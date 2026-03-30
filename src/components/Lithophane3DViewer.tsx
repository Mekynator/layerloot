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
};

function toneColor(lightTone: Props["lightTone"]) {
  if (lightTone === "warm") return "#ffd18a";
  if (lightTone === "cool") return "#acdfff";
  return "#f5f5f5";
}

function normalizeSize(mm: number, divisor: number) {
  return Math.max(1.2, mm / divisor);
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
}: Omit<Props, "sceneMode">) {
  const texture = useMemo(() => {
    if (!imageUrl) return null;
    const loader = new THREE.TextureLoader();
    const tex = loader.load(imageUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, [imageUrl]);

  const sizeW = normalizeSize(widthMm, 58);
  const sizeH = normalizeSize(heightMm, 58);
  const border = Math.max(0.05, borderMm / 30);

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

  if (!imageUrl) {
    return (
      <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.18}>
        <RoundedBox args={[3.2, 4.2, 0.22]} radius={0.12}>
          <meshStandardMaterial color="#ece7dd" roughness={0.7} metalness={0.03} />
        </RoundedBox>
      </Float>
    );
  }

  if (shape === "arched") {
    return (
      <group>
        <mesh rotation={[0, 0, 0]}>
          <cylinderGeometry args={[4.2, 4.2, sizeW, 96, 80, true, Math.PI * 0.38, Math.PI * 0.24]} />
          <primitive object={material} attach="material" />
        </mesh>
      </group>
    );
  }

  if (shape === "frame") {
    return (
      <group>
        <RoundedBox args={[sizeW + border + 0.6, sizeH + border + 0.7, 0.45]} radius={0.14} position={[0, 0, -0.15]}>
          <meshStandardMaterial color="#3b2517" roughness={0.82} metalness={0.08} />
        </RoundedBox>

        <RoundedBox args={[sizeW + border * 0.4, sizeH + border * 0.4, 0.2]} radius={0.08} position={[0, 0, 0.02]}>
          <meshStandardMaterial color="#191919" roughness={0.88} metalness={0.02} />
        </RoundedBox>

        <mesh position={[0, 0, 0.14]}>
          <planeGeometry args={[sizeW, sizeH, 180, 180]} />
          <primitive object={material} attach="material" />
        </mesh>
      </group>
    );
  }

  return (
    <mesh>
      <planeGeometry args={[orientation === "portrait" ? sizeW : sizeW + 0.6, sizeH, 180, 180]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function SceneShell({
  sceneMode,
  lightEnabled,
  lightTone,
  children,
}: {
  sceneMode: Props["sceneMode"];
  lightEnabled: boolean;
  lightTone: Props["lightTone"];
  children: React.ReactNode;
}) {
  const lampColor = toneColor(lightTone);

  return (
    <>
      <color attach="background" args={[sceneMode === "desk" ? "#141820" : sceneMode === "wall" ? "#18171b" : "#0b1020"]} />
      <ambientLight intensity={sceneMode === "dark" ? 0.36 : 0.55} />
      <directionalLight position={[3, 4, 5]} intensity={1.15} />
      <pointLight position={[0, 0.4, -1.8]} intensity={lightEnabled ? 8 : 1.8} color={lampColor} distance={12} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.2, 0]}>
        <planeGeometry args={[22, 22]} />
        <shadowMaterial opacity={0.2} />
      </mesh>

      {sceneMode === "desk" && (
        <mesh position={[0, -1.95, -0.8]}>
          <boxGeometry args={[12, 0.4, 5]} />
          <meshStandardMaterial color="#5e4939" roughness={0.9} />
        </mesh>
      )}

      {sceneMode === "wall" && (
        <mesh position={[0, 0, -1.9]}>
          <planeGeometry args={[16, 12]} />
          <meshStandardMaterial color="#675e5a" roughness={1} />
        </mesh>
      )}

      <Float speed={1.1} rotationIntensity={0.08} floatIntensity={0.16}>
        {children}
      </Float>
    </>
  );
}

export default function Lithophane3DViewer(props: Props) {
  return (
    <Canvas camera={{ position: [0, 0.5, 6.2], fov: 38 }} shadows>
      <Suspense fallback={null}>
        <SceneShell sceneMode={props.sceneMode} lightEnabled={props.lightEnabled} lightTone={props.lightTone}>
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
        minDistance={3.2}
        maxDistance={10}
        autoRotate={!props.imageUrl}
        autoRotateSpeed={0.9}
      />
    </Canvas>
  );
}
