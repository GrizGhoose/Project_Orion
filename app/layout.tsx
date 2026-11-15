import type { Metadata, Viewport } from "next";
import { MotionProvider } from "@/components/MotionProvider";
import { site, ui } from "@/content/site";
import { bodyFont, displayFont } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: site.title,
  description: site.description,
};

export const viewport: Viewport = {
  themeColor: "#0A0A0B", // matches the bg token
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only z-50 bg-gold px-4 py-3 text-small text-bg focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          {ui.skipToContent}
        </a>
        <MotionProvider>
          <main id="main">{children}</main>
        </MotionProvider>
      </body>
    </html>
  );
}
