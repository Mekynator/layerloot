import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Crop,
  Image as ImageIcon,
  LampDesk,
  PackageCheck,
  RotateCcw,
  Sparkles,
  SunMedium,
  Upload,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LithophaneImageEditorModal, {
  type CropState,
  type SavedLithophaneImage,
} from "@/components/LithophaneImageEditorModal";
import Lithophane3DViewer from "@/components/Lithophane3DViewer";

export type LithophaneShape = "flat" | "arched" | "frame";
export type LithophaneOrientation = "portrait" | "landscape";
export type LithophaneSceneMode = "desk" | "wall" | "dark";
export type LithophaneLightTone = "warm" | "neutral" | "cool";

export interface LithophaneSubmitPayload {
  sourceFileName: string | null;
  sourceDataUrl: string | null;
  originalSourceDataUrl: string | null;
  croppedImageDataUrl: string | null;
  processedDataUrl: string | null;
  previewScreenshotDataUrl: string | null;
  cropState: CropState | null;
  shape: LithophaneShape;
  orientation: LithophaneOrientation;
  widthMm: number;
  heightMm: number;
  minThicknessMm: number;
  maxThicknessMm: number;
  borderMm: number;
  invert: boolean;
  brightness: number;
  contrast: number;
  gamma: number;
  blur: number;
  lightEnabled: boolean;
  lightTone: LithophaneLightTone;
  sceneMode: LithophaneSceneMode;
  notes: string;
  estimatedPrice: number;
  estimatedPrintHours: number;
  designJson: Record<string, unknown>;
}

export interface LithophaneProps {
  className?: string;
  onSubmitDesign?: (payload: LithophaneSubmitPayload) => void | Promise<void>;
  onDraftChange?: (payload: Partial<LithophaneSubmitPayload>) => void;
  submitLabel?: string;
  initialNotes?: string;
}

type UploadProgressState = {
  active: boolean;
  progress: number;
  status: string;
};

const DEFAULTS = {
  widthMm: 120,
  heightMm: 160,
  borderMm: 3,
  orientation: "portrait" as LithophaneOrientation,
  shape: "frame" as LithophaneShape,
  sceneMode: "dark" as LithophaneSceneMode,
};

function estimatePrice(widthMm: number, heightMm: number, borderMm: number) {
  const widthExtra = Math.max(0, widthMm - 60);
  const heightExtra = Math.max(0, heightMm - 80);
  const basePrice = 100;
  const sizeIncrease = widthExtra * 0.48 + heightExtra * 0.62;
  const borderIncrease = borderMm * 8;
  return Number((basePrice + sizeIncrease + borderIncrease).toFixed(2));
}

function estimatePrintHours(widthMm: number, heightMm: number, borderMm: number) {
  const baseHours = 2;
  const sizeFactor = (widthMm * heightMm) / 9000;
  const borderFactor = borderMm * 0.12;
  return Number((baseHours + sizeFactor + borderFactor).toFixed(1));
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function detectOrientation(src: string): Promise<LithophaneOrientation> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image.width >= image.height ? "landscape" : "portrait");
    image.onerror = reject;
    image.src = src;
  });
}

