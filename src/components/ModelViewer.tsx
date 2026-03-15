import React, { Suspense, useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ArcballControls, Center, Environment, GizmoHelper, GizmoViewport, Grid, Html } from "@react-three/drei";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { Maximize2, RotateCcw, Loader2, ScanLine, Grid3X3, Box, Smartphone, Hand, Circle, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type ReferenceType = "none" | "coin" | "soda" | "monster" | "hand" | "phone" | "banana";

function getFileExtension(url: string, fileName?: string): string {
  if (fileName) {
    return fileName.split(".").pop()?.toLowerCase() ?? "";
  }
  const clean = url.split("?")[0];
  return clean.split(".").pop()?.toLowerCase() ?? "";
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;

      if (mesh.geometry) mesh.geometry.dispose();

      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => mat.dispose());
      } else if (mesh.material) {
        mesh.material.dispose();
      }
    }
  });
}

function normalizeObject(obj: THREE.Object3D, targetSize = 3) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);

  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim === 0) return;

  const scale = targetSize / maxDim;
  obj.scale.multiplyScalar(scale);

  const newBox = new THREE.Box3().setFromObject(obj);
  const center = new THREE.Vector3();
  newBox.getCenter(center);
  obj.position.sub(center);
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="flex items-center gap-2 rounded-md border border-border bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading 3D preview...
      </div>
    </Html>
  );
}

