import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import HeaderNav from "../components/HeaderNav";
import { useProject } from "../context/ProjectContext";
import api from "../lib/api";
import {
  Brain, Scale, LayoutGrid, Calculator, Truck, FileText, Play, Loader2, CircleCheck,
  TriangleAlert, ArrowRight, Sparkles, CircleDot,
} from "lucide-react";
import { toast } from "sonner";
import { AgentErrorModal } from "../components/AgentErrorModal";

const AGENTS = [
  { id: "thot", name: "THOT", role: "Site & Zoning Context", icon: Brain, kind: "text" },
  { id: "kael", name: "KAEL", role: "Regulatory Code & Citations", icon: Scale, kind: "citations" },
  { id: "iris", name: "IRIS", role: "Modular Layout Synthesis", icon: LayoutGrid, kind: "text" },
  { id: "cronos", name: "CRONOS", role: "Parametric Budget", icon: Calculator, kind: "totals" },
  { id: "terra", name: "TERRA", role: "Carbon & Logistics", icon: Truck, kind: "suppliers" },
  { id: "lyra", name: "LYRA", role: "Municipal Dossier", icon: FileText, kind: "text" },
];

export default function AiFormulationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { project, loadProject, runAgent } = useProject();
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(null);
  const [runningAll, setRunningAll] = useState(false);
  const [projName, setProjName] = useState("");
  const [catalog, setCatalog] = useState({ modules: [], materials: [], suppliers: [] });
  const [errorModal, setErrorModal] = useState({ isOpen: false, agentId: null, agentName: "", result: null });

  useEffect(() => {
    api.get("/catalog").then(({ data }) => setCatalog(data)).catch((err) => console.error("Catalog load failed:", err));
    api.get("/suppliers").then(({ data }) => setCatalog(prev => ({ ...prev, suppliers: data }))).catch((err) => console.error("Suppliers load failed:", err));
    loadProject(id)
      .then((p) => {
        if (!p) return;
        setProjName(p.name || "");
        setResults(p.agents || {});
      })
      .catch((err) => console.error("AiFormulationPage load error:", err));
  }, [id, loadProject]);

  const execute = async (agentId) => {
    setRunning(agentId);
    try {
      const res = await runAgent(id, agentId);
      setResults((prev) => ({ ...prev, [agentId]: res }));
      if (res.status === "gap") {
        const agent = AGENTS.find(a => a.id === agentId);
        setErrorModal({ isOpen: true, agentId, agentName: agent?.name || agentId, result: res });
        toast.warning(`${agentId.toUpperCase()} — data gap flagged`);
      }
      return res;
    } catch (e) {
      toast.error(`${agentId.toUpperCase()} failed`);
    } finally {
      setRunning(null);
    }
  };

  const closeErrorModal = () => setErrorModal({ isOpen: false, agentId: null, agentName: "", result: null });

  const runAll = async () => {
    setRunningAll(true);
    for (const a of AGENTS) {
      // eslint-disable-next-line no-await-in-loop
      await execute(a.id);
    }
    setRunningAll(false);
    toast.success("Formulation sequence complete");
  };

  const completed = AGENTS.filter((a) => results[a.id]?.status === "complete").length;

  return (
    <div className="min-h-screen bg-[#09090b]">
      <HeaderNav projectId={id} activeStep="formulation" />
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <p className="eyebrow mb-1">{projName}</p>
            <h1 className="font-display font-black text-3xl sm:text-4xl tracking-tight text-zinc-100 uppercase">AI Formulation Engine</h1>
            <p className="text-zinc-500 text-sm mt-2 max-w-2xl">Six sequential agents. THOT, IRIS and LYRA use Gemini 3.1 Pro; KAEL, CRONOS and TERRA stay grounded in structured data.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="font-display font-bold text-2xl text-zinc-100">{completed}<span className="text-zinc-600">/6</span></div>
              <div className="eyebrow">agents complete</div>
            </div>
            <button
              onClick={runAll} disabled={runningAll} data-testid="run-all-btn"
              className="flex items-center gap-2 bg-zinc-100 text-black font-semibold text-sm px-5 py-3 hover:bg-white disabled:opacity-60 transition-colors"
            >
              {runningAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Run sequence
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {AGENTS.map((a, i) => (
            <AgentCard
              key={a.id} agent={a} index={i} result={results[a.id]}
              running={running === a.id} onRun={() => execute(a.id)} disabled={runningAll}
            />
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            disabled={!(results.lyra?.status === "complete")}
            onClick={() => navigate(`/project/${id}/summary`)}
            data-testid="proceed-summary-btn"
            className="flex items-center justify-center gap-2 bg-zinc-100 text-black font-semibold text-sm px-6 py-3.5 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Proceed to Summary & Export <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      <AgentErrorModal
        isOpen={errorModal.isOpen}
        onClose={closeErrorModal}
        agentResult={errorModal.result}
        agentName={errorModal.agentName}
        catalog={catalog}
        projectId={id}
      />
    </div>
  );
}

function AgentCard({ agent, index, result, running, onRun, disabled }) {
  const Icon = agent.icon;
  const status = running ? "running" : result?.status || "idle";
  const statusMap = {
    idle: ["IDLE", "text-zinc-500", CircleDot],
    running: ["ANALYZING", "text-amber-400 beacon", Loader2],
    complete: ["COMPLETE", "text-green-400", CircleCheck],
    gap: ["GAP FLAGGED", "text-amber-400", TriangleAlert],
  };
  const [sLabel, sTone, SIcon] = statusMap[status];

  return (
    <div className={`border bg-[#0e0e11] fadeup ${status === "complete" ? "border-green-500/30" : status === "gap" ? "border-amber-500/40" : "border-zinc-800"}`} style={{ animationDelay: `${index * 40}ms` }} data-testid={`agent-card-${agent.id}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 border border-zinc-700 flex items-center justify-center">
            <Icon className="w-4.5 h-4.5 text-zinc-200" style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <div className="font-display font-bold text-zinc-100 tracking-tight leading-none">{agent.name}</div>
            <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{agent.role}</div>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-[10px] font-mono ${sTone}`}>
          <SIcon className={`w-3.5 h-3.5 ${running ? "animate-spin" : ""}`} /> {sLabel}
        </div>
      </div>

      <div className="p-4 min-h-[150px] text-sm">
        {status === "idle" && <p className="text-zinc-600 font-mono text-xs">Awaiting execution.</p>}
        {status === "running" && <div className="space-y-2"><div className="h-2 bg-zinc-800 w-3/4 animate-pulse" /><div className="h-2 bg-zinc-800 w-full animate-pulse" /><div className="h-2 bg-zinc-800 w-1/2 animate-pulse" /></div>}
        {status === "gap" && <GapNotice gap={result.gap} />}
        {status === "complete" && <AgentOutput agent={agent} result={result} />}
      </div>

      <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between">
        {result?.confidence != null && status === "complete" ? (
          <span className="text-[10px] font-mono text-zinc-500">confidence {Math.round(result.confidence * 100)}%</span>
        ) : <span />}
        <button
          onClick={onRun} disabled={running || disabled} data-testid={`run-${agent.id}-btn`}
          className="flex items-center gap-1.5 text-xs font-mono text-zinc-300 hover:text-zinc-100 border border-zinc-800 hover:border-zinc-500 px-3 py-1.5 disabled:opacity-50 transition-colors"
        >
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Run
        </button>
      </div>
    </div>
  );
}

function GapNotice({ gap }) {
  return (
    <div className="border border-amber-500/40 bg-amber-500/10 p-3" data-testid="data-gap-notice">
      <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-semibold mb-1">
        <TriangleAlert className="w-4 h-4" /> DATA GAP FLAGGED
      </div>
      <p className="text-[11px] font-mono text-amber-300/90 mb-1">Responsible: {gap?.institution}</p>
      <p className="text-sm text-zinc-300 leading-snug">{gap?.reason}</p>
    </div>
  );
}

function AgentOutput({ agent, result }) {
  if (agent.kind === "text") {
    return <p className="text-zinc-300 leading-relaxed whitespace-pre-line text-[13px]">{result.output}</p>;
  }
  if (agent.kind === "citations") {
    return (
      <div className="space-y-2">
        <p className="text-zinc-400 text-xs mb-2">{result.output}</p>
        {(result.citations || []).map((c) => (
          <div key={c.code} className="border border-zinc-800 p-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-mono text-xs text-zinc-100">{c.code}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 border border-zinc-700 text-zinc-400 uppercase">{c.level}</span>
            </div>
            <p className="text-[12px] text-zinc-400 mt-1">{c.title}</p>
            <p className="text-[10px] font-mono text-zinc-600 mt-1">{c.date}</p>
          </div>
        ))}
      </div>
    );
  }
  if (agent.kind === "totals") {
    const t = result.totals || {};
    return (
      <div>
        <p className="text-zinc-400 text-xs mb-3">{result.output}</p>
        <div className="grid grid-cols-2 gap-px bg-zinc-800 border border-zinc-800 mb-3">
          <MiniStat label="CapEx" value={`₹ ${(t.total_cost || 0).toLocaleString('en-IN')}`} />
          <MiniStat label="Carbon" value={`${(t.total_carbon || 0).toLocaleString()} kg`} />
          <MiniStat label="Floor area" value={`${t.floor_area || 0} m²`} />
          <MiniStat label="vs benchmark" value={`${t.carbon_saving_pct || 0}% ↓`} tone="text-green-400" />
        </div>
        <div className="space-y-1">
          {(t.breakdown || []).map((b, i) => (
            <div key={i} className="flex items-center justify-between text-[11px] font-mono border-b border-zinc-800/60 py-1">
              <span className="text-zinc-400">{b.module} · {b.material.split(" ")[0]}</span>
              <span className="text-zinc-200">₹ {b.cost.toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (agent.kind === "suppliers") {
    return (
      <div className="space-y-2">
        <p className="text-zinc-400 text-xs mb-2">{result.output}</p>
        {(result.suppliers || []).map((s) => (
          <div key={s.id} className="flex items-center gap-3 border border-zinc-800 p-2">
            <img src={s.image} alt={s.name} className="w-9 h-9 object-cover grayscale" />
            <div className="min-w-0 flex-1">
              <div className="text-xs text-zinc-100 truncate">{s.name}</div>
              <div className="text-[10px] font-mono text-zinc-500 truncate">{s.location} · {s.distance_km}km</div>
            </div>
            <span className="text-[9px] font-mono text-green-400 whitespace-nowrap">{s.delivery.split("—")[0]}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function MiniStat({ label, value, tone = "text-zinc-100" }) {
  return (
    <div className="bg-[#0e0e11] p-2">
      <div className="eyebrow text-[8px]">{label}</div>
      <div className={`font-display font-bold text-sm mt-0.5 ${tone}`}>{value}</div>
    </div>
  );
}
