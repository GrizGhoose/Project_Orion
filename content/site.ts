/**
 * ALL site copy and data. Pages only render from this file.
 * To fill in content: replace every "[PLACEHOLDER: …]" string below.
 * Images live in public/images/ (see images-needed.md for the list of slots).
 */

// ---------- Types ----------

export type Link = { label: string; href: string };

export type Spec = { label: string; value: string; unit?: string };

// ---------- Site-wide ----------

export const site = {
  title: "H.E.R.A: Hypoxia Emergency Response Assistant",
  /** Visually hidden page heading */
  heading: "H.E.R.A: Hypoxia Emergency Response Assistant",
  description:
    "H.E.R.A: Hypoxia Emergency Response Assistant. A behind-the-ear sensor, the Aegis helmet HUD and the H.E.R.A crew console detect hypoxia during spacewalks, alert the crew and guide first aid.",
};

/** Small interface strings used across components */
export const ui = {
  skipToContent: "Skip to content",
};

// ---------- Home ----------

export type Callout = {
  number: string;
  /** Part name, e.g. "The Sensor" (ink) */
  name: string;
  /** Model, e.g. "MAX30102" (gold, second line) */
  model: string;
  body: string;
  /** Optional smaller follow-up line */
  secondary?: string;
  /** Dot position on the part, as % of the product visual (for a tablet: % of its screen), from the top-left */
  x: number;
  y: number;
  /** Where the label sits on wide screens (1280px+). Below that, labels stack beside the visual in dot order. */
  position: "left-mid" | "left-low" | "right-top" | "right-mid";
  /** Row (1–3) when labels stack beside the visual at 1024–1279px; defaults to dot order (top dot first) */
  lgRow?: number;
  /** Label alignment within its row (default "center"); "start" pins it to the top */
  labelAlign?: "start" | "center" | "end";
};

/** Standalone caption box (no dot or leader line); `link` sits below the body */
export type InfoBoxContent = { label: string; title: string; body: string; link?: Link };

/** One slide of the home product carousel. Each product uses three callouts (01–03). */
export type ShowcaseProduct = {
  id: string;
  /** Shown in the pager and read out by screen readers */
  name: string;
  /** Huge decorative lettering behind the visual */
  backgroundWord: string;
  /** photo: cut-out image · tablet: angled tablet with `image` as its screen · visor: angled helmet visor */
  kind: "photo" | "tablet" | "visor";
  /** For "photo" the cut-out (null shows `imageSlot`); for "tablet" and "visor" the screen image */
  image: { src: string; alt: string; width: number; height: number } | null;
  imageSlot?: { slot: string; size: string; alt: string };
  /** Top-left caption for the whole product */
  device: InfoBoxContent;
  /** Bottom-right standalone caption */
  anchor: InfoBoxContent;
  callouts: Callout[];
  specs?: Spec[];
};

/**
 * Home product carousel. To add a product, add an entry to `products`: the counter, pager bars and arrows
 * update automatically. Put product images in public/images/ (see images-needed.md).
 */