function UnsupportedFallback({ ext }: { ext: string }) {
  return (
    <Html center>
      <div className="max-w-[260px] rounded-md border border-border bg-background/95 px-4 py-3 text-center text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
        Unsupported or unreadable file type
        <div className="mt-1 font-medium text-foreground">{ext || "unknown file"}</div>
        <div className="mt-1">Supported: STL, OBJ, 3MF</div>
      </div>
    </Html>
  );
}
function makeLabelTexture({
  bg = "#ffffff",
  fg = "#111111",
  lines = [],
  width = 512,
  height = 1024,
}: {
  bg?: string;
  fg?: string;
  lines: string[];
  width?: number;
  height?: number;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "rgba(255,255,255,0.18)");
  grad.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = fg;
  ctx.textAlign = "center";

  ctx.font = "bold 88px Arial";
  ctx.fillText(lines[0] ?? "", width / 2, 180);

  ctx.font = "bold 58px Arial";
  if (lines[1]) ctx.fillText(lines[1], width / 2, 280);

  ctx.font = "bold 42px Arial";
  if (lines[2]) ctx.fillText(lines[2], width / 2, 360);

  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 12;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function ReferenceAsset({
  path,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: {
  path: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}) {
  const { scene } = useGLTF(path);
  const clone = useMemo(() => scene.clone(), [scene]);

  return <primitive object={clone} position={position} rotation={rotation} scale={scale} />;
}

function ReferenceModel({ type }: { type: ReferenceType }) {
  switch (type) {
    case "coin":
      return (
        <ReferenceAsset path="/reference-models/coin.glb" position={[-2.8, 0.05, 0]} rotation={[0, 0, 0]} scale={0.5} />
      );

    case "soda":
      return (
        <ReferenceAsset path="/reference-models/soda_can.glb" position={[-2.8, 0, 0]} rotation={[0, 0, 0]} scale={1} />
      );

    case "monster":
      return (
        <ReferenceAsset
          path="/reference-models/monster_can.glb"
          position={[-2.8, 0, 0]}
          rotation={[0, 0, 0]}
          scale={1}
        />
      );

    case "phone":
      return (
        <ReferenceAsset path="/reference-models/phone.glb" position={[-2.8, 0, 0]} rotation={[0, 0.2, 0]} scale={1} />
      );

    case "hand":
      return (
        <ReferenceAsset path="/reference-models/hand.glb" position={[-2.8, 0, 0]} rotation={[0, 0.1, 0]} scale={1} />
      );

    case "banana":
      return (
        <ReferenceAsset
          path="/reference-models/banana.glb"
          position={[-2.8, 0, 0]}
          rotation={[0.15, 0.4, -0.35]}
          scale={1}
        />
      );

    default:
      return null;
  }
}

function ModelMesh({
  url,
  autoRotate,
  selectedColor = "#b0b0b0",
  fileName,
  wireframe,
  onDimensions,
  onSupported,
}: {
  url: string;
  autoRotate: boolean;
  selectedColor?: string;
  fileName?: string;
  wireframe: boolean;
  onDimensions?: (dims: THREE.Vector3 | null) => void;
  onSupported?: (supported: boolean, ext: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [object, setObject] = useState<THREE.Object3D | null>(null);
  const [ext, setExt] = useState("");

  const sharedMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(selectedColor),
        metalness: 0.18,
        roughness: 0.62,
        wireframe,
      }),
    [selectedColor, wireframe],
  );

  useEffect(() => {
    let mounted = true;
    let currentObject: THREE.Object3D | null = null;

    const detectedExt = getFileExtension(url, fileName);
    setExt(detectedExt);

    const handleSuccess = (obj: THREE.Object3D) => {
      if (!mounted) {
        disposeObject(obj);
        return;
      }

      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.material = sharedMaterial;
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          if (mesh.geometry) {
            mesh.geometry.computeBoundingSphere();
          }
        }
      });

      normalizeObject(obj);
      currentObject = obj;
      setObject(obj);

      const box = new THREE.Box3().setFromObject(obj);
      const size = new THREE.Vector3();
      box.getSize(size);
      onDimensions?.(size);
      onSupported?.(true, detectedExt);
    };

    const handleError = () => {
      setObject(null);
      onDimensions?.(null);
      onSupported?.(false, detectedExt);
    };

    if (detectedExt === "stl") {
      new STLLoader().load(
        url,
        (geometry) => {
          geometry.computeVertexNormals();
          const mesh = new THREE.Mesh(geometry, sharedMaterial);
          const group = new THREE.Group();
          group.add(mesh);
          handleSuccess(group);
        },
        undefined,
        handleError,
      );
    } else if (detectedExt === "obj") {
      new OBJLoader().load(url, handleSuccess, undefined, handleError);
    } else if (detectedExt === "3mf") {
      new ThreeMFLoader().load(url, handleSuccess, undefined, handleError);
    } else {
      handleError();
    }

    return () => {
      mounted = false;
      if (currentObject) disposeObject(currentObject);
    };
  }, [url, fileName, sharedMaterial, onDimensions, onSupported]);

  useEffect(() => {
    if (!object) return;

    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => {
            if ("color" in mat) {
              const standardMat = mat as THREE.MeshStandardMaterial;
              standardMat.color.set(selectedColor);
              standardMat.wireframe = wireframe;
            }
          });
        } else if (mesh.material && "color" in mesh.material) {
          const standardMat = mesh.material as THREE.MeshStandardMaterial;
          standardMat.color.set(selectedColor);
          standardMat.wireframe = wireframe;
        }
      }
    });
  }, [object, selectedColor, wireframe]);

  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  if (!ext) return null;
  if (!["stl", "obj", "3mf"].includes(ext)) return <UnsupportedFallback ext={ext} />;
  if (!object) return null;

  return (
    <Center>
      <group ref={groupRef}>
        <primitive object={object} />
      </group>
    </Center>
  );
}

function CameraControls({ viewPreset, resetTrigger }: { viewPreset: ViewPreset; resetTrigger: number }) {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  const applyView = useCallback(
    (preset: ViewPreset) => {
      const positions: Record<ViewPreset, [number, number, number]> = {
        front: [0, 0, 6],
        back: [0, 0, -6],
        left: [-6, 0, 0],
        right: [6, 0, 0],
        top: [0, 6, 0],
        bottom: [0, -6, 0],
        iso: [4.5, 3.5, 5.5],
      };

      const [x, y, z] = positions[preset];
      camera.position.set(x, y, z);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      controlsRef.current?.reset?.();
    },
    [camera],
  );

  useEffect(() => {
    applyView(viewPreset);
  }, [viewPreset, applyView]);

  useEffect(() => {
    applyView("iso");
  }, [resetTrigger, applyView]);

  return <ArcballControls ref={controlsRef} enabled enablePan enableZoom enableRotate adjustNearFar />;
}

