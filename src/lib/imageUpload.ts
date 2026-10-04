import type { Area } from "react-easy-crop";
import { uploadApi } from "./api";

const MAX_SIDE = 1600;
const OUTPUT_TYPE = "image/webp";
const QUALITY = 0.8;
const MAX_BYTES = 1024 * 1024;
const MIN_QUALITY = 0.4;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = src;
  });
}

export async function cropAndCompress(src: string, area: Area): Promise<Blob> {
  const img = await loadImage(src);
  const scale = Math.min(1, MAX_SIDE / Math.max(area.width, area.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(area.width * scale);
  canvas.height = Math.round(area.height * scale);
  canvas.getContext("2d")!.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);

  const encode = (quality: number) =>
    new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not compress image"))), OUTPUT_TYPE, quality),
    );

  let quality = QUALITY;
  let blob = await encode(quality);
  while (blob.size > MAX_BYTES && quality > MIN_QUALITY) {
    quality -= 0.1;
    blob = await encode(quality);
  }
  if (blob.size > MAX_BYTES) throw new Error("Image is too large — please crop a smaller area or use a simpler image");
  return blob;
}

export async function uploadImage(token: string, purpose: "article" | "teacher", blob: Blob): Promise<string> {
  const { upload_url, public_url } = await uploadApi.presign(token, {
    purpose,
    content_type: OUTPUT_TYPE,
    size: blob.size,
  });
  const res = await fetch(upload_url, { method: "PUT", headers: { "Content-Type": OUTPUT_TYPE }, body: blob });
  if (!res.ok) throw new Error("Image upload failed");
  return public_url;
}
