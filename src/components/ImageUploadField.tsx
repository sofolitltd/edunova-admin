"use client";

import { useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { getToken } from "@/lib/auth";
import { cropAndCompress, uploadImage } from "@/lib/imageUpload";

interface Props {
  value: string;
  onChange: (url: string) => void;
  purpose: "article" | "teacher";
  aspect?: number;
}

export default function ImageUploadField({ value, onChange, purpose, aspect = 1 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);

  const closeCropper = () => {
    if (src) URL.revokeObjectURL(src);
    setSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = (file?: File) => {
    if (file) setSrc(URL.createObjectURL(file));
  };

  const confirm = async () => {
    const token = getToken();
    if (!src || !area || !token) return;
    setUploading(true);
    try {
      const blob = await cropAndCompress(src, area);
      onChange(await uploadImage(token, purpose, blob));
      closeCropper();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {value ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-32 max-w-full rounded-xl object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-background/90 text-foreground hover:bg-background"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-sm text-foreground hover:bg-secondary/80 transition-colors"
        >
          <ImagePlus className="w-4 h-4" />
          Upload image
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {src && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-background overflow-hidden">
            <div className="relative h-80 bg-black">
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setArea(pixels)}
              />
            </div>
            <div className="p-4 space-y-4">
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCropper}
                  disabled={uploading}
                  className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirm}
                  disabled={uploading || !area}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                >
                  {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Crop & upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
