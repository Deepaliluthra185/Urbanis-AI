import { useEffect, useState } from "react";
import HeaderNav from "../components/HeaderNav";
import api from "../lib/api";
import { MapPin, BadgeCheck, Truck, Loader2, Store, Filter } from "lucide-react";
import { toast } from "sonner";

const RADII = [25, 50, 100];

export default function LocalSourcingPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(100);
  const [type, setType] = useState("All");

  useEffect(() => {
    api
      .get("/suppliers")
      .then(({ data }) => {
        setSuppliers(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load suppliers:", err);
        setLoading(false);
      });
  }, []);

  const types = ["All", ...Array.from(new Set(suppliers.map((s) => s.type)))];
  const filtered = suppliers.filter((s) => s.distance_km <= radius && (type === "All" || s.type === type));

  return (
    <div className="min-h-screen bg-[#09090b]">
      <HeaderNav />
      <main className="max-w-[1600px] mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="eyebrow mb-2 flex items-center gap-2"><Store className="w-3 h-3" /> TERRA Network</p>
          <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight text-zinc-100 uppercase leading-none">Local Sourcing</h1>
          <p className="text-zinc-500 text-sm mt-3 max-w-2xl">Certified modular fabricators, sustainable architects and circular material producers matched to your region.</p>
        </div>

        <div className="flex flex-wrap items-center gap-6 mb-8 border-y border-zinc-800 py-4">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-zinc-500" /><span className="eyebrow">Radius</span>
            {RADII.map((r) => (
              <button key={r} onClick={() => setRadius(r)} data-testid={`radius-${r}`}
                className={`text-xs font-mono px-3 py-1.5 border transition-colors ${radius === r ? "bg-zinc-100 text-black border-zinc-100" : "border-zinc-800 text-zinc-400 hover:border-zinc-500"}`}>
                {r}km
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="eyebrow">Type</span>
            {types.map((t) => (
              <button key={t} onClick={() => setType(t)} data-testid={`type-${t}`}
                className={`text-xs font-mono px-3 py-1.5 border transition-colors ${type === t ? "bg-zinc-100 text-black border-zinc-100" : "border-zinc-800 text-zinc-400 hover:border-zinc-500"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-600" /></div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s, i) => (
              <div key={s.id} className="border border-zinc-800 bg-[#0e0e11] hover:border-zinc-500 transition-colors fadeup group" style={{ animationDelay: `${i * 40}ms` }} data-testid={`supplier-${s.id}`}>
                <div className="h-36 overflow-hidden border-b border-zinc-800">
                  <img src={s.image} alt={s.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300" />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-mono px-2 py-0.5 border border-zinc-700 text-zinc-400 uppercase">{s.type}</span>
                    <span className="flex items-center gap-1 text-[10px] font-mono text-green-400"><BadgeCheck className="w-3.5 h-3.5" /> {s.cert}</span>
                  </div>
                  <h3 className="font-display font-bold text-lg text-zinc-100 leading-tight">{s.name}</h3>
                  <p className="text-sm text-zinc-500 mt-1 leading-snug">{s.specialty}</p>
                  <div className="flex items-center gap-4 mt-3 text-[11px] font-mono text-zinc-500">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.location}</span>
                    <span>{s.distance_km}km</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] font-mono text-zinc-400"><Truck className="w-3 h-3" /> {s.delivery}</div>
                  <button
                    onClick={() => toast.success(`Quote request sent to ${s.name}`)}
                    data-testid={`connect-${s.id}`}
                    className="w-full mt-4 bg-zinc-900 border border-zinc-700 hover:bg-zinc-100 hover:text-black text-zinc-100 text-sm font-semibold py-2.5 transition-colors"
                  >
                    Connect
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-zinc-600 font-mono text-sm col-span-full py-10 text-center">No suppliers match these filters.</p>}
          </div>
        )}
      </main>
    </div>
  );
}