export const productShowcase = {
  label: "Products",
  products: [
    {
      id: "herb",
      name: "H.E.R.B",
      backgroundWord: "H.E.R.B",
      kind: "photo",
      image: {
        src: "/images/herb-hardware.webp",
        width: 1240,
        height: 1600,
        alt: "[PLACEHOLDER: H.E.R.B] prototype hardware: pulse-oximeter sensor, ESP32 microcontroller and Raspberry Pi wired together on breadboards",
      },
      device: {
        label: "The Device",
        title: "Custom PCB",
        body: "An embedded system on a microchip, worn behind the ear and built into the astronaut's headgear. It's the most accurate spot to measure BPM and SpO₂, the key indicators of hypoxia.",
      },
      anchor: {
        label: "The Anchor",
        title: "iPad Pro 13in M4",
        body: "The master control for the crew member on board. They can monitor every astronaut on a spacewalk in real time and get step-by-step guidance to help if a hypoxia incident occurs. Controlled by the Raspberry Pi over Bluetooth.",
      },
      callouts: [
        {
          number: "01",
          name: "The Sensor",
          model: "MAX30102",
          body: "Uses infrared and red light to measure how much of each the blood absorbs. Infrared is absorbed by oxyhaemoglobin (oxygenated blood), red light by deoxyhaemoglobin, and the sensor returns the raw values.",
          position: "left-mid",
          secondary: "It samples every 6 seconds and keeps the last 15 readings in memory to watch for serious trends. Older samples are erased to keep it fast.",
          x: 21,
          y: 15,
        },
        {
          number: "02",
          name: "The MCU",
          model: "ESP32-WROOM-32E",
          body: "Turns the raw data into real SpO₂ and BPM values, then sends the live data over long-range Bluetooth to the Brain (Raspberry Pi).",
          position: "right-top",
          x: 42,
          y: 36,
        },
        {
          number: "03",
          name: "The Brain",
          model: "Raspberry Pi 5",
          body: "The main communicator to the two HUDs and the tablet. It handles several devices at once for low-latency syncing, updates each one with the refined data, and triggers any warnings needed on each device.",
          position: "left-low",
          x: 53,
          y: 69,
        },
      ],
      specs: [
        { label: "[PLACEHOLDER: Sampling rate]", value: "[PLACEHOLDER]" },
        { label: "[PLACEHOLDER: Connectivity]", value: "[PLACEHOLDER]" },
        { label: "[PLACEHOLDER: Power]", value: "[PLACEHOLDER]" },
        { label: "[PLACEHOLDER: Weight]", value: "[PLACEHOLDER]" },
        { label: "[PLACEHOLDER: Battery life]", value: "[PLACEHOLDER]" },
      ],
    },
    {
      id: "hera",
      name: "H.E.R.A",
      backgroundWord: "H.E.R.A",
      kind: "tablet",
      image: {
        src: "/images/hera-console.png",
        width: 2640,
        height: 1980,
        alt: "iPad Pro showing the H.E.R.A crew console: live SpO₂ and heart-rate trends over the last five minutes for two spacewalkers",
      },
      device: {
        label: "THE ANCHOR",
        title: "iPad Pro 13in M4",
        body: "The master control for the crew member on board. Monitor every spacewalker in real time and get step-by-step guidance if hypoxia strikes.",
      },
      anchor: {
        label: "THE APP",
        title: "H.E.R.A crew console",
        body: "Installs on iPad as a full-screen, offline app, with every incident and response saved to its log.",
        link: { label: "Launch the demo →", href: "https://crew-health-tablet.vercel.app" },
      },
      callouts: [
        {
          number: "01",
          name: "Live vitals",
          model: "5-min SpO₂ trend",
          body: "Tracks both spacewalkers' SpO₂ and heart rate live, and flags any reading that drifts from their personal pre-EVA baseline for 3–5 seconds.",
          x: 16,
          y: 32.3,
          position: "left-mid",
          // Above 02 at 1024–1279px: the tilt lifts dot 02 level with this label, so dot order would run line 01 through it
          lgRow: 1,
        },
        {
          number: "02",
          name: "Crew status",
          model: "Nominal → Warning → Critical",
          body: "Each astronaut's status escalates as readings worsen, backed by alert tones and voice, because hypoxia dulls vision and no one can watch a screen nonstop.",
          x: 94.4,
          y: 9.7,
          position: "right-top",
          lgRow: 2,
          labelAlign: "start",
        },
        {
          number: "03",
          name: "Hypoxia aid",
          model: "Guided first aid",
          body: "A game-style, multiple-choice walkthrough guides the crew member inside through vitals checks, first aid and resolution for hypoxia or decompression sickness, logging every step.",
          x: 37.5,
          y: 95.5,
          position: "left-low",
        },
      ],
    },
    {
      id: "aegis",
      name: "Aegis",
      backgroundWord: "AEGIS",
      kind: "visor",
      image: {
        src: "/images/aegis-hud.png",
        width: 2310,
        height: 1732,
        alt: "Aegis helmet HUD over a lunar landscape: respiration and heart rate on the left, SpO₂ and O₂ reserve on the right, EVA timer at the top and a locator for buddy astronaut EV2",
      },
      device: {
        label: "THE VISOR",
        title: "Aegis helmet HUD",
        body: "Astronauts cannot afford delayed recognition of physiological distress during an EVA.",
      },
      anchor: {
        label: "THE DEMO",
        title: "Aegis in Action",
        body: "Experience how Aegis detects physiological distress, adapts the helmet HUD, and alerts an EVA buddy through simulated emergency scenarios.",
        link: { label: "Launch the demo →", href: "https://astronaut-eva-hud.vercel.app" },
      },
      callouts: [
        {
          number: "01",
          name: "Physiological Intelligence",
          model: "SpO₂ · Heart rate · Respiration",
          body: "Monitors physiological readings against each astronaut's personal baseline to identify potential distress.",
          x: 25,
          y: 29,
          position: "left-mid",
        },
        {
          number: "02",
          name: "Adaptive HUD Alerts",
          model: "Normal · Warning · Critical",
          body: "Keeps routine information in peripheral vision, bringing actionable, severity-coded alerts into central view when intervention is needed.",
          // Centre of view, on clear sky above the horizon, where alerts appear
          x: 50,
          y: 33,
          position: "right-top",
        },
        {
          number: "03",
          name: "EVA Buddy Awareness",
          model: "Distance · Bearing · Distress status",
          body: "Displays a teammate's relative location and distress state, enabling coordinated emergency response.",
          x: 96.5,
          y: 55.3,
          position: "right-mid",
        },
      ],
    },
  ] as ShowcaseProduct[],
};

