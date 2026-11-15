/**
 * ALL site copy and data. Pages only render from this file.
 * To fill in content: replace every "[PLACEHOLDER: …]" string below.
 * Images live in public/images/ (see images-needed.md for the list of slots).
 */

// ---------- Types ----------

export type Link = { label: string; href: string };

// ---------- Site-wide ----------

export const site = {
  title: "Project Orion: aiming for zero hypoxia fatalities on every spacewalk",
  description:
    "Project Orion is an incident-response system for three-person EVA crews: a behind-the-ear sensor reads SpO₂ and heart rate, Aegis helmet HUDs alert the spacewalking pair, and the H.E.R.A tablet guides the crew member inside through first aid.",
};

/** Small interface strings used across components */
export const ui = {
  skipToContent: "Skip to content",
};

// ---------- Home ----------

export type HeroFact = { value: string; label: string };

/** Top of the page: full-bleed background, headline (the page's h1), two buttons and a row of key facts */
export const hero = {
  eyebrow: "PROJECT ORION · NASA SPACE APPS CHALLENGE 2026",
  headline: "We are aiming for zero hypoxia fatalities on every spacewalk.",
  body: "Spacesuits trade pressure for mobility and run on pure oxygen, so a single leak can turn fatal within seconds. Project Orion is an incident-response system for three-person crews: a custom sensor reads SpO₂ and heart rate behind the ear, helmet HUDs alert the spacewalking pair, and a tablet guides the crew member inside through first aid.",
  primary: { label: "Explore the system ↓", href: "#products" } as Link,
  secondary: { label: "See our milestones", href: "#milestones" } as Link,
  /** NASA public-domain photo (see credits.md); also the poster for `video` */
  image: {
    src: "/images/hero-eva.jpg",
    alt: "NASA astronaut Suni Williams on a spacewalk outside the International Space Station",
  },
  /** Optional muted background loop (path under /public); the image stays as poster and reduced-motion fallback */
  video: undefined as string | undefined,
  facts: [
    { value: "0.26", label: "EVA suit injuries per spacewalk" },
    { value: "3σ", label: "Personal-baseline alert trigger" },
    { value: "3", label: "Devices: sensor, HUD, tablet" },
  ] as HeroFact[],
  scrollCue: "Scroll",
};

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
};

/**
 * Home product carousel. To add a product, add an entry to `products`: the counter, pager bars and arrows
 * update automatically. Put product images in public/images/ (see images-needed.md).
 */
export const productShowcase = {
  label: "Products",
  /** Hint under the carousel's next arrow */
  nextHint: "Click here to go next",
  nextHintTouch: "Tap here to go next",
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
        title: "Custom Hardware Concept",
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
  type: "image";
  /** Optimised version shown in the milestone frame */
  src: string;
  /** Full-resolution file (or SVG), loaded only when the overlay opens. Defaults to `src` */
  fullSrc?: string;
  width: number;
  height: number;
  alt: string;
  /** Short name under the frame, e.g. "Schematic" */
  label: string;
  zoomable: boolean;
};

/** Milestone video, prepared with scripts/prepare_video.sh */
export type MilestoneVideo = {
  type: "video";
  /** H.264 MP4 */
  src: string;
  /** Smaller (1280px) H.264 MP4 served to screens narrower than 1280px */
  srcSmall?: string;
  srcWebm?: string;
  /** JPG frame shown before playback */
  poster: string;
  /** WebVTT captions, if any */
  captions?: string;
  width: number;
  height: number;
  /** Short name under the frame, e.g. "Prototype demo" */
  label: string;
  /** Full title, read out by the play button */
  title: string;
};

/** Slide deck: page images (rendered from the PDF) shown as a cover that opens a page viewer */
export type MilestoneDeck = {
  type: "deck";
  /** One image per page, in order; page 1 is the cover */
  pages: string[];
  width: number;
  height: number;
  /** The PDF itself, linked from the viewer */
  pdf: string;
  label: string;
  /** Alt text per page; "{n}" becomes the page number */
  alt: string;
};

export type MilestoneMedia = MilestoneImage | MilestoneVideo | MilestoneDeck;

export type Milestone = {
  number: string;
  title: string;
  caption?: string;
  /** One or more images or videos; more than one adds arrows and a counter. Empty shows an ImageSlot named `slot` */
  media: MilestoneMedia[];
  slot: string;
  /** Live app: the first image becomes a browser-window preview card linking to `url`, plus a "Launch <label> ↗" text link */
  link?: { url: string; label: string };
};

