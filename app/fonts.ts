import { Inter, Space_Grotesk } from "next/font/google";

// Swap fonts here. They are exposed as CSS variables and used through the
// font-display / font-sans tokens in tailwind.config.ts.
export const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
