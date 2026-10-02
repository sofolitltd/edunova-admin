import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

// Rasterizes every page of a PDF (e.g. a CamScanner-style multi-sheet scan)
// into one JPEG File per page, at roughly the resolution a phone camera
// photo would have — enough for the bubble detector, without producing
// huge uploads. Runs entirely in the browser; the server never sees a PDF.
export async function pdfToImageFiles(file: File, baseName: string): Promise<File[]> {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  const targetWidthPx = 1600;
  const files: File[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const unscaled = page.getViewport({ scale: 1 });
    const scale = targetWidthPx / unscaled.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (blob) {
      files.push(new File([blob], `${baseName}-page-${pageNum}.jpg`, { type: "image/jpeg" }));
    }
  }

  return files;
}
