import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  RotateCcw,
  Sun,
  Eye,
  Camera,
  Layers,
  Box,
  Compass,
} from "lucide-react";

/**
 * Architectural material colors for 3D rooms
 */
const ROOM_3D_PALETTE = {
  living: { floor: 0xdbeafe, wall: 0x93c5fd, label: "Living Room" },
  bedroom: { floor: 0xf3e8ff, wall: 0xd8b4fe, label: "Bedroom" },
  kitchen: { floor: 0xfef3c7, wall: 0xfde68a, label: "Kitchen" },
  bathroom: { floor: 0xccfbf1, wall: 0x99f6e4, label: "Bathroom" },
  dining: { floor: 0xfce7f3, wall: 0xfbcfe8, label: "Dining" },
  balcony: { floor: 0xdcfce7, wall: 0xbbf7d0, label: "Balcony" },
  circulation: { floor: 0xf1f5f9, wall: 0xcbd5e1, label: "Hallway" },
  default: { floor: 0xe0e7ff, wall: 0xc7d2fe, label: "Zone" },
};

const DEFAULT_FLOOR_PLAN = {
  unitsPerMeter: 20, // 20 units in 2D = 1 meter in 3D
  rooms: [
    { id: "room-1", name: "Living Room", type: "living", x: 100, y: 100, width: 220, height: 180 },
    { id: "room-2", name: "Master Bedroom", type: "bedroom", x: 340, y: 100, width: 180, height: 160 },
    { id: "room-3", name: "Kitchen", type: "kitchen", x: 100, y: 300, width: 150, height: 140 },
    { id: "room-4", name: "Bathroom", type: "bathroom", x: 270, y: 300, width: 110, height: 110 },
  ],
};