function Section({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={["rounded-2xl border border-slate-300 bg-white p-5 shadow-sm", className].filter(Boolean).join(" ")}
    >
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between text-xs font-medium text-slate-700">
        <span>{label}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-900">{value}</span>
      </div>
      <input
        className="w-full cursor-pointer accent-amber-500"
        type="range"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function ToggleChip({
  active,
  children,
  onClick,
  icon,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={[
        "flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition",
        active
          ? "border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-300 shadow-[0_0_24px_rgba(245,158,11,0.22)]"
          : "border-slate-300 bg-white text-slate-700 hover:border-amber-300 hover:bg-slate-50",
      ].join(" ")}
    >
      {icon}
      {children}
    </motion.button>
  );
}

function UploadOverlay({ progress, status }: { progress: number; status: string }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-white/85 px-5 text-center backdrop-blur-sm"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          className="mb-3"
        >
          <Sparkles className="h-7 w-7 text-amber-500" />
        </motion.div>
        <p className="text-sm font-semibold text-slate-900">{status}</p>
        <div className="mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-200">
          <motion.div
            className="h-full rounded-full bg-amber-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "easeOut", duration: 0.25 }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-600">{Math.round(progress)}%</p>
      </motion.div>
    </AnimatePresence>
  );
}

function StepPill({ active, done, children }: { active: boolean; done: boolean; children: React.ReactNode }) {
  return (
    <div
      className={[
        "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition",
        active
          ? "border-amber-400 bg-amber-50 text-amber-700 shadow-[0_0_20px_rgba(245,158,11,0.18)]"
          : done
            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
            : "border-white/15 bg-white/5 text-slate-300",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export default function Lithophane({
  className,
  onSubmitDesign,
  onDraftChange,
  submitLabel = "Submit Lithophane Design",
  initialNotes = "",
}: LithophaneProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [shape, setShape] = useState<LithophaneShape>(DEFAULTS.shape);
  const [orientation, setOrientation] = useState<LithophaneOrientation>(DEFAULTS.orientation);
  const [autoDetectedOrientation, setAutoDetectedOrientation] = useState<LithophaneOrientation>(DEFAULTS.orientation);
  const [sceneMode, setSceneMode] = useState<LithophaneSceneMode>(DEFAULTS.sceneMode);
  const [widthMm, setWidthMm] = useState(DEFAULTS.widthMm);
  const [heightMm, setHeightMm] = useState(DEFAULTS.heightMm);
  const [borderMm, setBorderMm] = useState(DEFAULTS.borderMm);
  const [lightEnabled, setLightEnabled] = useState(true);
  const [lightTone, setLightTone] = useState<LithophaneLightTone>("warm");
  const [notes, setNotes] = useState(initialNotes);
  const [allowRotation, setAllowRotation] = useState(false);
  const [viewerRevision, setViewerRevision] = useState(0);
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [originalSourceDataUrl, setOriginalSourceDataUrl] = useState<string | null>(null);
  const [croppedImageDataUrl, setCroppedImageDataUrl] = useState<string | null>(null);
  const [cropState, setCropState] = useState<CropState | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState>({
    active: false,
    progress: 0,
    status: "",
  });

  const estimatedPrice = useMemo(() => estimatePrice(widthMm, heightMm, borderMm), [widthMm, heightMm, borderMm]);
  const estimatedPrintHours = useMemo(
    () => estimatePrintHours(widthMm, heightMm, borderMm),
    [widthMm, heightMm, borderMm],
  );

  useEffect(() => {
    onDraftChange?.({
      sourceFileName,
      sourceDataUrl: croppedImageDataUrl,
      originalSourceDataUrl,
      croppedImageDataUrl,
      processedDataUrl: croppedImageDataUrl,
      previewScreenshotDataUrl: croppedImageDataUrl,
      cropState,
      shape,
      orientation,
      widthMm,
      heightMm,
      minThicknessMm: 0.8,
      maxThicknessMm: 3.2,
      borderMm,
      invert: false,
      brightness: 0,
      contrast: 0,
      gamma: 1,
      blur: 0,
      lightEnabled,
      lightTone,
      sceneMode,
      notes,
      estimatedPrice,
      estimatedPrintHours,
    });
  }, [
    sourceFileName,
    croppedImageDataUrl,
    originalSourceDataUrl,
    cropState,
    shape,
    orientation,
    widthMm,
    heightMm,
    borderMm,
    lightEnabled,
    lightTone,
    sceneMode,
    notes,
    estimatedPrice,
    estimatedPrintHours,
    onDraftChange,
  ]);

  const runUploadProgress = async (selectedFile: File) => {
    setUploadProgress({ active: true, progress: 8, status: "Reading image..." });
    await sleep(120);
    const dataUrl = await readFileAsDataUrl(selectedFile);
    setUploadProgress({ active: true, progress: 34, status: "Detecting orientation..." });
    await sleep(120);
    const detected = await detectOrientation(dataUrl);
    setAutoDetectedOrientation(detected);
    setOrientation(detected);
    setUploadProgress({ active: true, progress: 70, status: "Preparing editor..." });
    await sleep(150);
    setSourceFileName(selectedFile.name);
    setOriginalSourceDataUrl(dataUrl);
    setEditorOpen(true);
    setStep(2);
    setUploadProgress({ active: true, progress: 100, status: "Ready to crop" });
    await sleep(180);
    setUploadProgress({ active: false, progress: 0, status: "" });
  };

  const handleFileChange = async (file?: File | null) => {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) return;
    try {
      await runUploadProgress(file);
    } catch (error) {
      console.error("Lithophane upload failed", error);
      setUploadProgress({ active: false, progress: 0, status: "" });
    }
  };

  const handleImageSaved = (result: SavedLithophaneImage) => {
    setCroppedImageDataUrl(result.croppedDataUrl);
    setCropState(result.cropState);
    setEditorOpen(false);
    setStep(3);
    setViewerRevision((value) => value + 1);
  };

  const handleReset = () => {
    setWidthMm(DEFAULTS.widthMm);
    setHeightMm(DEFAULTS.heightMm);
    setBorderMm(DEFAULTS.borderMm);
    setLightEnabled(true);
    setLightTone("warm");
    setSceneMode(DEFAULTS.sceneMode);
    setOrientation(autoDetectedOrientation);
    setShape(DEFAULTS.shape);
    setAllowRotation(false);
    setViewerRevision((value) => value + 1);
  };

  const dimensionLabel = `${widthMm} × ${heightMm} mm`;
  const uploadBusy = uploadProgress.active;

  const submitPayload: LithophaneSubmitPayload = useMemo(
    () => ({
      sourceFileName,
      sourceDataUrl: croppedImageDataUrl,
      originalSourceDataUrl,
      croppedImageDataUrl,
      processedDataUrl: croppedImageDataUrl,
      previewScreenshotDataUrl: croppedImageDataUrl,
      cropState,
      shape,
      orientation,
      widthMm,
      heightMm,
      minThicknessMm: 0.8,
      maxThicknessMm: 3.2,
      borderMm,
      invert: false,
      brightness: 0,
      contrast: 0,
      gamma: 1,
      blur: 0,
      lightEnabled,
      lightTone,
      sceneMode,
      notes,
      estimatedPrice,
      estimatedPrintHours,
      designJson: {
        version: 5,
        component: "Lithophane",
        shape,
        orientation,
        autoDetectedOrientation,
        dimensions: { widthMm, heightMm, borderMm },
        scene: { lightEnabled, lightTone, sceneMode, allowRotation, viewerRevision },
        imageEditor: cropState,
        pricing: {
          estimatedPrice,
          estimatedPrintHours,
          minimumPriceRule: "60x80 border 0 = 100 DKK",
        },
      },
    }),
    [
      sourceFileName,
      croppedImageDataUrl,
      originalSourceDataUrl,
      cropState,
      shape,
      orientation,
      widthMm,
      heightMm,
      borderMm,
      lightEnabled,
      lightTone,
      sceneMode,
      notes,
      estimatedPrice,
      estimatedPrintHours,
      autoDetectedOrientation,
      allowRotation,
      viewerRevision,
    ],
  );

  return (
    <div className={["space-y-6", className].filter(Boolean).join(" ")}>
      <LithophaneImageEditorModal
        open={editorOpen}
        imageSrc={originalSourceDataUrl}
        sourceFileName={sourceFileName}
        orientation={orientation}
        onOrientationChange={setOrientation}
        onClose={() => setEditorOpen(false)}
        onSave={handleImageSaved}
      />

      <div className="rounded-3xl border border-slate-300 bg-[#0b1020] p-5 shadow-2xl">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <StepPill active={step === 1} done={step > 1}>
              1 Upload
            </StepPill>
            <StepPill active={step === 2} done={step > 2}>
              2 Crop
            </StepPill>
            <StepPill active={step === 3} done={step > 3}>
              3 Setup
            </StepPill>
            <StepPill active={step === 4} done={false}>
              4 Review
            </StepPill>
          </div>
          <div className="flex flex-wrap gap-2">
            <ToggleChip active={!allowRotation} onClick={() => setAllowRotation(false)}>
              Front view
            </ToggleChip>
            <ToggleChip active={allowRotation} onClick={() => setAllowRotation(true)}>
              Rotate preview
            </ToggleChip>
            <ToggleChip
              active={false}
              onClick={() => setViewerRevision((value) => value + 1)}
              icon={<RotateCcw className="h-4 w-4" />}
            >
              Reset view
            </ToggleChip>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-900">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),transparent_34%)]" />
          <div className="h-[360px] w-full sm:h-[440px] lg:h-[560px] xl:h-[640px]">
            <Lithophane3DViewer
              key={viewerRevision}
              imageUrl={croppedImageDataUrl}
              shape={shape}
              orientation={orientation}
              widthMm={widthMm}
              heightMm={heightMm}
              borderMm={borderMm}
              sceneMode={sceneMode}
              lightEnabled={lightEnabled}
              lightTone={lightTone}
              allowRotation={allowRotation}
            />
          </div>

          {!croppedImageDataUrl && (
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-10">
              <motion.div
                animate={{ y: [0, -6, 0], opacity: [0.92, 1, 0.92] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm text-slate-200 backdrop-blur-sm"
              >
                Upload an image to start the 3D lithophane preview
              </motion.div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_1.15fr]">
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr] xl:grid-cols-[1fr_0.9fr]">
            <Section
              title="Step 1 · Upload image"
              icon={<Upload className="h-4 w-4 text-amber-500" />}
              className="h-full"
            >
              <div
                className="relative"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  void handleFileChange(e.dataTransfer.files?.[0]);
                }}
              >
                <label
                  className={[
                    "flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-8 text-center transition-all",
                    dragActive
                      ? "border-amber-500 bg-amber-50 shadow-[0_0_28px_rgba(245,158,11,0.14)]"
                      : "border-slate-300 bg-slate-50 hover:bg-slate-100",
                  ].join(" ")}
                >
                  <motion.div
                    animate={dragActive ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                    transition={{ duration: 1.1, repeat: dragActive ? Infinity : 0 }}
                  >
                    <ImageIcon className="mb-3 h-8 w-8 text-slate-500" />
                  </motion.div>
                  <div className="text-sm font-semibold text-slate-900">
                    {sourceFileName ? "Replace image and reopen editor" : "Drop photo here or click to upload"}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">PNG, JPG, WEBP</div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => void handleFileChange(e.target.files?.[0])}
                  />
                </label>
                {uploadProgress.active && (
                  <UploadOverlay progress={uploadProgress.progress} status={uploadProgress.status} />
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <ToggleChip
                  active={false}
                  onClick={() => originalSourceDataUrl && setEditorOpen(true)}
                  icon={<Crop className="h-4 w-4" />}
                >
                  Reopen crop editor
                </ToggleChip>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  Auto orientation: <span className="font-semibold capitalize">{autoDetectedOrientation}</span>
                </div>
              </div>
            </Section>

            <Section title="Preview status" icon={<Sparkles className="h-4 w-4 text-amber-500" />} className="h-full">
              <div className="space-y-3 text-sm text-slate-700">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Current size</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">{dimensionLabel}</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Shape</div>
                    <div className="mt-1 font-semibold capitalize text-slate-900">{shape}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">View</div>
                    <div className="mt-1 font-semibold text-slate-900">
                      {allowRotation ? "Rotation enabled" : "Front only"}
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  The preview opens in a front view by default. Turn on rotation only when you want to inspect the
                  model.
                </div>
              </div>
            </Section>
          </div>

          <Section title="Step 2 · Product setup" icon={<PackageCheck className="h-4 w-4 text-amber-500" />}>
            <div className="grid grid-cols-3 gap-2">
              <ToggleChip
                active={shape === "flat"}
                onClick={() => {
                  setShape("flat");
                  setStep(3);
                }}
              >
                Flat
              </ToggleChip>
              <ToggleChip
                active={shape === "arched"}
                onClick={() => {
                  setShape("arched");
                  setStep(3);
                }}
              >
                Arched
              </ToggleChip>
              <ToggleChip
                active={shape === "frame"}
                onClick={() => {
                  setShape("frame");
                  setStep(3);
                }}
              >
                Framed
              </ToggleChip>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <ToggleChip active={orientation === "portrait"} onClick={() => setOrientation("portrait")}>
                Portrait
              </ToggleChip>
              <ToggleChip active={orientation === "landscape"} onClick={() => setOrientation("landscape")}>
                Landscape
              </ToggleChip>
            </div>

            <div className="mt-4 space-y-3">
              <Range
                label="Width (mm)"
                value={widthMm}
                min={60}
                max={240}
                onChange={(v) => {
                  setWidthMm(v);
                  setStep(4);
                }}
              />
              <Range
                label="Height (mm)"
                value={heightMm}
                min={80}
                max={300}
                onChange={(v) => {
                  setHeightMm(v);
                  setStep(4);
                }}
              />
              <Range
                label="Border (mm)"
                value={borderMm}
                min={0}
                max={10}
                step={0.5}
                onChange={(v) => {
                  setBorderMm(v);
                  setStep(4);
                }}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <ToggleChip active={!allowRotation} onClick={() => setAllowRotation(false)}>
                Front only
              </ToggleChip>
              <ToggleChip active={allowRotation} onClick={() => setAllowRotation(true)}>
                Free rotate
              </ToggleChip>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Reset setup
            </button>
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Step 3 · Scene preview" icon={<LampDesk className="h-4 w-4 text-amber-500" />}>
            <div className="grid gap-2 sm:grid-cols-3">
              <ToggleChip active={sceneMode === "desk"} onClick={() => setSceneMode("desk")}>
                Desk
              </ToggleChip>
              <ToggleChip active={sceneMode === "wall"} onClick={() => setSceneMode("wall")}>
                Wall
              </ToggleChip>
              <ToggleChip active={sceneMode === "dark"} onClick={() => setSceneMode("dark")}>
                Dark room
              </ToggleChip>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <ToggleChip
                active={lightEnabled}
                onClick={() => setLightEnabled((v) => !v)}
                icon={<SunMedium className="h-4 w-4" />}
              >
                {lightEnabled ? "Lamp on" : "Lamp off"}
              </ToggleChip>
              <ToggleChip active={lightTone === "warm"} onClick={() => setLightTone("warm")}>
                Warm
              </ToggleChip>
              <ToggleChip active={lightTone === "neutral"} onClick={() => setLightTone("neutral")}>
                Neutral
              </ToggleChip>
              <ToggleChip active={lightTone === "cool"} onClick={() => setLightTone("cool")}>
                Cool
              </ToggleChip>
            </div>
          </Section>

          <Section title="Step 4 · Order summary" icon={<PackageCheck className="h-4 w-4 text-amber-500" />}>
            <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
              <div className="flex justify-between gap-3 border-b border-slate-200 pb-2">
                <span>Type</span>
                <span className="font-semibold capitalize text-slate-900">{shape}</span>
              </div>
              <div className="flex justify-between gap-3 border-b border-slate-200 pb-2">
                <span>Orientation</span>
                <span className="font-semibold capitalize text-slate-900">{orientation}</span>
              </div>
              <div className="flex justify-between gap-3 border-b border-slate-200 pb-2">
                <span>Scene</span>
                <span className="font-semibold capitalize text-slate-900">{sceneMode}</span>
              </div>
              <div className="flex justify-between gap-3 border-b border-slate-200 pb-2">
                <span>Light</span>
                <span className="font-semibold capitalize text-slate-900">
                  {lightEnabled ? `${lightTone} / on` : "off"}
                </span>
              </div>
              <div className="flex justify-between gap-3 border-b border-slate-200 pb-2">
                <span>Size</span>
                <span className="font-semibold text-slate-900">{dimensionLabel}</span>
              </div>
              <div className="flex justify-between gap-3 border-b border-slate-200 pb-2">
                <span>Border</span>
                <span className="font-semibold text-slate-900">{borderMm} mm</span>
              </div>
              <div className="flex justify-between gap-3 border-b border-slate-200 pb-2">
                <span>Rotation</span>
                <span className="font-semibold text-slate-900">{allowRotation ? "Enabled" : "Front only"}</span>
              </div>
              <div className="flex justify-between gap-3 border-b border-slate-200 pb-2">
                <span>Crop status</span>
                <span className="font-semibold text-slate-900">{cropState ? "Saved" : "Pending"}</span>
              </div>
              <div className="flex justify-between gap-3 sm:col-span-2">
                <span>Estimated price</span>
                <span className="font-semibold text-amber-700">{estimatedPrice} DKK</span>
              </div>
            </div>

            <motion.div
              key={`${estimatedPrice}-${estimatedPrintHours}`}
              initial={{ opacity: 0.7, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -2 }}
              className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4"
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800">
                <Sparkles className="h-4 w-4" />
                Live estimate
              </div>
              <p className="text-lg font-bold text-slate-900">{estimatedPrice} DKK</p>
              <p className="mt-1 text-xs text-slate-700">Starts at 100 DKK for 60 × 80 mm with 0 mm border.</p>
              <p className="mt-2 text-xs text-slate-600">~{estimatedPrintHours} hrs estimated print time</p>
            </motion.div>
          </Section>

          <Section title="Customer note" icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add mounting notes, gift request, frame color, lamp preference..."
              className="min-h-[160px] w-full rounded-2xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-amber-500"
            />
          </Section>

          <motion.button
            type="button"
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => void onSubmitDesign?.(submitPayload)}
            disabled={!croppedImageDataUrl || uploadBusy}
            className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.32)] transition hover:from-amber-300 hover:to-orange-400 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-slate-100 disabled:shadow-none"
          >
            {submitLabel}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