/** Milestone image: a framed figure; with `zoomable` it opens in the click-to-enlarge overlay */
export type MilestoneImage = {
  /** Optimised version shown in the milestone frame */
  src: string;
  /** Full-resolution file (or SVG), loaded only when the overlay opens. Defaults to `src` */
  fullSrc?: string;
  width: number;
  height: number;
  alt: string;
  zoomable: boolean;
  /** Trigger button label, e.g. "Enlarge schematic" */
  enlargeLabel?: string;
};

export type Milestone = {
  number: string;
  title: string;
  caption: string;
  /** null shows an ImageSlot named `slot` until the image exists */
  image: MilestoneImage | null;
  slot: string;
  /** Live app: the image becomes a browser-window preview card linking to `url`, plus a "Launch <label> ↗" text link */
  link?: { url: string; label: string };
};

/**
 * Milestones section below the product carousel. Entries alternate image-left / image-right.
 * To add an image: put it in public/images/, then set `image` (with `zoomable: true` for click-to-enlarge).
 * With `link`, the image is shown as a preview card that opens the live app in a new tab.
 */
export const milestones = {
  eyebrow: "MILESTONES",
  title: "[PLACEHOLDER: section title, e.g. Building H.E.R.A]",
  items: [
    {
      number: "01",
      title: "[PLACEHOLDER: Milestone 1 title, e.g. Custom PCB schematic]",
      caption: "[PLACEHOLDER: 1–2 sentence caption]",
      slot: "milestone-1-schematic.jpg",
      image: {
        src: "/images/milestone-1-schematic.jpg",
        width: 800,
        height: 647,
        alt: "Schematic of the custom PCB: ESP32-C3 microcontroller, MAX30102 sensor, USB-C power and supporting circuitry",
        zoomable: true,
        enlargeLabel: "Enlarge schematic",
      },
    },
    { number: "02", title: "[PLACEHOLDER: Milestone 2 title]", caption: "[PLACEHOLDER: caption]", slot: "milestone-2.png", image: null },
    {
      number: "03",
      title: "Aegis UI",
      caption: "[PLACEHOLDER: 1–2 sentence caption about building the Aegis helmet HUD]",
      slot: "milestone-3-aegis-preview.webp",
      image: {
        src: "/images/milestone-3-aegis-preview.webp",
        width: 2880,
        height: 1800,
        alt: "Preview of the Aegis helmet HUD: vitals at the edges of view over a lunar landscape",
        zoomable: false,
      },
      link: { url: "https://astronaut-eva-hud.vercel.app", label: "Aegis UI" },
    },
    {
      number: "04",
      title: "H.E.R.A UI",
      caption: "[PLACEHOLDER: 1–2 sentence caption about building the H.E.R.A crew console]",
      slot: "milestone-4-hera-preview.webp",
      image: {
        src: "/images/milestone-4-hera-preview.webp",
        width: 2880,
        height: 1800,
        alt: "Preview of the H.E.R.A crew console: live SpO₂ and heart-rate trends for two spacewalkers",
        zoomable: false,
      },
      link: { url: "https://crew-health-tablet.vercel.app", label: "H.E.R.A UI" },
    },
  ] as Milestone[],
};

/** Strings for the click-to-enlarge overlay */
export const lightbox = {
  close: "Close enlarged image",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  reset: "Reset zoom",
  escHint: "Esc to close",
  hintMouse: "Click to enlarge",
  hintTouch: "Tap to enlarge",
};

/** Strings for the live-app preview cards */
export const linkPreview = {
  chip: "Open live demo ↗",
  ariaLabel: (label: string) => `Open the ${label} live demo (opens in a new tab)`,
  launch: (label: string) => `Launch ${label} ↗`,
};
