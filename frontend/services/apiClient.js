import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const API_BASE = `${BACKEND_URL}/api`;

const axiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Attach Authorization Bearer token automatically if logged in
axiosInstance.interceptors.request.use(
  (config) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("urbanis_token") : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for clear error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      "Network error occurred communicating with Urbanis AI backend";
    console.error("[UrbanisApiClient Error]:", message, error.response?.data);
    return Promise.reject(new Error(message));
  }
);

/**
 * Intelligent procedural floor plan synthesizer for fallback or instant generation
 */
function synthesizeProceduralLayout({ plotSize, rooms = [] }) {
  const plotW = Math.max(300, (plotSize?.width || 25) * 20); // 20px per meter
  const plotL = Math.max(300, (plotSize?.length || 20) * 20);

  // Standard room type sizes in px (20px = 1m)
  const roomDefaults = {
    living: { name: "Living Room", width: 220, height: 180, type: "living" },
    bedroom: { name: "Master Bedroom", width: 180, height: 160, type: "bedroom" },
    guest_bedroom: { name: "Guest Bedroom", width: 160, height: 140, type: "bedroom" },
    kitchen: { name: "Modular Kitchen", width: 150, height: 140, type: "kitchen" },
    bathroom: { name: "Bathroom", width: 110, height: 110, type: "bathroom" },
    dining: { name: "Dining Space", width: 160, height: 140, type: "dining" },
    balcony: { name: "Balcony Deck", width: 180, height: 80, type: "balcony" },
  };

  const generatedRooms = [];
  let currentX = 80;
  let currentY = 80;
  let maxHeightInRow = 0;

  const roomRequests =
    rooms.length > 0
      ? rooms
      : [
          { type: "living", count: 1 },
          { type: "bedroom", count: 2 },
          { type: "kitchen", count: 1 },
          { type: "bathroom", count: 2 },
          { type: "dining", count: 1 },
        ];

  let idCounter = 1;
  roomRequests.forEach((req) => {
    const count = req.count || 1;
    const def = roomDefaults[req.type] || {
      name: req.name || "Room",
      width: 160,
      height: 140,
      type: req.type || "default",
    };

    for (let i = 0; i < count; i++) {
      const rw = req.width ? req.width * 20 : def.width;
      const rh = req.height ? req.height * 20 : def.height;

      // Wrap to next row if exceeding plot boundary
      if (currentX + rw > plotW - 40) {
        currentX = 80;
        currentY += maxHeightInRow + 20;
        maxHeightInRow = 0;
      }

      generatedRooms.push({
        id: `room-${idCounter++}`,
        name: count > 1 ? `${def.name} ${i + 1}` : def.name,
        type: def.type,
        x: currentX,
        y: currentY,
        width: rw,
        height: rh,
      });

      currentX += rw + 20;
      maxHeightInRow = Math.max(maxHeightInRow, rh);
    }
  });

  return {
    plotDimensions: { width: plotW, length: plotL },
    unitsPerMeter: 20,
    rooms: generatedRooms,
  };
}

/**
 * Urbanis AI Architectural API Client
 */
