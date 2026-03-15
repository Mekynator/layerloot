// ModelViewer.tsx
// Clean version with:
// - Free orbit/tilt/zoom controls
// - Blender-style orientation gizmo
// - Grid toggle
// - Wireframe toggle
// - Reset view
// - Fullscreen
// - Reference objects (GLB)
// - STL / OBJ / 3MF support

import React, { Suspense, useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ArcballControls,
  Center,
  Environment,
  GizmoHelper,
  GizmoViewport,
  Grid,
  Html,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { Maximize2, RotateCcw, Grid3X3, ScanLine, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type ReferenceType = "none" | "coin" | "soda" | "monster" | "phone" | "banana";

function getFileExtension(url: string, fileName?: string): string {
  if (fileName) return fileName.split(".").pop()?.toLowerCase() ?? "";
  const clean = url.split("?")[0];
  return clean.split(".").pop()?.toLowerCase() ?? "";
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
      <div style={{ padding: "6px 10px", background: "#111", color: "#eee", borderRadius: 6 }}>
        Loading 3D preview...
      </div>
    </Html>
  );
}

function ReferenceAsset({ path, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) {
  const gltf = useGLTF(path) as any;
  const cloned = useMemo(() => gltf.scene.clone(), [gltf.scene]);

  return <primitive object={cloned} position={position} rotation={rotation} scale={scale} />;
}

function ReferenceModel({ type }: { type: ReferenceType }) {
  switch (type) {
    case "coin":
      return <ReferenceAsset path="/reference-models/coin.glb" position={[-2.8, 0, 0]} scale={1} />;

    case "soda":
      return <ReferenceAsset path="/reference-models/soda_can.glb" position={[-2.8, 0, 0]} scale={1} />;

    case "monster":
      return <ReferenceAsset path="/reference-models/monster_can.glb" position={[-2.8, 0, 0]} scale={1} />;

    case "phone":
      return <ReferenceAsset path="/reference-models/phone.glb" position={[-2.8, 0, 0]} scale={1} />;

    case "banana":
      return <ReferenceAsset path="/reference-models/banana.glb" position={[-2.8, 0, 0]} scale={1} />;

    default:
      return null;
  }
}

function ModelMesh({ url, autoRotate, selectedColor = "#b0b0b0", fileName, wireframe }) {
  const groupRef = useRef<THREE.Group>(null);
  const [object, setObject] = useState<THREE.Object3D | null>(null);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(selectedColor),
      metalness: 0.2,
      roughness: 0.6,
      wireframe,
    });
  }, [selectedColor, wireframe]);

  useEffect(() => {
    const ext = getFileExtension(url, fileName);

    const finish = (obj: THREE.Object3D) => {
      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.material = material;
        }
      });

      normalizeObject(obj);
      setObject(obj);
    };

    if (ext === "stl") {
      const loader = new STLLoader();
      loader.load(url, (geo) => {
        const mesh = new THREE.Mesh(geo, material);
        const group = new THREE.Group();
        group.add(mesh);
        finish(group);
      });
    } else if (ext === "obj") {
      const loader = new OBJLoader();
      loader.load(url, finish);
    } else if (ext === "3mf") {
      const loader = new ThreeMFLoader();
      loader.load(url, finish);
    }
  }, [url, fileName, material]);

  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  if (!object) return null;

  return (
    <Center>
      <group ref={groupRef}>
        <primitive object={object} />
      </group>
    </Center>
  );
}

function CameraControls({ resetKey }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(4.5, 3.5, 5.5);
    camera.lookAt(0, 0, 0);
  }, [camera, resetKey]);

  return <ArcballControls enablePan enableZoom enableRotate />;
}

function ViewerCanvas({ url, autoRotate, selectedColor, fileName, wireframe, showGrid, referenceType, resetKey }) {
  return (
    <Canvas camera={{ fov: 45, near: 0.1, far: 100, position: [4.5, 3.5, 5.5] }}>
      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 5, 5]} intensity={1.1} />

      {showGrid && <Grid position={[0, -1.8, 0]} args={[20, 20]} cellSize={0.5} infiniteGrid />}

      <Suspense fallback={<LoadingFallback />}>
        <ModelMesh
          url={url}
          autoRotate={autoRotate}
          selectedColor={selectedColor}
          fileName={fileName}
          wireframe={wireframe}
        />

        <ReferenceModel type={referenceType} />

        <Environment preset="studio" />
      </Suspense>

      <CameraControls resetKey={resetKey} />

      <GizmoHelper alignment="bottom-left" margin={[80, 80]}>
        <GizmoViewport axisColors={["#ff0000", "#00ff00", "#0000ff"]} />
      </GizmoHelper>
    </Canvas>
  );
}

export default function ModelViewer({
  url,
  className = "",
  showFullscreen = true,
  selectedColor = "#b0b0b0",
  fileName,
}) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [referenceType, setReferenceType] = useState<ReferenceType>("none");
  const [resetKey, setResetKey] = useState(0);

  const resetView = () => {
    setResetKey((v) => v + 1);
  };

  const viewer = (full = false) => (
    <div className={`relative ${className}`} style={{ height: "100%" }}>
      <ViewerCanvas
        url={url}
        autoRotate={autoRotate}
        selectedColor={selectedColor}
        fileName={fileName}
        wireframe={wireframe}
        showGrid={showGrid}
        referenceType={referenceType}
        resetKey={resetKey}
      />

      <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 6 }}>
        <Button size="icon" onClick={() => setShowGrid((v) => !v)}>
          <Grid3X3 size={16} />
        </Button>

        <Button size="icon" onClick={() => setWireframe((v) => !v)}>
          <ScanLine size={16} />
        </Button>

        <Button size="icon" onClick={resetView}>
          <Undo2 size={16} />
        </Button>

        {showFullscreen && !full && (
          <Button size="icon" onClick={() => setFullscreen(true)}>
            <Maximize2 size={16} />
          </Button>
        )}
      </div>

      <div style={{ position: "absolute", bottom: 10, right: 10 }}>
        <Button size="icon" onClick={() => setAutoRotate((v) => !v)}>
          <RotateCcw size={16} />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {viewer(false)}

      {showFullscreen && (
        <Dialog open={fullscreen} onOpenChange={setFullscreen}>
          <DialogContent style={{ height: "88vh", maxWidth: "94vw" }}>{viewer(true)}</DialogContent>
        </Dialog>
      )}
    </>
  );
}
