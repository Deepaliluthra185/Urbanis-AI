import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import * as turf from "@turf/turf";
import HeaderNav from "../components/HeaderNav";
import { useProject } from "../context/ProjectContext";
import {
  ShieldCheck, ShieldAlert, Ruler, Pentagon, Eraser, ArrowRight, Waves, Leaf, Loader2, MapPin,
} from "lucide-react";
import { toast } from "sonner";

const CENTER = [28.6250, 77.2400];

const FLOOD_ZONE = [[28.618, 77.250], [28.648, 77.250], [28.648, 77.268], [28.618, 77.268]];
const PROTECTED_ZONE = [[28.595, 77.210], [28.615, 77.210], [28.615, 77.228], [28.595, 77.228]];

const PRESET_POLYGONS = {
  compliant: { label: "Compliant Parcel", coords: [[28.628, 77.232], [28.630, 77.232], [28.630, 77.234], [28.628, 77.234]] },
  flood: { label: "Yamuna Floodplain Test", coords: [[28.628, 77.252], [28.630, 77.252], [28.630, 77.254], [28.628, 77.254]] },
  protected: { label: "Delhi Ridge Forest Test", coords: [[28.602, 77.214], [28.604, 77.214], [28.604, 77.216], [28.602, 77.216]] },
};

function toTurf(latlngs) {
  const ring = latlngs.map(([lat, lng]) => [lng, lat]);
  ring.push(ring[0]);
  return turf.polygon([ring]);
}

const floodTurf = toTurf(FLOOD_ZONE);
const protectedTurf = toTurf(PROTECTED_ZONE);

function validatePolygon(latlngs) {
  const poly = toTurf(latlngs);
  const area = turf.area(poly);
  const perimeter = turf.length(turf.polygonToLine(poly), { units: "kilometers" }) * 1000;
  const inFlood = turf.booleanIntersects(poly, floodTurf);
  const inProtected = turf.booleanIntersects(poly, protectedTurf);
  let status = "approved";
  let veto_reason = null;
  if (inFlood && inProtected) {
    status = "veto";
    veto_reason = "Parcel intersects BOTH the Yamuna 100-year flood zone and the Delhi Ridge protected reserve.";
  } else if (inFlood) {
    status = "veto";
    veto_reason = "Parcel intersects the designated Yamuna River 100-year flood zone.";
  } else if (inProtected) {
    status = "veto";
    veto_reason = "Parcel intersects the Delhi Ridge protected ecological reserve.";
  }
  return { status, veto_reason, area_m2: Math.round(area), perimeter_m: Math.round(perimeter) };
}