export const apiClient = {
  /**
   * Send project parameters (plot size, room schedule, location) to backend agents
   * to generate compiled 2D & 3D layout coordinates and regulatory clearances
   */
  async generateFloorPlan({ projectId, plotSize, rooms, style = "modern_modular", location = "" }) {
    try {
      // 1. If project ID is provided, query the backend IRIS & KAEL agents
      if (projectId) {
        // Run KAEL agent for regulatory clearances
        const kaelRes = await axiosInstance.post(`/projects/${projectId}/agents/kael`).catch(() => null);
        // Run IRIS agent for generative layout synthesis
        const irisRes = await axiosInstance.post(`/projects/${projectId}/agents/iris`).catch(() => null);

        // Fetch latest project state
        const projectRes = await axiosInstance.get(`/projects/${projectId}`);
        const project = projectRes.data;

        // If backend project has modules, map them to room layout
        if (project.design?.modules && project.design.modules.length > 0) {
          const mappedRooms = project.design.modules.map((m, idx) => ({
            id: m.instance_id || `mod-${idx + 1}`,
            name: m.name || `Module ${idx + 1}`,
            type: m.type || "living",
            x: m.x || 100 + (idx % 3) * 160,
            y: m.y || 100 + Math.floor(idx / 3) * 160,
            width: (m.width || 8) * 20,
            height: (m.length || 7) * 20,
            material: m.material,
          }));

          return {
            success: true,
            layout: {
              plotDimensions: {
                width: (project.site?.area_m2 ? Math.sqrt(project.site.area_m2) * 20 : 600),
                length: (project.site?.area_m2 ? Math.sqrt(project.site.area_m2) * 20 : 500),
              },
              unitsPerMeter: 20,
              rooms: mappedRooms,
            },
            kael: kaelRes?.data,
            iris: irisRes?.data,
          };
        }
      }

      // Procedural layout synthesis fallback
      const synthesized = synthesizeProceduralLayout({ plotSize, rooms });
      return {
        success: true,
        layout: synthesized,
        note: "Generated via Urbanis spatial synthesis engine",
      };
    } catch (err) {
      console.warn("Falling back to procedural synthesis due to error:", err.message);
      const synthesized = synthesizeProceduralLayout({ plotSize, rooms });
      return {
        success: true,
        layout: synthesized,
        fallback: true,
        error: err.message,
      };
    }
  },

  /**
   * Retrieve the active compiled layout for a project
   */
  async getProjectLayout(projectId) {
    const res = await axiosInstance.get(`/projects/${projectId}`);
    const project = res.data;
    const modules = project.design?.modules || [];

    if (modules.length > 0) {
      return {
        plotDimensions: {
          width: project.site?.width ? project.site.width * 20 : 600,
          length: project.site?.length ? project.site.length * 20 : 500,
        },
        unitsPerMeter: 20,
        rooms: modules.map((m, idx) => ({
          id: m.instance_id || `mod-${idx + 1}`,
          name: m.name || `Room ${idx + 1}`,
          type: m.type || "living",
          x: m.x || 100 + (idx % 3) * 180,
          y: m.y || 100 + Math.floor(idx / 3) * 160,
          width: (m.width || 9) * 20,
          height: (m.length || 8) * 20,
          material: m.material,
        })),
        totals: project.design?.totals,
      };
    }

    return synthesizeProceduralLayout({ plotSize: { width: 30, length: 25 } });
  },

  /**
   * Persist 2D / 3D modified room coordinates back to backend project design
   */
  async updateProjectLayout(projectId, layoutData) {
    const rooms = Array.isArray(layoutData) ? layoutData : layoutData.rooms || [];
    const scale = 1 / (layoutData.unitsPerMeter || 20);

    const modules = rooms.map((r, idx) => ({
      instance_id: r.id || `mod-${idx + 1}`,
      name: r.name,
      type: r.type,
      x: r.x,
      y: r.y,
      width: Math.round(r.width * scale),
      length: Math.round(r.height * scale),
      material: r.material || "timber_crosslam",
      module_id: r.module_id || "mod_standard_res",
    }));

    const res = await axiosInstance.put(`/projects/${projectId}`, {
      design: {
        modules,
      },
    });
    return res.data;
  },

  /**
   * Get detailed CapEx and embodied carbon cost breakdown from CRONOS & TERRA agents
   */
  async getCostBreakdown(projectId) {
    // Run CRONOS Quantity Surveyor Agent
    const cronosRes = await axiosInstance.post(`/projects/${projectId}/agents/cronos`).catch(() => null);
    // Run TERRA Procurement & Carbon Agent
    const terraRes = await axiosInstance.post(`/projects/${projectId}/agents/terra`).catch(() => null);

    const projectRes = await axiosInstance.get(`/projects/${projectId}`);
    const totals = projectRes.data?.design?.totals || {};

    return {
      success: true,
      totals,
      cronos: cronosRes?.data,
      terra: terraRes?.data,
    };
  },

  /**
   * Run any specific AI Agent on a project (THOT, KAEL, IRIS, CRONOS, TERRA, LYRA)
   */
  async runAgent(projectId, agentId) {
    const res = await axiosInstance.post(`/projects/${projectId}/agents/${agentId}`);
    return res.data;
  },

  /**
   * Run THOT spatial risk assessment (Seismic IS 1893, Flood Risk, NBC Climate, Soil)
   */
  async runSpatialAssessment(projectId, coordinates) {
    // Coordinates can update project site location
    if (coordinates && (coordinates.lat || coordinates.location)) {
      await axiosInstance.put(`/projects/${projectId}`, {
        location: coordinates.location || `${coordinates.lat}, ${coordinates.lon}`,
      });
    }
    const res = await axiosInstance.post(`/projects/${projectId}/agents/thot`);
    return res.data;
  },
};

export default apiClient;
