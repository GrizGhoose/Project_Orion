import type { Config } from "tailwindcss";

/**
 * Design tokens: the single place to change colours, fonts and the type scale.
 * Components use these names only (bg-bg, text-gold, font-display, text-h2 …), never raw hex values.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./content/**/*.ts"],
  theme: {
    // Sharp: no rounded corners anywhere
    borderRadius: { none: "0", DEFAULT: "0" },
    extend: {
      colors: {
        bg: "#0A0A0B", // main background (never pure black)
        "bg-alt": "#121214", // alternate sections
        slot: "#16161A", // image placeholders
        gold: "#C9A24A", // accents: buttons, eyebrows, numbers, lines
        "gold-bright": "#E6C76E", // hover and focus only
        ink: "#EDE8DC", // headings
        "ink-muted": "#A8A396", // body text
        danger: "#E8897A", // form errors (AA on bg)
      },
      fontFamily: {
        // Swap fonts in app/fonts.ts; these read the CSS variables it sets
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        // Eyebrow labels and the showcase info boxes (Device / Anchor) share this one source
        eyebrow: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      // One type scale: [size, { lineHeight, letterSpacing }]
      fontSize: {
        display: ["clamp(2.75rem, 7vw, 6rem)", { lineHeight: "1.02", letterSpacing: "-0.03em" }],
        h1: ["clamp(2.25rem, 5vw, 4rem)", { lineHeight: "1.05", letterSpacing: "-0.025em" }],
        h2: ["clamp(1.75rem, 3.5vw, 2.75rem)", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        h3: ["clamp(1.25rem, 2vw, 1.5rem)", { lineHeight: "1.25", letterSpacing: "-0.01em" }],
        stat: ["clamp(3.5rem, 9vw, 7.5rem)", { lineHeight: "1", letterSpacing: "-0.04em" }],
        lead: ["clamp(1.0625rem, 1.6vw, 1.25rem)", { lineHeight: "1.6" }],
        body: ["1rem", { lineHeight: "1.65" }],
        small: ["0.875rem", { lineHeight: "1.5" }],
        eyebrow: ["0.75rem", { lineHeight: "1.2", letterSpacing: "0.2em" }],
      },
      spacing: {
        section: "clamp(5rem, 12vw, 10rem)", // vertical padding of a section
        gutter: "clamp(1rem, 4vw, 3rem)", // page side padding
      },
      maxWidth: {
        page: "90rem",
        prose: "40rem",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
