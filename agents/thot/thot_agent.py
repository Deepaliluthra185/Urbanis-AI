"""
THOT — Site & Terrain Intelligence Agent
=========================================
Lead research and site-analysis agent for the Urbanis AI multi-agent proptech platform.

THOT ingests a set of coordinates or a city location and compiles a comprehensive
"Site Feasibility Brief" by spatially cross-referencing real Indian geographical,
hazard, and climate datasets.

Datasets evaluated:
  - Seismic zones    : BIS IS 1893:2016 (Part 1) GeoJSON polygons
  - Flood risk zones : CWC National Flood Atlas / NDMA Flood Hazard Atlas GeoJSON polygons
  - Climate zones    : BEE ECBC 2017 / IMD classification rules
  - Terrain/DEM      : ISRO Bhuvan Cartosat-DEM mock-integration (CartoDEM v3R1)

Spatial engine: Shapely 2.x point-in-polygon with GeoJSON fallback (bounding-box)
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("urbanis.thot")

# ---------------------------------------------------------------------------
# Optional Shapely import — graceful bbox fallback if not installed
# ---------------------------------------------------------------------------
try:
    from shapely.geometry import Point
    from shapely.geometry import shape as shapely_shape

    SHAPELY_AVAILABLE = True
    logger.info("THOT: Shapely spatial engine loaded (point-in-polygon active)")
except ImportError:  # pragma: no cover
    SHAPELY_AVAILABLE = False
    logger.warning(
        "THOT: Shapely not found — falling back to bounding-box spatial checks. "
        "Install via: pip install shapely"
    )

# ---------------------------------------------------------------------------
# Filesystem paths
# ---------------------------------------------------------------------------
_AGENT_DIR = Path(__file__).parent
_REPO_ROOT = _AGENT_DIR.parent.parent
_DATA_DIR = _REPO_ROOT / "data" / "datasets" / "thot"
_RULES_DIR = _AGENT_DIR / "rules"

# ---------------------------------------------------------------------------
# Defaults — Amritsar, Punjab as baseline
# ---------------------------------------------------------------------------
DEFAULT_LAT: float = 31.6340
DEFAULT_LON: float = 74.8723
DEFAULT_CITY: str = "Amritsar"
DEFAULT_STATE: str = "Punjab"


# ===========================================================================
# ThotAgent
# ===========================================================================
class ThotAgent:
    """
    THOT — Site & Terrain Intelligence Agent.

    Compiles a comprehensive Site Feasibility Brief by evaluating real Indian
    geographical, hazard, and climate datasets via spatial point-in-polygon
    analysis.

    Usage
    -----
    >>> agent = ThotAgent()
    >>> brief = await agent.analyze_site({
    ...     "latitude": 31.6340,
    ...     "longitude": 74.8723,
    ...     "city": "Amritsar",
    ...     "state": "Punjab",
    ...     "project_name": "Urban Housing Block A"
    ... })
    """

    def __init__(self) -> None:
        self._seismic_fc: Optional[Dict] = None
        self._flood_fc: Optional[Dict] = None
        self._climate_rules: Optional[Dict] = None
        self._loaded: bool = False

    # ------------------------------------------------------------------
    # Dataset loading (lazy, thread-safe via asyncio.to_thread)
    # ------------------------------------------------------------------

    def _load_datasets(self) -> None:
        """Load GeoJSON feature collections and climate JSON config from disk."""
        if self._loaded:
            return

        seismic_path = _DATA_DIR / "seismic_zones.geojson"
        flood_path = _DATA_DIR / "flood_risk_zones.geojson"
        climate_path = _RULES_DIR / "climate_zones.json"

        for path, label in [
            (seismic_path, "seismic_zones"),
            (flood_path, "flood_risk_zones"),
            (climate_path, "climate_zones"),
        ]:
            if not path.exists():
                raise FileNotFoundError(
                    f"THOT dataset missing: {path}. "
                    f"Ensure the data/datasets/thot/ directory is populated."
                )

        with open(seismic_path, encoding="utf-8") as f:
            self._seismic_fc = json.load(f)

        with open(flood_path, encoding="utf-8") as f:
            self._flood_fc = json.load(f)

        with open(climate_path, encoding="utf-8") as f:
            self._climate_rules = json.load(f)

        self._loaded = True
        logger.debug("THOT: All spatial datasets loaded.")

    # ------------------------------------------------------------------
    # Core spatial engine — point-in-polygon
    # ------------------------------------------------------------------

    def _point_in_feature(self, lat: float, lon: float, feature: Dict) -> bool:
        """
        Return True if the WGS84 point (lat, lon) lies inside the given GeoJSON Feature.
        Uses Shapely when available; falls back to bounding-box/ray-casting otherwise.
        """
        geometry = feature.get("geometry")
        if not geometry:
            return False

        if SHAPELY_AVAILABLE:
            try:
                geom = shapely_shape(geometry)
                pt = Point(lon, lat)  # GeoJSON [lon, lat] order
                return geom.contains(pt) or geom.touches(pt)
            except Exception as exc:
                logger.debug("THOT Shapely check failed for feature: %s", exc)
                return False

        # ------ Bounding-box fallback ------
        return self._bbox_fallback(lat, lon, feature)

    def _bbox_fallback(self, lat: float, lon: float, feature: Dict) -> bool:
        """Fast bounding-box check used when Shapely is unavailable."""
        # 1. Prefer the explicit GeoJSON 'bbox' property [minLon, minLat, maxLon, maxLat]
        bbox = feature.get("bbox")
        if bbox and len(bbox) == 4:
            min_lon, min_lat, max_lon, max_lat = bbox
            return min_lon <= lon <= max_lon and min_lat <= lat <= max_lat

        # 2. Derive bounding box from coordinate ring
        try:
            geom = feature["geometry"]
            gtype = geom["type"]
            coords = geom["coordinates"]
            ring = coords[0] if gtype == "Polygon" else coords[0][0]
            lons_list = [c[0] for c in ring]
            lats_list = [c[1] for c in ring]
            return (
                min(lons_list) <= lon <= max(lons_list)
                and min(lats_list) <= lat <= max(lats_list)
            )
        except (KeyError, IndexError, TypeError):
            return False

    def _query_feature_collection(
        self, lat: float, lon: float, fc: Dict
    ) -> List[Dict]:
        """
        Return the properties of ALL features in a FeatureCollection that contain
        the given point.  Ordered by appearance; caller picks priority.
        """
        matches: List[Dict] = []
        for feature in fc.get("features", []):
            if self._point_in_feature(lat, lon, feature):
                props = feature.get("properties", {})
                matches.append(props)
        return matches

    # ------------------------------------------------------------------
    # Assessment — Seismic Zone (BIS IS 1893:2016)
    # ------------------------------------------------------------------

    # ------------------------------------------------------------------
    # BIS IS 1893:2016 metadata lookup — enriches real dataset which only
    # carries zone name + intensity label (no engineering parameters)
    # ------------------------------------------------------------------
    _BIS_ZONE_META: Dict[str, Dict] = {
        "Zone II": {
            "zone_number": 2,
            "zone_factor_Z": 0.10,
            "pga_g": 0.10,
            "intensity": "V–VI (MSK Scale)",
            "description": (
                "Low Damage Risk Zone — stable cratonic regions. Covers most of "
                "peninsular India, southern Karnataka, Tamil Nadu interior, and "
                "Andhra plateau."
            ),
            "design_recommendation": (
                "Standard IS 456:2000 RCC design. Basic seismic detailing per "
                "IS 13920 recommended for buildings >4 storeys."
            ),
        },
        "Zone III": {
            "zone_number": 3,
            "zone_factor_Z": 0.16,
            "pga_g": 0.16,
            "intensity": "VI–VII (MSK Scale)",
            "description": (
                "Moderate Damage Risk Zone — covers Rajasthan plains, central MP, "
                "Bihar, eastern UP, coastal Andhra, and parts of Maharashtra Deccan."
            ),
            "design_recommendation": (
                "IS 456 RCC with IS 13920 ductile detailing for buildings >4 storeys "
                "or irregular configurations. Liquefaction check near river channels."
            ),
        },
        "Zone IV": {
            "zone_number": 4,
            "zone_factor_Z": 0.24,
            "pga_g": 0.24,
            "intensity": "VII–VIII (MSK Scale)",
            "description": (
                "High (Severe) Damage Risk Zone — Indo-Gangetic alluvial plains of "
                "Punjab, Haryana, Delhi NCT, HP Siwalik foothills, and NW Uttar Pradesh. "
                "Amritsar, Ludhiana, Chandigarh, Delhi all fall here."
            ),
            "design_recommendation": (
                "IS 13920 ductile detailing mandatory for all multi-storey RC frames. "
                "Response Spectrum Method mandatory for buildings >15m. Liquefaction "
                "assessment required in saturated alluvial zones near rivers."
            ),
        },
        "Zone V": {
            "zone_number": 5,
            "zone_factor_Z": 0.36,
            "pga_g": 0.36,
            "intensity": "IX and above (MSK Scale)",
            "description": (
                "Very High (Very Severe) Damage Risk Zone — J&K highlands, Ladakh, "
                "extreme HP, NE India (Assam, Manipur), Andaman & Nicobar Islands. "
                "Highest seismicity in India — Himalayan convergence zone."
            ),
            "design_recommendation": (
                "IS 13920 mandatory with base isolation for critical infrastructure. "
                "Site-specific response spectra required. Avoid soft/weak storey. "
                "Both seismic coefficient and RSM mandatory."
            ),
        },
    }

    # Mapping from real GeoJSON seismic_zo field → standard zone key
    _SEISMIC_ZO_MAP: Dict[str, str] = {
        "Seismic Zone-II":  "Zone II",
        "Seismic Zone-III": "Zone III",
        "Seismic Zone-IV":  "Zone IV",
        "Seismic Zone-V":   "Zone V",
        # fallback — in case the file uses short form
        "Zone-II":  "Zone II",
        "Zone-III": "Zone III",
        "Zone-IV":  "Zone IV",
        "Zone-V":   "Zone V",
        # already-normalised form (mock dataset)
        "Zone II":  "Zone II",
        "Zone III": "Zone III",
        "Zone IV":  "Zone IV",
        "Zone V":   "Zone V",
    }

    def _normalise_zone_key(self, props: Dict) -> Optional[str]:
        """
        Extract and normalise the seismic zone key from a feature's properties.
        Handles both real dataset format (seismic_zo) and mock format (zone).
        Returns None if the feature has no zone classification (null features).
        """
        raw = props.get("seismic_zo") or props.get("zone")
        if raw is None:
            return None
        return self._SEISMIC_ZO_MAP.get(str(raw).strip(), None)

    def _assess_seismic_zone(self, lat: float, lon: float) -> Dict[str, Any]:
        """Classify site seismic hazard per BIS IS 1893:2016."""
        all_matches = self._query_feature_collection(lat, lon, self._seismic_fc)

        # Filter out the 156 null-zone features present in the real dataset
        # (those are misc administrative/boundary polygons with no zone label)
        zone_matches = [
            (m, self._normalise_zone_key(m))
            for m in all_matches
            if self._normalise_zone_key(m) is not None
        ]

        if zone_matches:
            _priority = {"Zone V": 5, "Zone IV": 4, "Zone III": 3, "Zone II": 2, "Zone I": 1}
            # Pick the highest-severity zone if point is in multiple polygons
            props, zone_key = max(zone_matches, key=lambda t: _priority.get(t[1], 0))
            meta = self._BIS_ZONE_META.get(zone_key, {})

            return {
                "zone": zone_key,
                "zone_number": meta.get("zone_number"),
                "bis_standard": props.get("bis_code", "IS 1893:2016 (Part 1)"),
                "zone_factor_Z": meta.get("zone_factor_Z"),
                "peak_ground_acceleration_g": meta.get("pga_g"),
                "seismic_intensity": (
                    props.get("intensity_")          # real dataset field name
                    or props.get("intensity")        # mock dataset field name
                    or meta.get("intensity")         # fallback from lookup
                ),
                "description": props.get("description") or meta.get("description"),
                "design_recommendation": (
                    props.get("design_recommendation") or meta.get("design_recommendation")
                ),
                "key_districts": props.get("key_districts", []),
                "historical_events": props.get("historical_events", []),
                "data_source": (
                    "BIS IS 1893 (Part 1): 2016 — Real GeoJSON dataset "
                    "(Seismic_Zones.geojson, 173 features, all-India coverage)"
                ),
                "confidence": "HIGH",
            }

        # Fallback — point not inside any classified seismic polygon
        logger.info(
            "THOT: No seismic zone matched for (%.4f, %.4f) — defaulting to Zone II", lat, lon
        )
        meta = self._BIS_ZONE_META["Zone II"]
        return {
            "zone": "Zone II",
            "zone_number": meta["zone_number"],
            "bis_standard": "IS 1893:2016 (Part 1)",
            "zone_factor_Z": meta["zone_factor_Z"],
            "peak_ground_acceleration_g": meta["pga_g"],
            "seismic_intensity": meta["intensity"],
            "description": meta["description"],
            "design_recommendation": meta["design_recommendation"],
            "key_districts": [],
            "historical_events": [],
            "data_source": (
                "BIS IS 1893 (Part 1): 2016 — fallback (site outside all classified polygons)"
            ),
            "confidence": "LOW",
        }

    # ------------------------------------------------------------------
    # Assessment — Flood & Hydrological Risk
    # ------------------------------------------------------------------

    def _assess_flood_risk(self, lat: float, lon: float) -> Dict[str, Any]:
        """Assess flood and hydrological hazard from CWC/NDMA flood atlas layers."""
        matches = self._query_feature_collection(lat, lon, self._flood_fc)

        if not matches:
            return {
                "risk_level": "LOW",
                "risk_score": 1,
                "flood_zone_type": "Site lies outside identified flood-risk corridors",
                "drainage_basin": "Not within regional CWC flood atlas boundary",
                "return_period_design": "Standard drainage design — 10-year return period",
                "matched_zones": [],
                "mitigation_notes": (
                    "No special flood mitigation required. Standard IS 2156 plinth "
                    "height norms apply (≥ 450mm above NGL). Ensure adequate site "
                    "drainage gradient (1:100 minimum)."
                ),
                "regulatory_ref": "NBC 2016 Part 5 / IS 2156",
                "data_source": (
                    "CWC National Flood Atlas India / NDMA Flood Hazard Atlas 2016 / "
                    "ISRO Bhuvan LISS-IV Flood Mapping"
                ),
                "confidence": "MEDIUM",
            }

        # Risk priority for sorting
        _risk_priority = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}
        top = max(matches, key=lambda m: _risk_priority.get(m.get("risk_level", "LOW"), 0))

        return {
            "risk_level": top.get("risk_level"),
            "risk_score": _risk_priority.get(top.get("risk_level", "MEDIUM"), 2),
            "flood_zone_type": top.get("zone_type"),
            "drainage_basin": top.get("drainage_basin"),
            "river": top.get("river"),
            "return_period_design": top.get("return_period"),
            "matched_zones": [
                {"id": m.get("zone_id"), "name": m.get("zone_name"), "level": m.get("risk_level")}
                for m in matches
            ],
            "mitigation_notes": top.get("mitigation"),
            "regulatory_ref": top.get("regulatory_ref"),
            "last_major_flood_year": top.get("last_major_flood_year"),
            "flood_frequency": top.get("flood_frequency"),
            "data_source": (
                "CWC National Flood Atlas India / NDMA Flood Hazard Atlas 2016 / "
                "ISRO Bhuvan LISS-IV Flood Mapping"
            ),
            "confidence": "HIGH",
        }

    # ------------------------------------------------------------------
    # Assessment — Climate Zone (BEE ECBC / IMD)
    # ------------------------------------------------------------------

    def _assess_climate_zone(self, lat: float, lon: float, city: str) -> Dict[str, Any]:
        """Classify climate zone per BEE ECBC 2017 / IMD standards."""
        city_map: Dict[str, str] = self._climate_rules.get("city_map", {})
        zones: Dict[str, Any] = self._climate_rules.get("zones", {})

        # 1. Exact city name match (case-insensitive prefix)
        zone_key: Optional[str] = None
        city_norm = city.strip().lower()
        for name, mapped in city_map.items():
            if city_norm == name.lower() or city_norm in name.lower():
                zone_key = mapped
                break

        # 2. Coordinate-based fallback
        if not zone_key:
            zone_key = self._infer_climate_from_coords(lat, lon)
            confidence = "MEDIUM"
        else:
            confidence = "HIGH"

        zone_data = zones.get(zone_key, zones.get("Composite", {}))

        # Check for detailed city profile
        city_profile: Optional[Dict] = None
        for profile_key in ["amritsar_detailed_profile"]:
            p = self._climate_rules.get(profile_key, {})
            if p.get("city", "").lower() == city_norm:
                city_profile = p
                break

        result: Dict[str, Any] = {
            "zone": zone_key,
            "bee_ecbc_code": zone_data.get("ecbc_code"),
            "imd_classification": zone_data.get("imd_classification"),
            "description": zone_data.get("description"),
            "summer_temp_max_c": zone_data.get("summer_temp_max_c"),
            "winter_temp_min_c": zone_data.get("winter_temp_min_c"),
            "annual_rainfall_mm": zone_data.get("annual_rainfall_mm"),
            "relative_humidity_pct": zone_data.get("relative_humidity_pct"),
            "monsoon_months": zone_data.get("monsoon_months", []),
            "degree_days_cooling": zone_data.get("degree_days_cooling"),
            "degree_days_heating": zone_data.get("degree_days_heating"),
            "solar_radiation_kwh_m2_yr": zone_data.get("solar_radiation_kwh_m2_yr"),
            "passive_design_strategies": zone_data.get("passive_design_strategies", []),
            "ecbc_envelope_requirements": zone_data.get("ecbc_envelope_requirements", {}),
            "key_bioclimatic_challenge": zone_data.get("key_bioclimatic_challenge"),
            "material_recommendations": zone_data.get("material_recommendations", []),
            "data_source": (
                "BEE ECBC 2017 (Table 2 district demarcation) / "
                "IMD Climatological Atlas of India / NBC 2016 Part 8"
            ),
            "confidence": confidence,
        }

        if city_profile:
            result["city_detailed_profile"] = city_profile

        return result

    def _infer_climate_from_coords(self, lat: float, lon: float) -> str:
        """Rough coordinate-based climate zone inference when city is not in map."""
        if lat > 34.0:
            return "Cold"
        if lat > 31.0 and lon > 76.5:
            return "Temperate"  # HP/Uttarakhand foothills
        if lat > 28.0:
            return "Composite"  # North Indian plains
        if lon < 72.5 or (lat < 28.0 and lon < 74.0):
            return "Hot & Dry"  # Rajasthan/Kutch
        if lon > 78.0 and lat < 15.0:
            return "Warm & Humid"  # Southeast coast
        if lon > 76.0 and lat < 20.0:
            return "Warm & Humid"  # West coast, peninsular coast
        return "Composite"

    # ------------------------------------------------------------------
    # Assessment — Terrain & Elevation (ISRO Bhuvan DEM mock-integration)
    # ------------------------------------------------------------------

    def _assess_terrain(self, lat: float, lon: float) -> Dict[str, Any]:
        """
        Mock-integrated terrain assessment following ISRO Bhuvan Cartosat-1 DEM
        (CartoDEM v3R1, 30m resolution) guidelines.

        In production: replace with a live call to Bhuvan WCS endpoint:
          https://bhuvan-app3.nrsc.gov.in/bhuvan/wcs?SERVICE=WCS&REQUEST=GetCoverage
          &COVERAGE=cartodem&CRS=EPSG:4326&BBOX=...&FORMAT=GeoTIFF

        Elevation is approximated here using regional geomorphological models.
        """
        elev_m, terrain_class, slope_pct, drainage_pattern = self._model_terrain(lat, lon)

        return {
            "approx_elevation_m_amsl": elev_m,
            "terrain_classification": terrain_class,
            "slope_percent": slope_pct,
            "drainage_pattern": drainage_pattern,
            "groundwater_depth_estimate": self._model_groundwater(lat, lon),
            "soil_type_estimate": self._model_soil_type(lat, lon),
            "bearing_capacity_estimate_kn_m2": self._model_bearing_capacity(lat, lon),
            "liquefaction_susceptibility": self._assess_liquefaction(lat, lon),
            "dem_source": (
                "ISRO Bhuvan Cartosat-1 DEM — CartoDEM v3R1 (30m resolution) — "
                "Mock integration. Production: Bhuvan WCS API call required."
            ),
            "confidence": "MEDIUM — estimated from geomorphological model; production requires live DEM query",
        }

    def _model_terrain(self, lat: float, lon: float):
        """Return (elevation_m, terrain_class, slope_pct, drainage_pattern)."""
        # Punjab / Haryana alluvial plains (Amritsar region)
        if 30.0 <= lat <= 33.5 and 73.0 <= lon <= 77.5:
            elev = round(200 + (lat - 30.0) * 35 + (lon - 73.0) * 8, 1)
            return elev, "Level Alluvial Plain", "< 1%", "Sheet-flow — very low gradient (Doab alluvium)"

        # Himalayan foothills / Shivalik range
        if lat > 30.5 and lon > 76.0:
            elev = round(450 + (lat - 30.5) * 280 + (lon - 76.0) * 120, 1)
            return elev, "Undulating Foothill / Shivalik", "5–15%", "Dendritic — moderate gradient (colluvium)"

        # High Himalayan zone
        if lat > 33.0:
            elev = round(1800 + (lat - 33.0) * 1500, 1)
            return elev, "High Himalayan Terrain", "15–45%", "Braided / Trellis — steep catchment"

        # Rajasthan arid plains
        if lat < 28.5 and lon < 74.0:
            elev = round(180 + (28.5 - lat) * 15, 1)
            return elev, "Flat Arid Plain / Thar Desert fringe", "< 0.5%", "Inland basin — endorheic / aeolian"

        # Generic Indo-Gangetic plain
        elev = round(120 + lat * 4 + lon * 1.5, 1)
        return elev, "Gently Sloping Plain", "0.5–2%", "Braided alluvial — low gradient"

    def _model_groundwater(self, lat: float, lon: float) -> str:
        if 30.0 <= lat <= 33.0 and 73.0 <= lon <= 76.5:
            return "3–8 m BGL — Punjab alluvial aquifer (shallow water table; declining due to over-extraction)"
        if lat > 33.0:
            return "15–40 m BGL — Himalayan foothill (confined aquifer)"
        if lat < 28.0 and lon < 74.0:
            return "25–80 m BGL — Rajasthan arid zone (deep saline aquifer; freshwater scarce)"
        return "5–15 m BGL — Alluvial plain (phreatic aquifer)"

    def _model_soil_type(self, lat: float, lon: float) -> str:
        if 30.0 <= lat <= 33.5 and 73.0 <= lon <= 77.5:
            return (
                "Deep alluvial silt-loam (Indus-Gangetic alluvium — Holocene) — "
                "IS 1498:1970 Classification: CL / ML"
            )
        if lat > 33.0:
            return "Rocky colluvium / Moraine (Quaternary glacial) — IS 1498: GW / GC"
        if lat < 28.0 and lon < 74.0:
            return "Aeolian fine sand (Rajasthan desert) — IS 1498: SP / SM"
        return "Medium-deep alluvium (Ganga plain) — IS 1498: CL / CI"

    def _model_bearing_capacity(self, lat: float, lon: float) -> str:
        if 30.0 <= lat <= 33.5 and 73.0 <= lon <= 77.5:
            return "100–150 kN/m² (safe, shallow foundation on dense alluvium — IS 6403)"
        if lat > 33.0:
            return "300–600 kN/m² (rock/dense gravel — high bearing capacity)"
        if lat < 28.0 and lon < 74.0:
            return "50–80 kN/m² (loose sand — requires deep foundation or ground improvement)"
        return "80–130 kN/m² (medium alluvium — raft or strip foundation recommended)"

    def _assess_liquefaction(self, lat: float, lon: float) -> str:
        """Liquefaction susceptibility per IS 1893:2016 and NDMA guidelines."""
        if 30.0 <= lat <= 33.0 and 73.0 <= lon <= 76.5:
            return (
                "MEDIUM–HIGH — Saturated alluvial sands in Punjab plains susceptible to "
                "liquefaction under Zone IV seismic loading. Site-specific study mandatory "
                "for buildings >G+2 (IS 1893:2016 Clause 6.3.5)."
            )
        if lat > 33.0:
            return "LOW — Rocky / dense gravel terrain; liquefaction risk negligible."
        if lat < 28.0 and lon < 74.0:
            return (
                "MEDIUM — Loose aeolian sands susceptible to liquefaction if water table is "
                "shallow. Zone II seismic loading reduces overall risk."
            )
        return (
            "MEDIUM — Alluvial plain soils may be susceptible near river channels. "
            "Standard liquefaction assessment per IS 1893:2016 Annex F recommended."
        )

    # ------------------------------------------------------------------
    # Feasibility scoring
    # ------------------------------------------------------------------

    def _compute_feasibility_score(
        self,
        seismic: Dict,
        flood: Dict,
        climate: Dict,
        terrain: Dict,
    ) -> Dict[str, Any]:
        """
        Compute a composite site feasibility score (0–100) from the four assessments.
        Weights: Seismic 35%, Flood 30%, Terrain 20%, Climate 15%.
        """
        # --- Seismic score ---
        _seismic_scores = {"Zone V": 35, "Zone IV": 60, "Zone III": 78, "Zone II": 90, "Zone I": 97}
        s_score = _seismic_scores.get(seismic.get("zone", "Zone II"), 70)

        # --- Flood score ---
        _flood_scores = {1: 90, 2: 60, 3: 30}
        f_score = _flood_scores.get(flood.get("risk_score", 1), 65)

        # --- Terrain score ---
        terrain_class = terrain.get("terrain_classification", "")
        if "Plain" in terrain_class and "Arid" not in terrain_class:
            t_score = 80
        elif "Foothill" in terrain_class or "Undulating" in terrain_class:
            t_score = 68
        elif "High Himalayan" in terrain_class:
            t_score = 45
        else:
            t_score = 70

        # --- Climate score ---
        _climate_scores = {
            "Composite": 72,
            "Temperate": 88,
            "Hot & Dry": 62,
            "Warm & Humid": 68,
            "Cold": 50,
        }
        c_score = _climate_scores.get(climate.get("zone", "Composite"), 70)

        overall = round(
            s_score * 0.35 + f_score * 0.30 + t_score * 0.20 + c_score * 0.15,
            1,
        )

        if overall >= 78:
            verdict = "FEASIBLE"
            color = "green"
            recommendation = (
                "Site exhibits broadly favourable conditions across all primary risk vectors. "
                "Proceed to structural design with standard seismic detailing and "
                "ECBC-compliant envelope specification."
            )
        elif overall >= 55:
            verdict = "CONDITIONALLY FEASIBLE"
            color = "amber"
            recommendation = (
                "Site is developable with targeted mitigation measures. Address seismic "
                "detailing (IS 13920), flood resilience plinth, and passive climate design. "
                "Commission geo-technical investigation before foundation design."
            )
        else:
            verdict = "HIGH RISK — DETAILED STUDY REQUIRED"
            color = "red"
            recommendation = (
                "Significant multi-vector hazard exposure. Independent geo-technical report, "
                "hydrological study, and seismic micro-zonation mandatory before any "
                "statutory submission. Consider alternative site options."
            )

        return {
            "overall_score": overall,
            "max_score": 100,
            "verdict": verdict,
            "verdict_color": color,
            "recommendation": recommendation,
            "component_scores": {
                "seismic": {"score": s_score, "weight": "35%"},
                "flood": {"score": f_score, "weight": "30%"},
                "terrain": {"score": t_score, "weight": "20%"},
                "climate": {"score": c_score, "weight": "15%"},
            },
        }

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    async def analyze_site(self, site_data: dict) -> Dict[str, Any]:
        """
        Compile a Site Feasibility Brief for the given site.

        Parameters
        ----------
        site_data : dict
            Keys accepted:
              - latitude      float  (default: 31.6340 — Amritsar)
              - longitude     float  (default: 74.8723 — Amritsar)
              - city          str    (default: "Amritsar")
              - state         str    (default: "Punjab")
              - project_name  str    (default: "Unnamed Project")

        Returns
        -------
        dict
            Complete Site Feasibility Brief with seismic, flood, climate,
            terrain assessments, and a composite feasibility score.
        """
        lat: float = float(site_data.get("latitude", DEFAULT_LAT))
        lon: float = float(site_data.get("longitude", DEFAULT_LON))
        city: str = str(site_data.get("city", DEFAULT_CITY))
        state: str = str(site_data.get("state", DEFAULT_STATE))
        project_name: str = str(site_data.get("project_name", "Unnamed Project"))

        logger.info(
            "THOT: Analyzing site — %s, %s (%.4f, %.4f)", city, state, lat, lon
        )

        # Load datasets synchronously (idempotent — runs only once per instance)
        self._load_datasets()

        # Run all four assessments concurrently in the thread pool (CPU-bound Shapely ops)
        seismic, flood, climate, terrain = await asyncio.gather(
            asyncio.to_thread(self._assess_seismic_zone, lat, lon),
            asyncio.to_thread(self._assess_flood_risk, lat, lon),
            asyncio.to_thread(self._assess_climate_zone, lat, lon, city),
            asyncio.to_thread(self._assess_terrain, lat, lon),
        )

        feasibility = self._compute_feasibility_score(seismic, flood, climate, terrain)

        return {
            "agent": "THOT",
            "agent_role": "Site & Terrain Intelligence",
            "version": "1.0.0",
            "brief_title": f"Site Feasibility Brief — {project_name}",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "site": {
                "project_name": project_name,
                "city": city,
                "state": state,
                "latitude": lat,
                "longitude": lon,
                "coordinate_system": "WGS84 / EPSG:4326",
            },
            "assessments": {
                "seismic_zone": seismic,
                "flood_risk": flood,
                "climate_zone": climate,
                "terrain_elevation": terrain,
            },
            "feasibility_summary": feasibility,
            "spatial_engine": (
                f"{'Shapely 2.x point-in-polygon' if SHAPELY_AVAILABLE else 'Bounding-box fallback'}"
                " + GeoJSON feature cross-reference"
            ),
            "datasets_used": [
                "BIS IS 1893:2016 Seismic Zones — North India GeoJSON",
                "CWC / NDMA National Flood Atlas — Punjab / North India GeoJSON",
                "BEE ECBC 2017 / IMD Climate Zone Rules JSON",
                "ISRO Bhuvan CartoDEM v3R1 — Mock terrain model (30m)",
            ],
            "disclaimer": (
                "This brief is produced from reference vector datasets for pre-feasibility "
                "screening purposes only. All findings must be validated against live NDMA, "
                "BIS, IMD, Bhuvan, and local municipal data sources before submission to "
                "statutory authorities. THOT output does not constitute a formal geo-technical "
                "or hydrological report."
            ),
        }
