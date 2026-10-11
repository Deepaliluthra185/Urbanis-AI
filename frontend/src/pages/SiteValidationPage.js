import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import Konva from "konva";
import * as turf from "@turf/turf";
import HeaderNav from "../components/HeaderNav";
import { useProject } from "../context/ProjectContext";
import {
  ShieldCheck,
  ShieldAlert,
  Ruler,
  Pentagon,
  Eraser,
  ArrowRight,
  Waves,
  Leaf,
  Loader2,
  MapPin,
  Search,
  PenTool,
  Eye,
  EyeOff,
  RotateCcw,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { KNOWN_CITY_COORDINATES } from "../data/indianLocations";
import {
  evaluateParcelComprehensiveHazards,
  REGIONAL_RIVER_HAZARDS,
  ALL_RIVER_HAZARD_CORRIDORS,
} from "../data/riverHazardZones";

// Pre-configured geographic zones & deterministic regulatory presets
const CITY_CONFIGS = {
  amritsar: {
    cityName: "Amritsar, Punjab",
    center: [31.6340, 74.8723],
    zoom: 14,
    floodZone: [
      [31.625, 74.885],
      [31.650, 74.885],
      [31.650, 74.912],
      [31.625, 74.912],
    ],
    floodName: "Punjab Alluvial / Beas 100-year flood zone",
    floodLabel: "BEAS ALLUVIAL 100-YEAR FLOODPLAIN",
    protectedZone: [
      [31.605, 74.838],
      [31.622, 74.838],
      [31.622, 74.856],
      [31.605, 74.856],
    ],
    protectedName: "Ram Bagh ecological reserve",
    protectedLabel: "RAM BAGH ECOLOGICAL RESERVE",
    presets: {
      compliant: {
        label: "Compliant Parcel",
        sub: "Central Amritsar · Clear of veto layers",
        coords: [
          [31.635, 74.866],
          [31.637, 74.866],
          [31.637, 74.869],
          [31.635, 74.869],
        ],
      },
      flood: {
        label: "Alluvial Floodplain",
        sub: "Intersects Punjab flood plain",
        coords: [
          [31.630, 74.890],
          [31.633, 74.890],
          [31.633, 74.893],
          [31.630, 74.893],
        ],
      },
      protected: {
        label: "Ram Bagh Reserve",
        sub: "Intersects ecological reserve",
        coords: [
          [31.612, 74.844],
          [31.615, 74.844],
          [31.615, 74.847],
          [31.612, 74.847],
        ],
      },
    },
  },
  delhi: {
    cityName: "Delhi, India",
    center: [28.6250, 77.2400],
    zoom: 14,
    floodZone: [
      [28.618, 77.250],
      [28.648, 77.250],
      [28.648, 77.268],
      [28.618, 77.268],
    ],
    floodName: "Yamuna River 100-year flood zone",
    floodLabel: "YAMUNA 100-YEAR FLOODPLAIN",
    protectedZone: [
      [28.595, 77.210],
      [28.615, 77.210],
      [28.615, 77.228],
      [28.595, 77.228],
    ],
    protectedName: "Delhi Ridge protected ecological reserve",
    protectedLabel: "DELHI RIDGE ECOLOGICAL RESERVE",
    presets: {
      compliant: {
        label: "Compliant Parcel",
        sub: "Central Delhi · Clear of veto layers",
        coords: [
          [28.628, 77.232],
          [28.630, 77.232],
          [28.630, 77.234],
          [28.628, 77.234],
        ],
      },
      flood: {
        label: "Yamuna Floodplain Test",
        sub: "Intersects river flood zone",
        coords: [
          [28.628, 77.252],
          [28.630, 77.252],
          [28.630, 77.254],
          [28.628, 77.254],
        ],
      },
      protected: {
        label: "Delhi Ridge Forest Test",
        sub: "Intersects ecological reserve",
        coords: [
          [28.602, 77.214],
          [28.604, 77.214],
          [28.604, 77.216],
          [28.602, 77.216],
        ],
      },
    },
  },
  bengaluru: {
    cityName: "Bengaluru, India",
    center: [12.9716, 77.5946],
    zoom: 14,
    floodZone: [
      [12.930, 77.670],
      [12.960, 77.670],
      [12.960, 77.695],
      [12.930, 77.695],
    ],
    floodName: "Bellandur Catchment flood zone",
    floodLabel: "BELLANDUR BASIN FLOODPLAIN",
    protectedZone: [
      [12.870, 77.560],
      [12.900, 77.560],
      [12.900, 77.585],
      [12.870, 77.585],
    ],
    protectedName: "Bannerghatta Eco-Sensitive Buffer",
    protectedLabel: "BANNERGHATTA ECO-SENSITIVE ZONE",
    presets: {
      compliant: {
        label: "Compliant Parcel",
        sub: "Inner-City Core · Clear of veto layers",
        coords: [
          [12.974, 77.590],
          [12.976, 77.590],
          [12.976, 77.593],
          [12.974, 77.593],
        ],
      },
      flood: {
        label: "Lake Catchment Parcel",
        sub: "Intersects flood catchment",
        coords: [
          [12.940, 77.675],
          [12.943, 77.675],
          [12.943, 77.678],
          [12.940, 77.678],
        ],
      },
      protected: {
        label: "Eco-Sensitive Parcel",
        sub: "Intersects green reserve",
        coords: [
          [12.880, 77.565],
          [12.883, 77.565],
          [12.883, 77.568],
          [12.880, 77.568],
        ],
      },
    },
  },
  mumbai: {
    cityName: "Navi Mumbai, India",
    center: [19.0330, 73.0297],
    zoom: 14,
    floodZone: [
      [19.010, 73.040],
      [19.040, 73.040],
      [19.040, 73.065],
      [19.010, 73.065],
    ],
    floodName: "Coastal CRZ-I Tidal Floodplain",
    floodLabel: "COASTAL TIDAL INUNDATION ZONE",
    protectedZone: [
      [18.980, 73.000],
      [19.005, 73.000],
      [19.005, 73.020],
      [18.980, 73.020],
    ],
    protectedName: "Mangrove Conservation Reserve",
    protectedLabel: "MANGROVE CONSERVATION RESERVE",
    presets: {
      compliant: {
        label: "Compliant Parcel",
        sub: "Navi Mumbai Sector · Clear of veto layers",
        coords: [
          [19.035, 73.025],
          [19.037, 73.025],
          [19.037, 73.028],
          [19.035, 73.028],
        ],
      },
      flood: {
        label: "Tidal Inundation Parcel",
        sub: "Intersects coastal buffer",
        coords: [
          [19.020, 73.045],
          [19.023, 73.045],
          [19.023, 73.048],
          [19.020, 73.048],
        ],
      },
      protected: {
        label: "Mangrove Reserve Parcel",
        sub: "Intersects mangrove reserve",
        coords: [
          [18.990, 73.005],
          [18.993, 73.005],
          [18.993, 73.008],
          [18.990, 73.008],
        ],
      },
    },
  },
  chandigarh: {
    cityName: "Chandigarh, India",
    center: [30.7333, 76.7794],
    zoom: 14,
    floodZone: [
      [30.720, 76.800],
      [30.745, 76.800],
      [30.745, 76.820],
      [30.720, 76.820],
    ],
    floodName: "Sukhna Choe Seasonal Inundation Zone",
    floodLabel: "SUKHNA CHOE INUNDATION ZONE",
    protectedZone: [
      [30.750, 76.810],
      [30.770, 76.810],
      [30.770, 76.835],
      [30.750, 76.835],
    ],
    protectedName: "Sukhna Wildlife Sanctuary Reserve",
    protectedLabel: "SUKHNA WILDLIFE RESERVE",
    presets: {
      compliant: {
        label: "Compliant Parcel",
        sub: "Sector 17 Commercial Core · Clear",
        coords: [
          [30.735, 76.775],
          [30.737, 76.775],
          [30.737, 76.778],
          [30.735, 76.778],
        ],
      },
      flood: {
        label: "Choe Buffer Parcel",
        sub: "Intersects stream corridor",
        coords: [
          [30.725, 76.805],
          [30.728, 76.805],
          [30.728, 76.808],
          [30.725, 76.808],
        ],
      },
      protected: {
        label: "Wildlife Sanctuary Parcel",
        sub: "Intersects sanctuary buffer",
        coords: [
          [30.755, 76.815],
          [30.758, 76.815],
          [30.758, 76.818],
          [30.755, 76.818],
        ],
      },
    },
  },
};

function createDynamicConfig(cityName, lat, lng) {
  return {
    cityName: cityName,
    center: [lat, lng],
    zoom: 14,
    floodZone: [
      [lat - 0.008, lng + 0.010],
      [lat + 0.018, lng + 0.010],
      [lat + 0.018, lng + 0.025],
      [lat - 0.008, lng + 0.025],
    ],
    floodName: `${cityName} 100-year flood zone`,
    floodLabel: `${cityName.toUpperCase()} FLOODPLAIN BUFFER`,
    protectedZone: [
      [lat - 0.025, lng - 0.025],
      [lat - 0.008, lng - 0.025],
      [lat - 0.008, lng - 0.010],
      [lat - 0.025, lng - 0.010],
    ],
    protectedName: `${cityName} protected ecological reserve`,
    protectedLabel: `${cityName.toUpperCase()} ECOLOGICAL RESERVE`,
    presets: {
      compliant: {
        label: "Compliant Parcel",
        sub: `${cityName} Core · Clear of veto layers`,
        coords: [
          [lat + 0.002, lng - 0.003],
          [lat + 0.004, lng - 0.003],
          [lat + 0.004, lng - 0.001],
          [lat + 0.002, lng - 0.001],
        ],
      },
      flood: {
        label: "Floodplain Test",
        sub: "Intersects local flood zone",
        coords: [
          [lat + 0.005, lng + 0.012],
          [lat + 0.007, lng + 0.012],
          [lat + 0.007, lng + 0.015],
          [lat + 0.005, lng + 0.015],
        ],
      },
      protected: {
        label: "Ecological Reserve Test",
        sub: "Intersects ecological buffer",
        coords: [
          [lat - 0.015, lng - 0.018],
          [lat - 0.013, lng - 0.018],
          [lat - 0.013, lng - 0.015],
          [lat - 0.015, lng - 0.015],
        ],
      },
    },
  };
}

function resolveCityConfig(query) {
  if (!query || typeof query !== "string") return null;
  const q = query.toLowerCase().trim();
  if (q.includes("amritsar")) return CITY_CONFIGS.amritsar;
  if (q.includes("bengaluru") || q.includes("bangalore")) return CITY_CONFIGS.bengaluru;
  if (q.includes("mumbai") || q.includes("bombay")) return CITY_CONFIGS.mumbai;
  if (q.includes("chandigarh")) return CITY_CONFIGS.chandigarh;
  if (q.includes("delhi") || q.includes("new delhi") || q.includes("yamuna")) return CITY_CONFIGS.delhi;

  for (const [cityName, coords] of Object.entries(KNOWN_CITY_COORDINATES)) {
    if (q.includes(cityName)) {
      const formattedName = cityName.charAt(0).toUpperCase() + cityName.slice(1);
      return createDynamicConfig(formattedName, coords[0], coords[1]);
    }
  }

  return null;
}

async function geocodeLocation(query) {
  const local = resolveCityConfig(query);
  if (local) return local;

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
      headers: { "Accept-Language": "en" },
    });
    const data = await res.json();
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      const name = data[0].display_name ? data[0].display_name.split(",")[0] : query;
      return createDynamicConfig(name, lat, lon);
    }
  } catch (err) {
    console.warn("Geocoding lookup failed:", err);
  }
  return CITY_CONFIGS.delhi;
}