export default function ModelViewer3D({
  floorPlan = DEFAULT_FLOOR_PLAN,
  wallHeightMeters = 3.0,
  wallThicknessMeters = 0.2,
  className = "",
}) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const buildingGroupRef = useRef(null);
  const dirLightRef = useRef(null);

  // Viewer options
  const [wallHeight, setWallHeight] = useState(wallHeightMeters);
  const [showRoof, setShowRoof] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [showDimensions, setShowDimensions] = useState(true);
  const [sunIntensity, setSunIntensity] = useState(1.5);
  const [cameraMode, setCameraMode] = useState("isometric");

  // Create text sprite label for 3D room
  const createRoomLabel = useCallback((text) => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.roundRect(0, 0, 256, 64, 12);
    ctx.fill();

    ctx.strokeStyle = "rgba(148, 163, 184, 0.5)";
    ctx.lineWidth = 2;
    ctx.roundRect(0, 0, 256, 64, 12);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(3, 0.75, 1);
    return sprite;
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 550;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    sceneRef.current = scene;

    // Perspective Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(20, 24, 25);
    cameraRef.current = camera;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Keep camera above ground
    controls.minDistance = 5;
    controls.maxDistance = 120;
    controls.target.set(0, 1.5, 0);
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.5);
    scene.add(hemisphereLight);

    const dirLight = new THREE.DirectionalLight(0xfff7ed, 1.5);
    dirLight.position.set(25, 35, 18);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 120;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // Architectural Ground Grid
    const gridHelper = new THREE.GridHelper(60, 60, 0x38bdf8, 0x1e293b);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Ground Plane for Shadows
    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    scene.add(ground);

    // Building Group Container
    const buildingGroup = new THREE.Group();
    scene.add(buildingGroup);
    buildingGroupRef.current = buildingGroup;

    // Animation Loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handling
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      if (nw && nh) {
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Extrude 2D floor plan data into 3D geometry
  useEffect(() => {
    const buildingGroup = buildingGroupRef.current;
    if (!buildingGroup) return;

    // Clear previous building meshes
    while (buildingGroup.children.length > 0) {
      const obj = buildingGroup.children[0];
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
      buildingGroup.remove(obj);
    }

    const roomsData = Array.isArray(floorPlan) ? floorPlan : floorPlan.rooms || [];
    const scale = 1 / (floorPlan.unitsPerMeter || 20); // 20 units = 1 meter

    if (roomsData.length === 0) return;

    // Calculate center offset of rooms so the building rests centered around (0, 0, 0)
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    roomsData.forEach((r) => {
      minX = Math.min(minX, r.x);
      maxX = Math.max(maxX, r.x + r.width);
      minY = Math.min(minY, r.y);
      maxY = Math.max(maxY, r.y + r.height);
    });
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const wallThickness = wallThicknessMeters;
    const height = wallHeight;

    roomsData.forEach((room) => {
      const w = room.width * scale;
      const l = room.height * scale;
      const rx = (room.x + room.width / 2 - centerX) * scale;
      const rz = (room.y + room.height / 2 - centerY) * scale;

      const palette = ROOM_3D_PALETTE[room.type] || ROOM_3D_PALETTE.default;

      // 1. Floor Slab Mesh
      const floorGeo = new THREE.BoxGeometry(w, 0.12, l);
      const floorMat = new THREE.MeshStandardMaterial({
        color: palette.floor,
        roughness: 0.6,
        metalness: 0.1,
        wireframe,
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.set(rx, 0.06, rz);
      floorMesh.receiveShadow = true;
      buildingGroup.add(floorMesh);

      // 2. Extrude Perimeter Walls for this room
      const wallMat = new THREE.MeshStandardMaterial({
        color: palette.wall,
        roughness: 0.7,
        metalness: 0.05,
        wireframe,
      });

      // North Wall
      const northGeo = new THREE.BoxGeometry(w, height, wallThickness);
      const northWall = new THREE.Mesh(northGeo, wallMat);
      northWall.position.set(rx, height / 2, rz - l / 2 + wallThickness / 2);
      northWall.castShadow = true;
      northWall.receiveShadow = true;
      buildingGroup.add(northWall);

      // South Wall
      const southGeo = new THREE.BoxGeometry(w, height, wallThickness);
      const southWall = new THREE.Mesh(southGeo, wallMat);
      southWall.position.set(rx, height / 2, rz + l / 2 - wallThickness / 2);
      southWall.castShadow = true;
      southWall.receiveShadow = true;
      buildingGroup.add(southWall);

      // West Wall
      const westGeo = new THREE.BoxGeometry(wallThickness, height, l - wallThickness * 2);
      const westWall = new THREE.Mesh(westGeo, wallMat);
      westWall.position.set(rx - w / 2 + wallThickness / 2, height / 2, rz);
      westWall.castShadow = true;
      westWall.receiveShadow = true;
      buildingGroup.add(westWall);

      // East Wall
      const eastGeo = new THREE.BoxGeometry(wallThickness, height, l - wallThickness * 2);
      const eastWall = new THREE.Mesh(eastGeo, wallMat);
      eastWall.position.set(rx + w / 2 - wallThickness / 2, height / 2, rz);
      eastWall.castShadow = true;
      eastWall.receiveShadow = true;
      buildingGroup.add(eastWall);

      // 3. Optional Roof Slab
      if (showRoof) {
        const roofGeo = new THREE.BoxGeometry(w + 0.3, 0.15, l + 0.3);
        const roofMat = new THREE.MeshStandardMaterial({
          color: 0x475569,
          roughness: 0.4,
          transparent: true,
          opacity: 0.85,
        });
        const roofMesh = new THREE.Mesh(roofGeo, roofMat);
        roofMesh.position.set(rx, height + 0.075, rz);
        roofMesh.castShadow = true;
        buildingGroup.add(roofMesh);
      }

      // 4. Floating 3D Room Label
      if (showDimensions) {
        const areaM2 = (w * l).toFixed(1);
        const labelText = `${room.name || palette.label} (${areaM2}m²)`;
        const labelSprite = createRoomLabel(labelText);
        labelSprite.position.set(rx, height + 0.8, rz);
        buildingGroup.add(labelSprite);
      }
    });
  }, [
    floorPlan,
    wallHeight,
    wallThicknessMeters,
    showRoof,
    wireframe,
    showDimensions,
    createRoomLabel,
  ]);

  // Adjust Sun light intensity
  useEffect(() => {
    if (dirLightRef.current) {
      dirLightRef.current.intensity = sunIntensity;
    }
  }, [sunIntensity]);

  // Camera Presets
  const handleCameraPreset = (mode) => {
    setCameraMode(mode);
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    controls.target.set(0, 1.5, 0);

    if (mode === "topdown") {
      camera.position.set(0, 42, 0.01);
    } else if (mode === "front") {
      camera.position.set(0, 8, 38);
    } else if (mode === "side") {
      camera.position.set(38, 8, 0);
    } else {
      // Isometric
      camera.position.set(24, 26, 26);
    }
    camera.lookAt(0, 1.5, 0);
    controls.update();
  };

  // Reset Camera View
  const handleResetCamera = () => {
    handleCameraPreset("isometric");
  };

  // Take Snapshot
  const handleCaptureSnapshot = () => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const dataURL = renderer.domElement.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = "urbanis-3d-model.png";
    link.href = dataURL;
    link.click();
  };

  return (
    <div
      className={`relative flex flex-col w-full h-full min-h-[500px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl ${className}`}
    >
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-800 text-slate-200 text-xs shadow-lg">
        {/* Left: Camera Presets */}
        <div className="flex items-center gap-1">
          <span className="text-slate-400 text-[11px] font-medium mr-1 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-blue-400" />
            View:
          </span>

          <button
            type="button"
            onClick={() => handleCameraPreset("isometric")}
            className={`px-2 py-1 rounded transition ${
              cameraMode === "isometric" ? "bg-blue-600 text-white font-medium" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Iso 3D
          </button>

          <button
            type="button"
            onClick={() => handleCameraPreset("topdown")}
            className={`px-2 py-1 rounded transition ${
              cameraMode === "topdown" ? "bg-blue-600 text-white font-medium" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Top Plan
          </button>

          <button
            type="button"
            onClick={() => handleCameraPreset("front")}
            className={`px-2 py-1 rounded transition ${
              cameraMode === "front" ? "bg-blue-600 text-white font-medium" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Elevation
          </button>

          <button
            type="button"
            onClick={handleResetCamera}
            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded ml-1"
            title="Reset Camera Position"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Architectural Extrusion & Display Controls */}
        <div className="flex items-center gap-2">
          {/* Wall Height Slider */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded">
            <span className="text-[11px] text-slate-300">Height:</span>
            <input
              type="range"
              min="1.5"
              max="5.0"
              step="0.2"
              value={wallHeight}
              onChange={(e) => setWallHeight(parseFloat(e.target.value))}
              className="w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="font-mono text-[11px] text-blue-400 w-8 text-right">
              {wallHeight.toFixed(1)}m
            </span>
          </div>

          {/* Roof Toggle */}
          <button
            type="button"
            onClick={() => setShowRoof(!showRoof)}
            className={`px-2 py-1 rounded flex items-center gap-1 transition ${
              showRoof ? "bg-blue-950 text-blue-400 border border-blue-800" : "bg-slate-800 text-slate-400"
            }`}
            title="Toggle Roof Slab"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Roof</span>
          </button>

          {/* Wireframe Toggle */}
          <button
            type="button"
            onClick={() => setWireframe(!wireframe)}
            className={`px-2 py-1 rounded flex items-center gap-1 transition ${
              wireframe ? "bg-amber-950 text-amber-400 border border-amber-800" : "bg-slate-800 text-slate-400"
            }`}
            title="Toggle Wireframe Architecture"
          >
            <Box className="w-3.5 h-3.5" />
            <span>Wire</span>
          </button>

          {/* Room Labels Toggle */}
          <button
            type="button"
            onClick={() => setShowDimensions(!showDimensions)}
            className={`px-2 py-1 rounded flex items-center gap-1 transition ${
              showDimensions ? "bg-slate-800 text-slate-200" : "bg-slate-900 text-slate-500"
            }`}
            title="Toggle 3D Room Name Tags"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Labels</span>
          </button>

          {/* Sun / Sunlight Slider */}
          <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <input
              type="range"
              min="0.3"
              max="3.0"
              step="0.2"
              value={sunIntensity}
              onChange={(e) => setSunIntensity(parseFloat(e.target.value))}
              className="w-14 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
              title="Sunlight Exposure"
            />
          </div>

          {/* Snapshot 3D */}
          <button
            type="button"
            onClick={handleCaptureSnapshot}
            className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition shadow"
            title="Capture 3D Render Snapshot"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Three.js WebGL Container */}
      <div
        ref={containerRef}
        className="w-full h-full flex-1 cursor-grab active:cursor-grabbing bg-slate-950 touch-none"
        style={{ minHeight: "480px" }}
      />

      {/* Bottom Architectural Status Bar */}
      <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800 text-slate-400 text-[11px] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-slate-300 font-medium">Urbanis 3D Extrusion Engine</span>
          <span>• Orbital Controls (Left Drag: Rotate, Right Drag: Pan, Scroll: Zoom)</span>
          <span>• Wall Height: {wallHeight.toFixed(1)}m</span>
          <span>• Wall Thickness: {wallThicknessMeters * 100}cm</span>
        </div>
        <div>
          <span className="text-emerald-400 font-mono">Three.js WebGL Active</span>
        </div>
      </div>
    </div>
  );
}
