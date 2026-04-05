// ModelViewer.tsx
// Updated:
// - Preserves embedded 3MF/OBJ colors/materials/textures when available
// - Uses selectedColor only as a fallback when no embedded appearance exists
// - Keeps wireframe toggle working for both embedded and fallback materials
// - Keeps fullscreen/mobile centering behavior

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ArcballControls, Center, Environment, GizmoHelper, GizmoViewport, Grid, Html } from "@react-three/drei";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { Maximize2, RotateCcw, Grid3X3, ScanLine, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ModelViewerProps {
  url: string;
  className?: string;
  showFullscreen?: boolean;
  selectedColor?: string;
  fileName?: string;
}

function getFileExtension(url: string, fileName?: string): string {
  if (fileName) return fileName.split(".").pop()?.toLowerCase() ?? "";
  const clean = url.split("?")[0];
  return clean.split(".").pop()?.toLowerCase() ?? "";
}

function normalizeObject(obj: THREE.Object3D, targetSize = 2.65) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);

  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim === 0) return;

  const scale = targetSize / maxDim;
  obj.scale.multiplyScalar(scale);

  const newBox = new THREE.Box3().setFromObject(obj);
  const center = new THREE.Vector3();
  const scaledSize = new THREE.Vector3();

  newBox.getCenter(center);
  newBox.getSize(scaledSize);

  obj.position.sub(center);

  // Small upward visual bias so tall models don't look glued to the bottom.
  obj.position.y += scaledSize.y * 0.12;
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="rounded-md bg-black/80 px-3 py-2 text-sm text-white shadow-lg">Loading 3D preview...</div>
    </Html>
  );
}

function hasVisibleTexture(mat: THREE.Material & Partial<THREE.MeshStandardMaterial>) {
  return Boolean(mat.map || mat.emissiveMap || mat.normalMap || mat.roughnessMap || mat.metalnessMap);
}

function hasEmbeddedAppearance(
  mesh: THREE.Mesh,
  mat: THREE.Material & Partial<THREE.MeshStandardMaterial>,
  ext: string,
) {
  const geometry = mesh.geometry;
  const hasVertexColors = Boolean(geometry?.getAttribute("color"));
  const hasTexture = hasVisibleTexture(mat);
  const color = mat.color;
  const hasNonWhiteColor = Boolean(color && !color.equals(new THREE.Color(1, 1, 1)));

  if (ext === "3mf") {
    return hasVertexColors || hasTexture || hasNonWhiteColor;
  }

  if (ext === "obj") {
    return hasTexture || hasNonWhiteColor;
  }

  return false;
}

function createFallbackMaterial(selectedColor: string, wireframe: boolean) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(selectedColor),
    metalness: 0.18,
    roughness: 0.62,
    wireframe,
  });
}

function applyMaterials(obj: THREE.Object3D, ext: string, selectedColor: string, wireframe: boolean) {
  obj.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;

    const mesh = child as THREE.Mesh;
    const geometry = mesh.geometry;

    if (geometry) {
      geometry.computeVertexNormals();
    }

    const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    const nextMaterials = sourceMaterials.map((sourceMat) => {
      const baseMat =
        sourceMat instanceof THREE.MeshStandardMaterial ||
        sourceMat instanceof THREE.MeshPhysicalMaterial ||
        sourceMat instanceof THREE.MeshPhongMaterial ||
        sourceMat instanceof THREE.MeshLambertMaterial ||
        sourceMat instanceof THREE.MeshBasicMaterial
          ? sourceMat
          : null;

      const appearanceExists = baseMat ? hasEmbeddedAppearance(mesh, baseMat as THREE.Material & Partial<THREE.MeshStandardMaterial>, ext) : false;

      if (appearanceExists && baseMat) {
        const cloned = baseMat.clone();
        cloned.wireframe = wireframe;

        if ("vertexColors" in cloned && geometry?.getAttribute("color")) {
          cloned.vertexColors = true;
        }

        return cloned;
      }

      return createFallbackMaterial(selectedColor, wireframe);
    });

    mesh.material = Array.isArray(mesh.material) ? nextMaterials : nextMaterials[0];
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
}

function disposeObjectMaterials(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((mat) => mat?.dispose?.());
  });
}

