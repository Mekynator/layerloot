import React, { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Float, OrbitControls, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

type Props = {
  imageUrl: string | null;
  shape: "flat" | "arched" | "frame";
  orientation: "portrait" | "landscape";
  widthMm: number;
  heightMm: number;
  borderMm: number;
  sceneMode: "desk" | "wall" | "dark";
  lightEnabled: boolean;
  lightTone: "warm" | "neutral" | "cool";
  allowRotation?: boolean;
};

function toneColor(lightTone: Props["lightTone"]) {
  if (lightTone === "warm") return "#ffd18a";
  if (lightTone === "cool") return "#acdfff";
  return "#f5f5f5";
}

function normalizeSize(mm: number, divisor: number) {
  return Math.max(1.2, mm / divisor);
}

function LithophaneSurface({
  texture,
  sizeW,
  sizeH,
  lightEnabled,
  lightTone,
}: {
  texture: THREE.Texture | null;
  sizeW: number;
  sizeH: number;
  lightEnabled: boolean;
  lightTone: Props["lightTone"];
}) {
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: lightEnabled ? "#f4f0ea" : "#b8b1a8",
        emissive: new THREE.Color(lightEnabled ? toneColor(lightTone) : "#000000"),
        emissiveIntensity: lightEnabled ? 0.22 : 0,
        displacementMap: texture ?? undefined,
        displacementScale: 0.18,
        roughness: 0.78,
        metalness: 0.02,
        map: texture ?? undefined,
      }),
    [texture, lightEnabled, lightTone],
  );

  return (
    <mesh castShadow receiveShadow>
      <planeGeometry args={[sizeW, sizeH, 180, 180]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function LithophaneGeometry({
  imageUrl,
  shape,
  orientation,
  widthMm,
  heightMm,
  borderMm,
  lightEnabled,
  lightTone,
}: Omit<Props, "sceneMode" | "allowRotation">) {
  const texture = useMemo(() => {
    if (!imageUrl) return null;
    const loader = new THREE.TextureLoader();
    const tex = loader.load(imageUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, [imageUrl]);

  const sizeW = normalizeSize(widthMm, 66);
  const sizeH = normalizeSize(heightMm, 66);
  const border = Math.max(0.08, borderMm / 24);

  if (!imageUrl) {
    return (
      <Float speed={1.1} rotationIntensity={0} floatIntensity={0.12}>
        <RoundedBox args={[2.8, 3.9, 0.18]} radius={0.08} position={[0, 0, 0]}>
          <meshStandardMaterial color="#ece7dd" roughness={0.7} metalness={0.03} />
        </RoundedBox>
      </Float>
    );
  }

  if (shape === "arched") {
    return (
      <group position={[0, 0, 0]}>
        <mesh rotation={[0, Math.PI, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[4.2, 4.2, sizeW, 96, 48, true, Math.PI * 0.82, Math.PI * 0.5]} />
          <meshStandardMaterial
            color={lightEnabled ? "#f4f0ea" : "#b8b1a8"}
            emissive={new THREE.Color(lightEnabled ? toneColor(lightTone) : "#000000")}
            emissiveIntensity={lightEnabled ? 0.22 : 0}
            roughness={0.78}
            metalness={0.02}
            map={texture ?? undefined}
          />
        </mesh>
      </group>
    );
  }

  if (shape === "frame") {
    return (
      <group position={[0, 0, 0]}>
        <RoundedBox args={[sizeW + border + 0.5, sizeH + border + 0.55, 0.32]} radius={0.12} position={[0, 0, -0.06]}>
          <meshStandardMaterial color="#3b2517" roughness={0.82} metalness={0.08} />
        </RoundedBox>

        <RoundedBox args={[sizeW + border * 0.22, sizeH + border * 0.22, 0.1]} radius={0.06} position={[0, 0, 0]}>
          <meshStandardMaterial color="#191919" roughness={0.88} metalness={0.02} />
        </RoundedBox>

        <group position={[0, 0, 0.08]}>
          <LithophaneSurface
            texture={texture}
            sizeW={sizeW}
            sizeH={sizeH}
            lightEnabled={lightEnabled}
            lightTone={lightTone}
          />
        </group>
      </group>
    );
  }

  return (
    <group position={[0, 0, 0]}>
      <LithophaneSurface
        texture={texture}
        sizeW={orientation === "portrait" ? sizeW : sizeW + 0.5}
        sizeH={sizeH}
        lightEnabled={lightEnabled}
        lightTone={lightTone}
      />
    </group>
  );
}

function SceneShell({
  sceneMode,
  lightEnabled,
  lightTone,
  shape,
  children,
}: {
  sceneMode: Props["sceneMode"];
  lightEnabled: boolean;
  lightTone: Props["lightTone"];
  shape: Props["shape"];
  children: React.ReactNode;
}) {
  const lampColor = toneColor(lightTone);
  const modelZ = sceneMode === "wall" ? 1.2 : 0;

  return (
    <>
      <color
        attach="background"
        args={[sceneMode === "desk" ? "#141820" : sceneMode === "wall" ? "#18171b" : "#0b1020"]}
      />
      <ambientLight intensity={sceneMode === "dark" ? 0.4 : 0.58} />
      <directionalLight position={[3, 4, 5]} intensity={1.12} />
      <pointLight
        position={[0, 0.3, sceneMode === "wall" ? 0.78 : -1.55]}
        intensity={lightEnabled ? 7 : 1.4}
        color={lampColor}
        distance={12}
      />

      {sceneMode === "desk" && (
        <mesh position={[0, -2.35, -0.1]} receiveShadow>
          <boxGeometry args={[12, 0.35, 5.4]} />
          <meshStandardMaterial color="#5e4939" roughness={0.9} />
        </mesh>
      )}

      {sceneMode === "wall" && (
        <mesh position={[0, 0, 0.72]} receiveShadow>
          <planeGeometry args={[16, 12]} />
          <meshStandardMaterial color="#675e5a" roughness={1} />
        </mesh>
      )}

      <Float speed={1.05} rotationIntensity={0} floatIntensity={sceneMode === "wall" ? 0.04 : 0.12}>
        <group
          position={[0, sceneMode === "desk" ? -0.1 : 0, modelZ]}
          rotation={sceneMode === "wall" ? [0, shape === "arched" ? Math.PI : 0, 0] : [0, 0, 0]}
        >
          {children}
        </group>
      </Float>
    </>
  );
}

export default function Lithophane3DViewer(props: Props) {
  return (
    <Canvas
      camera={{ position: [0, 0, 6.2], fov: 34 }}
      shadows
      gl={{ antialias: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        <SceneShell
          sceneMode={props.sceneMode}
          lightEnabled={props.lightEnabled}
          lightTone={props.lightTone}
          shape={props.shape}
        >
          <LithophaneGeometry
            imageUrl={props.imageUrl}
            shape={props.shape}
            orientation={props.orientation}
            widthMm={props.widthMm}
            heightMm={props.heightMm}
            borderMm={props.borderMm}
            lightEnabled={props.lightEnabled}
            lightTone={props.lightTone}
          />
        </SceneShell>

        <Environment preset="studio" />
      </Suspense>

      <OrbitControls
        enablePan={false}
        enableRotate={Boolean(props.allowRotation)}
        minPolarAngle={Math.PI / 2}
        maxPolarAngle={Math.PI / 2}
        minDistance={4.2}
        maxDistance={8.4}
        autoRotate={false}
        target={[0, 0, props.sceneMode === "wall" ? 1.1 : 0]}
      />
    </Canvas>
  );
}
