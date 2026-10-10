import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import HeaderNav from "../components/HeaderNav";
import { useProject } from "../context/ProjectContext";
import {
  Plus, Activity, CircleCheck, Clock, TriangleAlert, ArrowRight, MapPin, Trash2, Loader2, Boxes,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "../components/ui/dialog";

const PRESETS = [
  { name: "Urbanis Modular Quad", location: "Bengaluru, India", description: "48-unit low-carbon modular timber quad on a cleared inner-city parcel.", population: "Young professionals & tech workforce" },
  { name: "Harbor Eco-Terrace", location: "Navi Mumbai, India", description: "Terraced modular housing near coastal development district with eco-protection buffers.", population: "Mixed-income municipal workers" },
  { name: "Riverfront Veto Test", location: "Yamuna Floodplain, Delhi, India", description: "Speculative riverfront parcel — intersects the 100-year municipal flood zone.", population: "Demonstration parcel" },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { setProject } = useProject();
  const [stats, setStats] = useState({ active: 0, approved: 0, pending: 0, veto: 0, data_gaps: 0 });
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", description: "", population: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([api.get("/dashboard"), api.get("/projects")]);
      setStats(s.data);
      setProjects(p.data || []);
    } catch (err) {
      console.error("Dashboard load failed:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const createProject = async (payload) => {
    setCreating(true);
    try {
      const { data } = await api.post("/projects", payload);
      setProject(data);
      localStorage.setItem("urbanis_project", data.id);
      toast.success(`Project "${data.name}" created`);
      navigate(`/project/${data.id}/site`);
    } catch (e) {
      toast.error("Could not create project");
    } finally {
      setCreating(false);
    }
  };

  const del = async (e, id) => {
    e.stopPropagation();
    await api.delete(`/projects/${id}`);
    toast.success("Project deleted");
    load();
  };

  const cards = [
    { label: "Active Projects", value: stats.active, icon: Activity, tone: "text-zinc-100" },
    { label: "Site Approved", value: stats.approved, icon: CircleCheck, tone: "text-green-400" },
    { label: "Pending Approvals", value: stats.pending, icon: Clock, tone: "text-amber-400" },
    { label: "Flagged Data Gaps", value: stats.data_gaps, icon: TriangleAlert, tone: "text-red-400" },
  ];

  return (
    <div className="min-h-screen bg-[#09090b]">
      <HeaderNav />
      <main className="max-w-[1600px] mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <p className="eyebrow mb-2">Command Center</p>
            <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight text-zinc-100 uppercase leading-none">
              Dashboard
            </h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button
                className="flex items-center gap-2 bg-zinc-100 text-black font-semibold text-sm px-5 py-3 hover:bg-white transition-colors self-start"
                data-testid="new-project-btn"
              >
                <Plus className="w-4 h-4" /> New Project
              </button>
            </DialogTrigger>
            <DialogContent className="bg-[#121215] border-zinc-800 text-zinc-100 rounded-none sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display tracking-tight text-2xl">New Housing Project</DialogTitle>
                <DialogDescription className="text-zinc-500 text-xs font-mono">Define the parcel context to begin the 4-step workflow.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <Input label="Project name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} testid="project-name-input" placeholder="Urbanis Modular Quad" />
                <Input label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} testid="project-location-input" placeholder="Bengaluru, India" />
                <Input label="Target population" value={form.population} onChange={(v) => setForm({ ...form, population: v })} testid="project-population-input" placeholder="Young families" />
                <div>
                  <span className="eyebrow block mb-1.5">Brief</span>
                  <textarea
                    data-testid="project-desc-input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-500 outline-none px-3 py-2 text-sm resize-none"
                    placeholder="Short description of the site and housing goal."
                  />
                </div>
              </div>
              <DialogFooter>
                <button
                  disabled={!form.name || creating} onClick={() => createProject(form)} data-testid="create-project-submit"
                  className="w-full bg-zinc-100 text-black font-semibold text-sm py-3 flex items-center justify-center gap-2 hover:bg-white disabled:opacity-50 transition-colors"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create & validate site <ArrowRight className="w-4 h-4" /></>}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-800 border border-zinc-800 mb-10">
          {cards.map((c) => (
            <div key={c.label} className="bg-[#0e0e11] p-5" data-testid={`stat-${c.label.toLowerCase().replace(/ /g, "-")}`}>
              <div className="flex items-center justify-between mb-6">
                <c.icon className={`w-5 h-5 ${c.tone}`} />
              </div>
              <div className={`font-display font-black text-4xl ${c.tone}`}>{loading ? "—" : c.value}</div>
              <div className="eyebrow mt-2">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Quick launch presets */}
        <p className="eyebrow mb-3">Quick-launch demo sites</p>
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {PRESETS.map((p) => (
            <button
              key={p.name} onClick={() => createProject(p)} disabled={creating}
              data-testid={`preset-${p.name.toLowerCase().replace(/ /g, "-")}`}
              className="text-left bg-[#0e0e11] border border-zinc-800 hover:border-zinc-500 p-5 transition-colors group disabled:opacity-50"
            >
              <div className="flex items-center gap-2 text-zinc-500 mb-3">
                <MapPin className="w-3.5 h-3.5" /><span className="text-xs font-mono">{p.location}</span>
              </div>
              <h3 className="font-display font-bold text-lg text-zinc-100 mb-1">{p.name}</h3>
              <p className="text-sm text-zinc-500 leading-snug mb-4">{p.description}</p>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 group-hover:text-zinc-100 transition-colors">
                Launch workflow <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>
          ))}
        </div>

        {/* Projects list */}
        <p className="eyebrow mb-3">Your projects</p>
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-600" /></div>
        ) : projects.length === 0 ? (
          <div className="border border-dashed border-zinc-800 py-20 text-center">
            <Boxes className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No projects yet. Launch a demo site or create one.</p>
          </div>
        ) : (
          <div className="border border-zinc-800 divide-y divide-zinc-800">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/project/${p.id}/site`)}
                data-testid={`project-row-${p.id}`}
                className="w-full flex items-center gap-4 p-4 hover:bg-[#121215] transition-colors text-left group"
              >
                <StatusDot status={p.site?.status} />
                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold text-zinc-100 truncate">{p.name}</div>
                  <div className="text-xs font-mono text-zinc-500 truncate">{p.location || "No location set"}</div>
                </div>
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-mono text-zinc-400">
                    {p.design?.totals ? `₹ ${p.design.totals.total_cost.toLocaleString('en-IN')}` : "Not costed"}
                  </div>
                  <div className="eyebrow">{p.design?.totals ? `${p.design.totals.units} modules` : "—"}</div>
                </div>
                <StatusBadge status={p.site?.status} />
                <span onClick={(e) => del(e, p.id)} data-testid={`delete-project-${p.id}`} className="p-2 text-zinc-600 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </span>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-100 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatusDot({ status }) {
  const c = status === "approved" ? "bg-green-500" : status === "veto" ? "bg-red-500" : "bg-amber-500";
  return <span className={`w-2 h-2 rounded-full shrink-0 ${c}`} />;
}

function StatusBadge({ status }) {
  const map = {
    approved: ["APPROVED", "text-green-400 border-green-500/40 bg-green-500/10"],
    veto: ["VETO", "text-red-400 border-red-500/40 bg-red-500/10"],
    pending: ["PENDING", "text-amber-400 border-amber-500/40 bg-amber-500/10"],
  };
  const [label, cls] = map[status] || map.pending;
  return <span className={`hidden md:inline-block text-[10px] font-mono px-2 py-1 border ${cls}`}>{label}</span>;
}

function Input({ label, value, onChange, testid, placeholder }) {
  return (
    <label className="block">
      <span className="eyebrow block mb-1.5">{label}</span>
      <input
        data-testid={testid} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-500 outline-none px-3 py-2 text-sm"
      />
    </label>
  );
}
