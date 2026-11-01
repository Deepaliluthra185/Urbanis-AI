import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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
  Layers,
  Maximize2,
  Minimize2,
  BoxSelect,
  Edit3,
  MousePointer,
  Crosshair,
  Compass,
  Plus,
  Minus,
  Navigation,
} from "lucide-react";
import { toast } from "sonner";
import { KNOWN_CITY_COORDINATES } from "../data/indianLocations";
import {
  evaluateParcelComprehensiveHazards,
  REGIONAL_RIVER_HAZARDS,
  ALL_RIVER_HAZARD_CORRIDORS,
} from "../data/riverHazardZones";

// High-performance basemaps with complete road labels and zero tile-drop
const BASEMAPS = {
  satellite: {
    id: "satellite",
    name: "Satellite (Hybrid)",
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    options: {
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      maxNativeZoom: 20,
      maxZoom: 22,
      attribution: "&copy; Google Satellite & Hybrid (Roads & Places)",
    },
  },
  street: {
    id: "street",
    name: "Street Map",
    url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    options: {
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      maxNativeZoom: 20,
      maxZoom: 22,
      attribution: "&copy; Google Maps Roads & Places",
    },
  },
  dark: {
    id: "dark",
    name: "Dark GIS",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    options: {
      maxNativeZoom: 16,
      maxZoom: 22,
      attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
    },
  },
};

