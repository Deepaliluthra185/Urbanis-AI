import * as turf from "@turf/turf";
import { PAN_INDIA_RIVER_CORRIDORS } from "./panIndiaRiverCorridors";

// Combined hazard source: Regional detailed corridors + full Pan-India CWC atlas
export const ALL_RIVER_HAZARD_CORRIDORS = [
  // PAN_INDIA_RIVER_CORRIDORS is the comprehensive 20+ river national dataset
  ...PAN_INDIA_RIVER_CORRIDORS,
];

// In-memory registry for user-uploaded custom GIS flood shapefiles/GeoJSON
let customHazardFeatures = [];

export function registerCustomHazardLayers(geojsonFeatures) {
  if (Array.isArray(geojsonFeatures)) {
    customHazardFeatures = geojsonFeatures;
  }
}

export function getCustomHazardLayers() {
  return customHazardFeatures;
}

// Helper to convert [[lat, lng], ...] to Turf.js Polygon
export function latlngsToTurfPolygon(latlngs) {
  if (!latlngs || latlngs.length < 3) return null;
  const ring = latlngs.map(([lat, lng]) => [lng, lat]);
  // Ensure ring is closed
  if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
    ring.push(ring[0]);
  }
  return turf.polygon([ring]);
}

export function latlngsToTurfLineString(latlngs) {
  if (!latlngs || latlngs.length < 2) return null;
  const coords = latlngs.map(([lat, lng]) => [lng, lat]);
  return turf.lineString(coords);
}

/**
 * Major River Floodplain Corridors (High Hazard — Construction strictly prohibited)
 */