interface ViewerCanvasProps {
  url: string;
  autoRotate: boolean;
  selectedColor?: string;
  isFullscreen?: boolean;
  fileName?: string;
  wireframe: boolean;
  showGrid: boolean;
  referenceType: ReferenceType;
  onDimensions?: (dims: THREE.Vector3 | null) => void;
  onSupported?: (supported: boolean, ext: string) => void;
}

function ViewerCanvas({
  url,
  autoRotate,
  selectedColor,
  isFullscreen = false,
  fileName,
  wireframe,
  showGrid,
  referenceType,
  viewPreset,
  resetTrigger,
  onDimensions,
  onSupported,
}: ViewerCanvasProps) {
  return (
    <Canvas
      className="touch-none"
      shadows={false}
      dpr={isFullscreen ? [1, 1.5] : [1, 1.25]}
      frameloop="always"
      camera={{ fov: 45, near: 0.1, far: 100, position: [4.5, 3.5, 5.5] }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={isFullscreen ? 0.92 : 0.84} />
      <directionalLight position={[5, 5, 5]} intensity={isFullscreen ? 1.15 : 1.04} />
      <directionalLight position={[-3, 3, -3]} intensity={isFullscreen ? 0.38 : 0.24} />

      {showGrid && (
        <Grid
          position={[0, -1.8, 0]}
          args={[20, 20]}
          cellSize={0.5}
          cellThickness={0.7}
          sectionSize={2}
          sectionThickness={1.1}
          fadeDistance={22}
          fadeStrength={1}
          infiniteGrid
        />
      )}

      <Suspense fallback={<LoadingFallback />}>
        <ModelMesh
          url={url}
          autoRotate={autoRotate}
          selectedColor={selectedColor}
          fileName={fileName}
          wireframe={wireframe}
          onDimensions={onDimensions}
          onSupported={onSupported}
        />
        <ReferenceModel type={referenceType} />
        {isFullscreen && <Environment preset="studio" />}
      </Suspense>

      <GizmoHelper alignment="bottom-left" margin={[78, 78]}>
        <GizmoViewport axisColors={["#ef4444", "#22c55e", "#3b82f6"]} labelColor="#ffffff" />
      </GizmoHelper>
    </Canvas>
  );
}

interface ModelViewerProps {
  url: string;
  className?: string;
  showFullscreen?: boolean;
  selectedColor?: string;
  fileName?: string;
}

const viewButtons: { key: ViewPreset; label: string }[] = [
  { key: "front", label: "Front" },
  { key: "back", label: "Back" },
  { key: "left", label: "Left" },
  { key: "right", label: "Right" },
  { key: "top", label: "Top" },
  { key: "bottom", label: "Bottom" },
  { key: "iso", label: "Iso" },
];

const referenceButtons: {
  key: ReferenceType;
  label: string;
  icon?: React.ReactNode;
}[] = [
  { key: "none", label: "None" },
  { key: "coin", label: "Coin", icon: <Circle className="h-3.5 w-3.5" /> },
  { key: "soda", label: "Soda", icon: <Box className="h-3.5 w-3.5" /> },
  { key: "monster", label: "Monster", icon: <Box className="h-3.5 w-3.5" /> },
  { key: "hand", label: "Hand", icon: <Hand className="h-3.5 w-3.5" /> },
  { key: "phone", label: "Phone", icon: <Smartphone className="h-3.5 w-3.5" /> },
  { key: "banana", label: "Banana", icon: <Circle className="h-3.5 w-3.5" /> },
];

const ModelViewer = ({
  url,
  className = "",
  showFullscreen = true,
  selectedColor = "#b0b0b0",
  fileName,
}: ModelViewerProps) => {
  const [autoRotate, setAutoRotate] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [referenceType, setReferenceType] = useState<ReferenceType>("none");
  const [dimensions, setDimensions] = useState<THREE.Vector3 | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [ext, setExt] = useState("");

  const handleSupported = useCallback((supported: boolean, detectedExt: string) => {
    setIsSupported(supported);
    setExt(detectedExt);
  }, []);

  const resetView = () => {
    setViewPreset("iso");
    setResetTrigger((v) => v + 1);
  };

  const viewerContent = (isFullscreenMode = false) => (
    <div
      className={`relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-muted to-background ${
        isFullscreenMode ? "h-full w-full" : className
      }`}
    >
      <ViewerCanvas
        url={url}
        autoRotate={autoRotate}
        selectedColor={selectedColor}
        isFullscreen={isFullscreenMode}
        fileName={fileName}
        wireframe={wireframe}
        showGrid={showGrid}
        referenceType={referenceType}
        viewPreset={viewPreset}
        resetTrigger={resetTrigger}
        onDimensions={setDimensions}
        onSupported={handleSupported}
      />

      <div className="absolute left-2 top-2 rounded bg-background/80 px-2 py-1 text-xs font-display uppercase text-muted-foreground backdrop-blur-sm">
        3D View
      </div>

      {!isSupported && (
        <div className="absolute left-2 bottom-2 rounded bg-background/85 px-2 py-1 text-xs text-destructive backdrop-blur-sm">
          Unsupported or failed preview {ext ? `(${ext})` : ""}
        </div>
      )}

      {dimensions && (
        <div className="absolute right-2 bottom-2 rounded bg-background/85 px-2 py-1 text-xs text-muted-foreground backdrop-blur-sm">
          X {dimensions.x.toFixed(2)} · Y {dimensions.y.toFixed(2)} · Z {dimensions.z.toFixed(2)}
        </div>
      )}

      <div className="absolute right-2 top-2 flex gap-1">
        <Button
          variant="secondary"
          size="icon"
          className={`h-8 w-8 shadow-sm ${showGrid ? "ring-1 ring-primary" : ""}`}
          onClick={() => setShowGrid((v) => !v)}
          title="Toggle grid floor"
        >
          <Grid3X3 className="h-4 w-4" />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          className={`h-8 w-8 shadow-sm ${wireframe ? "ring-1 ring-primary" : ""}`}
          onClick={() => setWireframe((v) => !v)}
          title="Toggle wireframe"
        >
          <ScanLine className="h-4 w-4" />
        </Button>

        <Button variant="secondary" size="icon" className="h-8 w-8 shadow-sm" onClick={resetView} title="Reset view">
          <Undo2 className="h-4 w-4" />
        </Button>

        {showFullscreen && !isFullscreenMode && (
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 shadow-sm"
            onClick={() => setFullscreen(true)}
            title="Fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="absolute left-2 bottom-12 flex flex-wrap gap-1 rounded-lg bg-background/80 p-1 backdrop-blur-sm">
        {referenceButtons.map((ref) => (
          <button
            key={ref.key}
            type="button"
            onClick={() => setReferenceType(ref.key)}
            className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-display uppercase transition ${
              referenceType === ref.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
            title={`Reference: ${ref.label}`}
          >
            {ref.icon}
            {ref.label}
          </button>
        ))}
      </div>

      <div className="absolute bottom-2 right-[170px]">
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 shadow-sm"
          onClick={() => setAutoRotate((v) => !v)}
          title={autoRotate ? "Stop rotation" : "Auto-rotate"}
        >
          <RotateCcw
            className={`h-4 w-4 ${autoRotate ? "animate-spin" : ""}`}
            style={autoRotate ? { animationDuration: "3s" } : {}}
          />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {viewerContent(false)}

      {showFullscreen && (
        <Dialog open={fullscreen} onOpenChange={setFullscreen}>
          <DialogContent className="h-[88vh] max-w-[94vw] p-0">{viewerContent(true)}</DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ModelViewer;