function toTurf(latlngs) {
  const ring = latlngs.map(([lat, lng]) => [lng, lat]);
  ring.push(ring[0]);
  return turf.polygon([ring]);
}

function validatePolygonWithConfig(latlngs, config) {
  return evaluateParcelComprehensiveHazards(latlngs, config);
}

export default function SiteValidationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { project, loadProject, updateProject } = useProject();

  const mapRef = useRef(null);
  const mapEl = useRef(null);
  const drawnRef = useRef(null);
  const overlaysGroupRef = useRef(null);

  const [activeConfig, setActiveConfig] = useState(CITY_CONFIGS.delhi);
  const activeConfigRef = useRef(CITY_CONFIGS.delhi);
  activeConfigRef.current = activeConfig;

  // Hazard overlays visibility (Hidden while user freely draws, revealed upon completion!)
  const [showHazardLayers, setShowHazardLayers] = useState(false);
  const showHazardLayersRef = useRef(false);
  showHazardLayersRef.current = showHazardLayers;

  // Konva Canvas Drawing Tool state
  const [isKonvaDrawing, setIsKonvaDrawing] = useState(false);
  const konvaContainerRef = useRef(null);
  const konvaStageRef = useRef(null);
  const konvaPointsRef = useRef([]);
  const [placedCount, setPlacedCount] = useState(0);

  const [result, setResult] = useState(null);
  const [label, setLabel] = useState(null);
  const [saving, setSaving] = useState(false);
  const [projName, setProjName] = useState("");
  const [projLocation, setProjLocation] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searching, setSearching] = useState(false);

  // Update Hazard Overlays (Blue Flood & Green Protected)
  const updateMapOverlays = useCallback((cfg, isVisible) => {
    const map = mapRef.current;
    if (!map || !overlaysGroupRef.current) return;
    overlaysGroupRef.current.clearLayers();

    if (!isVisible) return; // Hidden while user is drawing building footprint

    // City primary flood zone layer
    if (cfg?.floodZone) {
      const floodLayer = L.polygon(cfg.floodZone, {
        color: "#3b82f6",
        weight: 2,
        dashArray: "5,5",
        fillColor: "#3b82f6",
        fillOpacity: 0.22,
      }).bindTooltip(cfg.floodLabel || "100-YEAR FLOODPLAIN", { permanent: false });
      overlaysGroupRef.current.addLayer(floodLayer);
    }

    // City protected zone layer
    if (cfg?.protectedZone) {
      const protLayer = L.polygon(cfg.protectedZone, {
        color: "#22c55e",
        weight: 2,
        dashArray: "5,5",
        fillColor: "#22c55e",
        fillOpacity: 0.18,
      }).bindTooltip(cfg.protectedLabel || "ECOLOGICAL RESERVE", { permanent: false });
      overlaysGroupRef.current.addLayer(protLayer);
    }

    // Regional River Corridors & Floodplains (Beas, Ravi, Sutlej, Yamuna, etc.) - detailed set
    REGIONAL_RIVER_HAZARDS.forEach((hazard) => {
      if (hazard.coords) {
        const riverLayer = L.polygon(hazard.coords, {
          color: hazard.color || "#0284c7",
          weight: 2,
          dashArray: "6,4",
          fillColor: hazard.color || "#0284c7",
          fillOpacity: 0.22,
        }).bindTooltip(hazard.label, { permanent: false });
        overlaysGroupRef.current.addLayer(riverLayer);
      }
    });

    // Pan-India CWC National River Corridors (Ganga, Brahmaputra, Godavari, Krishna, Kaveri, etc.)
    ALL_RIVER_HAZARD_CORRIDORS.forEach((hazard) => {
      if (hazard.coords) {
        const riverLayer = L.polygon(hazard.coords, {
          color: "#0ea5e9",
          weight: 1.5,
          dashArray: "8,5",
          fillColor: "#0ea5e9",
          fillOpacity: 0.14,
        }).bindTooltip(
          `<b>${hazard.name}</b><br/><span style="font-size:11px;color:#94a3b8">${hazard.legalRef || ""}</span>`,
          { permanent: false }
        );
        overlaysGroupRef.current.addLayer(riverLayer);
      }

      // Also render centerline HFL buffer as a subtle line if available
      if (hazard.centerline && hazard.centerline.length >= 2) {
        const centerlineLayer = L.polyline(hazard.centerline, {
          color: "#38bdf8",
          weight: 1.5,
          opacity: 0.5,
          dashArray: "4,6",
        }).bindTooltip(`${hazard.river || hazard.name} — River Centerline (HFL Buffer: ${hazard.bufferKm || 1}km)`, { permanent: false });
        overlaysGroupRef.current.addLayer(centerlineLayer);
      }
    });
  }, []);

  const renderPolygon = useCallback((latlngs, res) => {
    const map = mapRef.current;
    if (!map || !drawnRef.current) return;
    drawnRef.current.clearLayers();
    const color = res.status === "veto" ? "#ef4444" : "#22c55e";
    const layer = L.polygon(latlngs, {
      color,
      weight: 2.5,
      fillOpacity: 0.2,
      fillColor: color,
    });
    drawnRef.current.addLayer(layer);
    map.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 16 });
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (mapRef.current || !mapEl.current) return;

    const initialCenter = activeConfigRef.current.center;
    const map = L.map(mapEl.current, { center: initialCenter, zoom: 14, zoomControl: true });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    const overlaysGroup = new L.FeatureGroup();
    map.addLayer(overlaysGroup);
    overlaysGroupRef.current = overlaysGroup;

    // By default, keep hazard layers hidden until building is drawn
    updateMapOverlays(activeConfigRef.current, showHazardLayersRef.current);

    const drawn = new L.FeatureGroup();
    map.addLayer(drawn);
    drawnRef.current = drawn;

    const drawControl = new L.Control.Draw({
      draw: {
        polygon: { shapeOptions: { color: "#fafafa", weight: 2 }, allowIntersection: false, showArea: false },
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false,
      },
      edit: false,
    });
    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, (e) => {
      const latlngs = e.layer.getLatLngs()[0].map((p) => [p.lat, p.lng]);
      const res = validatePolygonWithConfig(latlngs, activeConfigRef.current);
      setResult(res);
      setLabel("Custom Drawn Parcel");
      renderPolygon(latlngs, res);
      persist(latlngs, res, "Custom Drawn Parcel");

      // Reveal hazard overlays upon polygon completion
      setShowHazardLayers(true);
      updateMapOverlays(activeConfigRef.current, true);
    });

    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line
  }, [updateMapOverlays]);

  // Load project & automatically center map to project's location
  useEffect(() => {
    loadProject(id)
      .then(async (p) => {
        if (!p) return;
        setProjName(p.name || "");
        const loc = p.location || "";
        setProjLocation(loc);
        setSearchInput(loc);

        // Auto-detect and configure coordinates from project's location
        let cfg = CITY_CONFIGS.delhi;
        if (loc) {
          cfg = await geocodeLocation(loc);
        }
        setActiveConfig(cfg);
        activeConfigRef.current = cfg;

        const hasSavedPolygon = Boolean(p.site?.polygon);
        setShowHazardLayers(hasSavedPolygon);

        const map = mapRef.current;
        if (map) {
          updateMapOverlays(cfg, hasSavedPolygon);
          if (!hasSavedPolygon) {
            map.setView(cfg.center, cfg.zoom || 14);
          }
        }

        if (hasSavedPolygon) {
          const evaluatedRes = evaluateParcelComprehensiveHazards(p.site.polygon, cfg);
          setResult(evaluatedRes);
          setLabel(p.site.label || "Custom Drawn Building");
          if (evaluatedRes.status !== p.site.status || evaluatedRes.veto_reason !== p.site.veto_reason) {
            updateProject(id, {
              site: {
                ...p.site,
                status: evaluatedRes.status,
                veto_reason: evaluatedRes.veto_reason,
              },
            });
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load project:", err);
      });
  }, [id, loadProject, updateMapOverlays]);

  // Draw existing polygon if present
  useEffect(() => {
    if (mapRef.current && project?.site?.polygon && drawnRef.current && drawnRef.current.getLayers().length === 0) {
      const res = {
        status: project.site.status,
        veto_reason: project.site.veto_reason,
        area_m2: project.site.area_m2,
        perimeter_m: project.site.perimeter_m,
      };
      renderPolygon(project.site.polygon, res);
    }
  }, [project, renderPolygon]);

  const persist = async (latlngs, res, lbl) => {
    setSaving(true);
    await updateProject(id, {
      site: {
        polygon: latlngs,
        status: res.status,
        area_m2: res.area_m2,
        perimeter_m: res.perimeter_m,
        veto_reason: res.veto_reason,
        label: lbl,
      },
    });
    setSaving(false);
    if (res.status === "veto") toast.error("HARD VETO — site conflicts with environmental hazard zone");
    else toast.success("Site approved — parcel clears environmental hazard layers");
  };

  const applyPreset = (key) => {
    const preset = activeConfig.presets[key];
    if (!preset) return;
    const res = validatePolygonWithConfig(preset.coords, activeConfig);
    setResult(res);
    setLabel(preset.label);
    renderPolygon(preset.coords, res);
    persist(preset.coords, res, preset.label);

    // Reveal hazard overlays so user sees why preset passes or vetoes
    setShowHazardLayers(true);
    updateMapOverlays(activeConfig, true);
  };

  const clear = async () => {
    drawnRef.current?.clearLayers();
    setResult(null);
    setLabel(null);
    setShowHazardLayers(false);
    updateMapOverlays(activeConfig, false);
    await updateProject(id, {
      site: { polygon: null, status: "pending", area_m2: 0, perimeter_m: 0, veto_reason: null, label: null },
    });
    toast.info("Cleared parcel. Draw a new building location.");
  };

  const handleLocationSearch = async (locQuery) => {
    if (!locQuery || !locQuery.trim()) return;
    setSearching(true);
    try {
      const cfg = await geocodeLocation(locQuery.trim());
      setActiveConfig(cfg);
      activeConfigRef.current = cfg;
      updateMapOverlays(cfg, showHazardLayers);

      const map = mapRef.current;
      if (map) {
        map.flyTo(cfg.center, cfg.zoom || 14, { duration: 1.2 });
      }
      toast.success(`Map centered to ${cfg.cityName}`);
    } catch (e) {
      toast.error("Could not find location");
    } finally {
      setSearching(false);
    }
  };

  const handleSyncLocationToProject = async () => {
    await updateProject(id, { location: activeConfig.cityName });
    setProjLocation(activeConfig.cityName);
    toast.success(`Updated project location to ${activeConfig.cityName}`);
  };

  // Toggle Hazard Overlays manually
  const toggleHazardLayers = () => {
    const next = !showHazardLayers;
    setShowHazardLayers(next);
    updateMapOverlays(activeConfig, next);
    if (next) toast.info("Environmental hazard layers enabled (Flood & Protected zones visible)");
    else toast.info("Environmental hazard layers hidden");
  };

  // -------------------------------------------------------------
  // Konva Interactive Polygon Building Drawer
  // -------------------------------------------------------------
  const startKonvaDrawing = () => {
    setIsKonvaDrawing(true);
    // Hide hazard layers while actively planning/drawing to keep canvas clean
    setShowHazardLayers(false);
    updateMapOverlays(activeConfig, false);
    toast.info("Building Drawing Mode: Click on the map to place building corners", {
      description: "Click the starting point or double-click when finished.",
    });
  };

  const cancelKonvaDrawing = () => {
    setIsKonvaDrawing(false);
    konvaPointsRef.current = [];
    setPlacedCount(0);
    toast.info("Building drawing canceled");
  };

  const undoLastKonvaPoint = () => {
    if (konvaPointsRef.current.length > 0) {
      konvaPointsRef.current.pop();
      setPlacedCount(konvaPointsRef.current.length);
      // Trigger redraw in stage if active
      if (konvaStageRef.current?._customRedraw) {
        konvaStageRef.current._customRedraw();
      }
    }
  };

  const finishKonvaPolygon = useCallback(() => {
    const pts = konvaPointsRef.current;
    if (pts.length < 3) {
      toast.error("Place at least 3 points to complete a building boundary");
      return;
    }
    const map = mapRef.current;
    if (!map) return;

    const latlngs = pts.map((p) => [p.lat, p.lng]);
    const res = validatePolygonWithConfig(latlngs, activeConfigRef.current);
    setResult(res);
    setLabel("Custom Drawn Building");
    renderPolygon(latlngs, res);
    persist(latlngs, res, "Custom Drawn Building");

    // REVEAL ENVIRONMENTAL HAZARD OVERLAYS NOW!
    setShowHazardLayers(true);
    updateMapOverlays(activeConfigRef.current, true);

    setIsKonvaDrawing(false);
    konvaPointsRef.current = [];
    setPlacedCount(0);

    toast.success("Building footprint defined! Environmental hazard layers revealed.");
  }, [renderPolygon, updateMapOverlays]);

  // Mount Konva Stage when drawing mode is active
  useEffect(() => {
    if (!isKonvaDrawing || !konvaContainerRef.current || !mapRef.current) return;
    const map = mapRef.current;
    const container = konvaContainerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 540;

    // Disable map interaction during precision drawing
    map.dragging.disable();
    map.touchZoom?.disable();
    map.doubleClickZoom?.disable();
    map.scrollWheelZoom?.disable();

    const stage = new Konva.Stage({
      container,
      width,
      height,
    });
    konvaStageRef.current = stage;

    const layer = new Konva.Layer();
    stage.add(layer);

    // Interactive backdrop
    const bgRect = new Konva.Rect({
      x: 0,
      y: 0,
      width,
      height,
      fill: "rgba(0, 0, 0, 0.08)",
    });
    layer.add(bgRect);

    // In-progress polygon
    const polyLine = new Konva.Line({
      points: [],
      stroke: "#38bdf8",
      strokeWidth: 2.5,
      dash: [6, 4],
      closed: false,
      fill: "rgba(56, 189, 248, 0.18)",
    });
    layer.add(polyLine);

    // Rubberband line to mouse
    const rubberband = new Konva.Line({
      points: [],
      stroke: "#94a3b8",
      strokeWidth: 1.5,
      dash: [4, 4],
    });
    layer.add(rubberband);

    // Dimension metric text on active edge
    const measureText = new Konva.Text({
      text: "",
      fontSize: 11,
      fontFamily: "monospace",
      fill: "#38bdf8",
      padding: 3,
    });
    layer.add(measureText);

    // Cursor tip
    const cursorGuide = new Konva.Text({
      text: "Click to place starting vertex of building",
      fontSize: 11,
      fontFamily: "monospace",
      fill: "#fafafa",
    });
    layer.add(cursorGuide);

    const verticesGroup = new Konva.Group();
    layer.add(verticesGroup);

    const points = konvaPointsRef.current;

    const redraw = (currentPointer) => {
      const flatPts = [];
      points.forEach((p) => {
        flatPts.push(p.x, p.y);
      });
      polyLine.points(flatPts);

      verticesGroup.destroyChildren();
      points.forEach((p, idx) => {
        const isStart = idx === 0;
        const circle = new Konva.Circle({
          x: p.x,
          y: p.y,
          radius: isStart ? 7 : 5,
          fill: isStart ? "#38bdf8" : "#ffffff",
          stroke: "#0284c7",
          strokeWidth: 2,
        });
        verticesGroup.add(circle);

        const num = new Konva.Text({
          x: p.x + 8,
          y: p.y - 12,
          text: `${idx + 1}`,
          fontSize: 10,
          fontFamily: "monospace",
          fill: "#e2e8f0",
        });
        verticesGroup.add(num);
      });

      if (points.length > 0 && currentPointer) {
        const last = points[points.length - 1];
        let targetX = currentPointer.x;
        let targetY = currentPointer.y;

        let isSnapped = false;
        if (points.length >= 3) {
          const start = points[0];
          const distToStart = Math.hypot(currentPointer.x - start.x, currentPointer.y - start.y);
          if (distToStart < 22) {
            targetX = start.x;
            targetY = start.y;
            isSnapped = true;
          }
        }

        rubberband.points([last.x, last.y, targetX, targetY]);
        rubberband.visible(true);

        const lastLatLng = L.latLng(last.lat, last.lng);
        const currLatLng = map.containerPointToLatLng(L.point(targetX, targetY));
        const distMeters = Math.round(map.distance(lastLatLng, currLatLng));

        measureText.text(`${distMeters} m`);
        measureText.x((last.x + targetX) / 2 + 8);
        measureText.y((last.y + targetY) / 2 - 16);
        measureText.visible(true);

        if (isSnapped) {
          cursorGuide.text("Snap to Start • Click to complete & reveal hazard analysis");
        } else if (points.length < 3) {
          cursorGuide.text(`Corner #${points.length + 1} • Click to place point`);
        } else {
          cursorGuide.text(`Corner #${points.length + 1} • Click point 1 or double-click to finish`);
        }
        cursorGuide.x(Math.min(currentPointer.x + 15, width - 280));
        cursorGuide.y(Math.max(currentPointer.y - 25, 12));
        cursorGuide.visible(true);
      } else {
        rubberband.visible(false);
        measureText.visible(false);
        if (currentPointer) {
          cursorGuide.text("Click to place starting vertex of building");
          cursorGuide.x(Math.min(currentPointer.x + 15, width - 280));
          cursorGuide.y(Math.max(currentPointer.y - 25, 12));
          cursorGuide.visible(true);
        }
      }

      layer.batchDraw();
    };

    stage._customRedraw = () => redraw(stage.getPointerPosition());

    const handlePointerMove = () => {
      const pos = stage.getPointerPosition();
      if (pos) redraw(pos);
    };

    const handlePointerDown = () => {
      const pos = stage.getPointerPosition();
      if (!pos) return;

      if (points.length >= 3) {
        const start = points[0];
        const dist = Math.hypot(pos.x - start.x, pos.y - start.y);
        if (dist < 22) {
          finishKonvaPolygon();
          return;
        }
      }

      const latlng = map.containerPointToLatLng(L.point(pos.x, pos.y));
      points.push({
        x: pos.x,
        y: pos.y,
        lat: latlng.lat,
        lng: latlng.lng,
      });
      setPlacedCount(points.length);
      redraw(pos);
    };

    const handleDblClick = () => {
      if (points.length >= 3) {
        finishKonvaPolygon();
      }
    };

    stage.on("pointermove", handlePointerMove);
    stage.on("pointerdown", handlePointerDown);
    stage.on("dblclick", handleDblClick);

    return () => {
      stage.destroy();
      konvaStageRef.current = null;
      map.dragging.enable();
      map.touchZoom?.enable();
      map.doubleClickZoom?.enable();
      map.scrollWheelZoom?.enable();
    };
  }, [isKonvaDrawing, finishKonvaPolygon]);

  const approved = result?.status === "approved";
  const footprint = result ? Math.round(result.area_m2 * 0.4) : 0;

  return (
    <div className="min-h-screen bg-[#09090b]">
      <HeaderNav projectId={id} activeStep="site" />
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-1 flex items-center gap-2">
              <MapPin className="w-3 h-3 text-zinc-400" /> {projName} {projLocation ? `· ${projLocation}` : ""}
            </p>
            <h1 className="font-display font-black text-3xl sm:text-4xl tracking-tight text-zinc-100 uppercase">
              Site Validation
            </h1>
            <p className="text-zinc-500 text-sm mt-1 max-w-2xl">
              Draw your building parcel with Konva precision tools. Environmental hazard overlays reveal automatically
              upon completion to detect flood and ecological risk conflicts.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Map Area */}
          <div className="lg:col-span-2 border border-zinc-800 flex flex-col">
            {/* Location & Search Controls Bar */}
            <div className="px-4 py-2.5 bg-[#121215] border-b border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 font-mono text-xs text-zinc-400">
                  <MapPin className="w-3.5 h-3.5 text-zinc-200" />
                  <span className="text-zinc-500">Active Area:</span>
                  <span className="text-zinc-200 font-semibold">{activeConfig.cityName}</span>
                </span>
                {projLocation && projLocation.toLowerCase() !== activeConfig.cityName.toLowerCase() && (
                  <button
                    onClick={handleSyncLocationToProject}
                    className="text-[11px] font-mono text-amber-400 hover:text-amber-300 underline ml-1"
                    title="Update project location in database"
                  >
                    Sync with project
                  </button>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLocationSearch(searchInput);
                }}
                className="flex items-center gap-1.5 w-full sm:w-auto"
              >
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search city, area or coordinates (e.g. Amritsar)..."
                    className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-500 outline-none pl-8 pr-2 py-1.5 text-xs text-zinc-200 font-mono placeholder:text-zinc-600"
                    data-testid="map-location-search-input"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching}
                  data-testid="map-location-search-btn"
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 font-mono text-xs transition-colors flex items-center gap-1 shrink-0"
                >
                  {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : "Locate"}
                </button>
              </form>
            </div>

            {/* Quick jump city chips */}
            <div className="flex items-center gap-2 px-4 py-2 bg-[#0e0e11] border-b border-zinc-800 text-[11px] font-mono overflow-x-auto">
              <span className="text-zinc-500 shrink-0">Quick jump:</span>
              {["Amritsar", "Delhi", "Bengaluru", "Mumbai", "Chandigarh"].map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    setSearchInput(city);
                    handleLocationSearch(city);
                  }}
                  className={`px-2 py-0.5 border transition-colors shrink-0 ${
                    activeConfig.cityName.toLowerCase().includes(city.toLowerCase())
                      ? "border-zinc-400 text-zinc-100 bg-zinc-800/80"
                      : "border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>

            {/* Toolbar: Drawing Tools & Hazard Layer Toggle */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-[#0e0e11] flex-wrap gap-2">
              <div className="flex items-center gap-3">
                {/* Primary Konva Draw Tool Button */}
                <button
                  type="button"
                  onClick={isKonvaDrawing ? cancelKonvaDrawing : startKonvaDrawing}
                  data-testid="konva-draw-btn"
                  className={`flex items-center gap-1.5 text-xs font-mono font-medium px-3 py-1.5 transition-colors border ${
                    isKonvaDrawing
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                      : "bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border-sky-500/30 hover:border-sky-500/60"
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  {isKonvaDrawing ? "Cancel Drawing" : "Draw Building Parcel (Konva)"}
                </button>

                {/* Environmental Hazard Overlays Toggle */}
                <button
                  type="button"
                  onClick={toggleHazardLayers}
                  className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 transition-colors border ${
                    showHazardLayers
                      ? "text-zinc-300 border-zinc-700 bg-zinc-800/60"
                      : "text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700"
                  }`}
                  title="Toggle visibility of flood and ecological hazard zones"
                >
                  {showHazardLayers ? <Eye className="w-3.5 h-3.5 text-blue-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>Hazard Zones: {showHazardLayers ? "Revealed" : "Hidden"}</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                {/* Status indicator */}
                {showHazardLayers ? (
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <span className="flex items-center gap-1 text-blue-400">
                      <Waves className="w-3 h-3" /> Flood Zone
                    </span>
                    <span className="flex items-center gap-1 text-green-400">
                      <Leaf className="w-3 h-3" /> Protected
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400/80" /> Risk layers reveal after drawing
                  </span>
                )}

                <button
                  onClick={clear}
                  data-testid="clear-polygon-btn"
                  className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-500/40 px-2.5 py-1.5 transition-colors"
                >
                  <Eraser className="w-3.5 h-3.5" /> Clear
                </button>
              </div>
            </div>

            {/* Map Canvas with Konva Overlay */}
            <div className="relative" style={{ height: 560, width: "100%" }}>
              {/* Leaflet Map */}
              <div ref={mapEl} data-testid="site-map" className="w-full h-full" />

              {/* Konva Interactive Precision Drawing Stage */}
              {isKonvaDrawing && (
                <div
                  ref={konvaContainerRef}
                  className="absolute inset-0 z-[1000] cursor-crosshair select-none"
                  data-testid="konva-drawing-overlay"
                />
              )}

              {/* Floating Action Bar when Konva Drawing is Active */}
              {isKonvaDrawing && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1050] bg-[#121215]/95 border border-sky-500/50 backdrop-blur px-4 py-2 flex items-center gap-3 text-xs font-mono shadow-2xl">
                  <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
                    <PenTool className="w-3.5 h-3.5 animate-pulse" />
                    <span>{placedCount} corners placed</span>
                  </span>

                  <span className="text-zinc-600">|</span>

                  <button
                    type="button"
                    onClick={undoLastKonvaPoint}
                    disabled={placedCount === 0}
                    className="flex items-center gap-1 text-zinc-400 hover:text-zinc-100 disabled:opacity-40 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Undo
                  </button>

                  <button
                    type="button"
                    onClick={finishKonvaPolygon}
                    disabled={placedCount < 3}
                    data-testid="complete-konva-polygon-btn"
                    className="flex items-center gap-1 bg-sky-500 hover:bg-sky-400 text-black font-semibold px-2.5 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Check className="w-3.5 h-3.5" /> Complete Boundary
                  </button>

                  <button
                    type="button"
                    onClick={cancelKonvaDrawing}
                    className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Controls & Metrics Panel */}
          <div className="space-y-4">
            <div className="border border-zinc-800 p-4">
              <p className="eyebrow mb-1">Sample parcels</p>
              <p className="text-[11px] font-mono text-zinc-500 mb-3">Contextual presets for {activeConfig.cityName}:</p>
              <div className="space-y-2">
                <PresetBtn
                  onClick={() => applyPreset("compliant")}
                  testid="preset-compliant"
                  tone="green"
                  label={activeConfig.presets.compliant.label}
                  sub={activeConfig.presets.compliant.sub}
                />
                <PresetBtn
                  onClick={() => applyPreset("flood")}
                  testid="preset-flood"
                  tone="red"
                  label={activeConfig.presets.flood.label}
                  sub={activeConfig.presets.flood.sub}
                />
                <PresetBtn
                  onClick={() => applyPreset("protected")}
                  testid="preset-protected"
                  tone="red"
                  label={activeConfig.presets.protected.label}
                  sub={activeConfig.presets.protected.sub}
                />
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

            {/* Verdict Banner */}
            {result && (
              <div
                data-testid="validation-banner"
                className={`border p-5 fadeup ${
                  approved ? "border-green-500/40 bg-green-500/10" : "border-red-500/50 bg-red-500/10"
                }`}
              >
                <div className="flex items-start gap-3">
                  {approved ? (
                    <ShieldCheck className="w-6 h-6 text-green-400 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-6 h-6 text-red-400 shrink-0" />
                  )}
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
                      <p className="text-[11px] font-mono text-red-300/80 mt-2">
                        Ref: Municipal Bylaw MB-22.7 (2022-09-05) / CWC Flood Atlas
                      </p>
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
                approved
                  ? "bg-zinc-100 text-black hover:bg-white"
                  : "bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800"
              }`}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Proceed to Design & Costing <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            {!approved && result && (
              <p className="text-center text-[11px] font-mono text-red-400">
                Progression blocked until a compliant site is selected.
              </p>
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
    <button
      onClick={onClick}
      data-testid={testid}
      className="w-full flex items-center gap-3 border border-zinc-800 hover:border-zinc-500 px-3 py-2.5 text-left transition-colors"
    >
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
      <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span className="eyebrow">{label}</span>
      </div>
      <div className="font-display font-bold text-lg text-zinc-100">{value}</div>
    </div>
  );
}