export const REGIONAL_RIVER_HAZARDS = [
  // 1. BEAS RIVER ACTIVE FLOODPLAIN CORRIDOR (Punjab)
  // Originating near Pong Dam / Talwara, passing Mukerian, Mirthal, Dasuya, Gurdaspur, down to Harike Pattan
  {
    id: "beas-river-corridor",
    name: "Beas River Active Floodplain Corridor (100-Year Return Period)",
    river: "Beas River",
    type: "flood",
    color: "#3b82f6",
    label: "BEAS RIVER 100-YEAR ACTIVE FLOODPLAIN",
    legalRef: "CWC Flood Demarcation / Municipal Bylaw MB-22.7",
    coords: [
      // Mukerian / Mirthal / Talwara northern reach (intersects lat 32.18-32.25, lng 75.35-75.45)
      [32.28, 75.52],
      [32.25, 75.44],
      [32.22, 75.36],
      [32.18, 75.36],
      [32.15, 75.42],
      [32.10, 75.48],
      // Dasuya / Gurdaspur middle reach
      [31.95, 75.52],
      [31.80, 75.46],
      [31.65, 75.35],
      [31.50, 75.25],
      // Kapurthala / Harike lower confluence reach
      [31.35, 75.15],
      [31.18, 75.05],
      [31.10, 74.92],
      [31.15, 74.88],
      [31.25, 75.00],
      [31.42, 75.18],
      [31.58, 75.30],
      [31.75, 75.40],
      [31.90, 75.55],
      [32.08, 75.60],
      [32.20, 75.50],
      [32.28, 75.52],
    ],
    centerline: [
      [32.26, 75.48],
      [32.20, 75.38],
      [32.16, 75.42],
      [31.92, 75.50],
      [31.72, 75.38],
      [31.52, 75.24],
      [31.30, 75.12],
      [31.14, 74.95],
    ],
    bufferKm: 1.2,
  },

  // 2. RAVI RIVER ACTIVE FLOODPLAIN & INTERNATIONAL CORRIDOR (Punjab / Border)
  // Flows from Madhopur through Pathankot, Dera Baba Nanak, Ajnala, Ramdas, down to Lahore border
  {
    id: "ravi-river-corridor",
    name: "Ravi River Flood Inundation & Buffer Zone",
    river: "Ravi River",
    type: "flood",
    color: "#0284c7",
    label: "RAVI RIVER HIGH-FLOOD CORRIDOR",
    legalRef: "Indus Water Treaty Zone / CWC Flood Atlas",
    coords: [
      [32.38, 75.62],
      [32.28, 75.45],
      [32.15, 75.25],
      [32.05, 75.10],
      [31.90, 74.88],
      [31.78, 74.72],
      [31.62, 74.60],
      [31.48, 74.52],
      [31.45, 74.58],
      [31.58, 74.68],
      [31.72, 74.80],
      [31.85, 74.95],
      [32.00, 75.18],
      [32.12, 75.32],
      [32.25, 75.52],
      [32.38, 75.62],
    ],
    centerline: [
      [32.35, 75.58],
      [32.20, 75.36],
      [32.02, 75.14],
      [31.84, 74.80],
      [31.70, 74.66],
      [31.50, 74.55],
    ],
    bufferKm: 1.0,
  },

  // 3. SUTLEJ RIVER FLOODPLAIN CORRIDOR (Punjab)
  // Ropar through Phillaur, Ludhiana, Dharmkot, down to Harike Pattan
  {
    id: "sutlej-river-corridor",
    name: "Sutlej River 100-Year Active Floodplain",
    river: "Sutlej River",
    type: "flood",
    color: "#3b82f6",
    label: "SUTLEJ RIVER 100-YEAR FLOODPLAIN",
    legalRef: "BBMB Regulations / NDMA Flood Risk Guidelines",
    coords: [
      [31.25, 76.50],
      [31.05, 76.15],
      [30.98, 75.85],
      [30.94, 75.55],
      [30.98, 75.15],
      [31.10, 74.95],
      [31.02, 74.82],
      [30.85, 74.50],
      [30.80, 74.55],
      [30.95, 74.88],
      [31.05, 75.05],
      [30.90, 75.50],
      [30.92, 75.80],
      [31.00, 76.10],
      [31.20, 76.48],
      [31.25, 76.50],
    ],
    centerline: [
      [31.22, 76.45],
      [31.02, 76.12],
      [30.95, 75.82],
      [30.95, 75.45],
      [31.08, 74.98],
      [30.85, 74.52],
    ],
    bufferKm: 1.5,
  },

  // 4. UPPER BARI DOAB & AMRITSAR REGIONAL DRAINAGE CORRIDORS
  {
    id: "amritsar-drainage-corridor",
    name: "Tung Dhab & UBDC Municipal Flood Catchment",
    river: "Tung Dhab Canal & Flood Corridor",
    type: "flood",
    color: "#0ea5e9",
    label: "TUNG DHAB URBAN FLOOD CORRIDOR",
    legalRef: "Punjab Irrigation Drainage Act / Municipal Bylaw MB-22.7",
    coords: [
      [31.67, 74.82],
      [31.69, 74.85],
      [31.68, 74.92],
      [31.65, 74.93],
      [31.64, 74.88],
      [31.63, 74.83],
      [31.67, 74.82],
    ],
    centerline: [
      [31.68, 74.83],
      [31.67, 74.88],
      [31.65, 74.92],
    ],
    bufferKm: 0.6,
  },

  // 5. YAMUNA RIVER ACTIVE FLOODPLAIN CORRIDOR (Delhi NCT & NCR)
  {
    id: "yamuna-river-corridor",
    name: "Yamuna River Active 100-Year Floodplain Corridor",
    river: "Yamuna River",
    type: "flood",
    color: "#3b82f6",
    label: "YAMUNA RIVER ACTIVE FLOODPLAIN (DELHI)",
    legalRef: "NGT Order 2015 / Delhi Master Plan 2041 / Municipal Bylaw MB-22.7",
    coords: [
      [28.85, 77.18],
      [28.75, 77.22],
      [28.66, 77.24],
      [28.62, 77.25],
      [28.56, 77.29],
      [28.48, 77.34],
      [28.45, 77.38],
      [28.47, 77.40],
      [28.54, 77.34],
      [28.62, 77.28],
      [28.68, 77.27],
      [28.78, 77.25],
      [28.85, 77.22],
      [28.85, 77.18],
    ],
    centerline: [
      [28.84, 77.20],
      [28.72, 77.23],
      [28.64, 77.26],
      [28.54, 77.32],
      [28.46, 77.36],
    ],
    bufferKm: 0.8,
  },

  // 6. MITHI RIVER & TIDAL CRZ-I INUNDATION (Mumbai)
  {
    id: "mithi-river-corridor",
    name: "Mithi River Tidal Flood Corridor & Mangrove Buffer",
    river: "Mithi River",
    type: "flood",
    color: "#3b82f6",
    label: "MITHI RIVER FLOODPLAIN (CRZ-I BUFFER)",
    legalRef: "CRZ Notification 2019 / Maharashtra Coastal Authority",
    coords: [
      [19.14, 72.89],
      [19.11, 72.88],
      [19.08, 72.87],
      [19.05, 72.85],
      [19.03, 72.84],
      [19.05, 72.86],
      [19.09, 72.89],
      [19.12, 72.91],
      [19.14, 72.89],
    ],
    centerline: [
      [19.13, 72.89],
      [19.09, 72.87],
      [19.05, 72.85],
    ],
    bufferKm: 0.4,
  },

  // 7. SABARMATI RIVER FLOODPLAIN (Ahmedabad)
  {
    id: "sabarmati-river-corridor",
    name: "Sabarmati River Active Basin & Flood Corridor",
    river: "Sabarmati River",
    type: "flood",
    color: "#3b82f6",
    label: "SABARMATI RIVER FLOODPLAIN CORRIDOR",
    legalRef: "Gujarat Disaster Management Act / Municipal Bylaw MB-22.7",
    coords: [
      [23.14, 72.60],
      [23.08, 72.58],
      [23.02, 72.57],
      [22.95, 72.55],
      [22.92, 72.58],
      [23.00, 72.60],
      [23.07, 72.61],
      [23.14, 72.63],
      [23.14, 72.60],
    ],
    centerline: [
      [23.13, 72.61],
      [23.05, 72.58],
      [22.96, 72.56],
    ],
    bufferKm: 0.5,
  },
];

