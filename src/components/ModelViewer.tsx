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

type ReferenceType = "none" | "coin" | "soda" | "monster" | "hand" | "phone";
type ViewPreset = "front" | "back" | "left" | "right" | "top" | "bottom" | "iso";

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

function getObjectDimensions(obj: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  return size;
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

function ReferenceModel({ type }: { type: ReferenceType }) {
  if (type === "none") return null;

  switch (type) {
    case "coin":
      return (
        <mesh position={[-2.8, 0.08, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.08, 48]} />
          <meshStandardMaterial color="#c9c9c9" metalness={0.7} roughness={0.35} />
        </mesh>
      );

    case "soda":
      return (
        <mesh position={[-2.8, 1.22, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 2.44, 48]} />
          <meshStandardMaterial color="#d94b4b" metalness={0.15} roughness={0.55} />
        </mesh>
      );

    case "monster":
      return (
        <mesh position={[-2.8, 1.65, 0]}>
          <cylinderGeometry args={[0.43, 0.43, 3.3, 48]} />
          <meshStandardMaterial color="#222222" metalness={0.2} roughness={0.45} />
        </mesh>
      );

    case "phone":
      return (
        <mesh position={[-2.8, 1.45, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.75, 2.9, 0.12]} />
          <meshStandardMaterial color="#30343a" metalness={0.2} roughness={0.5} />
        </mesh>
      );

    case "hand":
      return (
        <group position={[-2.8, 1.55, 0]}>
          <mesh>
            <boxGeometry args={[0.85, 1.7, 0.06]} />
            <meshStandardMaterial color="#d9b49a" transparent opacity={0.65} />
          </mesh>
          <mesh position={[-0.25, 1.05, 0]}>
            <boxGeometry args={[0.12, 0.65, 0.06]} />
            <meshStandardMaterial color="#d9b49a" transparent opacity={0.65} />
          </mesh>
          <mesh position={[-0.05, 1.12, 0]}>
            <boxGeometry args={[0.12, 0.78, 0.06]} />
            <meshStandardMaterial color="#d9b49a" transparent opacity={0.65} />
          </mesh>
          <mesh position={[0.15, 1.08, 0]}>
            <boxGeometry args={[0.12, 0.72, 0.06]} />
            <meshStandardMaterial color="#d9b49a" transparent opacity={0.65} />
          </mesh>
          <mesh position={[0.35, 0.98, 0]}>
            <boxGeometry args={[0.12, 0.58, 0.06]} />
            <meshStandardMaterial color="#d9b49a" transparent opacity={0.65} />
          </mesh>
        </group>
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
    const manager = new THREE.LoadingManager();

    const applySharedMaterial = (obj: THREE.Object3D) => {
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
    };

    const finish = (obj: THREE.Object3D) => {
      if (!mounted) {
        disposeObject(obj);
        return;
      }

      applySharedMaterial(obj);
      normalizeObject(obj);
      currentObject = obj;
      setObject(obj);
      onDimensions?.(getObjectDimensions(obj));
      onSupported?.(true, detectedExt);
    };

    if (detectedExt === "stl") {
      const loader = new STLLoader(manager);
      loader.load(
        url,
        (geometry) => {
          geometry.computeVertexNormals();
          geometry.computeBoundingSphere();

          const mesh = new THREE.Mesh(geometry, sharedMaterial);
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          const group = new THREE.Group();
          group.add(mesh);
          finish(group);
        },
        undefined,
        () => {
          setObject(null);
          onDimensions?.(null);
          onSupported?.(false, detectedExt);
        },
      );
    } else if (detectedExt === "obj") {
      const loader = new OBJLoader(manager);
      loader.load(
        url,
        (obj) => finish(obj),
        undefined,
        () => {
          setObject(null);
          onDimensions?.(null);
          onSupported?.(false, detectedExt);
        },
      );
    } else if (detectedExt === "3mf") {
      const loader = new ThreeMFLoader(manager);
      loader.load(
        url,
        (obj) => finish(obj),
        undefined,
        () => {
          setObject(null);
          onDimensions?.(null);
          onSupported?.(false, detectedExt);
        },
      );
    } else {
      setObject(null);
      onDimensions?.(null);
      onSupported?.(false, detectedExt);
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
  if (!["stl", "obj", "3mf"].includes(ext)) {
    return <UnsupportedFallback ext={ext} />;
  }

  if (!object) return null;

  return (
    <Center>
      <group ref={groupRef}>
        <primitive object={object} />
      </group>
    </Center>
  );
}

function CameraRig({ viewPreset, resetTrigger }: { viewPreset: ViewPreset; resetTrigger: number }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

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

      if (controlsRef.current) {
        controlsRef.current.reset?.();
      }
    },
    [camera],
  );

  useEffect(() => {
    applyView(viewPreset);
  }, [viewPreset, applyView]);

  useEffect(() => {
    applyView("iso");
  }, [resetTrigger, applyView]);

  return (
    <ArcballControls ref={controlsRef} enabled enablePan enableZoom enableRotate dampingFactor={0.08} adjustNearFar />
  );
}

interface ModelViewerProps {
  url: string;
  className?: string;
  showFullscreen?: boolean;
  selectedColor?: string;
  fileName?: string;
}

const ViewerCanvas = ({
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
}: {
  url: string;
  autoRotate: boolean;
  selectedColor?: string;
  isFullscreen?: boolean;
  fileName?: string;
  wireframe: boolean;
  showGrid: boolean;
  referenceType: ReferenceType;
  viewPreset: ViewPreset;
  resetTrigger: number;
  onDimensions?: (dims: THREE.Vector3 | null) => void;
  onSupported?: (supported: boolean, ext: string) => void;
}) => {
  return (
    <Canvas
      className="touch-none"
      shadows={false}
      dpr={isFullscreen ? [1, 1.5] : [1, 1.25]}
      frameloop="always"
      camera={{ fov: 45, near: 0.1, far: 100 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }}
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

      <CameraRig viewPreset={viewPreset} resetTrigger={resetTrigger} />

      <GizmoHelper alignment="bottom-left" margin={[78, 78]}>
        <GizmoViewport axisColors={["#ef4444", "#22c55e", "#3b82f6"]} labelColor="#ffffff" />
      </GizmoHelper>
    </Canvas>
  );
};

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
  const [viewPreset, setViewPreset] = useState<ViewPreset>("iso");
  const [resetTrigger, setResetTrigger] = useState(0);
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
  ];

  const Viewer = ({ isFullscreenMode = false }: { isFullscreenMode?: boolean }) => (
    <div
      className={`relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-muted to-background ${isFullscreenMode ? "h-full w-full" : className}`}
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

      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1 rounded-lg bg-background/80 p-1 backdrop-blur-sm">
        {viewButtons.map((btn) => (
          <button
            key={btn.key}
            type="button"
            onClick={() => setViewPreset(btn.key)}
            className={`rounded px-2 py-1 text-[10px] font-display uppercase transition ${
              viewPreset === btn.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {btn.label}
          </button>
        ))}
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
      <Viewer />

      {showFullscreen && (
        <Dialog open={fullscreen} onOpenChange={setFullscreen}>
          <DialogContent className="h-[88vh] max-w-[94vw] p-0">
            <Viewer isFullscreenMode />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ModelViewer;
