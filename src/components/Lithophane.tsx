import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image as ImageIcon,
  Upload,
  SlidersHorizontal,
  SunMedium,
  Contrast,
  RotateCcw,
  Wand2,
  PackageCheck,
  AlertTriangle,
} from "lucide-react";

export type LithophaneShape = "flat" | "arched" | "frame";
export type LithophaneOrientation = "portrait" | "landscape";
export type LithophanePreviewTab = "original" | "processed" | "heightmap" | "scene";

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

type ProcessedResult = {
  processedDataUrl: string | null;
  heightmapDataUrl: string | null;
  qualityLabel: "Excellent" | "Good" | "Fair" | "Low";
  qualityMessage: string;
};

const DEFAULTS = {
  widthMm: 120,
  heightMm: 160,
  minThicknessMm: 0.8,
  maxThicknessMm: 3.2,
  borderMm: 3,
  brightness: 0,
  contrast: 15,
  gamma: 1,
  blur: 0,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function estimatePrice(widthMm: number, heightMm: number, maxThicknessMm: number, borderMm: number) {
  const areaFactor = (widthMm * heightMm) / 1000;
  const thicknessFactor = maxThicknessMm * 1.35;
  const borderFactor = borderMm * 0.9;
  return Number((39 + areaFactor + thicknessFactor + borderFactor).toFixed(2));
}

function estimatePrintHours(widthMm: number, heightMm: number, maxThicknessMm: number) {
  return Number((1.2 + widthMm / 80 + heightMm / 65 + maxThicknessMm * 0.7).toFixed(1));
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function processImage(
  sourceDataUrl: string,
  options: {
    brightness: number;
    contrast: number;
    gamma: number;
    blur: number;
    invert: boolean;
  },
): Promise<ProcessedResult> {
  const img = await loadImage(sourceDataUrl);
  const size = 720;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const mapCanvas = document.createElement("canvas");
  const mapCtx = mapCanvas.getContext("2d", { willReadFrequently: true });

  if (!ctx || !mapCtx) {
    throw new Error("Canvas context not available");
  }

  canvas.width = size;
  canvas.height = size;
  mapCanvas.width = size;
  mapCanvas.height = size;

  const aspect = img.width / img.height;
  let drawWidth = size;
  let drawHeight = size;
  let dx = 0;
  let dy = 0;

  if (aspect > 1) {
    drawHeight = size / aspect;
    dy = (size - drawHeight) / 2;
  } else {
    drawWidth = size * aspect;
    dx = (size - drawWidth) / 2;
  }

  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

  if (options.blur > 0) {
    ctx.filter = `blur(${options.blur}px)`;
    const snapshot = canvas.toDataURL("image/png");
    const blurred = await loadImage(snapshot);
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(blurred, 0, 0, size, size);
    ctx.filter = "none";
  }

  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  const contrastFactor = (259 * (options.contrast + 255)) / (255 * (259 - options.contrast));
  let brightnessSum = 0;
  let varianceSeed = 0;

  for (let i = 0; i < data.length; i += 4) {
    let gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    gray += options.brightness;
    gray = contrastFactor * (gray - 128) + 128;
    gray = 255 * Math.pow(clamp(gray / 255, 0, 1), 1 / Math.max(0.2, options.gamma));
    if (options.invert) gray = 255 - gray;
    gray = clamp(gray, 0, 255);

    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;

    brightnessSum += gray;
    varianceSeed += gray * gray;
  }

  ctx.putImageData(imageData, 0, 0);

  mapCtx.fillStyle = "#0b0f19";
  mapCtx.fillRect(0, 0, size, size);
  const mapData = ctx.getImageData(0, 0, size, size);
  const mapPixels = mapData.data;

  for (let i = 0; i < mapPixels.length; i += 4) {
    const value = mapPixels[i];
    const shaded = clamp(35 + value * 0.9, 0, 255);
    mapPixels[i] = shaded * 0.72;
    mapPixels[i + 1] = shaded * 0.8;
    mapPixels[i + 2] = shaded;
    mapPixels[i + 3] = 255;
  }

  mapCtx.putImageData(mapData, 0, 0);

  const pixelCount = data.length / 4;
  const mean = brightnessSum / pixelCount;
  const variance = varianceSeed / pixelCount - mean * mean;
  let qualityLabel: ProcessedResult["qualityLabel"] = "Low";
  let qualityMessage = "The image may print muddy. Increase contrast or use a clearer photo.";

  if (variance > 3600 && mean > 80 && mean < 185) {
    qualityLabel = "Excellent";
    qualityMessage = "Excellent contrast and tonal spread for lithophane printing.";
  } else if (variance > 2200) {
    qualityLabel = "Good";
    qualityMessage = "Good base image. Minor tuning can improve edge detail.";
  } else if (variance > 1200) {
    qualityLabel = "Fair";
    qualityMessage = "Usable, but finer details may soften in the print.";
  }

  return {
    processedDataUrl: canvas.toDataURL("image/png"),
    heightmapDataUrl: mapCanvas.toDataURL("image/png"),
    qualityLabel,
    qualityMessage,
  };
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-white">{title}</h3>
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
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span>{label}</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white">{value}</span>
      </div>
      <input
        className="w-full accent-amber-400"
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
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl border px-3 py-2 text-sm transition",
        active
          ? "border-amber-400 bg-amber-400/15 text-amber-200"
          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
      ].join(" ")}
    >
      {children}
    </button>
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
  const [processedDataUrl, setProcessedDataUrl] = useState<string | null>(null);
  const [heightmapDataUrl, setHeightmapDataUrl] = useState<string | null>(null);
  const [qualityLabel, setQualityLabel] = useState<ProcessedResult["qualityLabel"]>("Good");
  const [qualityMessage, setQualityMessage] = useState("Upload a photo to begin.");
  const [shape, setShape] = useState<LithophaneShape>("frame");
  const [orientation, setOrientation] = useState<LithophaneOrientation>("portrait");
  const [activeTab, setActiveTab] = useState<LithophanePreviewTab>("processed");
  const [widthMm, setWidthMm] = useState(DEFAULTS.widthMm);
  const [heightMm, setHeightMm] = useState(DEFAULTS.heightMm);
  const [minThicknessMm, setMinThicknessMm] = useState(DEFAULTS.minThicknessMm);
  const [maxThicknessMm, setMaxThicknessMm] = useState(DEFAULTS.maxThicknessMm);
  const [borderMm, setBorderMm] = useState(DEFAULTS.borderMm);
  const [brightness, setBrightness] = useState(DEFAULTS.brightness);
  const [contrast, setContrast] = useState(DEFAULTS.contrast);
  const [gamma, setGamma] = useState(DEFAULTS.gamma);
  const [blur, setBlur] = useState(DEFAULTS.blur);
  const [invert, setInvert] = useState(false);
  const [lightEnabled, setLightEnabled] = useState(true);
  const [lightTone, setLightTone] = useState<"warm" | "neutral" | "cool">("warm");
  const [notes, setNotes] = useState(initialNotes);
  const [isProcessing, setIsProcessing] = useState(false);

  const debounceRef = useRef<number | null>(null);

  const estimatedPrice = useMemo(
    () => estimatePrice(widthMm, heightMm, maxThicknessMm, borderMm),
    [widthMm, heightMm, maxThicknessMm, borderMm],
  );

  const estimatedPrintHours = useMemo(
    () => estimatePrintHours(widthMm, heightMm, maxThicknessMm),
    [widthMm, heightMm, maxThicknessMm],
  );

  const processCurrentImage = useCallback(async () => {
    if (!sourceDataUrl) return;

    setIsProcessing(true);
    try {
      const result = await processImage(sourceDataUrl, {
        brightness,
        contrast,
        gamma,
        blur,
        invert,
      });
      setProcessedDataUrl(result.processedDataUrl);
      setHeightmapDataUrl(result.heightmapDataUrl);
      setQualityLabel(result.qualityLabel);
      setQualityMessage(result.qualityMessage);
    } catch (error) {
      console.error("Lithophane processing failed", error);
      setQualityLabel("Low");
      setQualityMessage("Image processing failed. Try another file.");
    } finally {
      setIsProcessing(false);
    }
  }, [sourceDataUrl, brightness, contrast, gamma, blur, invert]);

  useEffect(() => {
    if (!sourceDataUrl) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void processCurrentImage();
    }, 220);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [sourceDataUrl, brightness, contrast, gamma, blur, invert, processCurrentImage]);

  useEffect(() => {
    onDraftChange?.({
      sourceFileName,
      sourceDataUrl,
      processedDataUrl,
      shape,
      orientation,
      widthMm,
      heightMm,
      minThicknessMm,
      maxThicknessMm,
      borderMm,
      invert,
      brightness,
      contrast,
      gamma,
      blur,
      lightEnabled,
      lightTone,
      notes,
      estimatedPrice,
      estimatedPrintHours,
    });
  }, [
    sourceFileName,
    sourceDataUrl,
    processedDataUrl,
    shape,
    orientation,
    widthMm,
    heightMm,
    minThicknessMm,
    maxThicknessMm,
    borderMm,
    invert,
    brightness,
    contrast,
    gamma,
    blur,
    lightEnabled,
    lightTone,
    notes,
    estimatedPrice,
    estimatedPrintHours,
    onDraftChange,
  ]);

  const handleFileChange = async (file?: File | null) => {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setQualityLabel("Low");
      setQualityMessage("Please upload JPG, PNG, or WEBP.");
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    setSourceFileName(file.name);
    setSourceDataUrl(dataUrl);
    setActiveTab("processed");
  };

  const handleReset = () => {
    setBrightness(DEFAULTS.brightness);
    setContrast(DEFAULTS.contrast);
    setGamma(DEFAULTS.gamma);
    setBlur(DEFAULTS.blur);
    setInvert(false);
    setWidthMm(DEFAULTS.widthMm);
    setHeightMm(DEFAULTS.heightMm);
    setMinThicknessMm(DEFAULTS.minThicknessMm);
    setMaxThicknessMm(DEFAULTS.maxThicknessMm);
    setBorderMm(DEFAULTS.borderMm);
    setLightEnabled(true);
    setLightTone("warm");
  };

  const previewScreenshotDataUrl = useMemo(() => {
    return activeTab === "heightmap" ? heightmapDataUrl : processedDataUrl;
  }, [activeTab, heightmapDataUrl, processedDataUrl]);

  const submitPayload: LithophaneSubmitPayload = useMemo(
    () => ({
      sourceFileName,
      sourceDataUrl,
      processedDataUrl,
      previewScreenshotDataUrl,
      shape,
      orientation,
      widthMm,
      heightMm,
      minThicknessMm,
      maxThicknessMm,
      borderMm,
      invert,
      brightness,
      contrast,
      gamma,
      blur,
      lightEnabled,
      lightTone,
      notes,
      estimatedPrice,
      estimatedPrintHours,
      designJson: {
        version: 1,
        component: "Lithophane",
        shape,
        orientation,
        dimensions: {
          widthMm,
          heightMm,
          minThicknessMm,
          maxThicknessMm,
          borderMm,
        },
        image: {
          invert,
          brightness,
          contrast,
          gamma,
          blur,
          qualityLabel,
          qualityMessage,
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
      processedDataUrl,
      previewScreenshotDataUrl,
      shape,
      orientation,
      widthMm,
      heightMm,
      minThicknessMm,
      maxThicknessMm,
      borderMm,
      invert,
      brightness,
      contrast,
      gamma,
      blur,
      lightEnabled,
      lightTone,
      notes,
      estimatedPrice,
      estimatedPrintHours,
      qualityLabel,
      qualityMessage,
    ],
  );

  const previewImage =
    activeTab === "original" ? sourceDataUrl : activeTab === "heightmap" ? heightmapDataUrl : processedDataUrl;

  return (
    <div className={["space-y-5", className].filter(Boolean).join(" ")}>
      <div className="rounded-3xl border border-white/10 bg-[#0b1020] p-4 md:p-5 shadow-2xl">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Lithophane Preview</h2>
            <p className="text-sm text-slate-400">Full-width live preview with image, heightmap, and scene mode.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["original", "processed", "heightmap", "scene"] as LithophanePreviewTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={[
                  "rounded-full px-3 py-1.5 text-xs capitalize transition",
                  activeTab === tab
                    ? "bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/40"
                    : "bg-white/5 text-slate-300 hover:bg-white/10",
                ].join(" ")}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-900">
          <div className="aspect-[16/8] min-h-[340px] w-full md:min-h-[420px] xl:min-h-[500px]">
            {activeTab !== "scene" && previewImage ? (
              <img src={previewImage} alt="Lithophane preview" className="h-full w-full object-contain" />
            ) : activeTab === "scene" ? (
              <div
                className="relative flex h-full w-full items-center justify-center overflow-hidden"
                style={{
                  background:
                    lightTone === "warm"
                      ? "radial-gradient(circle at center, rgba(255,200,120,0.15), rgba(12,18,32,1) 55%)"
                      : lightTone === "cool"
                        ? "radial-gradient(circle at center, rgba(120,200,255,0.14), rgba(12,18,32,1) 55%)"
                        : "radial-gradient(circle at center, rgba(220,220,220,0.12), rgba(12,18,32,1) 55%)",
                }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:28px_28px] opacity-30" />
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />
                <div className="relative flex items-end justify-center">
                  <div
                    className="absolute top-1/2 h-40 w-40 -translate-y-1/2 rounded-full blur-3xl"
                    style={{
                      background: lightEnabled
                        ? lightTone === "warm"
                          ? "rgba(255, 196, 110, 0.48)"
                          : lightTone === "cool"
                            ? "rgba(142, 214, 255, 0.42)"
                            : "rgba(255,255,255,0.35)"
                        : "transparent",
                    }}
                  />
                  <div className="absolute bottom-10 h-3 w-64 rounded-full bg-black/40 blur-md" />
                  <div className="rounded-[30px] border border-[#5f4632] bg-[#2a1d17] p-3 shadow-2xl">
                    <div className="rounded-[22px] border border-[#6e584a] bg-[#161616] p-2">
                      <div className="h-[320px] w-[240px] md:h-[360px] md:w-[270px] overflow-hidden rounded-[16px] border border-white/10 bg-black">
                        {processedDataUrl ? (
                          <img
                            src={processedDataUrl}
                            alt="Framed lithophane scene"
                            className="h-full w-full object-cover opacity-95"
                            style={{
                              filter: lightEnabled
                                ? lightTone === "warm"
                                  ? "sepia(0.25) brightness(1.35)"
                                  : lightTone === "cool"
                                    ? "hue-rotate(180deg) brightness(1.22)"
                                    : "brightness(1.2)"
                                : "brightness(0.72)",
                            }}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-slate-400">
                            Upload an image to light the frame
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Upload an image to preview the lithophane
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white">
                  Processing image…
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-4">
          <Section title="Upload image" icon={<Upload className="h-4 w-4 text-amber-300" />}>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-slate-950/40 px-4 py-8 text-center hover:bg-white/5">
              <ImageIcon className="mb-3 h-8 w-8 text-slate-300" />
              <div className="text-sm font-medium text-white">Drop photo here or click to upload</div>
              <div className="mt-1 text-xs text-slate-400">PNG, JPG, WEBP</div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => void handleFileChange(e.target.files?.[0])}
              />
            </label>
            <div className="mt-3 text-xs text-slate-400">
              {sourceFileName ? `Loaded: ${sourceFileName}` : "No image loaded yet."}
            </div>
          </Section>

          <Section title="Image tuning" icon={<SlidersHorizontal className="h-4 w-4 text-amber-300" />}>
            <div className="space-y-3">
              <Range label="Brightness" value={brightness} min={-80} max={80} onChange={setBrightness} />
              <Range label="Contrast" value={contrast} min={-120} max={120} onChange={setContrast} />
              <Range label="Gamma" value={gamma} min={0.4} max={2.5} step={0.1} onChange={setGamma} />
              <Range label="Blur cleanup" value={blur} min={0} max={4} step={0.2} onChange={setBlur} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <ToggleChip active={invert} onClick={() => setInvert((v) => !v)}>
                Invert tones
              </ToggleChip>
              <ToggleChip active={orientation === "portrait"} onClick={() => setOrientation("portrait")}>
                Portrait
              </ToggleChip>
              <ToggleChip active={orientation === "landscape"} onClick={() => setOrientation("landscape")}>
                Landscape
              </ToggleChip>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="mt-4 inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
              Reset controls
            </button>
          </Section>

          <Section title="Product setup" icon={<PackageCheck className="h-4 w-4 text-amber-300" />}>
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

            <div className="mt-4 space-y-3">
              <Range label="Width (mm)" value={widthMm} min={60} max={240} onChange={setWidthMm} />
              <Range label="Height (mm)" value={heightMm} min={80} max={300} onChange={setHeightMm} />
              <Range
                label="Min thickness (mm)"
                value={minThicknessMm}
                min={0.4}
                max={2}
                step={0.1}
                onChange={setMinThicknessMm}
              />
              <Range
                label="Max thickness (mm)"
                value={maxThicknessMm}
                min={1.8}
                max={5}
                step={0.1}
                onChange={setMaxThicknessMm}
              />
              <Range label="Border (mm)" value={borderMm} min={0} max={10} step={0.5} onChange={setBorderMm} />
            </div>
          </Section>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium text-emerald-200">
                <Wand2 className="h-4 w-4" />
                Quality: {qualityLabel}
              </div>
              <p className="text-xs text-emerald-50/90">{qualityMessage}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium text-white">
                <SunMedium className="h-4 w-4 text-amber-300" />
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
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium text-white">
                <Contrast className="h-4 w-4 text-amber-300" />
                Print estimate
              </div>
              <p className="text-xs text-slate-300">
                ~{estimatedPrintHours} hrs · {estimatedPrice} DKK
              </p>
              <p className="mt-1 text-[11px] text-slate-400">Preview estimate only. Final admin quote can adjust it.</p>
            </div>
          </div>

          <Section title="Order summary" icon={<PackageCheck className="h-4 w-4 text-amber-300" />}>
            <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
              <div className="flex justify-between gap-3">
                <span>Type</span>
                <span className="capitalize text-white">{shape}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Orientation</span>
                <span className="capitalize text-white">{orientation}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Size</span>
                <span className="text-white">
                  {widthMm} × {heightMm} mm
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Thickness</span>
                <span className="text-white">
                  {minThicknessMm}–{maxThicknessMm} mm
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Border</span>
                <span className="text-white">{borderMm} mm</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Estimated price</span>
                <span className="font-semibold text-amber-200">{estimatedPrice} DKK</span>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">
              Save this payload into your custom order record together with the source image, processed preview, and the
              designJson object.
            </div>
          </Section>

          <Section title="Customer note" icon={<AlertTriangle className="h-4 w-4 text-amber-300" />}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add mounting notes, gift request, frame color, lamp preference..."
              className="min-h-[160px] w-full rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-400/40"
            />
          </Section>

          <button
            type="button"
            onClick={() => void onSubmitDesign?.(submitPayload)}
            disabled={!sourceDataUrl}
            className="w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
