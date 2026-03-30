import React, { useCallback, useMemo, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crop, ImagePlus, ZoomIn } from "lucide-react";
import { motion } from "framer-motion";

export type CropState = {
  zoom: number;
  cropX: number;
  cropY: number;
  croppedAreaPixels: Area | null;
  savedOrientation: "portrait" | "landscape";
};

export type SavedLithophaneImage = {
  croppedDataUrl: string;
  cropState: CropState;
};

type Props = {
  open: boolean;
  imageSrc: string | null;
  sourceFileName: string | null;
  orientation: "portrait" | "landscape";
  onOrientationChange: (value: "portrait" | "landscape") => void;
  onClose: () => void;
  onSave: (result: SavedLithophaneImage) => void;
};

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Canvas context unavailable");

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return canvas.toDataURL("image/png", 0.98);
}

export default function LithophaneImageEditorModal({
  open,
  imageSrc,
  sourceFileName,
  orientation,
  onOrientationChange,
  onClose,
  onSave,
}: Props) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.05);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const aspect = useMemo(() => (orientation === "portrait" ? 3 / 4 : 4 / 3), [orientation]);

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const croppedDataUrl = await getCroppedImg(imageSrc, croppedAreaPixels);
      onSave({
        croppedDataUrl,
        cropState: {
          zoom,
          cropX: crop.x,
          cropY: crop.y,
          croppedAreaPixels,
          savedOrientation: orientation,
        },
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="max-w-5xl overflow-hidden border-slate-300 p-0">
        <div className="grid min-h-[72vh] lg:grid-cols-[1.25fr_0.75fr]">
          <div className="relative bg-[#0a1020]">
            <DialogHeader className="absolute left-0 right-0 top-0 z-20 bg-gradient-to-b from-black/60 to-transparent px-6 py-5 text-left">
              <DialogTitle className="text-white">Crop and position your lithophane image</DialogTitle>
              <DialogDescription className="text-slate-200">
                Drag to reposition and use zoom to choose the exact view that will be sent with the order.
              </DialogDescription>
            </DialogHeader>

            <div className="absolute inset-0">
              {imageSrc ? (
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspect}
                  showGrid={false}
                  objectFit="contain"
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-300">No image selected</div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-5 bg-white p-6">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ImagePlus className="h-4 w-4 text-amber-500" />
                Image editor
              </div>
              <p className="text-sm text-slate-600">{sourceFileName || "Uploaded image"}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Crop className="h-4 w-4 text-amber-500" />
                Frame ratio
              </div>
              <div className="grid grid-cols-2 gap-2">
                <motion.button
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOrientationChange("portrait")}
                  className={[
                    "rounded-xl border px-3 py-2 text-sm font-medium transition",
                    orientation === "portrait"
                      ? "border-amber-500 bg-amber-50 text-amber-700 shadow-[0_0_24px_rgba(245,158,11,0.2)]"
                      : "border-slate-300 bg-white text-slate-700 hover:border-amber-300",
                  ].join(" ")}
                >
                  Portrait
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOrientationChange("landscape")}
                  className={[
                    "rounded-xl border px-3 py-2 text-sm font-medium transition",
                    orientation === "landscape"
                      ? "border-amber-500 bg-amber-50 text-amber-700 shadow-[0_0_24px_rgba(245,158,11,0.2)]"
                      : "border-slate-300 bg-white text-slate-700 hover:border-amber-300",
                  ].join(" ")}
                >
                  Landscape
                </motion.button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ZoomIn className="h-4 w-4 text-amber-500" />
                Zoom
              </div>

              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full cursor-pointer accent-amber-500"
              />

              <div className="mt-2 text-xs text-slate-600">Current zoom: {zoom.toFixed(2)}x</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              The saved crop is used for the 3D preview and is included in the custom order payload for admin review.
            </div>

            <div className="mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} disabled={!imageSrc || !croppedAreaPixels || saving}>
                {saving ? "Saving..." : "Save crop and continue"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
