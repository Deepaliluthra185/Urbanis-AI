import React, { useEffect, useRef, useState, useCallback } from "react";
import Konva from "konva";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Trash2,
  Plus,
  Download,
  Move,
  Layers,
} from "lucide-react";

/**
 * Default color palette for architectural room categories
 */
const ROOM_TYPE_COLORS = {
  living: { fill: "rgba(56, 189, 248, 0.25)", stroke: "#0284c7", text: "#0369a1" },
  bedroom: { fill: "rgba(168, 85, 247, 0.25)", stroke: "#9333ea", text: "#7e22ce" },
  kitchen: { fill: "rgba(251, 191, 36, 0.25)", stroke: "#d97706", text: "#b45309" },
  bathroom: { fill: "rgba(45, 212, 191, 0.25)", stroke: "#0d9488", text: "#0f766e" },
  dining: { fill: "rgba(244, 114, 182, 0.25)", stroke: "#db2777", text: "#be185d" },
  balcony: { fill: "rgba(74, 222, 128, 0.25)", stroke: "#16a34a", text: "#15803d" },
  circulation: { fill: "rgba(148, 163, 184, 0.25)", stroke: "#64748b", text: "#475569" },
  default: { fill: "rgba(99, 102, 241, 0.25)", stroke: "#4f46e5", text: "#4338ca" },
};

const DEFAULT_ROOMS = [
  { id: "room-1", name: "Living Room", type: "living", x: 100, y: 100, width: 220, height: 180 },
  { id: "room-2", name: "Master Bedroom", type: "bedroom", x: 340, y: 100, width: 180, height: 160 },
  { id: "room-3", name: "Kitchen", type: "kitchen", x: 100, y: 300, width: 150, height: 140 },
  { id: "room-4", name: "Bathroom", type: "bathroom", x: 270, y: 300, width: 110, height: 110 },
];

const GRID_SIZE = 20; // 20px = 1 meter approx scale

