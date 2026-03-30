import React, { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
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

function normalizeWidth(mm: number) {
  return Math.max(1.45, mm / 78);
}

function normalizeHeight(mm: number) {
  return Math.max(1.85, mm / 78);
}

function useLithophaneTexture(imageUrl: string | null) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setTexture(null);
      return;
    }

    let disposed = false;
    const loader = new THREE.TextureLoader();

    loader.load(
      imageUrl,
      (loadedTexture) => {
        if (disposed) {
          loadedTexture.dispose();
          return;
        }
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
        loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
        loadedTexture.anisotropy = 4;
        setTexture((previous) => {
          previous?.dispose();
          return loadedTexture;
        });
      },
      undefined,
      () => {
        if (!disposed) setTexture(null);
      },
    );

    return () => {
      disposed = true;
    };
  }, [imageUrl]);

  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  return texture;
}

function CameraFit({ sceneMode }: { sceneMode: Props["sceneMode"] }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, sceneMode === "desk" ? 0.2 : 0.05, sceneMode === "wall" ? 5.8 : 6.2);
    camera.lookAt(0, 0.08, sceneMode === "wall" ? 0.1 : 0);
  }, [camera, sceneMode]);

  return null;
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
        displacementScale: 0.12,
        roughness: 0.78,
        metalness: 0.02,
        map: texture ?? undefined,
      }),
    [texture, lightEnabled, lightTone],
  );

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return (
    <mesh castShadow receiveShadow>
      <planeGeometry args={[sizeW, sizeH, 120, 120]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function FlatLithophane({
  texture,
  sizeW,
  sizeH,
  border,
  lightEnabled,
  lightTone,
}: {
  texture: THREE.Texture | null;
  sizeW: number;
  sizeH: number;
  border: number;
  lightEnabled: boolean;
  lightTone: Props["lightTone"];
}) {
  return (
    <group>
      <RoundedBox args={[sizeW + border * 0.42, sizeH + border * 0.42, 0.08]} radius={0.05} position={[0, 0, -0.03]}>
        <meshStandardMaterial color="#ede7de" roughness={0.82} metalness={0.02} />
      </RoundedBox>
      <group position={[0, 0, 0.015]}>
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

function FramedLithophane({
  texture,
  sizeW,
  sizeH,
  border,
  lightEnabled,
  lightTone,
}: {
  texture: THREE.Texture | null;
  sizeW: number;
  sizeH: number;
  border: number;
  lightEnabled: boolean;
  lightTone: Props["lightTone"];
}) {
  return (
    <group>
      <RoundedBox args={[sizeW + border + 0.52, sizeH + border + 0.58, 0.28]} radius={0.12} position={[0, 0, -0.08]}>
        <meshStandardMaterial color="#3b2517" roughness={0.82} metalness={0.08} />
      </RoundedBox>

      <RoundedBox args={[sizeW + border * 0.24, sizeH + border * 0.24, 0.08]} radius={0.06} position={[0, 0, -0.005]}>
        <meshStandardMaterial color="#191919" roughness={0.88} metalness={0.02} />
      </RoundedBox>

      <group position={[0, 0, 0.055]}>
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

function ArchedLithophane({
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
  const radius = Math.max(2.2, sizeW * 1.18);
  const thetaLength = Math.min(1.28, Math.max(0.9, sizeW / 3.2));

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: lightEnabled ? "#f4f0ea" : "#b8b1a8",
        emissive: new THREE.Color(lightEnabled ? toneColor(lightTone) : "#000000"),
        emissiveIntensity: lightEnabled ? 0.22 : 0,
        roughness: 0.78,
        metalness: 0.02,
        map: texture ?? undefined,
        side: THREE.DoubleSide,
      }),
    [texture, lightEnabled, lightTone],
  );

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return (
    <group rotation={[0, Math.PI, 0]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, sizeH, 96, 1, true, Math.PI / 2 - thetaLength / 2, thetaLength]} />
        <primitive object={material} attach="material" />
      </mesh>
    </group>
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
  const texture = useLithophaneTexture(imageUrl);

  const baseWidth = normalizeWidth(widthMm);
  const baseHeight = normalizeHeight(heightMm);
  const sizeW = orientation === "portrait" ? baseWidth : baseHeight;
  const sizeH = orientation === "portrait" ? baseHeight : baseWidth;
  const border = Math.max(0.08, borderMm / 24);

  if (!imageUrl) {
    return (
      <Float speed={1.05} rotationIntensity={0} floatIntensity={0.08}>
        <RoundedBox args={[2.8, 3.9, 0.18]} radius={0.08} position={[0, 0.1, 0]}>
          <meshStandardMaterial color="#ece7dd" roughness={0.7} metalness={0.03} />
        </RoundedBox>
      </Float>
    );
  }

  if (shape === "arched") {
    return (
      <ArchedLithophane
        texture={texture}
        sizeW={sizeW}
        sizeH={sizeH}
        lightEnabled={lightEnabled}
        lightTone={lightTone}
      />
    );
  }

  if (shape === "frame") {
    return (
      <FramedLithophane
        texture={texture}
        sizeW={sizeW}
        sizeH={sizeH}
        border={border}
        lightEnabled={lightEnabled}
        lightTone={lightTone}
      />
    );
  }

  return (
    <FlatLithophane
      texture={texture}
      sizeW={sizeW}
      sizeH={sizeH}
      border={border}
      lightEnabled={lightEnabled}
      lightTone={lightTone}
    />
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
  const floatAmount = sceneMode === "wall" ? 0.01 : 0.06;
  const yPosition = sceneMode === "desk" ? 0.02 : 0.03;
  const zPosition = sceneMode === "wall" ? 0.63 : 0;
  const wallRotationY = shape === "arched" ? 0 : 0;

  return (
    <>
      <color
        attach="background"
        args={[sceneMode === "desk" ? "#141820" : sceneMode === "wall" ? "#18171b" : "#0b1020"]}
      />
      <ambientLight intensity={sceneMode === "dark" ? 0.42 : 0.58} />
      <directionalLight position={[3, 4, 5]} intensity={1.05} castShadow />
      <pointLight
        position={[0, 0.15, sceneMode === "wall" ? 0.15 : -1.45]}
        intensity={lightEnabled ? 6.5 : 1.2}
        color={lampColor}
        distance={12}
      />

      {sceneMode === "desk" && (
        <>
          <mesh position={[0, -2.0, -1.2]} receiveShadow>
            <boxGeometry args={[14, 0.35, 8.2]} />
            <meshStandardMaterial color="#5e4939" roughness={0.92} />
          </mesh>
          <mesh position={[0, -1.72, -0.68]} receiveShadow>
            <boxGeometry args={[4.1, 0.08, 2.15]} />
            <meshStandardMaterial color="#2c231e" roughness={0.92} />
          </mesh>
        </>
      )}

      {sceneMode === "wall" && (
        <mesh position={[0, 0, 0.48]} receiveShadow>
          <planeGeometry args={[16, 12]} />
          <meshStandardMaterial color="#675e5a" roughness={1} />
        </mesh>
      )}

      <Float speed={1.02} rotationIntensity={0} floatIntensity={floatAmount}>
        <group position={[0, yPosition, zPosition]} rotation={[0, wallRotationY, 0]}>
          {children}
        </group>
      </Float>
    </>
  );
}

export default function Lithophane3DViewer(props: Props) {
  const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 1.75) : 1.5;

  return (
    <Canvas
      camera={{
        position: [0, props.sceneMode === "desk" ? 0.2 : 0.05, props.sceneMode === "wall" ? 5.8 : 6.2],
        fov: 34,
      }}
      shadows
      dpr={dpr}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        <CameraFit sceneMode={props.sceneMode} />
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
        minDistance={4.8}
        maxDistance={8.2}
        autoRotate={false}
        target={[0, 0.08, props.sceneMode === "wall" ? 0.12 : 0]}
      />
    </Canvas>
  );
}
