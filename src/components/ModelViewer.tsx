import { Suspense, useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Center, Environment } from "@react-three/drei";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { Maximize2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

function getFileExtension(url: string): string {
  const clean = url.split("?")[0];
  return clean.split(".").pop()?.toLowerCase() ?? "";
}

function ModelMesh({ url, autoRotate }: { url: string; autoRotate: boolean }) {
  const meshRef = useRef<THREE.Group>(null);
  const [object, setObject] = useState<THREE.Object3D | null>(null);

  useEffect(() => {
    const ext = getFileExtension(url);
    const manager = new THREE.LoadingManager();

    if (ext === "stl") {
      const loader = new STLLoader(manager);
      loader.load(url, (geometry) => {
        geometry.computeVertexNormals();
        const material = new THREE.MeshPhysicalMaterial({
          color: 0xb0b0b0,
          metalness: 0.3,
          roughness: 0.4,
          clearcoat: 0.3,
        });
        const mesh = new THREE.Mesh(geometry, material);
        const group = new THREE.Group();
        group.add(mesh);
        setObject(group);
      });
    } else if (ext === "obj") {
      const loader = new OBJLoader(manager);
      loader.load(url, (obj) => {
        obj.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            (child as THREE.Mesh).material = new THREE.MeshPhysicalMaterial({
              color: 0xb0b0b0,
              metalness: 0.3,
              roughness: 0.4,
            });
          }
        });
        setObject(obj);
      });
    } else if (ext === "3mf") {
      const loader = new ThreeMFLoader(manager);
      loader.load(url, (obj) => {
        setObject(obj);
      });
    }
  }, [url]);

  useFrame((_, delta) => {
    if (autoRotate && meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  if (!object) return null;

  return (
    <Center>
      <group ref={meshRef}>
        <primitive object={object} />
      </group>
    </Center>
  );
}

function SceneSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(3, 2, 5);
  }, [camera]);
  return null;
}

interface ModelViewerProps {
  url: string;
  className?: string;
  showFullscreen?: boolean;
}

const ModelViewer = ({ url, className = "", showFullscreen = true }: ModelViewerProps) => {
  const [autoRotate, setAutoRotate] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  const viewer = (
    <Canvas shadows camera={{ fov: 45, near: 0.1, far: 100 }} className="touch-none">
      <SceneSetup />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <directionalLight position={[-3, 3, -3]} intensity={0.4} />
      <Suspense fallback={null}>
        <ModelMesh url={url} autoRotate={autoRotate} />
        <Environment preset="studio" />
      </Suspense>
      <OrbitControls enablePan enableZoom enableRotate dampingFactor={0.1} />
      <gridHelper args={[10, 10, 0x888888, 0x444444]} position={[0, -0.01, 0]} />
    </Canvas>
  );

  return (
    <>
      <div className={`relative overflow-hidden rounded-lg border border-border bg-muted ${className}`}>
        {viewer}
        <div className="absolute bottom-2 right-2 flex gap-1">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8"
            onClick={() => setAutoRotate(!autoRotate)}
            title={autoRotate ? "Stop rotation" : "Auto-rotate"}
          >
            <RotateCcw className={`h-4 w-4 ${autoRotate ? "animate-spin" : ""}`} style={autoRotate ? { animationDuration: "3s" } : {}} />
          </Button>
          {showFullscreen && (
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8"
              onClick={() => setFullscreen(true)}
              title="Fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="absolute left-2 top-2 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground font-display uppercase">
          3D View
        </div>
      </div>

      {showFullscreen && (
        <Dialog open={fullscreen} onOpenChange={setFullscreen}>
          <DialogContent className="h-[85vh] max-w-[90vw] p-0">
            <div className="h-full w-full">
              {viewer}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ModelViewer;