export default function SiteValidationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { project, loadProject, updateProject } = useProject();
  const mapRef = useRef(null);
  const mapEl = useRef(null);
  const drawnRef = useRef(null);
  const [result, setResult] = useState(null);
  const [label, setLabel] = useState(null);
  const [saving, setSaving] = useState(false);
  const [projName, setProjName] = useState("");

  useEffect(() => {
    loadProject(id)
      .then((p) => {
        if (!p) return;
        setProjName(p.name || "");
        if (p.site?.polygon) {
          setResult({
            status: p.site.status,
            veto_reason: p.site.veto_reason,
            area_m2: p.site.area_m2,
            perimeter_m: p.site.perimeter_m,
          });
          setLabel(p.site.label);
        }
      })
      .catch((err) => {
        console.error("Failed to load project:", err);
      });
  }, [id, loadProject]);

  const renderPolygon = useCallback((latlngs, res) => {
    const map = mapRef.current;
    if (!map || !drawnRef.current) return;
    drawnRef.current.clearLayers();
    const color = res.status === "veto" ? "#ef4444" : "#22c55e";
    const layer = L.polygon(latlngs, { color, weight: 2, fillOpacity: 0.15, fillColor: color });
    drawnRef.current.addLayer(layer);
    map.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 16 });
  }, []);

  // init map once
  useEffect(() => {
    if (mapRef.current || !mapEl.current) return;
    const map = L.map(mapEl.current, { center: CENTER, zoom: 14, zoomControl: true });
    mapRef.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap", maxZoom: 19,
    }).addTo(map);

    L.polygon(FLOOD_ZONE, { color: "#3b82f6", weight: 1.5, dashArray: "5,5", fillColor: "#3b82f6", fillOpacity: 0.18 })
      .bindTooltip("YAMUNA 100-YEAR FLOODPLAIN", { permanent: false }).addTo(map);
    L.polygon(PROTECTED_ZONE, { color: "#22c55e", weight: 1.5, dashArray: "5,5", fillColor: "#22c55e", fillOpacity: 0.14 })
      .bindTooltip("DELHI RIDGE ECOLOGICAL RESERVE", { permanent: false }).addTo(map);

    const drawn = new L.FeatureGroup();
    map.addLayer(drawn);
    drawnRef.current = drawn;

    const drawControl = new L.Control.Draw({
      draw: {
        polygon: { shapeOptions: { color: "#fafafa", weight: 2 }, allowIntersection: false, showArea: false },
        polyline: false, rectangle: false, circle: false, marker: false, circlemarker: false,
      },
      edit: false,
    });
    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, (e) => {
      const latlngs = e.layer.getLatLngs()[0].map((p) => [p.lat, p.lng]);
      const res = validatePolygon(latlngs);
      setResult(res);
      setLabel("Custom Drawn Parcel");
      renderPolygon(latlngs, res);
      persist(latlngs, res, "Custom Drawn Parcel");
    });

    setTimeout(() => map.invalidateSize(), 200);
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line
  }, []);

  // draw existing polygon after map ready
  useEffect(() => {
    if (mapRef.current && project?.site?.polygon && drawnRef.current && drawnRef.current.getLayers().length === 0) {
      const res = { status: project.site.status, veto_reason: project.site.veto_reason, area_m2: project.site.area_m2, perimeter_m: project.site.perimeter_m };
      renderPolygon(project.site.polygon, res);
    }
  }, [project, renderPolygon]);

  const persist = async (latlngs, res, lbl) => {
    setSaving(true);
    await updateProject(id, {
      site: {
        polygon: latlngs, status: res.status, area_m2: res.area_m2,
        perimeter_m: res.perimeter_m, veto_reason: res.veto_reason, label: lbl,
      },
    });
    setSaving(false);
    if (res.status === "veto") toast.error("HARD VETO — site blocked");
    else toast.success("Site approved");
  };

  const applyPreset = (key) => {
    const preset = PRESET_POLYGONS[key];
    const res = validatePolygon(preset.coords);
    setResult(res);
    setLabel(preset.label);
    renderPolygon(preset.coords, res);
    persist(preset.coords, res, preset.label);
  };

  const clear = async () => {
    drawnRef.current?.clearLayers();
    setResult(null);
    setLabel(null);
    await updateProject(id, { site: { polygon: null, status: "pending", area_m2: 0, perimeter_m: 0, veto_reason: null, label: null } });
  };

  const approved = result?.status === "approved";
  const footprint = result ? Math.round(result.area_m2 * 0.4) : 0;

  return (
    <div className="min-h-screen bg-[#09090b]">
      <HeaderNav projectId={id} activeStep="site" />
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-6">
          <p className="eyebrow mb-1 flex items-center gap-2"><MapPin className="w-3 h-3" /> {projName}</p>
          <h1 className="font-display font-black text-3xl sm:text-4xl tracking-tight text-zinc-100 uppercase">Site Validation</h1>
          <p className="text-zinc-500 text-sm mt-2 max-w-2xl">
            Draw a parcel boundary or load a sample site. Overlays show flood and protected-ecology layers.
            Intersection triggers a deterministic hard veto — the same input always yields the same result.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2 border border-zinc-800">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-[#0e0e11] flex-wrap gap-2">
              <div className="flex items-center gap-4 text-[11px] font-mono">
                <span className="flex items-center gap-1.5 text-blue-400"><Waves className="w-3.5 h-3.5" /> Flood</span>
                <span className="flex items-center gap-1.5 text-green-400"><Leaf className="w-3.5 h-3.5" /> Protected</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-1"><Pentagon className="w-3 h-3" /> Use the polygon tool ↖</span>
                <button onClick={clear} data-testid="clear-polygon-btn" className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-500/40 px-2.5 py-1.5 transition-colors">
                  <Eraser className="w-3.5 h-3.5" /> Clear
                </button>
              </div>
            </div>
            <div ref={mapEl} data-testid="site-map" style={{ height: 560, width: "100%" }} />
          </div>

          {/* Panel */}
          <div className="space-y-4">
            <div className="border border-zinc-800 p-4">
              <p className="eyebrow mb-3">Sample parcels</p>
              <div className="space-y-2">
                <PresetBtn onClick={() => applyPreset("compliant")} testid="preset-compliant" tone="green" label="Compliant Parcel" sub="Central Delhi · Clear of veto layers" />
                <PresetBtn onClick={() => applyPreset("flood")} testid="preset-flood" tone="red" label="Yamuna Floodplain" sub="Intersects river flood zone" />
                <PresetBtn onClick={() => applyPreset("protected")} testid="preset-protected" tone="red" label="Delhi Ridge Reserve" sub="Intersects ecological reserve" />
              </div>
            </div>

            {/* Metrics */}
            <div className="border border-zinc-800 p-4" data-testid="site-metrics">
              <p className="eyebrow mb-3">Geodesic metrics</p>
              {result ? (
                <div className="grid grid-cols-2 gap-px bg-zinc-800 border border-zinc-800">
                  <Metric icon={Ruler} label="Area" value={`${result.area_m2.toLocaleString()} m²`} />
                  <Metric icon={Pentagon} label="Perimeter" value={`${result.perimeter_m.toLocaleString()} m`} />
                </div>
              ) : (
                <p className="text-sm text-zinc-600 font-mono">No parcel selected.</p>
              )}
            </div>

            {/* Verdict */}
            {result && (
              <div
                data-testid="validation-banner"
                className={`border p-5 fadeup ${approved ? "border-green-500/40 bg-green-500/10" : "border-red-500/50 bg-red-500/10"}`}
              >
                <div className="flex items-start gap-3">
                  {approved ? <ShieldCheck className="w-6 h-6 text-green-400 shrink-0" /> : <ShieldAlert className="w-6 h-6 text-red-400 shrink-0" />}
                  <div>
                    <div className={`font-display font-bold text-lg ${approved ? "text-green-400" : "text-red-400"}`}>
                      {approved ? "SITE APPROVED" : "HARD VETO — ZONE CONFLICT"}
                    </div>
                    <p className="text-sm text-zinc-300 mt-1 leading-snug">
                      {approved
                        ? `Parcel clears all environmental veto layers. Max building footprint ≈ ${footprint.toLocaleString()} m² at 40% coverage.`
                        : result.veto_reason}
                    </p>
                    {!approved && (
                      <p className="text-[11px] font-mono text-red-300/80 mt-2">Ref: Municipal Bylaw MB-22.7 (2022-09-05)</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              disabled={!approved || saving}
              onClick={() => navigate(`/project/${id}/design`)}
              data-testid="proceed-design-btn"
              className={`w-full flex items-center justify-center gap-2 font-semibold text-sm py-3.5 transition-colors ${
                approved ? "bg-zinc-100 text-black hover:bg-white" : "bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800"
              }`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Proceed to Design & Costing <ArrowRight className="w-4 h-4" /></>}
            </button>
            {!approved && result && (
              <p className="text-center text-[11px] font-mono text-red-400">Progression blocked until a compliant site is selected.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function PresetBtn({ onClick, testid, tone, label, sub }) {
  const dot = tone === "green" ? "bg-green-500" : "bg-red-500";
  return (
    <button onClick={onClick} data-testid={testid} className="w-full flex items-center gap-3 border border-zinc-800 hover:border-zinc-500 px-3 py-2.5 text-left transition-colors">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <div className="min-w-0">
        <div className="text-sm text-zinc-100 font-medium truncate">{label}</div>
        <div className="text-[11px] font-mono text-zinc-500 truncate">{sub}</div>
      </div>
    </button>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="bg-[#0e0e11] p-3">
      <div className="flex items-center gap-1.5 text-zinc-500 mb-1"><Icon className="w-3.5 h-3.5" /><span className="eyebrow">{label}</span></div>
      <div className="font-display font-bold text-lg text-zinc-100">{value}</div>
    </div>
  );
}