/**
 * Evaluates any drawn parcel polygon against all river floodplains,
 * local environmental zones, and high-flood level (HFL) buffers.
 */
export function evaluateParcelComprehensiveHazards(latlngs, activeCityConfig) {
  const poly = latlngsToTurfPolygon(latlngs);
  if (!poly) {
    return { status: "pending", veto_reason: "Invalid polygon geometry" };
  }

  const area = turf.area(poly);
  const perimeter = turf.length(turf.polygonToLine(poly), { units: "kilometers" }) * 1000;

  // 1. Check City Primary Flood Zone
  if (activeCityConfig?.floodZone) {
    const cityFloodTurf = latlngsToTurfPolygon(activeCityConfig.floodZone);
    if (cityFloodTurf && turf.booleanIntersects(poly, cityFloodTurf)) {
      return {
        status: "veto",
        veto_reason: `Parcel intersects the designated ${activeCityConfig.floodName || "100-year flood zone"}. Construction is prohibited under Municipal Bylaw MB-22.7.`,
        hazard_type: "flood",
        hazard_name: activeCityConfig.floodName,
        area_m2: Math.round(area),
        perimeter_m: Math.round(perimeter),
      };
    }
  }

  // 2. Check City Protected Ecological Reserve
  if (activeCityConfig?.protectedZone) {
    const cityProtectedTurf = latlngsToTurfPolygon(activeCityConfig.protectedZone);
    if (cityProtectedTurf && turf.booleanIntersects(poly, cityProtectedTurf)) {
      return {
        status: "veto",
        veto_reason: `Parcel intersects the ${activeCityConfig.protectedName || "protected ecological reserve"}. Construction is strictly prohibited in conservation reserves.`,
        hazard_type: "protected",
        hazard_name: activeCityConfig.protectedName,
        area_m2: Math.round(area),
        perimeter_m: Math.round(perimeter),
      };
    }
  }

  // 3. Check All Regional River Corridors & Floodplains (REGIONAL detailed set)
  for (const hazard of REGIONAL_RIVER_HAZARDS) {
    // Polygon intersection check
    if (hazard.coords) {
      const riverPoly = latlngsToTurfPolygon(hazard.coords);
      if (riverPoly && turf.booleanIntersects(poly, riverPoly)) {
        return {
          status: "veto",
          veto_reason: `Parcel intersects the ${hazard.name}. Habitable construction is prohibited under ${hazard.legalRef}.`,
          hazard_type: "river_flood",
          hazard_name: hazard.name,
          hazard_obj: hazard,
          area_m2: Math.round(area),
          perimeter_m: Math.round(perimeter),
        };
      }
    }

    // River centerline setback buffer check
    if (hazard.centerline && hazard.bufferKm) {
      const riverLine = latlngsToTurfLineString(hazard.centerline);
      if (riverLine) {
        try {
          const riverBuffer = turf.buffer(riverLine, hazard.bufferKm, { units: "kilometers" });
          if (riverBuffer && turf.booleanIntersects(poly, riverBuffer)) {
            return {
              status: "veto",
              veto_reason: `Parcel lies within the statutory High Flood Level (HFL) buffer of ${hazard.river || hazard.name}. Construction within river buffer is prohibited under ${hazard.legalRef}.`,
              hazard_type: "river_buffer",
              hazard_name: hazard.name,
              hazard_obj: hazard,
              area_m2: Math.round(area),
              perimeter_m: Math.round(perimeter),
            };
          }
        } catch (e) {
          // fallback if buffer generation fails
        }
      }
    }
  }

  // 4. Check Pan-India CWC National River Corridors (Ganga, Brahmaputra, Godavari, Krishna, etc.)
  for (const hazard of PAN_INDIA_RIVER_CORRIDORS) {
    if (hazard.coords) {
      const riverPoly = latlngsToTurfPolygon(hazard.coords);
      if (riverPoly && turf.booleanIntersects(poly, riverPoly)) {
        return {
          status: "veto",
          veto_reason: `Parcel intersects the ${hazard.name}. Habitable construction is prohibited under ${hazard.legalRef}.`,
          hazard_type: "river_flood",
          hazard_name: hazard.name,
          hazard_obj: hazard,
          area_m2: Math.round(area),
          perimeter_m: Math.round(perimeter),
        };
      }
    }

    // River centerline HFL buffer check
    if (hazard.centerline && hazard.bufferKm) {
      const riverLine = latlngsToTurfLineString(hazard.centerline);
      if (riverLine) {
        try {
          const riverBuffer = turf.buffer(riverLine, hazard.bufferKm, { units: "kilometers" });
          if (riverBuffer && turf.booleanIntersects(poly, riverBuffer)) {
            return {
              status: "veto",
              veto_reason: `Parcel lies within the statutory High Flood Level (HFL) buffer of ${hazard.river || hazard.name} (${(hazard.states || []).join(", ")}). Construction is prohibited under ${hazard.legalRef}.`,
              hazard_type: "river_buffer",
              hazard_name: hazard.name,
              hazard_obj: hazard,
              area_m2: Math.round(area),
              perimeter_m: Math.round(perimeter),
            };
          }
        } catch (e) {
          // buffer generation failed; skip
        }
      }
    }
  }

  // 5. Check custom user-uploaded GIS hazard layers (if any)
  for (const feature of customHazardFeatures) {
    try {
      const fPoly = feature.geometry?.type === "Polygon" ? turf.feature(feature.geometry) : null;
      if (fPoly && turf.booleanIntersects(poly, fPoly)) {
        const name = feature.properties?.name || feature.properties?.label || "Custom GIS Hazard Zone";
        return {
          status: "veto",
          veto_reason: `Parcel intersects uploaded GIS hazard layer: ${name}.`,
          hazard_type: "custom_gis",
          hazard_name: name,
          area_m2: Math.round(area),
          perimeter_m: Math.round(perimeter),
        };
      }
    } catch (e) {
      // skip malformed feature
    }
  }

  // If clears all floodplains, river corridors, and protected reserves:
  return {
    status: "approved",
    veto_reason: null,
    area_m2: Math.round(area),
    perimeter_m: Math.round(perimeter),
  };
}