/**
 * Milestones section below the product carousel. Entries alternate image-left / image-right.
 * To add media: put images in public/images/ and videos in public/videos/, then add entries to `media`.
 * With `link`, the image is shown as a preview card that opens the live app in a new tab.
 */
export const milestones = {
  eyebrow: "MILESTONES",
  title: "Project Orion's Prototypes",
  items: [
    {
      number: "01",
      title: "Mock-up schematics",
      caption:
        "From the KiCad schematic to a 3D render of the H.E.R.B v1 board: an ESP32-C3 microcontroller, MAX30102 sensor, regulator and USB-C power on one compact PCB.",
      slot: "milestone-1-schematic.png",
      media: [
        {
          type: "image",
          src: "/images/milestone-1-schematic.png",
          width: 1280,
          height: 1059,
          alt: "KiCad schematic of the custom PCB: ESP32-C3 microcontroller, MAX30102 SpO₂ sensor, LT1963 3.3V regulator, USB-C input, buttons and status LEDs",
          label: "Schematic",
          zoomable: true,
        },
        {
          type: "image",
          src: "/images/milestone-1-pcb-3d.png",
          width: 1280,
          height: 705,
          alt: "3D render of the H.E.R.B v1 PCB showing the ESP32-C3 chip, regulator, USB-C port and two push buttons",
          label: "3D render",
          zoomable: true,
        },
      ],
    },
    {
      number: "02",
      title: "Prototype functionality",
      slot: "milestone-2 video",
      media: [
        {
          type: "video",
          src: "/videos/milestone-2/prototype-demo-web.mp4",
          srcSmall: "/videos/milestone-2/prototype-demo-web-1280.mp4",
          srcWebm: "/videos/milestone-2/prototype-demo-web.webm",
          poster: "/videos/milestone-2/prototype-demo-web-poster.jpg",
          width: 1920,
          height: 1080,
          label: "Prototype demo",
          title: "Project Orion prototype demo",
        },
        {
          type: "deck",
          pages: [1, 2, 3, 4, 5, 6, 7].map((n) => `/images/deck/page-0${n}.webp`),
          width: 2400,
          height: 1351,
          pdf: "/docs/project-orion-deck.pdf",
          label: "Project Orion deck",
          alt: "Project Orion slide deck, page {n} of 7",
        },
      ],
    },
    {
      number: "03",
      title: "Aegis UI",
      slot: "milestone-3-aegis-preview.webp",
      media: [
        {
          type: "image",
          src: "/images/milestone-3-aegis-preview.webp",
          width: 2880,
          height: 1800,
          alt: "Preview of the Aegis helmet HUD: vitals at the edges of view over a lunar landscape",
          label: "Aegis UI",
          zoomable: false,
        },
      ],
      link: { url: "https://astronaut-eva-hud.vercel.app", label: "Aegis UI" },
    },
    {
      number: "04",
      title: "H.E.R.A UI",
      slot: "milestone-4-hera-preview.webp",
      media: [
        {
          type: "image",
          src: "/images/milestone-4-hera-preview.webp",
          width: 2880,
          height: 1800,
          alt: "Preview of the H.E.R.A crew console: live SpO₂ and heart-rate trends for two spacewalkers",
          label: "H.E.R.A UI",
          zoomable: false,
        },
      ],
      link: { url: "https://crew-health-tablet.vercel.app", label: "H.E.R.A UI" },
    },
  ] as Milestone[],
};

/** Strings for the milestone gallery (arrows, counter) and video player */
export const gallery = {
  next: "Next image",
  previous: "Previous image",
  nextVideo: "Next video",
  previousVideo: "Previous video",
  nextItem: "Next item",
  previousItem: "Previous item",
  play: (title: string) => `Play video: ${title}`,
  enlarge: (label: string) => `Enlarge ${label.toLowerCase()}`,
  viewDeck: (label: string, pages: number) => `View the ${label} (${pages} pages)`,
  deckHintMouse: (pages: number) => `${pages} pages · Click to view`,
  deckHintTouch: (pages: number) => `${pages} pages · Tap to view`,
  openPdf: "Open PDF ↗",
};

/** Strings for the click-to-enlarge overlay */
export const lightbox = {
  close: "Close enlarged image",
  next: "Next image",
  previous: "Previous image",
  nextPage: "Next page",
  previousPage: "Previous page",
  page: (n: number, total: number) => `Page ${n} / ${total}`,
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
