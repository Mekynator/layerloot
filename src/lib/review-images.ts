import { supabase } from "@/integrations/supabase/client";

const REVIEW_IMAGES_BUCKET = "review-images";
const MAX_DIMENSION = 1200;
const IMAGE_QUALITY = 0.72;

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    image.src = url;
  });
}

async function compressImage(file: File) {
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image compression is not supported in this browser");

  ctx.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", IMAGE_QUALITY);
  });

  if (!blob) throw new Error("Could not compress image");

  return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "review"}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

export async function uploadReviewImage(args: { file: File; userId: string; productId: string }) {
  const optimizedFile = await compressImage(args.file);
  const filePath = `${args.userId}/${args.productId}/${Date.now()}-${optimizedFile.name}`;

  const { error } = await supabase.storage
    .from(REVIEW_IMAGES_BUCKET)
    .upload(filePath, optimizedFile, {
      cacheControl: "3600",
      contentType: optimizedFile.type,
      upsert: false,
    });

  if (error) throw error;

  return supabase.storage.from(REVIEW_IMAGES_BUCKET).getPublicUrl(filePath).data.publicUrl;
}
