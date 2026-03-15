import { Suspense, useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Center, Environment, Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { Maximize2, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

function getFileExtension(url: string): string {
  const clean = url.split("?")[0];
  return clean.split(".").pop()?.toLowerCase() ?? "";
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;

      if (mesh.geometry) {
        mesh.geometry.dispose();
      }

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

function SceneSetup({ isFullscreen = false }: { isFullscreen?: boolean }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(isFullscreen ? 3.4 : 3, isFullscreen ? 2.2 : 2, isFullscreen ? 5.4 : 5);
  }, [camera, isFullscreen]);

  return null;
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

function ModelMesh({
  url,
  autoRotate,
  selectedColor = "#b0b0b0",
  fileName,
}: {
  url: string;
  autoRotate: boolean;
  selectedColor?: string;
  fileName?: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [object, setObject] = useState<THREE.Object3D | null>(null);

  const sharedMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(selectedColor),
        metalness: 0.18,
        roughness: 0.62,
      }),
    [selectedColor],
  );

  useEffect(() => {
    let mounted = true;
    let currentObject: THREE.Object3D | null = null;

    const ext = getFileExtension(url, fileName);
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
    };

    if (ext === "stl") {
      const loader = new STLLoader(manager);
      loader.load(url, (geometry) => {
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();

        const mesh = new THREE.Mesh(geometry, sharedMaterial);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const group = new THREE.Group();
        group.add(mesh);
        finish(group);
      });
    } else if (ext === "obj") {
      const loader = new OBJLoader(manager);
      loader.load(url, (obj) => {
        finish(obj);
      });
    } else if (ext === "3mf") {
      const loader = new ThreeMFLoader(manager);
      loader.load(url, (obj) => {
        finish(obj);
      });
    } else {
      setObject(null);
    }

    return () => {
      mounted = false;
      if (currentObject) disposeObject(currentObject);
    };
  }, [url, sharedMaterial]);

  useEffect(() => {
    if (!object) return;

    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => {
            if ("color" in mat) {
              (mat as THREE.MeshStandardMaterial).color.set(selectedColor);
            }
          });
        } else if (mesh.material && "color" in mesh.material) {
          (mesh.material as THREE.MeshStandardMaterial).color.set(selectedColor);
        }
      }
    });
  }, [object, selectedColor]);

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
}: {
  url: string;
  autoRotate: boolean;
  selectedColor?: string;
  isFullscreen?: boolean;
  fileName?: string;
}) => {
  return (
    <Canvas
      className="touch-none"
      shadows={false}
      dpr={isFullscreen ? [1, 1.5] : [1, 1.25]}
      frameloop={autoRotate ? "always" : "demand"}
      camera={{ fov: 45, near: 0.1, far: 100 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }}
    >
      <SceneSetup isFullscreen={isFullscreen} />

      <ambientLight intensity={isFullscreen ? 0.9 : 0.82} />
      <directionalLight position={[5, 5, 5]} intensity={isFullscreen ? 1.12 : 1.02} />
      <directionalLight position={[-3, 3, -3]} intensity={isFullscreen ? 0.35 : 0.22} />

      <Suspense fallback={<LoadingFallback />}>
        <ModelMesh url={url} autoRotate={autoRotate} selectedColor={selectedColor} fileName={fileName} />
        {isFullscreen && <Environment preset="studio" />}
      </Suspense>

      <OrbitControls enablePan={false} enableZoom enableRotate dampingFactor={0.1} />
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

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-muted to-background ${className}`}
      >
        <ViewerCanvas
          url={url}
          autoRotate={autoRotate}
          selectedColor={selectedColor}
          isFullscreen={false}
          fileName={fileName}
        />

        {showFullscreen && (
          <div className="absolute right-2 top-2">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 shadow-sm"
              onClick={() => setFullscreen(true)}
              title="Fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="absolute bottom-2 right-2">
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

        <div className="absolute left-2 top-2 rounded bg-background/80 px-2 py-1 text-xs font-display uppercase text-muted-foreground backdrop-blur-sm">
          3D View
        </div>
      </div>

      {showFullscreen && (
        <Dialog open={fullscreen} onOpenChange={setFullscreen}>
          <DialogContent className="h-[85vh] max-w-[90vw] p-0">
            <div className="h-full w-full bg-gradient-to-br from-muted to-background">
              <ViewerCanvas
                url={url}
                autoRotate={autoRotate}
                selectedColor={selectedColor}
                isFullscreen
                fileName={fileName}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ModelViewer;
