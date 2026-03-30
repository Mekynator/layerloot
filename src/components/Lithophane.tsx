import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Contrast,
  Image as ImageIcon,
  Loader2,
  PackageCheck,
  SunMedium,
  Upload,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import LithophaneImageEditorModal, {
  type CropState,
  type SavedLithophaneImage,
} from "@/components/LithophaneImageEditorModal";
import Lithophane3DViewer from "@/components/Lithophane3DViewer";

export type LithophaneShape = "flat" | "arched" | "frame";
export type LithophaneOrientation = "portrait" | "landscape";
export type LithophanePreviewTab = "original" | "scene";

export interface LithophaneSubmitPayload {
  sourceFileName: string | null;
  sourceDataUrl: string | null;
  processedDataUrl: string | null;
  previewScreenshotDataUrl: string | null;
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
  lightTone: "warm" | "neutral" | "cool";
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
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function estimatePrice(widthMm: number, heightMm: number, borderMm: number) {
  const areaFactor = (widthMm * heightMm) / 1000;
  const borderFactor = borderMm * 1.2;
  return Number((39 + areaFactor + borderFactor).toFixed(2));
}

function estimatePrintHours(widthMm: number, heightMm: number) {
  return Number((1.2 + widthMm / 80 + heightMm / 65).toFixed(1));
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
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
        className="w-full accent-amber-500"
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
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={[
        "rounded-xl border px-3 py-2 text-sm font-medium transition",
        active
          ? "border-amber-500 bg-amber-50 text-amber-700 shadow-[0_0_20px_rgba(245,158,11,0.14)]"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </motion.button>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
        <Loader2 className="mb-3 h-7 w-7 animate-spin text-amber-500" />
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

export default function Lithophane({
  className,
  onSubmitDesign,
  onDraftChange,
  submitLabel = "Submit Lithophane Design",
  initialNotes = "",
}: LithophaneProps) {
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [sourceDataUrl, setSourceDataUrl] = useState<string | null>(null);
  const [shape, setShape] = useState<LithophaneShape>("frame");
  const [orientation, setOrientation] = useState<LithophaneOrientation>(DEFAULTS.orientation);
  const [activeTab, setActiveTab] = useState<LithophanePreviewTab>("scene");
  const [widthMm, setWidthMm] = useState(DEFAULTS.widthMm);
  const [heightMm, setHeightMm] = useState(DEFAULTS.heightMm);
  const [borderMm, setBorderMm] = useState(DEFAULTS.borderMm);
  const [lightEnabled, setLightEnabled] = useState(true);
  const [lightTone, setLightTone] = useState<"warm" | "neutral" | "cool">("warm");
  const [notes, setNotes] = useState(initialNotes);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState>({
    active: false,
    progress: 0,
    status: "",
  });

  const estimatedPrice = useMemo(() => estimatePrice(widthMm, heightMm, borderMm), [widthMm, heightMm, borderMm]);
  const estimatedPrintHours = useMemo(() => estimatePrintHours(widthMm, heightMm), [widthMm, heightMm]);

  useEffect(() => {
    onDraftChange?.({
      sourceFileName,
      sourceDataUrl,
      processedDataUrl: sourceDataUrl,
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
      notes,
      estimatedPrice,
      estimatedPrintHours,
    });
  }, [
    sourceFileName,
    sourceDataUrl,
    shape,
    orientation,
    widthMm,
    heightMm,
    borderMm,
    lightEnabled,
    lightTone,
    notes,
    estimatedPrice,
    estimatedPrintHours,
    onDraftChange,
  ]);

  const runUploadProgress = async (selectedFile: File) => {
    setUploadProgress({ active: true, progress: 8, status: "Reading image..." });
    await sleep(140);
    setUploadProgress({ active: true, progress: 34, status: "Checking image..." });
    await sleep(150);
    setUploadProgress({ active: true, progress: 68, status: "Preparing preview..." });

    const dataUrl = await readFileAsDataUrl(selectedFile);

    setSourceFileName(selectedFile.name);
    setSourceDataUrl(dataUrl);
    setActiveTab("scene");

    setUploadProgress({ active: true, progress: 100, status: "Image ready" });
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

  const handleReset = () => {
    setWidthMm(DEFAULTS.widthMm);
    setHeightMm(DEFAULTS.heightMm);
    setBorderMm(DEFAULTS.borderMm);
    setLightEnabled(true);
    setLightTone("warm");
    setOrientation(DEFAULTS.orientation);
    setShape("frame");
  };

  const previewScreenshotDataUrl = sourceDataUrl;

  const submitPayload: LithophaneSubmitPayload = useMemo(
    () => ({
      sourceFileName,
      sourceDataUrl,
      processedDataUrl: sourceDataUrl,
      previewScreenshotDataUrl,
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
      notes,
      estimatedPrice,
      estimatedPrintHours,
      designJson: {
        version: 3,
        component: "Lithophane",
        shape,
        orientation,
        dimensions: {
          widthMm,
          heightMm,
          borderMm,
        },
        image: {
          sourceOnly: true,
        },
        scene: {
          lightEnabled,
          lightTone,
        },
      },
    }),
    [
      sourceFileName,
      sourceDataUrl,
      previewScreenshotDataUrl,
      shape,
      orientation,
      widthMm,
      heightMm,
      borderMm,
      lightEnabled,
      lightTone,
      notes,
      estimatedPrice,
      estimatedPrintHours,
    ],
  );

  const frameOuterStyle =
    orientation === "portrait"
      ? {
          width: `${clamp(widthMm * 1.8, 240, 420)}px`,
          height: `${clamp(heightMm * 1.8, 320, 560)}px`,
          padding: `${clamp(borderMm * 2.2, 10, 26)}px`,
        }
      : {
          width: `${clamp(widthMm * 2.1, 320, 620)}px`,
          height: `${clamp(heightMm * 1.5, 220, 420)}px`,
          padding: `${clamp(borderMm * 2.2, 10, 26)}px`,
        };

  const innerFrameStyle = {
    padding: `${clamp(borderMm * 1.1, 6, 14)}px`,
  };

  const uploadBusy = uploadProgress.active;

  return (
    <div className={["space-y-6", className].filter(Boolean).join(" ")}>
      <div className="rounded-3xl border border-slate-300 bg-[#0b1020] p-5 shadow-2xl">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Lithophane Preview</h2>
            <p className="text-sm text-slate-300">
              Clean workflow: upload image, choose product setup, preview the final framed look.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["original", "scene"] as LithophanePreviewTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={[
                  "rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition",
                  activeTab === tab
                    ? "bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/50"
                    : "bg-white/10 text-slate-200 hover:bg-white/15",
                ].join(" ")}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-900">
          <div className="aspect-[16/8] min-h-[360px] w-full md:min-h-[460px] xl:min-h-[560px]">
            {activeTab === "original" && sourceDataUrl ? (
              <img src={sourceDataUrl} alt="Lithophane original preview" className="h-full w-full object-contain" />
            ) : activeTab === "scene" ? (
              <div
                className="relative flex h-full w-full items-center justify-center overflow-hidden"
                style={{
                  background:
                    lightTone === "warm"
                      ? "radial-gradient(circle at center, rgba(255,200,120,0.16), rgba(12,18,32,1) 55%)"
                      : lightTone === "cool"
                        ? "radial-gradient(circle at center, rgba(120,200,255,0.16), rgba(12,18,32,1) 55%)"
                        : "radial-gradient(circle at center, rgba(220,220,220,0.14), rgba(12,18,32,1) 55%)",
                }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:28px_28px] opacity-30" />
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />
                <div className="relative flex items-end justify-center">
                  <div
                    className="absolute top-1/2 rounded-full blur-3xl"
                    style={{
                      width: orientation === "portrait" ? "240px" : "320px",
                      height: orientation === "portrait" ? "340px" : "220px",
                      transform: "translateY(-50%)",
                      background: lightEnabled
                        ? lightTone === "warm"
                          ? "rgba(255, 196, 110, 0.48)"
                          : lightTone === "cool"
                            ? "rgba(142, 214, 255, 0.42)"
                            : "rgba(255,255,255,0.35)"
                        : "transparent",
                    }}
                  />
                  <div className="absolute bottom-10 h-4 w-80 rounded-full bg-black/40 blur-md" />
                  <div
                    className="rounded-[30px] border border-[#5f4632] bg-[#2a1d17] shadow-2xl"
                    style={frameOuterStyle}
                  >
                    <div
                      className="h-full w-full rounded-[22px] border border-[#6e584a] bg-[#161616]"
                      style={innerFrameStyle}
                    >
                      <div className="h-full w-full overflow-hidden rounded-[16px] border border-white/10 bg-black">
                        {sourceDataUrl ? (
                          <img
                            src={sourceDataUrl}
                            alt="Framed lithophane scene"
                            className="h-full w-full object-cover opacity-95"
                            style={{
                              filter: lightEnabled
                                ? lightTone === "warm"
                                  ? "sepia(0.25) brightness(1.2) grayscale(1)"
                                  : lightTone === "cool"
                                    ? "grayscale(1) brightness(1.16) contrast(1.02)"
                                    : "grayscale(1) brightness(1.1)"
                                : "grayscale(1) brightness(0.72)",
                            }}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-slate-300">
                            Upload an image to light the frame
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-300">
                Upload an image to preview the lithophane
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-4">
          <Section title="Upload image" icon={<Upload className="h-4 w-4 text-amber-500" />}>
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
                  "flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-8 text-center transition-all",
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
                  {sourceFileName ? "Replace image" : "Drop photo here or click to upload"}
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

            <AnimatePresence>
              {sourceFileName && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="mt-3 overflow-hidden rounded-2xl border border-slate-300 bg-white"
                >
                  {sourceDataUrl ? (
                    <img src={sourceDataUrl} alt="Uploaded source" className="h-56 w-full object-cover bg-slate-100" />
                  ) : null}

                  <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{sourceFileName}</div>
                      <div className="text-xs text-slate-600">Ready for lithophane preview</div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Section>

          <Section title="Product setup" icon={<PackageCheck className="h-4 w-4 text-amber-500" />}>
            <div className="grid grid-cols-3 gap-2">
              <ToggleChip active={shape === "flat"} onClick={() => setShape("flat")}>
                Flat
              </ToggleChip>
              <ToggleChip active={shape === "arched"} onClick={() => setShape("arched")}>
                Arched
              </ToggleChip>
              <ToggleChip active={shape === "frame"} onClick={() => setShape("frame")}>
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
              <Range label="Width (mm)" value={widthMm} min={60} max={240} onChange={setWidthMm} />
              <Range label="Height (mm)" value={heightMm} min={80} max={300} onChange={setHeightMm} />
              <Range label="Border (mm)" value={borderMm} min={0} max={10} step={0.5} onChange={setBorderMm} />
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
          <div className="grid gap-3 md:grid-cols-2">
            <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-slate-300 bg-white p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <SunMedium className="h-4 w-4 text-amber-500" />
                Light preview
              </div>
              <div className="flex flex-wrap gap-2">
                <ToggleChip active={lightEnabled} onClick={() => setLightEnabled((v) => !v)}>
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
            </motion.div>

            <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-slate-300 bg-white p-4">
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Contrast className="h-4 w-4 text-amber-500" />
                Print estimate
              </div>
              <p className="text-sm font-semibold text-slate-900">
                ~{estimatedPrintHours} hrs · {estimatedPrice} DKK
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Preview estimate only. Final admin quote can adjust it.
              </p>
            </motion.div>
          </div>

          <Section title="Order summary" icon={<PackageCheck className="h-4 w-4 text-amber-500" />}>
            <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
              <div className="flex justify-between gap-3 border-b border-slate-200 pb-2">
                <span>Type</span>
                <span className="capitalize font-semibold text-slate-900">{shape}</span>
              </div>
              <div className="flex justify-between gap-3 border-b border-slate-200 pb-2">
                <span>Orientation</span>
                <span className="capitalize font-semibold text-slate-900">{orientation}</span>
              </div>
              <div className="flex justify-between gap-3 border-b border-slate-200 pb-2">
                <span>Size</span>
                <span className="font-semibold text-slate-900">
                  {widthMm} × {heightMm} mm
                </span>
              </div>
              <div className="flex justify-between gap-3 border-b border-slate-200 pb-2">
                <span>Border</span>
                <span className="font-semibold text-slate-900">{borderMm} mm</span>
              </div>
              <div className="flex justify-between gap-3 sm:col-span-2">
                <span>Estimated price</span>
                <span className="font-semibold text-amber-700">{estimatedPrice} DKK</span>
              </div>
            </div>
          </Section>

          <Section title="Customer note" icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add mounting notes, gift request, frame color, lamp preference..."
              className="min-h-[160px] w-full rounded-2xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-amber-500"
            />
          </Section>

          <button
            type="button"
            onClick={() => void onSubmitDesign?.(submitPayload)}
            disabled={!sourceDataUrl || uploadBusy}
            className="w-full rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-slate-100"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
