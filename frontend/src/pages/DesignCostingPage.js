import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import HeaderNav from "../components/HeaderNav";
import { useProject } from "../context/ProjectContext";
import api from "../lib/api";
import {
  BedDouble, CookingPot, Bath, Sofa, Sun, Trees, X, ArrowRight, Layers, IndianRupee, Leaf, Ruler, GripVertical, ShieldAlert, Loader2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Cell as RCell, ResponsiveContainer, Tooltip } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";

const ICONS = { "bed-double": BedDouble, "cooking-pot": CookingPot, bath: Bath, sofa: Sofa, sun: Sun, trees: Trees };
const COLS = 6;
const CELLS = 24;
let UID = 1;

export default function DesignCostingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { project, loadProject, updateProject } = useProject();
  const [catalog, setCatalog] = useState({ modules: [], materials: [], benchmark_carbon: 350 });
  const [cells, setCells] = useState(Array(CELLS).fill(null));
  const [defaultMat, setDefaultMat] = useState("clt");
  const [projName, setProjName] = useState("");
  const [approved, setApproved] = useState(true);
  const dragData = useRef(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    api.get("/catalog").then(({ data }) => setCatalog(data)).catch((err) => console.error("Catalog load failed:", err));
    loadProject(id)
      .then((p) => {
        if (!p) return;
        setProjName(p.name || "");
        setApproved(p.site?.status === "approved");
        const grid = Array(CELLS).fill(null);
        (p.design?.modules || []).forEach((m, i) => {
          const cell = m.cell != null ? m.cell : i;
          grid[cell] = { uid: UID++, module_id: m.module_id, material: m.material, cell };
        });
        setCells(grid);
      })
      .catch((err) => console.error("Project load failed:", err));
    // eslint-disable-next-line
  }, [id]);

  const modById = (mid) => catalog.modules.find((m) => m.id === mid);
  const matById = (mid) => catalog.materials.find((m) => m.id === mid);

  const totals = useMemo(() => {
    let cost = 0, carbon = 0, area = 0;
    const placed = cells.filter(Boolean);
    placed.forEach((c) => {
      const mod = catalog.modules?.find((m) => m.id === c.module_id);
      const mat = catalog.materials?.find((m) => m.id === c.material);
      if (!mod || !mat) return;
      cost += mod.base_cost + mod.area * mat.cost_per_m2;
      carbon += mod.area * mat.carbon_per_m2;
      area += mod.area;
    });
    const benchmark = area * (catalog.benchmark_carbon || 350);
    return {
      cost, carbon, area, units: placed.length, benchmark,
      saving: benchmark > 0 ? Math.round((1 - carbon / benchmark) * 100) : 0,
    };
  }, [cells, catalog]);

  const persist = (grid) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const modules = grid.map((c, i) => (c ? { module_id: c.module_id, material: c.material, cell: i } : null)).filter(Boolean);
      updateProject(id, { design: { modules } });
    }, 500);
  };

  const setGrid = (grid) => { setCells(grid); persist(grid); };

  const onDrop = (index) => {
    const d = dragData.current;
    dragData.current = null;
    if (!d || cells[index]) return;
    const grid = [...cells];
    if (d.type === "palette") {
      grid[index] = { uid: UID++, module_id: d.module_id, material: defaultMat, cell: index };
    } else if (d.type === "move") {
      grid[index] = { ...cells[d.from], cell: index };
      grid[d.from] = null;
    }
    setGrid(grid);
  };

  const removeCell = (index) => {
    const grid = [...cells]; grid[index] = null; setGrid(grid);
  };

  const swapMaterial = (index, material) => {
    const grid = [...cells]; grid[index] = { ...grid[index], material }; setGrid(grid);
  };

  const swapAll = (material) => {
    setDefaultMat(material);
    const grid = cells.map((c) => (c ? { ...c, material } : null));
    setGrid(grid);
    toast.success(`All modules swapped to ${matById(material)?.name}`);
  };

  const chartData = [
    { name: "This Design", value: Math.round(totals.carbon), fill: "#22c55e" },
    { name: "Concrete Benchmark", value: Math.round(totals.benchmark), fill: "#71717a" },
  ];

  const costData = useMemo(() => {
    const agg = {};
    cells.filter(Boolean).forEach((c) => {
      const mod = modByIdStatic(catalog.modules, c.module_id);
      const mat = matByIdStatic(catalog.materials, c.material);
      if (!mod || !mat) return;
      agg[mod.name] = (agg[mod.name] || 0) + mod.base_cost + mod.area * mat.cost_per_m2;
    });
    return Object.entries(agg).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [cells, catalog]);

  return (
    <div className="min-h-screen bg-[#09090b]">
      <HeaderNav projectId={id} activeStep="design" />
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-6">
          <p className="eyebrow mb-1">{projName}</p>
          <h1 className="font-display font-black text-3xl sm:text-4xl tracking-tight text-zinc-100 uppercase">Design & Costing</h1>
          <p className="text-zinc-500 text-sm mt-2 max-w-2xl">Drag modules onto the grid. Swap materials to see cost and embodied carbon recalculate live.</p>
        </div>

        {!approved && (
          <div className="mb-6 border border-red-500/50 bg-red-500/10 p-4 flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <p className="text-sm text-red-300">This site is not validated/approved. Complete Site Validation first for a compliant workflow.</p>
          </div>
        )}

        <div className="grid lg:grid-cols-[220px_1fr_320px] gap-6">
          {/* Palette */}
          <div className="border border-zinc-800 p-4 h-fit">
            <p className="eyebrow mb-3">Module palette</p>
            <div className="space-y-2">
              {catalog.modules.map((m) => {
                const Icon = ICONS[m.icon] || Layers;
                return (
                  <div
                    key={m.id} draggable
                    onDragStart={() => (dragData.current = { type: "palette", module_id: m.id })}
                    data-testid={`palette-${m.id}`}
                    className="flex items-center gap-3 border border-zinc-800 hover:border-zinc-500 bg-[#0e0e11] px-3 py-2.5 cursor-grab active:cursor-grabbing transition-colors"
                  >
                    <Icon className="w-4 h-4 text-zinc-300 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-zinc-100 truncate">{m.name}</div>
                      <div className="text-[10px] font-mono text-zinc-500">{m.area} m²</div>
                    </div>
                    <GripVertical className="w-3.5 h-3.5 text-zinc-600" />
                  </div>
                );
              })}
            </div>
            <p className="eyebrow mt-6 mb-2">Default material</p>
            <Select value={defaultMat} onValueChange={swapAll}>
              <SelectTrigger className="bg-[#09090b] border-zinc-800 rounded-none text-xs" data-testid="swap-all-material">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#18181b] border-zinc-800 text-zinc-200 rounded-none">
                {catalog.materials.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] font-mono text-zinc-600 mt-2">Changes all placed modules.</p>
          </div>

          {/* Canvas */}
          <div className="border border-zinc-800">
            <div className="px-4 py-3 border-b border-zinc-800 bg-[#0e0e11] flex items-center justify-between">
              <span className="eyebrow">Assembly grid · {totals.units} modules</span>
              <span className="eyebrow">{totals.area} m² GFA</span>
            </div>
            <div className="p-4 grid-bg">
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0,1fr))` }} data-testid="design-grid">
                {cells.map((c, i) => (
                  <GridCell
                    key={i} index={i} cell={c} modByIdStatic={() => modByIdStatic(catalog.modules, c?.module_id)}
                    matById={matById} materials={catalog.materials}
                    onDrop={onDrop} onRemove={removeCell} onSwap={swapMaterial} dragData={dragData}
                  />
                ))}
              </div>
              {totals.units === 0 && (
                <p className="text-center text-sm text-zinc-600 font-mono mt-4">Drag modules from the palette into any cell.</p>
              )}
            </div>
          </div>

          {/* Live totals */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-px bg-zinc-800 border border-zinc-800" data-testid="live-totals">
              <BigMetric icon={IndianRupee} label="Estimated CapEx" value={`₹ ${Math.round(totals.cost).toLocaleString('en-IN')}`} tone="text-zinc-100" />
              <BigMetric icon={Leaf} label="Embodied Carbon" value={`${Math.round(totals.carbon).toLocaleString()} kg CO₂e`} tone="text-green-400" />
              <BigMetric icon={Ruler} label="Gross Floor Area" value={`${totals.area} m²`} tone="text-zinc-100" />
            </div>

            <div className="border border-zinc-800 p-4">
              <p className="eyebrow mb-1">Carbon vs Concrete Benchmark</p>
              <p className={`font-display font-bold text-2xl mb-3 ${totals.saving >= 0 ? "text-green-400" : "text-red-400"}`}>
                {totals.saving >= 0 ? `${totals.saving}% lower` : `${Math.abs(totals.saving)}% higher`}
              </p>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={{ stroke: "#27272a" }} tickLine={false} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 0, fontSize: 11 }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="value" radius={0}>
                    {chartData.map((d, i) => <RCell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {costData.length > 0 && (
              <div className="border border-zinc-800 p-4">
                <p className="eyebrow mb-3">Cost breakdown by module</p>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={costData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={72} tick={{ fill: "#a1a1aa", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 0, fontSize: 11 }} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={(v) => `₹ ${v.toLocaleString('en-IN')}`} />
                    <Bar dataKey="value" fill="#fafafa" radius={0} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <button
              disabled={totals.units === 0}
              onClick={() => navigate(`/project/${id}/formulation`)}
              data-testid="proceed-formulation-btn"
              className="w-full flex items-center justify-center gap-2 bg-zinc-100 text-black font-semibold text-sm py-3.5 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Proceed to AI Formulation <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function modByIdStatic(modules, mid) { return modules.find((m) => m.id === mid); }
function matByIdStatic(materials, mid) { return materials.find((m) => m.id === mid); }

function GridCell({ index, cell, matById, materials, onDrop, onRemove, onSwap, dragData }) {
  const modules = null;
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onDrop(index); }}
      data-testid={`grid-cell-${index}`}
      className={`aspect-square border transition-colors ${cell ? "border-zinc-700 bg-[#1c1c21]" : "border-dashed border-zinc-800 hover:border-zinc-600"}`}
    >
      {cell && <PlacedModule index={index} cell={cell} matById={matById} materials={materials} onRemove={onRemove} onSwap={onSwap} dragData={dragData} />}
    </div>
  );
}

function PlacedModule({ index, cell, matById, materials, onRemove, onSwap, dragData }) {
  const mat = matById(cell.material);
  return (
    <div
      draggable
      onDragStart={() => (dragData.current = { type: "move", from: index })}
      className="w-full h-full p-1.5 flex flex-col justify-between relative group cursor-grab active:cursor-grabbing"
      data-testid={`placed-${cell.module_id}`}
    >
      <button onClick={() => onRemove(index)} data-testid={`remove-cell-${index}`} className="absolute top-0.5 right-0.5 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
        <X className="w-3.5 h-3.5" />
      </button>
      <span className="text-[9px] font-mono text-zinc-300 leading-tight capitalize">{cell.module_id.replace("_", " ")}</span>
      <Select value={cell.material} onValueChange={(v) => onSwap(index, v)}>
        <SelectTrigger className="h-6 bg-[#09090b] border-zinc-800 rounded-none text-[8px] px-1.5" data-testid={`material-select-${index}`}>
          <SelectValue>{mat?.name?.split(" ")[0]}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-[#18181b] border-zinc-800 text-zinc-200 rounded-none">
          {materials.map((m) => <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function BigMetric({ icon: Icon, label, value, tone }) {
  return (
    <div className="bg-[#0e0e11] p-4">
      <div className="flex items-center gap-2 text-zinc-500 mb-2"><Icon className="w-4 h-4" /><span className="eyebrow">{label}</span></div>
      <div className={`font-display font-black text-2xl ${tone}`}>{value}</div>
    </div>
  );
}
