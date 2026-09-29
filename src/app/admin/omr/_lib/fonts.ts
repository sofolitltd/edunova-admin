import localFont from "next/font/local";

// SolaimanLipi — the Bangla font used on the OMR sheet (preview, browser
// print, and the downloaded PDF, since that's a rasterized capture of this
// same DOM). next/font/local self-hosts and optimizes it at build time, so
// it renders identically regardless of whether the viewer's OS has a Bangla
// font installed.
export const solaimanLipi = localFont({
  src: [
    { path: "./fonts/SolaimanLipi-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/SolaimanLipi-Bold.ttf", weight: "700", style: "normal" },
  ],
  display: "swap",
});
