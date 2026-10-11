import sys
from pathlib import Path

ROOT_DIR = Path(__file__).parent
if str(ROOT_DIR.parent) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR.parent))

from dotenv import load_dotenv
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, APIRouter, Request, HTTPException, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

from backend import auth
from backend import agents
from backend.seed_data import MODULES, MATERIALS, REGULATIONS, SUPPLIERS, TRADITIONAL_BENCHMARK_CARBON, compute_totals, material_by_id

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="UrbanisAI API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("urbanis")


# ----------------------- Models -----------------------
class RegisterInput(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class ProjectInput(BaseModel):
    name: str
    location: str = ""
    description: str = ""
    population: str = ""


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    population: Optional[str] = None
    site: Optional[Dict[str, Any]] = None
    design: Optional[Dict[str, Any]] = None


def now_iso():
    return datetime.now(timezone.utc).isoformat()


async def current_user(request: Request):
    return await auth.get_user_from_request(request, db)


# ----------------------- Auth -----------------------
@api_router.post("/auth/register")
async def register(payload: RegisterInput):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id, "email": email, "name": payload.name,
        "password_hash": auth.hash_password(payload.password),
        "role": "planner", "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    token = auth.create_access_token(user_id, email)
    return {"token": token, "user": {"id": user_id, "email": email, "name": payload.name, "role": "planner"}}


@api_router.post("/auth/login")
async def login(payload: LoginInput):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not auth.verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = auth.create_access_token(user["id"], email)
    return {"token": token, "user": {"id": user["id"], "email": email, "name": user["name"], "role": user.get("role", "planner")}}


@api_router.get("/auth/me")
async def me(user=Depends(current_user)):
    return user


# ----------------------- Reference data -----------------------
@api_router.get("/catalog")
async def catalog():
    return {"modules": MODULES, "materials": MATERIALS, "benchmark_carbon": TRADITIONAL_BENCHMARK_CARBON}


@api_router.get("/regulations")
async def get_regulations():
    return REGULATIONS


@api_router.get("/suppliers")
async def get_suppliers(material: Optional[str] = None):
    if material:
        return [s for s in SUPPLIERS if material in s["materials"]]
    return SUPPLIERS


@api_router.post("/design/compute")
async def design_compute(payload: Dict[str, Any]):
    return compute_totals(payload.get("modules", []))


# ----------------------- Projects -----------------------
def default_project(user_id, payload: ProjectInput):
    return {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": payload.name,
        "location": payload.location,
        "description": payload.description,
        "population": payload.population,
        "site": {"status": "pending", "polygon": None, "area_m2": 0, "perimeter_m": 0, "veto_reason": None, "label": None},
        "design": {"modules": [], "totals": None},
        "agents": {},
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }


@api_router.post("/projects")
async def create_project(payload: ProjectInput, user=Depends(current_user)):
    doc = default_project(user["id"], payload)
    await db.projects.insert_one({**doc})
    doc.pop("_id", None)
    return doc


@api_router.get("/projects")
async def list_projects(user=Depends(current_user)):
    projects = await db.projects.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return projects


@api_router.get("/projects/{project_id}")
async def get_project(project_id: str, user=Depends(current_user)):
    p = await db.projects.find_one({"id": project_id, "user_id": user["id"]}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


@api_router.put("/projects/{project_id}")
async def update_project(project_id: str, payload: ProjectUpdate, user=Depends(current_user)):
    p = await db.projects.find_one({"id": project_id, "user_id": user["id"]})
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if "design" in updates and updates["design"].get("modules") is not None:
        updates["design"]["totals"] = compute_totals(updates["design"]["modules"])
    updates["updated_at"] = now_iso()
    await db.projects.update_one({"id": project_id}, {"$set": updates})
    p = await db.projects.find_one({"id": project_id}, {"_id": 0})
    return p


@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user=Depends(current_user)):
    await db.projects.delete_one({"id": project_id, "user_id": user["id"]})
    return {"ok": True}


@api_router.get("/dashboard")
async def dashboard(user=Depends(current_user)):
    projects = await db.projects.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    active = len(projects)
    approved = sum(1 for p in projects if p.get("site", {}).get("status") == "approved")
    pending = sum(1 for p in projects if p.get("site", {}).get("status") in (None, "pending"))
    veto = sum(1 for p in projects if p.get("site", {}).get("status") == "veto")
    gaps = 0
    for p in projects:
        if not p.get("location"):
            gaps += 1
        if not p.get("design", {}).get("modules"):
            gaps += 1
    return {"active": active, "approved": approved, "pending": pending, "veto": veto, "data_gaps": gaps}


# ----------------------- AI Agents -----------------------
def chosen_materials(project) -> List[str]:
    return sorted({m.get("material") for m in project.get("design", {}).get("modules", []) if m.get("material")})


async def run_thot(project):
    if not project.get("location") or not project.get("description"):
        return {"status": "gap", "gap": {"institution": "Municipal Planning Office",
                "reason": "Site location and project brief are required to establish demographic and zoning context."}}
    site = project.get("site", {})
    prompt = (
        f"Project: {project['name']}\nLocation: {project['location']}\n"
        f"Brief: {project['description']}\nTarget population: {project.get('population') or 'unspecified'}\n"
        f"Parcel area: {site.get('area_m2', 0)} m2, validation status: {site.get('status')}.\n"
        "Write a concise 120-word site & demographic context summary for a modular housing feasibility study. "
        "Be factual and professional; do not invent regulations or prices."
    )
    text = await agents.llm_generate(
        "You are THOT, the site-context agent of an urban planning platform. You summarise parcel and demographic context.",
        prompt, f"thot-{project['id']}")
    return {"status": "complete", "confidence": 0.92, "output": text.strip()}


def run_kael(project):
    site = project.get("site", {})
    if site.get("status") == "veto":
        cite = [r for r in REGULATIONS if r["code"] == "Municipal Bylaw MB-22.7"]
        return {"status": "complete", "confidence": 1.0, "veto": True,
                "output": "Construction blocked by flood/ecological prohibition.", "citations": cite}
    if site.get("status") != "approved":
        return {"status": "gap", "gap": {"institution": "GIS / Cadastral Authority",
                "reason": "Parcel must pass Site Validation before regulatory codes can be resolved."}}
    mats = chosen_materials(project)
    cites = [r for r in REGULATIONS if "materials" not in r or any(m in r["materials"] for m in mats)]
    return {"status": "complete", "confidence": 0.97, "citations": cites,
            "output": f"{len(cites)} applicable codes resolved for the selected parcel and material palette."}


async def run_iris(project):
    modules = project.get("design", {}).get("modules", [])
    if not modules:
        return {"status": "gap", "gap": {"institution": "Design Studio Input",
                "reason": "No modular components placed. Add modules on the Design & Costing canvas to synthesise layouts."}}
    counts = {}
    for m in modules:
        mod = next((x for x in MODULES if x["id"] == m["module_id"]), None)
        if mod:
            counts[mod["name"]] = counts.get(mod["name"], 0) + 1
    summary = ", ".join(f"{v}x {k}" for k, v in counts.items())
    prompt = (
        f"Modules selected: {summary}.\n"
        "Propose exactly 3 distinct modular layout options (stacking/clustering) to maximise natural ventilation and daylight. "
        "For each option give a short bold title and 2 sentences. Return as a numbered list. No prices, no regulations."
    )
    text = await agents.llm_generate(
        "You are IRIS, the generative design agent. You propose modular housing layout options.",
        prompt, f"iris-{project['id']}")
    return {"status": "complete", "confidence": 0.9, "output": text.strip()}


def run_cronos(project):
    totals = project.get("design", {}).get("totals")
    if not totals or not project.get("design", {}).get("modules"):
        return {"status": "gap", "gap": {"institution": "Quantity Surveyor Input",
                "reason": "No design costed yet. Complete the Design & Costing step to generate the bill of quantities."}}
    return {"status": "complete", "confidence": 1.0, "totals": totals,
            "output": f"Bill of quantities computed: ₹ {totals['total_cost']:,.0f} CapEx across {totals['units']} modules ({totals['floor_area']:.0f} m2)."}


def run_terra(project):
    mats = chosen_materials(project)
    if not mats:
        return {"status": "gap", "gap": {"institution": "Procurement / Logistics",
                "reason": "Select materials on the Design step so certified local suppliers can be matched."}}
    matched = [s for s in SUPPLIERS if any(m in s["materials"] for m in mats)]
    totals = project.get("design", {}).get("totals", {}) or {}
    return {"status": "complete", "confidence": 0.95, "suppliers": matched,
            "output": f"{len(matched)} certified suppliers matched within 50km. Estimated embodied carbon {totals.get('total_carbon', 0):,.0f} kg CO2e."}


async def run_lyra(project, agent_outputs):
    required = ["thot", "kael", "iris", "cronos", "terra"]
    missing = [a for a in required if agent_outputs.get(a, {}).get("status") != "complete"]
    if missing:
        return {"status": "gap", "gap": {"institution": "Documentation Office",
                "reason": f"Cannot compile dossier — upstream agents incomplete: {', '.join(x.upper() for x in missing)}."}}
    totals = project.get("design", {}).get("totals", {})
    prompt = (
        f"Project {project['name']} in {project['location']}. Site approved. "
        f"CapEx ₹ {totals.get('total_cost', 0):,.0f}, embodied carbon {totals.get('total_carbon', 0):,.0f} kg CO2e "
        f"({totals.get('carbon_saving_pct', 0)}% below concrete benchmark). "
        "Write a 100-word executive summary for a municipal submission dossier. Professional, confident, factual."
    )
    text = await agents.llm_generate(
        "You are LYRA, the documentation agent compiling a municipal submission dossier.",
        prompt, f"lyra-{project['id']}")
    return {"status": "complete", "confidence": 0.96, "output": text.strip()}


@api_router.post("/projects/{project_id}/agents/{agent_id}")
async def run_agent(project_id: str, agent_id: str, user=Depends(current_user)):
    project = await db.projects.find_one({"id": project_id, "user_id": user["id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    agent_id = agent_id.lower()
    if agent_id == "thot":
        result = await run_thot(project)
    elif agent_id == "kael":
        result = run_kael(project)
    elif agent_id == "iris":
        result = await run_iris(project)
    elif agent_id == "cronos":
        result = run_cronos(project)
    elif agent_id == "terra":
        result = run_terra(project)
    elif agent_id == "lyra":
        result = await run_lyra(project, project.get("agents", {}))
    else:
        raise HTTPException(status_code=400, detail="Unknown agent")
    result["ran_at"] = now_iso()
    await db.projects.update_one({"id": project_id}, {"$set": {f"agents.{agent_id}": result, "updated_at": now_iso()}})
    return result


@api_router.get("/")
async def root():
    return {"message": "UrbanisAI API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.projects.create_index("user_id")
    await auth.seed_admin(db)
    logger.info("UrbanisAI backend ready")


@app.on_event("shutdown")
async def shutdown():
    client.close()
