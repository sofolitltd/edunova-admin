import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import "@fontsource/google-sans/400.css";
import "@fontsource/google-sans/500.css";
import "@fontsource/google-sans/700.css";
import "@fontsource/noto-sans-bengali/400.css";
import "@fontsource/noto-sans-bengali/500.css";
import "@fontsource/noto-sans-bengali/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduNova",
  description: "Admin dashboard for EduNova education platform",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
