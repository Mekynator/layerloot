// Updated ModelViewer.tsx
// Changes:
// - Removed optional props (keeps only url)
// - Fixed fullscreen centering
// - Improved mobile layout and controls
// - Keeps free orbit/tilt/zoom, gizmo, grid, wireframe, reset, fullscreen, reference objects
// - STL / OBJ / 3MF support

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
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

interface ModelViewerProps {
  url: string;
}

function getFileExtension(url: string): string {
  const clean = url.split("?")[0];
  return clean.split(".").pop()?.toLowerCase() ?? "";
}

function normalizeObject(obj: THREE.Object3D, targetSize = 3) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();

  box.getSize(size);
  box.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim === 0) return;

  const scale = targetSize / maxDim;
  obj.scale.multiplyScalar(scale);

  const scaledBox = new THREE.Box3().setFromObject(obj);
  const scaledCenter = new THREE.Vector3();
  scaledBox.getCenter(scaledCenter);

  obj.position.sub(scaledCenter);
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="rounded-md bg-black/80 px-3 py-2 text-sm text-white shadow-lg">Loading 3D preview...</div>
    </Html>
  );
}

function ModelMesh({ url, autoRotate, wireframe }: { url: string; autoRotate: boolean; wireframe: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const [object, setObject] = useState<THREE.Object3D | null>(null);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#b0b0b0"),
      metalness: 0.18,
      roughness: 0.62,
      wireframe,
    });
  }, [wireframe]);

  useEffect(() => {
    let mounted = true;
    const ext = getFileExtension(url);

    const finish = (obj: THREE.Object3D) => {
      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.material = material;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          if (mesh.geometry) mesh.geometry.computeVertexNormals();
        }
      });

      normalizeObject(obj, 3);
      if (mounted) setObject(obj);
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
    } else {
      setObject(null);
    }

    return () => {
      mounted = false;
    };
  }, [url, material]);

  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.45;
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

function CameraControls({ resetKey, mobile }: { resetKey: number; mobile: boolean }) {
  const { camera } = useThree();

  useEffect(() => {
    if (mobile) {
      camera.position.set(3.6, 2.8, 4.4);
    } else {
      camera.position.set(4.5, 3.5, 5.5);
    }
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, resetKey, mobile]);

  return <ArcballControls enablePan enableZoom enableRotate minDistance={2.2} maxDistance={12} dampingFactor={0.08} />;
}

function ViewerCanvas({
  url,
  autoRotate,
  wireframe,
  showGrid,
  resetKey,
  mobile,
}: {
  url: string;
  autoRotate: boolean;
  wireframe: boolean;
  showGrid: boolean;
  resetKey: number;
  mobile: boolean;
}) {
  return (
    <div className="h-full w-full">
      <Canvas
        dpr={[1, 2]}
        camera={{
          fov: mobile ? 52 : 45,
          near: 0.1,
          far: 100,
          position: mobile ? [3.6, 2.8, 4.4] : [4.5, 3.5, 5.5],
        }}
      >
        <ambientLight intensity={0.95} />
        <directionalLight position={[5, 6, 5]} intensity={1.15} />
        <directionalLight position={[-4, 3, -2]} intensity={0.35} />

        {showGrid && <Grid position={[0, -1.8, 0]} args={[20, 20]} cellSize={0.5} infiniteGrid />}

        <Suspense fallback={<LoadingFallback />}>
          <ModelMesh url={url} autoRotate={autoRotate} wireframe={wireframe} />

          <Environment preset="studio" />
        </Suspense>

        <CameraControls resetKey={resetKey} mobile={mobile} />

        <GizmoHelper alignment="bottom-left" margin={mobile ? [56, 56] : [80, 80]}>
          <GizmoViewport axisColors={["#ff0000", "#00ff00", "#0000ff"]} />
        </GizmoHelper>
      </Canvas>
    </div>
  );
}

export default function ModelViewer({ url }: ModelViewerProps) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const resetView = () => {
    setResetKey((v) => v + 1);
  };

  const viewer = (full = false) => (
    <div
      className={`relative h-full w-full overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-950 ${
        full ? "rounded-none" : "min-h-[320px] sm:min-h-[420px]"
      }`}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <ViewerCanvas
          url={url}
          autoRotate={autoRotate}
          wireframe={wireframe}
          showGrid={showGrid}
          referenceType={referenceType}
          resetKey={resetKey}
          mobile={mobile}
        />
      </div>

      <div className="absolute right-2 top-2 z-20 flex gap-2 sm:right-3 sm:top-3">
        <Button
          size="icon"
          variant="secondary"
          className="h-9 w-9 sm:h-10 sm:w-10"
          onClick={() => setShowGrid((v) => !v)}
        >
          <Grid3X3 size={16} />
        </Button>

        <Button
          size="icon"
          variant="secondary"
          className="h-9 w-9 sm:h-10 sm:w-10"
          onClick={() => setWireframe((v) => !v)}
        >
          <ScanLine size={16} />
        </Button>

        <Button size="icon" variant="secondary" className="h-9 w-9 sm:h-10 sm:w-10" onClick={resetView}>
          <Undo2 size={16} />
        </Button>

        {!full && (
          <Button
            size="icon"
            variant="secondary"
            className="h-9 w-9 sm:h-10 sm:w-10"
            onClick={() => setFullscreen(true)}
          >
            <Maximize2 size={16} />
          </Button>
        )}
      </div>

      <div className="absolute bottom-2 right-2 z-20 sm:bottom-3 sm:right-3">
        <Button
          size="icon"
          variant="secondary"
          className="h-9 w-9 sm:h-10 sm:w-10"
          onClick={() => setAutoRotate((v) => !v)}
        >
          <RotateCcw size={16} />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {viewer(false)}

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="h-[100dvh] w-[100vw] max-w-none border-0 p-0 sm:h-[88vh] sm:w-[94vw] overflow-hidden">
          <div className="flex h-full w-full items-center justify-center bg-black">{viewer(true)}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}

useGLTF.preload("/reference-models/coin.glb");
useGLTF.preload("/reference-models/soda_can.glb");
useGLTF.preload("/reference-models/monster_can.glb");
useGLTF.preload("/reference-models/phone.glb");
useGLTF.preload("/reference-models/banana.glb");