function ModelMesh({
  url,
  autoRotate,
  wireframe,
  selectedColor,
  fileName,
}: {
  url: string;
  autoRotate: boolean;
  wireframe: boolean;
  selectedColor: string;
  fileName?: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [object, setObject] = useState<THREE.Object3D | null>(null);

  useEffect(() => {
    let mounted = true;
    let currentObject: THREE.Object3D | null = null;
    const ext = getFileExtension(url, fileName);

    const finish = (obj: THREE.Object3D) => {
      applyMaterials(obj, ext, selectedColor, wireframe);
      normalizeObject(obj);
      currentObject = obj;

      if (mounted) {
        setObject(obj);
      }
    };

    if (ext === "stl") {
      const loader = new STLLoader();
      loader.load(url, (geo) => {
        const mesh = new THREE.Mesh(geo, createFallbackMaterial(selectedColor, wireframe));
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
      if (currentObject) {
        disposeObjectMaterials(currentObject);
      }
    };
  }, [url, fileName, selectedColor, wireframe]);

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
      camera.position.set(4.2, 3.2, 5.2);
    } else {
      camera.position.set(5.1, 4.0, 6.4);
    }

    camera.lookAt(0, 0.15, 0);
    camera.updateProjectionMatrix();
  }, [camera, resetKey, mobile]);

  return <ArcballControls enablePan enableZoom enableRotate minDistance={2.4} maxDistance={14} />;
}

function ViewerCanvas({
  url,
  autoRotate,
  wireframe,
  showGrid,
  resetKey,
  mobile,
  selectedColor,
  fileName,
}: {
  url: string;
  autoRotate: boolean;
  wireframe: boolean;
  showGrid: boolean;
  resetKey: number;
  mobile: boolean;
  selectedColor: string;
  fileName?: string;
}) {
  return (
    <div className="h-full w-full">
      <Canvas
        dpr={mobile ? [1, 1.5] : [1, 2]}
        style={{ touchAction: "none" }}
        camera={{
          fov: mobile ? 50 : 42,
          near: 0.1,
          far: 100,
          position: mobile ? [4.2, 3.2, 5.2] : [5.1, 4.0, 6.4],
        }}
      >
        <ambientLight intensity={0.95} />
        <directionalLight position={[5, 6, 5]} intensity={1.15} />
        <directionalLight position={[-4, 3, -2]} intensity={0.35} />

        {showGrid && <Grid position={[0, -1.8, 0]} args={[20, 20]} cellSize={0.5} infiniteGrid />}

        <Suspense fallback={<LoadingFallback />}>
          <ModelMesh
            url={url}
            autoRotate={autoRotate}
            wireframe={wireframe}
            selectedColor={selectedColor}
            fileName={fileName}
          />
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

export default function ModelViewer({
  url,
  className = "",
  showFullscreen = true,
  selectedColor = "#b0b0b0",
  fileName,
}: ModelViewerProps) {
  const [autoRotate, setAutoRotate] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const update = () => setMobile(media.matches);
    update();

    const add = media.addEventListener?.bind(media);
    const remove = media.removeEventListener?.bind(media);

    if (add && remove) {
      add("change", update);
      return () => remove("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  const resetView = () => {
    setResetKey((v) => v + 1);
  };

  const viewer = (full = false) => (
    <div
      className={`relative h-full w-full overflow-hidden bg-gradient-to-b from-white to-zinc-100 ${
        full ? "rounded-none" : "min-h-[260px] sm:min-h-[320px] rounded-2xl sm:min-h-[420px]"
      } ${className}`}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <ViewerCanvas
          url={url}
          autoRotate={autoRotate}
          wireframe={wireframe}
          showGrid={showGrid}
          resetKey={resetKey}
          mobile={mobile}
          selectedColor={selectedColor}
          fileName={fileName}
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

        {showFullscreen && !full && (
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

      {showFullscreen && (
        <Dialog open={fullscreen} onOpenChange={setFullscreen}>
          <DialogContent className="max-w-none border-0 p-0 overflow-hidden h-[100dvh] w-[100vw] sm:h-[88vh] sm:w-[94vw]">
            <div className="relative h-full w-full bg-black">{viewer(true)}</div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