export default function FloorPlanCanvas2D({
  rooms = DEFAULT_ROOMS,
  onRoomsChange,
  selectedRoomId: controlledSelectedRoomId,
  onSelectRoom,
  plotDimensions = { width: 600, length: 500 },
  readOnly = false,
  className = "",
}) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const roomLayerRef = useRef(null);
  const gridLayerRef = useRef(null);
  const plotLayerRef = useRef(null);

  const [localRooms, setLocalRooms] = useState(rooms);
  const [internalSelectedId, setInternalSelectedId] = useState(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeTool, setActiveTool] = useState("select"); // 'select' | 'pan'

  const activeSelectedId =
    controlledSelectedRoomId !== undefined ? controlledSelectedRoomId : internalSelectedId;

  // Sync internal rooms if external prop updates
  useEffect(() => {
    if (rooms && Array.isArray(rooms)) {
      setLocalRooms(rooms);
    }
  }, [rooms]);

  const notifyChange = useCallback(
    (newRooms) => {
      setLocalRooms(newRooms);
      if (onRoomsChange) {
        onRoomsChange(newRooms);
      }
    },
    [onRoomsChange]
  );

  const handleSelectRoom = useCallback(
    (id) => {
      setInternalSelectedId(id);
      if (onSelectRoom) onSelectRoom(id);
    },
    [onSelectRoom]
  );

  // Snap coordinate helper
  const snap = useCallback(
    (val) => (snapToGrid ? Math.round(val / GRID_SIZE) * GRID_SIZE : val),
    [snapToGrid]
  );

  // Initialize and maintain Konva Stage
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 550;

    // Build stage
    const stage = new Konva.Stage({
      container,
      width,
      height,
      draggable: activeTool === "pan",
    });
    stageRef.current = stage;

    // Layers
    const gridLayer = new Konva.Layer({ listening: false });
    const plotLayer = new Konva.Layer({ listening: false });
    const roomLayer = new Konva.Layer();
    const interactionLayer = new Konva.Layer();

    gridLayerRef.current = gridLayer;
    plotLayerRef.current = plotLayer;
    roomLayerRef.current = roomLayer;

    // Transformer for scaling / moving room rectangles
    const tr = new Konva.Transformer({
      rotateEnabled: false,
      keepRatio: false,
      enabledAnchors: [
        "top-left",
        "top-center",
        "top-right",
        "middle-right",
        "middle-left",
        "bottom-left",
        "bottom-center",
        "bottom-right",
      ],
      borderStroke: "#2563eb",
      borderStrokeWidth: 1.5,
      borderDash: [4, 4],
      anchorStroke: "#2563eb",
      anchorFill: "#ffffff",
      anchorSize: 9,
      anchorCornerRadius: 2,
    });
    transformerRef.current = tr;
    interactionLayer.add(tr);

    stage.add(gridLayer);
    stage.add(plotLayer);
    stage.add(roomLayer);
    stage.add(interactionLayer);

    // Click on empty canvas deselects
    stage.on("click tap", (e) => {
      if (e.target === stage) {
        handleSelectRoom(null);
        tr.nodes([]);
        interactionLayer.batchDraw();
      }
    });

    // Zoom on mouse wheel
    stage.on("wheel", (e) => {
      e.evt.preventDefault();
      const scaleBy = 1.1;
      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();

      if (!pointer) return;

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
      const clampedScale = Math.max(0.3, Math.min(newScale, 3.5));

      stage.scale({ x: clampedScale, y: clampedScale });
      const newPos = {
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      };
      stage.position(newPos);
      stage.batchDraw();
      setZoomLevel(Number(clampedScale.toFixed(2)));
    });

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      if (nw && nh) {
        stage.width(nw);
        stage.height(nh);
        stage.batchDraw();
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      stage.destroy();
    };
  }, [handleSelectRoom, activeTool]);

  // Redraw Grid Layer
  useEffect(() => {
    const gridLayer = gridLayerRef.current;
    if (!gridLayer || !stageRef.current) return;

    gridLayer.destroyChildren();

    if (showGrid) {
      const stage = stageRef.current;
      const width = 3000;
      const height = 3000;
      const startX = -1000;
      const startY = -1000;

      // Minor lines
      for (let x = startX; x <= width; x += GRID_SIZE) {
        const isMajor = (x - startX) % (GRID_SIZE * 5) === 0;
        gridLayer.add(
          new Konva.Line({
            points: [x, startY, x, height],
            stroke: isMajor ? "rgba(148, 163, 184, 0.35)" : "rgba(226, 232, 240, 0.6)",
            strokeWidth: isMajor ? 1 : 0.6,
          })
        );
      }

      for (let y = startY; y <= height; y += GRID_SIZE) {
        const isMajor = (y - startY) % (GRID_SIZE * 5) === 0;
        gridLayer.add(
          new Konva.Line({
            points: [startX, y, width, y],
            stroke: isMajor ? "rgba(148, 163, 184, 0.35)" : "rgba(226, 232, 240, 0.6)",
            strokeWidth: isMajor ? 1 : 0.6,
          })
        );
      }
    }

    gridLayer.batchDraw();
  }, [showGrid]);

  // Redraw Plot boundary
  useEffect(() => {
    const plotLayer = plotLayerRef.current;
    if (!plotLayer) return;

    plotLayer.destroyChildren();

    if (plotDimensions && plotDimensions.width && plotDimensions.length) {
      const plotRect = new Konva.Rect({
        x: 60,
        y: 60,
        width: plotDimensions.width,
        height: plotDimensions.length,
        stroke: "#059669",
        strokeWidth: 2,
        dash: [8, 6],
        fill: "rgba(16, 185, 129, 0.04)",
      });

      const label = new Konva.Text({
        x: 65,
        y: 42,
        text: `Plot Boundary (${(plotDimensions.width / 20).toFixed(1)}m × ${(
          plotDimensions.length / 20
        ).toFixed(1)}m)`,
        fontSize: 12,
        fontFamily: "monospace",
        fill: "#059669",
      });

      plotLayer.add(plotRect);
      plotLayer.add(label);
    }

    plotLayer.batchDraw();
  }, [plotDimensions]);

  // Render Rooms & attach Transformer
  useEffect(() => {
    const roomLayer = roomLayerRef.current;
    const tr = transformerRef.current;
    if (!roomLayer || !tr) return;

    roomLayer.destroyChildren();

    let nodeToAttach = null;

    localRooms.forEach((room) => {
      const colors = ROOM_TYPE_COLORS[room.type] || ROOM_TYPE_COLORS.default;
      const isSelected = room.id === activeSelectedId;

      const group = new Konva.Group({
        id: room.id,
        x: room.x,
        y: room.y,
        draggable: !readOnly && activeTool === "select",
      });

      // Background rect
      const rect = new Konva.Rect({
        name: "room-rect",
        width: room.width,
        height: room.height,
        fill: colors.fill,
        stroke: isSelected ? "#2563eb" : colors.stroke,
        strokeWidth: isSelected ? 2.5 : 1.5,
        cornerRadius: 4,
        shadowColor: "black",
        shadowBlur: isSelected ? 10 : 2,
        shadowOpacity: isSelected ? 0.15 : 0.05,
        shadowOffset: { x: 0, y: 2 },
      });

      // Room Title
      const title = new Konva.Text({
        name: "room-title",
        x: 10,
        y: 10,
        text: room.name || "Room",
        fontSize: 13,
        fontStyle: "bold",
        fontFamily: "Inter, sans-serif",
        fill: colors.text,
      });

      // Area label (1px = 0.05m -> 20px = 1m)
      const areaM2 = ((room.width / GRID_SIZE) * (room.height / GRID_SIZE)).toFixed(1);
      const dimText = new Konva.Text({
        name: "room-dims",
        x: 10,
        y: 28,
        text: `${areaM2} m² (${(room.width / GRID_SIZE).toFixed(1)}m × ${(
          room.height / GRID_SIZE
        ).toFixed(1)}m)`,
        fontSize: 11,
        fontFamily: "monospace",
        fill: colors.text,
        opacity: 0.85,
      });

      group.add(rect);
      group.add(title);
      group.add(dimText);

      // Room selection
      group.on("click tap", (e) => {
        e.cancelBubble = true;
        handleSelectRoom(room.id);
      });

      // Dragging events with optional snap to grid
      group.on("dragmove", () => {
        if (snapToGrid) {
          group.position({
            x: snap(group.x()),
            y: snap(group.y()),
          });
        }
      });

      group.on("dragend", () => {
        const nx = snap(group.x());
        const ny = snap(group.y());
        const updated = localRooms.map((r) => (r.id === room.id ? { ...r, x: nx, y: ny } : r));
        notifyChange(updated);
      });

      // Transform events (resize / scale via Konva.Transformer)
      group.on("transformend", () => {
        const scaleX = group.scaleX();
        const scaleY = group.scaleY();

        // Reset scales on group and apply directly to width/height
        group.scaleX(1);
        group.scaleY(1);

        const newWidth = Math.max(GRID_SIZE * 2, snap(room.width * scaleX));
        const newHeight = Math.max(GRID_SIZE * 2, snap(room.height * scaleY));
        const nx = snap(group.x());
        const ny = snap(group.y());

        const updated = localRooms.map((r) =>
          r.id === room.id
            ? {
                ...r,
                x: nx,
                y: ny,
                width: newWidth,
                height: newHeight,
              }
            : r
        );
        notifyChange(updated);
      });

      roomLayer.add(group);

      if (isSelected) {
        nodeToAttach = group;
      }
    });

    if (nodeToAttach && !readOnly && activeTool === "select") {
      tr.nodes([nodeToAttach]);
    } else {
      tr.nodes([]);
    }

    roomLayer.batchDraw();
    tr.getLayer()?.batchDraw();
  }, [
    localRooms,
    activeSelectedId,
    readOnly,
    activeTool,
    handleSelectRoom,
    snapToGrid,
    snap,
    notifyChange,
  ]);

  // Zoom Controls
  const handleZoom = (direction) => {
    const stage = stageRef.current;
    if (!stage) return;
    const factor = direction === "in" ? 1.2 : 0.83;
    const current = stage.scaleX();
    const next = Math.max(0.3, Math.min(current * factor, 3.5));
    stage.scale({ x: next, y: next });
    stage.batchDraw();
    setZoomLevel(Number(next.toFixed(2)));
  };

  const handleResetView = () => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.scale({ x: 1, y: 1 });
    stage.position({ x: 0, y: 0 });
    stage.batchDraw();
    setZoomLevel(1);
  };

  // Add Room
  const handleAddRoom = (type = "bedroom") => {
    const id = `room-${Date.now()}`;
    const nameMap = {
      living: "Living Room",
      bedroom: "Bedroom",
      kitchen: "Kitchen",
      bathroom: "Bathroom",
      dining: "Dining Room",
      balcony: "Balcony",
    };
    const newRoom = {
      id,
      name: nameMap[type] || "New Room",
      type,
      x: snap(120 + (localRooms.length % 4) * 40),
      y: snap(120 + (localRooms.length % 4) * 40),
      width: type === "bathroom" ? 100 : 180,
      height: type === "bathroom" ? 100 : 140,
    };
    const updated = [...localRooms, newRoom];
    notifyChange(updated);
    handleSelectRoom(id);
  };

  // Delete Selected Room
  const handleDeleteSelected = () => {
    if (!activeSelectedId) return;
    const updated = localRooms.filter((r) => r.id !== activeSelectedId);
    notifyChange(updated);
    handleSelectRoom(null);
  };

  // Export Canvas to PNG
  const handleExportImage = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const dataURL = stage.toDataURL({ pixelRatio: 2 });
    const link = document.createElement("a");
    link.download = "urbanis-floorplan-2d.png";
    link.href = dataURL;
    link.click();
  };

  return (
    <div
      className={`relative flex flex-col w-full h-full min-h-[500px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl ${className}`}
    >
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-800 text-slate-200 text-xs shadow-lg">
        {/* Left: Mode & Room Tools */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTool("select")}
            className={`px-2.5 py-1.5 rounded flex items-center gap-1 transition ${
              activeTool === "select"
                ? "bg-blue-600 text-white font-medium"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
            title="Select & Transform Rooms"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Select</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool("pan")}
            className={`px-2.5 py-1.5 rounded flex items-center gap-1 transition ${
              activeTool === "pan"
                ? "bg-blue-600 text-white font-medium"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
            title="Pan / Navigate Canvas"
          >
            <Move className="w-3.5 h-3.5" />
            <span>Pan</span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          {/* Add Room Presets */}
          <button
            type="button"
            onClick={() => handleAddRoom("bedroom")}
            disabled={readOnly}
            className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded flex items-center gap-1 transition"
          >
            <Plus className="w-3 h-3 text-emerald-400" />
            <span>+ Room</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddRoom("kitchen")}
            disabled={readOnly}
            className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded flex items-center gap-1 transition"
          >
            <Plus className="w-3 h-3 text-amber-400" />
            <span>+ Kitchen</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddRoom("bathroom")}
            disabled={readOnly}
            className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded flex items-center gap-1 transition"
          >
            <Plus className="w-3 h-3 text-cyan-400" />
            <span>+ Bath</span>
          </button>

          {activeSelectedId && !readOnly && (
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="px-2.5 py-1.5 bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800/60 rounded flex items-center gap-1 transition ml-1"
              title="Delete Selected Room"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Delete</span>
            </button>
          )}
        </div>

        {/* Right: Grid, Zoom & Export Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`px-2 py-1.5 rounded flex items-center gap-1 transition ${
              snapToGrid ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-slate-800 text-slate-400"
            }`}
            title="Toggle Snap to Grid (20px)"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Snap {snapToGrid ? "On" : "Off"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2 py-1.5 rounded flex items-center gap-1 transition ${
              showGrid ? "bg-slate-800 text-slate-200" : "bg-slate-900 text-slate-500"
            }`}
            title="Toggle Grid Lines"
          >
            <span>Grid</span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          <button
            type="button"
            onClick={() => handleZoom("out")}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="font-mono text-[11px] text-slate-400 min-w-[36px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>

          <button
            type="button"
            onClick={() => handleZoom("in")}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleResetView}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
            title="Reset View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleExportImage}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center gap-1 transition"
            title="Export 2D Layout as PNG"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Main Konva Stage Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-full flex-1 cursor-crosshair bg-slate-950 touch-none"
        style={{ minHeight: "480px" }}
      />

      {/* Bottom Status / Legend Bar */}
      <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800 text-slate-400 text-[11px] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-slate-300 font-medium">Urbanis 2D Studio</span>
          <span>• 1 Grid Cell = 1.0 Meter</span>
          <span>• Total Rooms: {localRooms.length}</span>
          <span>
            • Total Area:{" "}
            {localRooms
              .reduce((acc, r) => acc + (r.width / GRID_SIZE) * (r.height / GRID_SIZE), 0)
              .toFixed(1)}{" "}
            m²
          </span>
        </div>
        <div className="flex items-center gap-2">
          {activeSelectedId ? (
            <span className="text-blue-400 font-medium">
              Selected: {localRooms.find((r) => r.id === activeSelectedId)?.name || activeSelectedId}
            </span>
          ) : (
            <span className="text-slate-500">Click a room to resize or scale walls</span>
          )}
        </div>
      </div>
    </div>
  );
}