// Pre-configured geographic zones & deterministic regulatory presets
const CITY_CONFIGS = {
  amritsar: {
    cityName: "Amritsar, Punjab",
    center: [31.634, 74.8723],
    zoom: 14,
    floodZone: [
      [31.625, 74.885],
      [31.65, 74.885],
      [31.65, 74.912],
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
          [31.63, 74.89],
          [31.633, 74.89],
          [31.633, 74.893],
          [31.63, 74.893],
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
    center: [28.625, 77.24],
    zoom: 14,
    floodZone: [
      [28.618, 77.25],
      [28.648, 77.25],
      [28.648, 77.268],
      [28.618, 77.268],
    ],
    floodName: "Yamuna River 100-year flood zone",
    floodLabel: "YAMUNA 100-YEAR FLOODPLAIN",
    protectedZone: [
      [28.595, 77.21],
      [28.615, 77.21],
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
          [28.63, 77.232],
          [28.63, 77.234],
          [28.628, 77.234],
        ],
      },
      flood: {
        label: "Yamuna Floodplain Test",
        sub: "Intersects river flood zone",
        coords: [
          [28.628, 77.252],
          [28.63, 77.252],
          [28.63, 77.254],
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
      [12.94, 77.62],
      [12.97, 77.62],
      [12.97, 77.65],
      [12.94, 77.65],
    ],
    floodName: "Bellandur Lake Inundation & Stormwater Buffer",
    floodLabel: "BELLANDUR BASIN INUNDATION ZONE",
    protectedZone: [
      [12.95, 77.58],
      [12.97, 77.58],
      [12.97, 77.605],
      [12.95, 77.605],
    ],
    protectedName: "Lalbagh Botanical Protected Core",
    protectedLabel: "LALBAGH ECOLOGICAL CORE",
    presets: {
      compliant: {
        label: "Compliant Parcel",
        sub: "CBD Area · Clear of lake buffer",
        coords: [
          [12.975, 77.592],
          [12.977, 77.592],
          [12.977, 77.595],
          [12.975, 77.595],
        ],
      },
      flood: {
        label: "Bellandur Wetland Parcel",
        sub: "Intersects lake buffer zone",
        coords: [
          [12.945, 77.625],
          [12.948, 77.625],
          [12.948, 77.628],
          [12.945, 77.628],
        ],
      },
      protected: {
        label: "Botanical Reserve Parcel",
        sub: "Intersects Lalbagh buffer",
        coords: [
          [12.955, 77.585],
          [12.958, 77.585],
          [12.958, 77.588],
          [12.955, 77.588],
        ],
      },
    },
  },
  mumbai: {
    cityName: "Navi Mumbai, India",
    center: [19.033, 73.0297],
    zoom: 14,
    floodZone: [
      [19.01, 73.04],
      [19.04, 73.04],
      [19.04, 73.065],
      [19.01, 73.065],
    ],
    floodName: "Coastal CRZ-I Tidal Floodplain",
    floodLabel: "COASTAL TIDAL INUNDATION ZONE",
    protectedZone: [
      [18.98, 73.0],
      [19.005, 73.0],
      [19.005, 73.02],
      [18.98, 73.02],
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
          [19.02, 73.045],
          [19.023, 73.045],
          [19.023, 73.048],
          [19.02, 73.048],
        ],
      },
      protected: {
        label: "Mangrove Reserve Parcel",
        sub: "Intersects mangrove reserve",
        coords: [
          [18.99, 73.005],
          [18.993, 73.005],
          [18.993, 73.008],
          [18.99, 73.008],
        ],
      },
    },
  },
  chandigarh: {
    cityName: "Chandigarh, India",
    center: [30.7333, 76.7794],
    zoom: 14,
    floodZone: [
      [30.72, 76.8],
      [30.745, 76.8],
      [30.745, 76.82],
      [30.72, 76.82],
    ],
    floodName: "Sukhna Choe Seasonal Inundation Zone",
    floodLabel: "SUKHNA CHOE INUNDATION ZONE",
    protectedZone: [
      [30.75, 76.81],
      [30.77, 76.81],
      [30.77, 76.835],
      [30.75, 76.835],
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
      [lat - 0.008, lng + 0.01],
      [lat + 0.018, lng + 0.01],
      [lat + 0.018, lng + 0.025],
      [lat - 0.008, lng + 0.025],
    ],
    floodName: `${cityName} 100-year flood zone`,
    floodLabel: `${cityName.toUpperCase()} FLOODPLAIN BUFFER`,
    protectedZone: [
      [lat - 0.025, lng - 0.025],
      [lat - 0.008, lng - 0.025],
      [lat - 0.008, lng - 0.01],
      [lat - 0.025, lng - 0.01],
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
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      {
        headers: { "Accept-Language": "en" },
      }
    );
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

function validatePolygonWithConfig(latlngs, config) {
  return evaluateParcelComprehensiveHazards(latlngs, config);
}

// Format area into user-selected unit
function formatArea(areaM2, unit = "m2") {
  if (!areaM2) return "0 m²";
  if (unit === "sqft") {
    const sqft = Math.round(areaM2 * 10.7639);
    return `${sqft.toLocaleString()} sq ft`;
  }
  if (unit === "acres") {
    const acres = (areaM2 * 0.000247105).toFixed(2);
    return `${acres} acres`;
  }
  return `${areaM2.toLocaleString()} m²`;
}

export default function SiteValidationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { project, loadProject, updateProject } = useProject();

  const mapRef = useRef(null);
  const mapEl = useRef(null);
  const tileLayerRef = useRef(null);
  const drawnRef = useRef(null);
  const overlaysGroupRef = useRef(null);
  const drawLayerRef = useRef(null);
  const editMarkersRef = useRef(null);
  const sharedCanvasRendererRef = useRef(null);

  const [activeConfig, setActiveConfig] = useState(CITY_CONFIGS.delhi);
  const activeConfigRef = useRef(CITY_CONFIGS.delhi);
  activeConfigRef.current = activeConfig;

  // Map Basemap & Layer Visibilities
  const [activeBasemap, setActiveBasemap] = useState("satellite");
  const [showHazardLayers, setShowHazardLayers] = useState(false);
  const showHazardLayersRef = useRef(false);
  showHazardLayersRef.current = showHazardLayers;

  const [showFlood, setShowFlood] = useState(true);
  const [showProtected, setShowProtected] = useState(true);
  const [mapHeightExpanded, setMapHeightExpanded] = useState(false);
  const [areaUnit, setAreaUnit] = useState("m2"); // "m2" | "sqft" | "acres"

  // Drawing Tools State
  // "none" | "polygon" | "rectangle" | "edit"
  const [drawTool, setDrawTool] = useState("none");
  const drawToolRef = useRef("none");
  drawToolRef.current = drawTool;

  const [drawPoints, setDrawPoints] = useState([]);
  const drawPointsRef = useRef([]);
  drawPointsRef.current = drawPoints;

  const [rectStartPoint, setRectStartPoint] = useState(null);
  const rectStartPointRef = useRef(null);
  rectStartPointRef.current = rectStartPoint;

  const [currentParcelCoords, setCurrentParcelCoords] = useState(null);
  const currentParcelCoordsRef = useRef(null);
  currentParcelCoordsRef.current = currentParcelCoords;

  const [liveCursorInfo, setLiveCursorInfo] = useState(null);
  const [mouseCoords, setMouseCoords] = useState({ lat: 28.625, lng: 77.24, zoom: 14 });

  const [result, setResult] = useState(null);
  const [label, setLabel] = useState(null);
  const [saving, setSaving] = useState(false);
  const [projName, setProjName] = useState("");
  const [projLocation, setProjLocation] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searching, setSearching] = useState(false);

  // Backward compatibility alias for testids
  const isKonvaDrawing = drawTool === "polygon" || drawTool === "rectangle";
  const placedCount = drawPoints.length;

  // -------------------------------------------------------------
  // Basemap Switcher
  // -------------------------------------------------------------
  const switchBasemap = useCallback((basemapKey) => {
    const map = mapRef.current;
    if (!map) return;
    const basemapDef = BASEMAPS[basemapKey] || BASEMAPS.satellite;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const newTileLayer = L.tileLayer(basemapDef.url, {
      ...basemapDef.options,
      maxNativeZoom: basemapDef.options.maxNativeZoom || 19,
      maxZoom: 22,
      keepBuffer: 8,
      updateWhenIdle: false,
      updateWhenZooming: true,
      updateInterval: 60,
    }).addTo(map);

    newTileLayer.bringToBack();
    tileLayerRef.current = newTileLayer;
    setActiveBasemap(basemapKey);
  }, []);

  // -------------------------------------------------------------
  // Render Hazard Overlays using ultra-fast Hardware-Accelerated Canvas
  // -------------------------------------------------------------
  const updateMapOverlays = useCallback(
    (cfg, isVisible) => {
      const map = mapRef.current;
      if (!map || !overlaysGroupRef.current) return;
      overlaysGroupRef.current.clearLayers();

      if (!isVisible) return;

      const renderer = sharedCanvasRendererRef.current;

      // City primary flood zone layer
      if (cfg?.floodZone && showFlood) {
        const floodLayer = L.polygon(cfg.floodZone, {
          color: "#38bdf8",
          weight: 2,
          dashArray: "5,5",
          fillColor: "#0284c7",
          fillOpacity: 0.22,
          renderer,
        }).bindTooltip(cfg.floodLabel || "100-YEAR FLOODPLAIN", { permanent: false, direction: "top" });
        overlaysGroupRef.current.addLayer(floodLayer);
      }

      // City protected zone layer
      if (cfg?.protectedZone && showProtected) {
        const protLayer = L.polygon(cfg.protectedZone, {
          color: "#22c55e",
          weight: 2,
          dashArray: "5,5",
          fillColor: "#16a34a",
          fillOpacity: 0.2,
          renderer,
        }).bindTooltip(cfg.protectedLabel || "ECOLOGICAL RESERVE", { permanent: false, direction: "top" });
        overlaysGroupRef.current.addLayer(protLayer);
      }

      // Regional River Corridors & Floodplains
      if (showFlood) {
        REGIONAL_RIVER_HAZARDS.forEach((hazard) => {
          if (hazard.coords) {
            const riverLayer = L.polygon(hazard.coords, {
              color: hazard.color || "#0ea5e9",
              weight: 2,
              dashArray: "6,4",
              fillColor: hazard.color || "#0ea5e9",
              fillOpacity: 0.2,
              renderer,
            }).bindTooltip(hazard.label, { permanent: false, direction: "top" });
            overlaysGroupRef.current.addLayer(riverLayer);
          }
        });

        // Pan-India CWC National River Corridors
        ALL_RIVER_HAZARD_CORRIDORS.forEach((hazard) => {
          if (hazard.coords) {
            const riverLayer = L.polygon(hazard.coords, {
              color: "#38bdf8",
              weight: 1.5,
              dashArray: "8,5",
              fillColor: "#0284c7",
              fillOpacity: 0.16,
              renderer,
            }).bindTooltip(
              `<b>${hazard.name}</b><br/><span style="font-size:11px;color:#94a3b8">${hazard.legalRef || ""}</span>`,
              { permanent: false, direction: "top" }
            );
            overlaysGroupRef.current.addLayer(riverLayer);
          }

          if (hazard.centerline && hazard.centerline.length >= 2) {
            const centerlineLayer = L.polyline(hazard.centerline, {
              color: "#7dd3fc",
              weight: 1.5,
              opacity: 0.6,
              dashArray: "4,6",
              renderer,
            }).bindTooltip(`${hazard.river || hazard.name} — River Centerline (HFL Buffer: ${hazard.bufferKm || 1}km)`, {
              permanent: false,
            });
            overlaysGroupRef.current.addLayer(centerlineLayer);
          }
        });
      }
    },
    [showFlood, showProtected]
  );

  // -------------------------------------------------------------
  // Render Approved / Vetoed Parcel Polygon & Editable Handles
  // -------------------------------------------------------------
  const renderPolygon = useCallback(
    (latlngs, res, shouldFit = true) => {
      const map = mapRef.current;
      if (!map || !drawnRef.current) return;
      drawnRef.current.clearLayers();
      if (editMarkersRef.current) editMarkersRef.current.clearLayers();

      setCurrentParcelCoords(latlngs);

      const isApproved = res.status === "approved";
      const color = isApproved ? "#10b981" : "#f43f5e";
      const fillColor = isApproved ? "#059669" : "#e11d48";

      const layer = L.polygon(latlngs, {
        color,
        weight: 3,
        fillColor,
        fillOpacity: 0.28,
        renderer: sharedCanvasRendererRef.current,
      });

      layer.bindTooltip(
        `<b>${isApproved ? "Approved Building Site" : "Hard Veto — Hazard Zone"}</b><br/>Area: ${res.area_m2?.toLocaleString() || 0} m²`,
        { permanent: false, direction: "center" }
      );

      drawnRef.current.addLayer(layer);

      // Render sleek interactive draggable corner handles for easy vertex adjustment!
      if (editMarkersRef.current && latlngs.length >= 3) {
        latlngs.forEach((coord, idx) => {
          const markerIcon = L.divIcon({
            className: "vertex-corner-handle",
            html: `<div style="
              width: 14px;
              height: 14px;
              background: #ffffff;
              border: 3px solid ${color};
              border-radius: 50%;
              box-shadow: 0 0 10px ${color}80;
              cursor: grab;
              transform: translate(-50%, -50%);
              transition: transform 0.15s ease;
            "></div>`,
            iconSize: [0, 0],
          });

          const marker = L.marker(coord, { icon: markerIcon, draggable: true });

          marker.on("drag", () => {
            const updatedCoords = [...latlngs];
            const newPos = marker.getLatLng();
            updatedCoords[idx] = [newPos.lat, newPos.lng];
            layer.setLatLngs(updatedCoords);

            // Compute live area while dragging
            try {
              const ring = updatedCoords.map(([lat, lng]) => [lng, lat]);
              ring.push(ring[0]);
              const livePoly = turf.polygon([ring]);
              const liveArea = Math.round(turf.area(livePoly));
              const livePerim = Math.round(turf.length(livePoly, { units: "meters" }));
              setResult((prev) => (prev ? { ...prev, area_m2: liveArea, perimeter_m: livePerim } : null));
            } catch (e) {
              // Ignore degenerate polygon intermediate state
            }
          });

          marker.on("dragend", () => {
            const updatedCoords = layer.getLatLngs()[0].map((p) => [p.lat, p.lng]);
            const newRes = validatePolygonWithConfig(updatedCoords, activeConfigRef.current);
            setResult(newRes);
            renderPolygon(updatedCoords, newRes, false);
            persist(updatedCoords, newRes, "Adjusted Building Footprint");
            toast.success("Parcel boundary adjusted and re-validated!");
          });

          editMarkersRef.current.addLayer(marker);
        });
      }

      if (shouldFit) {
        map.fitBounds(layer.getBounds(), { padding: [60, 60], maxZoom: 16 });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // -------------------------------------------------------------
  // Persist site to backend project database
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // Preset parcels
  // -------------------------------------------------------------
  const applyPreset = (key) => {
    const preset = activeConfig.presets[key];
    if (!preset) return;
    const res = validatePolygonWithConfig(preset.coords, activeConfig);
    setResult(res);
    setLabel(preset.label);
    renderPolygon(preset.coords, res, true);
    persist(preset.coords, res, preset.label);

    setShowHazardLayers(true);
    updateMapOverlays(activeConfig, true);
  };

  const clear = async () => {
    drawnRef.current?.clearLayers();
    if (editMarkersRef.current) editMarkersRef.current.clearLayers();
    if (drawLayerRef.current) drawLayerRef.current.clearLayers();
    setCurrentParcelCoords(null);
    setResult(null);
    setLabel(null);
    setShowHazardLayers(false);
    updateMapOverlays(activeConfig, false);
    setDrawTool("none");
    setDrawPoints([]);
    await updateProject(id, {
      site: { polygon: null, status: "pending", area_m2: 0, perimeter_m: 0, veto_reason: null, label: null },
    });
    toast.info("Cleared parcel. Use drawing tools or presets to define your site.");
  };

  // -------------------------------------------------------------
  // Finish Custom Boundary
  // -------------------------------------------------------------
  const finishDrawingPolygon = useCallback(() => {
    const pts = drawPointsRef.current;
    if (pts.length < 3) {
      toast.error("Place at least 3 points to complete a building boundary");
      return;
    }

    const latlngs = pts.map((p) => [p.lat, p.lng]);
    const res = validatePolygonWithConfig(latlngs, activeConfigRef.current);
    setResult(res);
    setLabel("Custom Drawn Building");
    renderPolygon(latlngs, res, true);
    persist(latlngs, res, "Custom Drawn Building");

    setShowHazardLayers(true);
    updateMapOverlays(activeConfigRef.current, true);

    if (drawLayerRef.current) drawLayerRef.current.clearLayers();
    setDrawTool("none");
    setDrawPoints([]);
    setLiveCursorInfo(null);
    toast.success("Building footprint defined! Environmental hazard layers revealed.");
  }, [renderPolygon, updateMapOverlays]);

  // -------------------------------------------------------------
  // Cancel Drawing
  // -------------------------------------------------------------
  const cancelDrawing = () => {
    setDrawTool("none");
    setDrawPoints([]);
    setRectStartPoint(null);
    setLiveCursorInfo(null);
    if (drawLayerRef.current) drawLayerRef.current.clearLayers();
    toast.info("Drawing canceled");
  };

  // Undo last vertex
  const undoLastPoint = () => {
    setDrawPoints((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      drawPointsRef.current = next;
      redrawPreview();
      return next;
    });
  };

  // Redraw live in-progress drawing preview directly on Leaflet map
  const redrawPreview = (currentLatLng) => {
    const map = mapRef.current;
    const previewGroup = drawLayerRef.current;
    if (!map || !previewGroup) return;

    previewGroup.clearLayers();
    const pts = drawPointsRef.current;

    if (pts.length === 0 && !currentLatLng) return;

    // Render placed vertices
    pts.forEach((p, idx) => {
      const isStart = idx === 0;
      const markerIcon = L.divIcon({
        className: "draw-vertex-point",
        html: `<div style="
          width: ${isStart ? "18px" : "12px"};
          height: ${isStart ? "18px" : "12px"};
          background: ${isStart ? "#38bdf8" : "#ffffff"};
          border: 2px solid ${isStart ? "#0284c7" : "#0ea5e9"};
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: bold;
          color: ${isStart ? "#000000" : "#0284c7"};
          transform: translate(-50%, -50%);
        ">${idx + 1}</div>`,
        iconSize: [0, 0],
      });

      const vertexMarker = L.marker([p.lat, p.lng], { icon: markerIcon });
      if (isStart && pts.length >= 3) {
        vertexMarker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          finishDrawingPolygon();
        });
      }
      previewGroup.addLayer(vertexMarker);
    });

    // Render connecting lines & shaded polygon preview
    if (pts.length >= 2) {
      const polyCoords = pts.map((p) => [p.lat, p.lng]);
      const line = L.polyline(polyCoords, {
        color: "#38bdf8",
        weight: 2.5,
        dashArray: "6,4",
      });
      previewGroup.addLayer(line);
    }

    // Active rubberband line to cursor
    if (pts.length > 0 && currentLatLng) {
      const last = pts[pts.length - 1];
      const rubberband = L.polyline(
        [
          [last.lat, last.lng],
          [currentLatLng.lat, currentLatLng.lng],
        ],
        {
          color: "#0ea5e9",
          weight: 1.8,
          dashArray: "4,4",
        }
      );
      previewGroup.addLayer(rubberband);

      // Closing dashed line to start if >= 2 points
      if (pts.length >= 2) {
        const start = pts[0];
        const closingLine = L.polyline(
          [
            [currentLatLng.lat, currentLatLng.lng],
            [start.lat, start.lng],
          ],
          {
            color: "#38bdf8",
            weight: 1.2,
            dashArray: "2,4",
            opacity: 0.6,
          }
        );
        previewGroup.addLayer(closingLine);
      }
    }
  };

  // -------------------------------------------------------------
  // Initialize Leaflet Map with Silky Smooth Controls
  // -------------------------------------------------------------
  useEffect(() => {
    if (mapRef.current || !mapEl.current) return;

    const initialCenter = activeConfigRef.current.center;

    // Create shared high-speed HTML5 Canvas renderer for vector graphics
    const canvasRenderer = L.canvas({ padding: 0.5 });
    sharedCanvasRendererRef.current = canvasRenderer;

    const map = L.map(mapEl.current, {
      center: initialCenter,
      zoom: 14,
      maxZoom: 22,
      minZoom: 3,
      zoomControl: false, // Clean custom floating buttons
      preferCanvas: true, // 60fps canvas hardware acceleration for polygons
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
      zoomSnap: 0.25, // Fractional zoom allows butter-smooth wheel/trackpad scrolling
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 120,
      wheelDebounceTime: 40,
      inertia: true,
      inertiaDeceleration: 3000,
      easeLinearity: 0.2,
      worldCopyJump: false,
    });
    mapRef.current = map;

    // Default tile layer (Google Hybrid Satellite with road & place labels)
    const initialBasemap = BASEMAPS.satellite;
    const tileLayer = L.tileLayer(initialBasemap.url, {
      ...initialBasemap.options,
      maxNativeZoom: initialBasemap.options.maxNativeZoom || 19,
      maxZoom: 22,
      keepBuffer: 8,
      updateWhenIdle: false,
      updateWhenZooming: true,
      updateInterval: 60,
    }).addTo(map);
    tileLayer.bringToBack();
    tileLayerRef.current = tileLayer;

    // Overlays group (Flood & Protected zones)
    const overlaysGroup = new L.FeatureGroup();
    map.addLayer(overlaysGroup);
    overlaysGroupRef.current = overlaysGroup;

    // Drawn parcel group
    const drawn = new L.FeatureGroup();
    map.addLayer(drawn);
    drawnRef.current = drawn;

    // Edit handles group
    const editHandles = new L.FeatureGroup();
    map.addLayer(editHandles);
    editMarkersRef.current = editHandles;

    // In-progress draw preview group
    const drawGroup = new L.FeatureGroup();
    map.addLayer(drawGroup);
    drawLayerRef.current = drawGroup;

    updateMapOverlays(activeConfigRef.current, showHazardLayersRef.current);

    // Track mouse coordinates for HUD
    map.on("mousemove", (e) => {
      setMouseCoords({
        lat: Number(e.latlng.lat.toFixed(4)),
        lng: Number(e.latlng.lng.toFixed(4)),
        zoom: Number(map.getZoom().toFixed(1)),
      });

      // Handle interactive drawing feedback
      if (drawToolRef.current === "polygon") {
        const pts = drawPointsRef.current;
        let targetLatLng = e.latlng;
        let isSnapped = false;

        // Vertex magnetic snapping to start point (< 22px)
        if (pts.length >= 3) {
          const startPt = pts[0];
          const startLayerPoint = map.latLngToContainerPoint([startPt.lat, startPt.lng]);
          const cursorLayerPoint = map.latLngToContainerPoint(e.latlng);
          const distPx = startLayerPoint.distanceTo(cursorLayerPoint);

          if (distPx < 22) {
            targetLatLng = L.latLng(startPt.lat, startPt.lng);
            isSnapped = true;
          }
        }

        let edgeMeters = 0;
        let liveAreaM2 = 0;

        if (pts.length > 0) {
          const last = pts[pts.length - 1];
          edgeMeters = Math.round(map.distance(L.latLng(last.lat, last.lng), targetLatLng));
        }

        if (pts.length >= 2) {
          try {
            const previewRing = pts.map((p) => [p.lng, p.lat]);
            previewRing.push([targetLatLng.lng, targetLatLng.lat]);
            previewRing.push(previewRing[0]);
            const tempPoly = turf.polygon([previewRing]);
            liveAreaM2 = Math.round(turf.area(tempPoly));
          } catch (err) {
            // intermediate collinear points
          }
        }

        setLiveCursorInfo({
          isSnapped,
          edgeMeters,
          liveAreaM2,
        });

        redrawPreview(targetLatLng);
      } else if (drawToolRef.current === "rectangle" && rectStartPointRef.current) {
        // Live Rectangle Drag Preview
        const start = rectStartPointRef.current;
        const bounds = L.latLngBounds([start.lat, start.lng], [e.latlng.lat, e.latlng.lng]);
        drawGroup.clearLayers();
        const rectLayer = L.rectangle(bounds, {
          color: "#38bdf8",
          weight: 2,
          dashArray: "5,5",
          fillColor: "#0284c7",
          fillOpacity: 0.2,
        });
        drawGroup.addLayer(rectLayer);

        const widthM = Math.round(map.distance([start.lat, start.lng], [start.lat, e.latlng.lng]));
        const heightM = Math.round(map.distance([start.lat, start.lng], [e.latlng.lat, start.lng]));
        setLiveCursorInfo({
          edgeMeters: widthM,
          liveAreaM2: widthM * heightM,
          rectDim: `${widthM}m × ${heightM}m`,
        });
      }
    });

    // Map Click Handler for Drawing
    map.on("click", (e) => {
      if (drawToolRef.current === "polygon") {
        const pts = drawPointsRef.current;

        // If clicked on or near the first point after placing >= 3 corners: Complete!
        if (pts.length >= 3) {
          const startPt = pts[0];
          const startPx = map.latLngToContainerPoint([startPt.lat, startPt.lng]);
          const clickPx = map.latLngToContainerPoint(e.latlng);
          if (startPx.distanceTo(clickPx) < 22) {
            finishDrawingPolygon();
            return;
          }
        }

        const newPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
        const updated = [...pts, newPoint];
        setDrawPoints(updated);
        drawPointsRef.current = updated;
        redrawPreview(e.latlng);
      } else if (drawToolRef.current === "rectangle") {
        if (!rectStartPointRef.current) {
          rectStartPointRef.current = { lat: e.latlng.lat, lng: e.latlng.lng };
          setRectStartPoint(rectStartPointRef.current);
          toast.info("Corner #1 placed! Click opposite corner to complete rectangle.");
        } else {
          // Finish Rectangle
          const start = rectStartPointRef.current;
          const end = { lat: e.latlng.lat, lng: e.latlng.lng };
          const rectCoords = [
            [start.lat, start.lng],
            [start.lat, end.lng],
            [end.lat, end.lng],
            [end.lat, start.lng],
          ];

          const res = validatePolygonWithConfig(rectCoords, activeConfigRef.current);
          setResult(res);
          setLabel("Rectangular Building Plot");
          renderPolygon(rectCoords, res, true);
          persist(rectCoords, res, "Rectangular Building Plot");

          setShowHazardLayers(true);
          updateMapOverlays(activeConfigRef.current, true);

          drawGroup.clearLayers();
          setDrawTool("none");
          setRectStartPoint(null);
          rectStartPointRef.current = null;
          setLiveCursorInfo(null);
          toast.success("Rectangular building footprint placed!");
        }
      }
    });

    // Double-click to complete polygon
    map.on("dblclick", (e) => {
      if (drawToolRef.current === "polygon" && drawPointsRef.current.length >= 3) {
        L.DomEvent.stopPropagation(e);
        finishDrawingPolygon();
      }
    });

    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line
  }, []);

  // Keyboard shortcuts (Enter to finish, Backspace to undo, Esc to cancel)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (drawTool === "polygon") {
        if (e.key === "Enter" && drawPoints.length >= 3) {
          e.preventDefault();
          finishDrawingPolygon();
        } else if ((e.key === "Backspace" || (e.ctrlKey && e.key === "z")) && drawPoints.length > 0) {
          e.preventDefault();
          undoLastPoint();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancelDrawing();
        }
      } else if (drawTool === "rectangle" && e.key === "Escape") {
        e.preventDefault();
        cancelDrawing();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawTool, drawPoints.length, finishDrawingPolygon]);

  // Load project & automatically center map to project's location (only on initial mount or id change)
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

        const hasSavedPolygon = Boolean(p.site?.polygon && p.site.polygon.length >= 3);
        setShowHazardLayers(hasSavedPolygon);

        const map = mapRef.current;
        if (map) {
          updateMapOverlays(cfg, hasSavedPolygon);

          if (hasSavedPolygon) {
            // Check if saved polygon is located in the active region (or old mismatched dummy coordinates)
            const polyCenterLat = p.site.polygon.reduce((sum, pt) => sum + pt[0], 0) / p.site.polygon.length;
            const polyCenterLng = p.site.polygon.reduce((sum, pt) => sum + pt[1], 0) / p.site.polygon.length;
            const distFromCity = map.distance(
              L.latLng(polyCenterLat, polyCenterLng),
              L.latLng(cfg.center[0], cfg.center[1])
            );

            // If polygon is within 400km of city, fit to polygon; otherwise center on city
            if (distFromCity < 400000) {
              const evaluatedRes = evaluateParcelComprehensiveHazards(p.site.polygon, cfg);
              setResult(evaluatedRes);
              setLabel(p.site.label || "Custom Drawn Building");
              renderPolygon(p.site.polygon, evaluatedRes, true);
            } else {
              map.setView(cfg.center, cfg.zoom || 14);
            }
          } else {
            map.setView(cfg.center, cfg.zoom || 14);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load project:", err);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Set map container cursor safely via Leaflet DOM without stripping Leaflet's internal CSS classes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const container = map.getContainer();
    if (container) {
      container.style.cursor = drawTool !== "none" ? "crosshair" : "";
    }
  }, [drawTool]);

  // Recalculate overlays when hazard layer checkboxes change
  useEffect(() => {
    updateMapOverlays(activeConfig, showHazardLayers);
  }, [showFlood, showProtected, showHazardLayers, activeConfig, updateMapOverlays]);

  // Handle Location Search
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
      toast.success(`Map smoothly centered to ${cfg.cityName}`);
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

  // Toggle Hazard Overlays
  const toggleHazardLayers = () => {
    const next = !showHazardLayers;
    setShowHazardLayers(next);
    updateMapOverlays(activeConfig, next);
    if (next) toast.info("Environmental hazard layers enabled (Flood & Protected zones visible)");
    else toast.info("Environmental hazard layers hidden");
  };

  // Start Drawing Tools
  const startPolygonDrawing = () => {
    setDrawTool("polygon");
    setDrawPoints([]);
    setLiveCursorInfo(null);
    setShowHazardLayers(false);
    updateMapOverlays(activeConfig, false);
    toast.info("Freehand Polygon Tool: Click on map to place corners", {
      description: "Pan & zoom are active! Snap to corner #1 or press Enter when done.",
    });
  };

  const startRectangleDrawing = () => {
    setDrawTool("rectangle");
    setRectStartPoint(null);
    rectStartPointRef.current = null;
    setLiveCursorInfo(null);
    setShowHazardLayers(false);
    updateMapOverlays(activeConfig, false);
    toast.info("Box Tool: Click 2 opposite corners to drop an instant plot", {
      description: "Click once for corner 1, then click corner 2.",
    });
  };

  // Fit view to current parcel
  const fitToParcel = () => {
    const map = mapRef.current;
    if (!map || !currentParcelCoords || currentParcelCoords.length === 0) {
      toast.info("No parcel placed yet. Draw or select a preset first.");
      return;
    }
    const bounds = L.latLngBounds(currentParcelCoords);
    map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 16, duration: 1 });
  };

  // Recenter to active city
  const recenterToCity = () => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo(activeConfig.center, activeConfig.zoom || 14, { duration: 1 });
  };

  // Toggle map expansion
  const toggleMapExpansion = () => {
    setMapHeightExpanded((prev) => {
      const next = !prev;
      setTimeout(() => {
        if (mapRef.current) mapRef.current.invalidateSize();
      }, 300);
      return next;
    });
  };

  const approved = result?.status === "approved";
  const footprint = result ? Math.round(result.area_m2 * 0.4) : 0;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <HeaderNav projectId={id} activeStep="site" />
      <main className="max-w-[1680px] mx-auto px-4 sm:px-6 py-6">
        {/* Top Header & Context */}
        <div className="mb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-1 flex items-center gap-2">
              <MapPin className="w-3 h-3 text-sky-400" /> {projName} {projLocation ? `· ${projLocation}` : ""}
            </p>
            <h1 className="font-display font-black text-2xl sm:text-4xl tracking-tight text-zinc-100 uppercase flex items-center gap-3">
              <span>Site Validation & Masterplanning</span>
              <span className="text-xs font-mono font-medium tracking-normal normal-case px-2.5 py-0.5 rounded border border-sky-500/30 bg-sky-500/10 text-sky-300">
                Ultra-Smooth GIS
              </span>
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1 max-w-2xl">
              Plan your building site with hardware-accelerated precision tools. Full pan & zoom during drawing,
              satellite overlays, and automatic CWC flood & ecological reserve compliance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-500">Unit:</span>
            <div className="inline-flex rounded border border-zinc-800 bg-[#121215] p-0.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setAreaUnit("m2")}
                className={`px-2 py-0.5 rounded transition-colors ${
                  areaUnit === "m2" ? "bg-zinc-700 text-white font-medium" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                m²
              </button>
              <button
                type="button"
                onClick={() => setAreaUnit("sqft")}
                className={`px-2 py-0.5 rounded transition-colors ${
                  areaUnit === "sqft" ? "bg-zinc-700 text-white font-medium" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                sq ft
              </button>
              <button
                type="button"
                onClick={() => setAreaUnit("acres")}
                className={`px-2 py-0.5 rounded transition-colors ${
                  areaUnit === "acres" ? "bg-zinc-700 text-white font-medium" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                acres
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Main Map Workstation */}
          <div className="lg:col-span-8 xl:col-span-9 border border-zinc-800 bg-[#0c0c0e] flex flex-col shadow-2xl overflow-hidden rounded-md">
            {/* Top Toolbar: Location Search & City Quick Jump */}
            <div className="px-4 py-2.5 bg-[#121215] border-b border-zinc-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <MapPin className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-zinc-500">Active Zone:</span>
                  <span className="text-zinc-100 font-semibold">{activeConfig.cityName}</span>
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

              {/* Search Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLocationSearch(searchInput);
                }}
                className="flex items-center gap-1.5 w-full md:w-auto"
              >
                <div className="relative flex-1 md:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search city, area or coordinate..."
                    className="w-full bg-[#09090b] border border-zinc-800 focus:border-sky-500/60 rounded outline-none pl-8 pr-2 py-1.5 text-xs text-zinc-200 font-mono placeholder:text-zinc-600 transition-colors"
                    data-testid="map-location-search-input"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching}
                  data-testid="map-location-search-btn"
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 font-mono text-xs rounded transition-colors flex items-center gap-1 shrink-0"
                >
                  {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : "Locate"}
                </button>
              </form>
            </div>

            {/* Sub-bar: Quick jump city chips */}
            <div className="flex items-center gap-2 px-4 py-1.5 bg-[#0e0e11] border-b border-zinc-800/80 text-[11px] font-mono overflow-x-auto">
              <span className="text-zinc-500 shrink-0">Quick jump:</span>
              {["Amritsar", "Delhi", "Bengaluru", "Mumbai", "Chandigarh"].map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    setSearchInput(city);
                    handleLocationSearch(city);
                  }}
                  className={`px-2.5 py-0.5 rounded transition-all shrink-0 ${
                    activeConfig.cityName.toLowerCase().includes(city.toLowerCase())
                      ? "border border-sky-500/50 text-sky-200 bg-sky-500/10 font-semibold"
                      : "border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 bg-zinc-900/40"
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>

            {/* Handy Action Bar: Drawing Tools & Layer Switches */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-[#121215] flex-wrap gap-2 text-xs font-mono">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Freeform Polygon Tool (Also serves as konva-draw-btn for test compatibility) */}
                <button
                  type="button"
                  onClick={drawTool === "polygon" ? cancelDrawing : startPolygonDrawing}
                  data-testid="konva-draw-btn"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all font-medium border ${
                    drawTool === "polygon"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                      : "bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border-sky-500/30 hover:border-sky-500/60"
                  }`}
                  title="Draw building corners directly on map. Zoom & pan stay active!"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>{drawTool === "polygon" ? "Cancel Drawing" : "Draw Parcel (Polygon)"}</span>
                </button>

                {/* Instant Box / Rectangle Tool */}
                <button
                  type="button"
                  onClick={drawTool === "rectangle" ? cancelDrawing : startRectangleDrawing}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all font-medium border ${
                    drawTool === "rectangle"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                      : "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border-zinc-700 hover:border-zinc-500"
                  }`}
                  title="Click 2 opposite corners to create an instant rectangular building footprint"
                >
                  <BoxSelect className="w-3.5 h-3.5" />
                  <span>{drawTool === "rectangle" ? "Cancel Box" : "Quick Box Tool"}</span>
                </button>

                {/* Clear Parcel */}
                <button
                  onClick={clear}
                  data-testid="clear-polygon-btn"
                  className="flex items-center gap-1 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/40 px-2.5 py-1.5 rounded transition-colors"
                >
                  <Eraser className="w-3.5 h-3.5" /> Clear
                </button>
              </div>

              {/* Basemap Switcher Pills */}
              <div className="flex items-center gap-1.5 bg-[#09090b] border border-zinc-800 p-0.5 rounded">
                <span className="text-[10px] text-zinc-500 uppercase px-1.5">Map:</span>
                {Object.values(BASEMAPS).map((bm) => (
                  <button
                    key={bm.id}
                    type="button"
                    onClick={() => switchBasemap(bm.id)}
                    className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                      activeBasemap === bm.id
                        ? "bg-zinc-800 text-sky-400 font-semibold"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {bm.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Map Viewport with HUD Controls */}
            <div
              className="relative transition-all duration-300"
              style={{ height: mapHeightExpanded ? 720 : 560, width: "100%" }}
            >
              {/* Leaflet Map Canvas */}
              <div
                ref={mapEl}
                data-testid="site-map"
                className="w-full h-full"
              />

              {/* Backward compatibility anchor for testid */}
              <div data-testid="konva-drawing-overlay" className="hidden" />

              {/* Floating Map Controls HUD (Top Left: Zoom & Fit) */}
              <div className="absolute top-3 left-3 z-[400] flex flex-col gap-1.5">
                <div className="flex flex-col rounded-md border border-zinc-700/60 bg-[#121215]/90 backdrop-blur-md overflow-hidden shadow-lg">
                  <button
                    type="button"
                    onClick={() => mapRef.current?.zoomIn()}
                    className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-700/50 transition-colors border-b border-zinc-800/80"
                    title="Zoom In"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => mapRef.current?.zoomOut()}
                    className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-700/50 transition-colors"
                    title="Zoom Out"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col rounded-md border border-zinc-700/60 bg-[#121215]/90 backdrop-blur-md overflow-hidden shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      if (!navigator.geolocation) {
                        toast.error("Geolocation is not supported by your browser");
                        return;
                      }
                      toast.loading("Detecting your location...", { id: "locate-user" });
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          const { latitude, longitude } = pos.coords;
                          const map = mapRef.current;
                          if (map) {
                            map.flyTo([latitude, longitude], 17, { duration: 1.5 });
                            toast.success("Centered on your current location!", { id: "locate-user" });
                          }
                        },
                        (err) => {
                          toast.error("Could not retrieve your location: " + err.message, { id: "locate-user" });
                        },
                        { enableHighAccuracy: true, timeout: 8000 }
                      );
                    }}
                    className="p-2 text-zinc-300 hover:text-emerald-400 hover:bg-zinc-700/50 transition-colors border-b border-zinc-800/80"
                    title="Locate My GPS Position"
                  >
                    <Navigation className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={fitToParcel}
                    className="p-2 text-zinc-300 hover:text-sky-400 hover:bg-zinc-700/50 transition-colors border-b border-zinc-800/80"
                    title="Fit to Parcel"
                  >
                    <Crosshair className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={recenterToCity}
                    className="p-2 text-zinc-300 hover:text-sky-400 hover:bg-zinc-700/50 transition-colors border-b border-zinc-800/80"
                    title="Recenter to City"
                  >
                    <Compass className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={toggleMapExpansion}
                    className="p-2 text-zinc-300 hover:text-sky-400 hover:bg-zinc-700/50 transition-colors"
                    title={mapHeightExpanded ? "Collapse Map" : "Expand Map View"}
                  >
                    {mapHeightExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Floating Layer Controls (Top Right) */}
              <div className="absolute top-3 right-3 z-[400] flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleHazardLayers}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border backdrop-blur-md font-mono text-xs shadow-lg transition-all ${
                    showHazardLayers
                      ? "bg-[#121215]/95 border-sky-500/50 text-sky-300"
                      : "bg-[#121215]/80 border-zinc-700/60 text-zinc-400 hover:text-zinc-200"
                  }`}
                  title="Toggle CWC River Floodplains & Protected Reserves"
                >
                  {showHazardLayers ? <Eye className="w-3.5 h-3.5 text-sky-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>Hazard Zones: {showHazardLayers ? "Revealed" : "Hidden"}</span>
                </button>
              </div>

              {/* Floating Drawing Status & Action Bar (When in drawing mode) */}
              {isKonvaDrawing && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[450] bg-[#121215]/95 border border-sky-500/60 backdrop-blur-md px-4 py-2 rounded-lg flex items-center gap-3 text-xs font-mono shadow-2xl animate-in fade-in slide-in-from-top-2">
                  <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
                    <PenTool className="w-3.5 h-3.5 animate-pulse" />
                    <span>
                      {drawTool === "polygon"
                        ? `${placedCount} corners placed`
                        : rectStartPoint
                        ? "Click opposite corner"
                        : "Click corner 1"}
                    </span>
                  </span>

                  {liveCursorInfo && (
                    <>
                      <span className="text-zinc-600">|</span>
                      <span className="text-zinc-300">
                        {liveCursorInfo.rectDim
                          ? liveCursorInfo.rectDim
                          : liveCursorInfo.edgeMeters
                          ? `Edge: ${liveCursorInfo.edgeMeters}m`
                          : ""}
                      </span>
                      {liveCursorInfo.liveAreaM2 > 0 && (
                        <span className="text-emerald-400">
                          ~{formatArea(liveCursorInfo.liveAreaM2, areaUnit)}
                        </span>
                      )}
                    </>
                  )}

                  <span className="text-zinc-600">|</span>

                  {drawTool === "polygon" && (
                    <button
                      type="button"
                      onClick={undoLastPoint}
                      disabled={placedCount === 0}
                      className="flex items-center gap-1 text-zinc-400 hover:text-zinc-100 disabled:opacity-40 transition-colors"
                      title="Undo last corner (Backspace / Ctrl+Z)"
                    >
                      <RotateCcw className="w-3 h-3" /> Undo
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={finishDrawingPolygon}
                    disabled={drawTool !== "polygon" || placedCount < 3}
                    data-testid="complete-konva-polygon-btn"
                    className="flex items-center gap-1 bg-sky-500 hover:bg-sky-400 text-black font-semibold px-2.5 py-1 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Complete boundary (or press Enter)"
                  >
                    <Check className="w-3.5 h-3.5" /> Complete Boundary
                  </button>

                  <button
                    type="button"
                    onClick={cancelDrawing}
                    className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors ml-1"
                    title="Cancel drawing (Esc)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Cursor Drawing Guide Prompt (when drawing) */}
              {isKonvaDrawing && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[400] bg-zinc-950/90 border border-zinc-700/80 px-3.5 py-1.5 rounded-full text-[11px] font-mono text-zinc-300 shadow-xl pointer-events-none flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                  {liveCursorInfo?.isSnapped ? (
                    <span className="text-emerald-400 font-semibold">
                      🎯 Snap to start! Click point #1 or press Enter to complete boundary
                    </span>
                  ) : drawTool === "polygon" ? (
                    placedCount === 0 ? (
                      "Click anywhere on the map to place corner #1. Pan & scroll zoom anytime!"
                    ) : (
                      `Corner #${placedCount + 1}: Click to place. Double-click or press Enter to finish.`
                    )
                  ) : rectStartPoint ? (
                    "Click to finish rectangle opposite corner"
                  ) : (
                    "Click to place the first corner of the rectangular plot"
                  )}
                </div>
              )}

              {/* Bottom HUD: Live Coordinates & Scale Bar */}
              <div className="absolute bottom-2 left-3 z-[400] flex items-center gap-3 pointer-events-none">
                <div className="bg-[#121215]/85 border border-zinc-800/80 px-2.5 py-1 rounded text-[10px] font-mono text-zinc-400 backdrop-blur-sm">
                  Lat: {mouseCoords.lat}° | Lng: {mouseCoords.lng}° | Zoom: {mouseCoords.zoom}
                </div>
                {currentParcelCoords && (
                  <div className="bg-[#121215]/85 border border-zinc-800/80 px-2.5 py-1 rounded text-[10px] font-mono text-sky-400 backdrop-blur-sm flex items-center gap-1.5">
                    <Edit3 className="w-3 h-3 text-sky-400" />
                    <span>Corners are draggable to fine-tune boundary</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Presets, Metrics & Verdict */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            {/* Contextual Sample Parcels */}
            <div className="border border-zinc-800 p-4 rounded-md bg-[#0e0e11]">
              <p className="eyebrow mb-1">Deterministic Test Presets</p>
              <p className="text-[11px] font-mono text-zinc-400 mb-3">Contextual parcels for {activeConfig.cityName}:</p>
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

            {/* Geodesic Metrics Card */}
            <div className="border border-zinc-800 p-4 rounded-md bg-[#0e0e11]" data-testid="site-metrics">
              <div className="flex items-center justify-between mb-3">
                <p className="eyebrow">Geodesic Metrics</p>
                {label && <span className="text-[11px] font-mono text-sky-400 truncate max-w-[160px]">{label}</span>}
              </div>

              {result ? (
                <div className="grid grid-cols-2 gap-2">
                  <Metric
                    icon={Ruler}
                    label="Area"
                    value={formatArea(result.area_m2, areaUnit)}
                    sub={`Footprint: ~${formatArea(footprint, areaUnit)}`}
                  />
                  <Metric
                    icon={Pentagon}
                    label="Perimeter"
                    value={`${result.perimeter_m.toLocaleString()} m`}
                    sub={result.perimeter_m > 1000 ? `${(result.perimeter_m / 1000).toFixed(2)} km` : ""}
                  />
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-xs text-zinc-500 font-mono">No parcel active.</p>
                  <p className="text-[11px] text-zinc-600 mt-1">Use drawing tools or click a preset above.</p>
                </div>
              )}
            </div>

            {/* Verdict Banner */}
            {result && (
              <div
                data-testid="validation-banner"
                className={`border p-4 rounded-md transition-all ${
                  approved ? "border-emerald-500/40 bg-emerald-500/10" : "border-rose-500/50 bg-rose-500/10"
                }`}
              >
                <div className="flex items-start gap-3">
                  {approved ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className={`font-display font-bold text-base ${approved ? "text-emerald-400" : "text-rose-400"}`}>
                      {approved ? "SITE APPROVED" : "HARD VETO — HAZARD CONFLICT"}
                    </div>
                    <p className="text-xs text-zinc-300 mt-1 leading-snug">
                      {approved
                        ? `Parcel clears all statutory CWC floodplains and ecological veto layers. Max footprint ≈ ${formatArea(
                            footprint,
                            areaUnit
                          )} at 40% plot coverage.`
                        : result.veto_reason}
                    </p>
                    {!approved && (
                      <p className="text-[10px] font-mono text-rose-300/80 mt-2">
                        Ref: Municipal Bylaw MB-22.7 / Central Water Commission Flood Demarcation
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Proceed to Next Step */}
            <button
              disabled={!approved || saving}
              onClick={() => navigate(`/project/${id}/design`)}
              data-testid="proceed-design-btn"
              className={`w-full flex items-center justify-center gap-2 font-semibold text-sm py-3.5 rounded transition-all ${
                approved
                  ? "bg-zinc-100 text-black hover:bg-white shadow-[0_0_15px_rgba(255,255,255,0.15)]"
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
              <p className="text-center text-[11px] font-mono text-rose-400">
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
  const dot = tone === "green" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]";
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className="w-full flex items-center gap-3 border border-zinc-800 hover:border-zinc-600 bg-zinc-900/40 hover:bg-zinc-900/90 px-3 py-2.5 rounded text-left transition-all group"
    >
      <span className={`w-2.5 h-2.5 rounded-full ${dot} shrink-0`} />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-zinc-100 font-medium truncate group-hover:text-white transition-colors">
          {label}
        </div>
        <div className="text-[11px] font-mono text-zinc-400 truncate">{sub}</div>
      </div>
    </button>
  );
}

function Metric({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-[#121215] border border-zinc-800/80 p-3 rounded">
      <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
        <Icon className="w-3.5 h-3.5 text-sky-400" />
        <span className="eyebrow">{label}</span>
      </div>
      <div className="font-display font-bold text-base text-zinc-100">{value}</div>
      {sub && <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  );
}
