/**
 * ALL site copy and data. Pages only render from this file.
 * To fill in content: replace every "[PLACEHOLDER: …]" string below.
 * To add a real image: set `src` on its ImageRef (path under /public, e.g. "/images/hero-bg.jpg")
 * and write a real `alt`. Slots without `src` render as labelled placeholder blocks.
 * See images-needed.md for the list of slots.
 */

// ---------- Types ----------

export type ImageRef = {
  /** Slot name shown on the placeholder, e.g. "hero-bg" */
  slot: string;
  /** Intended size, e.g. "1920×1080" */
  size: string;
  /** Path under /public; leave undefined to show the placeholder */
  src?: string;
  alt: string;
};

export type Link = { label: string; href: string };

export type Spec = { label: string; value: string; unit?: string };

export type ProgressItem = {
  title: string;
  caption: string;
  image: ImageRef;
  /** Optional "Watch video" link */
  videoHref?: string;
};

export type Stat = { value: number; suffix?: string; prefix?: string; label: string };

export type NewsItem = {
  slug: string;
  category: string;
  /** Display date, e.g. "12 Mar 2026" */
  date: string;
  headline: string;
  excerpt: string;
  image: ImageRef;
  /** Body paragraphs for the post page */
  body?: string[];
};

export type PressQuote = { quote: string; publication: string; href?: string };

export type TeamMember = { name: string; role: string; image: ImageRef };

export type TimelineEntry = { date: string; title: string; body: string };

export type Step = { title: string; body: string };

export type SocialLink = { label: string; href: string; icon: "x" | "linkedin" | "youtube" | "instagram" };

// ---------- Site-wide ----------

export const site = {
  name: "[PLACEHOLDER: Company]",
  legalName: "[PLACEHOLDER: Company legal name]",
  description: "[PLACEHOLDER: One-sentence description of the company for search engines.]",
};

export const nav: Link[] = [
  { label: "Product", href: "/product" },
  { label: "About", href: "/about" },
  { label: "Updates", href: "/updates" },
  { label: "Contact", href: "/contact" },
];

export const headerCta: Link = { label: "Get in touch", href: "/contact" };

/** Small interface strings used across components */
export const ui = {
  skipToContent: "Skip to content",
  menu: "Menu",
  close: "Close",
  watchVideo: "Watch video",
  allUpdates: "All updates",
  moreUpdates: "More updates",
  updateCount: (n: number) => `${n} ${n === 1 ? "update" : "updates"}`,
  filterLabel: "Filter by category",
  optional: "(optional)",
  addressLabel: "Address",
  emailLabel: "Email",
  newsletterEmailLabel: "Email address",
  emailPlaceholder: "you@example.com",
  errors: {
    name: "Enter your name.",
    email: "Enter a valid email address.",
    message: "Write a message of at least 10 characters.",
  },
};

// ---------- Home ----------

export const hero = {
  eyebrow: "[PLACEHOLDER: Eyebrow]",
  headline: "[PLACEHOLDER: Bold headline, five to seven words]",
  supporting: "[PLACEHOLDER: One supporting line that says what the company does.]",
  cta: { label: "[PLACEHOLDER: Main action]", href: "/product" } as Link,
  /** Optional background video (path under /public). Falls back to the image slot. */
  video: undefined as string | undefined,
  poster: { slot: "hero-bg", size: "1920×1080", alt: "[PLACEHOLDER: Hero image description]" } as ImageRef,
};

export const specs: Spec[] = [
  { label: "Crew", value: "[PLACEHOLDER]" },
  { label: "Mass", value: "[PLACEHOLDER]", unit: "kg" },
  { label: "Power", value: "[PLACEHOLDER]", unit: "kW" },
  { label: "Orbit", value: "[PLACEHOLDER]" },
  { label: "[PLACEHOLDER: Spec]", value: "[PLACEHOLDER]" },
  { label: "[PLACEHOLDER: Spec]", value: "[PLACEHOLDER]" },
];

export type Callout = {
  number: string;
  name: string;
  description: string;
  /** Dot position on the part, as % of the product image box (0–100, from the top-left) */
  x: number;
  y: number;
  /** Which side the label sits on (desktop) */
  side: "left" | "right";
  /** Optional label height as % of the image box; defaults to the dot's y (straight leader line) */
  labelY?: number;
};

/** Home product showcase: cut-out hardware over huge background lettering, with callouts */
export const productShowcase = {
  eyebrow: "[PLACEHOLDER: eyebrow, e.g. PROTOTYPE HARDWARE]",
  /** Background lettering (decorative) and the screen-reader heading */
  word: "H.E.R.B",
  heading: "H.E.R.B",
  image: {
    src: "/images/herb-hardware.webp",
    width: 1240,
    height: 1600,
    alt: "[PLACEHOLDER: H.E.R.B] prototype hardware: pulse-oximeter sensor, ESP32 microcontroller and Raspberry Pi wired together on breadboards",
  },
  callouts: [
    {
      number: "01",
      name: "[PLACEHOLDER: Sensor name, e.g. MAX30102 SpO₂ sensor]",
      description: "[PLACEHOLDER: 1–2 sentence explanation of what this part does]",
      x: 21,
      y: 15,
      side: "left",
    },
    {
      number: "02",
      name: "[PLACEHOLDER: MCU name, e.g. ESP32 microcontroller]",
      description: "[PLACEHOLDER: 1–2 sentence explanation of what this part does]",
      x: 42,
      y: 36,
      side: "right",
    },
    {
      number: "03",
      name: "[PLACEHOLDER: Brain, e.g. Raspberry Pi]",
      description: "[PLACEHOLDER: 1–2 sentence explanation of what this part does]",
      x: 53,
      y: 69,
      side: "left",
    },
  ] as Callout[],
  specs: [
    { label: "[PLACEHOLDER: Sampling rate]", value: "[PLACEHOLDER]" },
    { label: "[PLACEHOLDER: Connectivity]", value: "[PLACEHOLDER]" },
    { label: "[PLACEHOLDER: Power]", value: "[PLACEHOLDER]" },
    { label: "[PLACEHOLDER: Weight]", value: "[PLACEHOLDER]" },
    { label: "[PLACEHOLDER: Battery life]", value: "[PLACEHOLDER]" },
  ] as Spec[],
  cta: { label: "[PLACEHOLDER: Learn more]", href: "/product" } as Link,
};

export const progress = {
  eyebrow: "Progress",
  title: "[PLACEHOLDER: Progress section heading]",
  items: [
    {
      title: "[PLACEHOLDER: Milestone heading]",
      caption: "[PLACEHOLDER: One or two sentences describing this milestone and why it matters.]",
      image: { slot: "progress-1", size: "1200×900", alt: "[PLACEHOLDER: Image description]" },
      videoHref: "#",
    },
    {
      title: "[PLACEHOLDER: Milestone heading]",
      caption: "[PLACEHOLDER: One or two sentences describing this milestone and why it matters.]",
      image: { slot: "progress-2", size: "1200×900", alt: "[PLACEHOLDER: Image description]" },
    },
    {
      title: "[PLACEHOLDER: Milestone heading]",
      caption: "[PLACEHOLDER: One or two sentences describing this milestone and why it matters.]",
      image: { slot: "progress-3", size: "1200×900", alt: "[PLACEHOLDER: Image description]" },
      videoHref: "#",
    },
    {
      title: "[PLACEHOLDER: Milestone heading]",
      caption: "[PLACEHOLDER: One or two sentences describing this milestone and why it matters.]",
      image: { slot: "progress-4", size: "1200×900", alt: "[PLACEHOLDER: Image description]" },
    },
  ] as ProgressItem[],
};

/** PLACEHOLDER numbers: they only exist to show the layout and count-up. Replace all three. */
export const stats: Stat[] = [
  { value: 100, suffix: "+", label: "[PLACEHOLDER: What this counts]" },
  { value: 24, label: "[PLACEHOLDER: What this counts]" },
  { value: 7, label: "[PLACEHOLDER: What this counts]" },
];

export const mission = {
  eyebrow: "Mission",
  title: "[PLACEHOLDER: Mission heading in one line]",
  body: [
    "[PLACEHOLDER: Two or three sentences on why the company exists and where it is going.]",
    "[PLACEHOLDER: A second short paragraph with supporting detail.]",
  ],
  image: { slot: "mission", size: "1400×1600", alt: "[PLACEHOLDER: Image description]" } as ImageRef,
  cta: { label: "About us", href: "/about" } as Link,
};

export const updateCategories = ["[PLACEHOLDER: Topic A]", "[PLACEHOLDER: Topic B]", "[PLACEHOLDER: Topic C]"];

export const news: NewsItem[] = [
  {
    slug: "sample-post",
    category: updateCategories[0],
    date: "[PLACEHOLDER: Date]",
    headline: "[PLACEHOLDER: Update headline on one line]",
    excerpt: "[PLACEHOLDER: One-sentence summary of the update.]",
    image: { slot: "update-1", size: "1600×900", alt: "[PLACEHOLDER: Image description]" },
    body: [
      "[PLACEHOLDER: Opening paragraph of the post. Two to four sentences that set out the news.]",
      "[PLACEHOLDER: Second paragraph with detail, context or a quote from the team.]",
      "[PLACEHOLDER: Closing paragraph with what happens next.]",
    ],
  },
  {
    slug: "update-2",
    category: updateCategories[1],
    date: "[PLACEHOLDER: Date]",
    headline: "[PLACEHOLDER: Update headline on one line]",
    excerpt: "[PLACEHOLDER: One-sentence summary of the update.]",
    image: { slot: "update-2", size: "1600×900", alt: "[PLACEHOLDER: Image description]" },
  },
  {
    slug: "update-3",
    category: updateCategories[2],
    date: "[PLACEHOLDER: Date]",
    headline: "[PLACEHOLDER: Update headline on one line]",
    excerpt: "[PLACEHOLDER: One-sentence summary of the update.]",
    image: { slot: "update-3", size: "1600×900", alt: "[PLACEHOLDER: Image description]" },
  },
  {
    slug: "update-4",
    category: updateCategories[0],
    date: "[PLACEHOLDER: Date]",
    headline: "[PLACEHOLDER: Update headline on one line]",
    excerpt: "[PLACEHOLDER: One-sentence summary of the update.]",
    image: { slot: "update-4", size: "1600×900", alt: "[PLACEHOLDER: Image description]" },
  },
  {
    slug: "update-5",
    category: updateCategories[1],
    date: "[PLACEHOLDER: Date]",
    headline: "[PLACEHOLDER: Update headline on one line]",
    excerpt: "[PLACEHOLDER: One-sentence summary of the update.]",
    image: { slot: "update-5", size: "1600×900", alt: "[PLACEHOLDER: Image description]" },
  },
  {
    slug: "update-6",
    category: updateCategories[2],
    date: "[PLACEHOLDER: Date]",
    headline: "[PLACEHOLDER: Update headline on one line]",
    excerpt: "[PLACEHOLDER: One-sentence summary of the update.]",
    image: { slot: "update-6", size: "1600×900", alt: "[PLACEHOLDER: Image description]" },
  },
];

export const press: PressQuote[] = [
  { quote: "[PLACEHOLDER: Short press quote, one sentence.]", publication: "[PLACEHOLDER: Publication]" },
  { quote: "[PLACEHOLDER: Short press quote, one sentence.]", publication: "[PLACEHOLDER: Publication]" },
  { quote: "[PLACEHOLDER: Short press quote, one sentence.]", publication: "[PLACEHOLDER: Publication]" },
];

/** Headings for the home page's updates and press sections */
export const homeSections = {
  updates: { eyebrow: "Updates", title: "Latest updates", cta: { label: "All updates", href: "/updates" } as Link },
  press: { eyebrow: "Press", title: "In the press" },
};

export const newsletter = {
  eyebrow: "Newsletter",
  title: "[PLACEHOLDER: Newsletter heading]",
  body: "[PLACEHOLDER: One line on what subscribers receive and how often.]",
  button: "Subscribe",
  success: "Thanks. You're on the list.",
};

// ---------- Product page ----------

export const productPage = {
  hero: {
    eyebrow: "[PLACEHOLDER: Product line]",
    title: "[PLACEHOLDER: Product name]",
    supporting: "[PLACEHOLDER: One line describing the product.]",
    image: { slot: "product-hero", size: "1920×1080", alt: "[PLACEHOLDER: Image description]" } as ImageRef,
  },
  specsIntro: {
    eyebrow: "Specifications",
    title: "[PLACEHOLDER: Specs heading]",
    body: "[PLACEHOLDER: One sentence introducing the specifications.]",
    image: { slot: "product-specs", size: "1600×1200", alt: "[PLACEHOLDER: Image description]" } as ImageRef,
  },
  howItWorks: {
    eyebrow: "How it works",
    title: "[PLACEHOLDER: How-it-works heading]",
    steps: [
      { title: "[PLACEHOLDER: Step one]", body: "[PLACEHOLDER: One or two sentences on this step.]" },
      { title: "[PLACEHOLDER: Step two]", body: "[PLACEHOLDER: One or two sentences on this step.]" },
      { title: "[PLACEHOLDER: Step three]", body: "[PLACEHOLDER: One or two sentences on this step.]" },
    ] as Step[],
  },
  gallery: {
    eyebrow: "Gallery",
    title: "[PLACEHOLDER: Gallery heading]",
    images: [
      { slot: "gallery-1", size: "2000×1000", alt: "[PLACEHOLDER: Image description]" },
      { slot: "gallery-2", size: "1200×1200", alt: "[PLACEHOLDER: Image description]" },
      { slot: "gallery-3", size: "1200×1200", alt: "[PLACEHOLDER: Image description]" },
      { slot: "gallery-4", size: "1200×1200", alt: "[PLACEHOLDER: Image description]" },
      { slot: "gallery-5", size: "1200×1200", alt: "[PLACEHOLDER: Image description]" },
      { slot: "gallery-6", size: "2000×1000", alt: "[PLACEHOLDER: Image description]" },
    ] as ImageRef[],
  },
};

// ---------- About page ----------

export const aboutPage = {
  hero: {
    eyebrow: "About",
    statement: "[PLACEHOLDER: Mission statement in one bold sentence.]",
    bodyEyebrow: "Our mission",
    body: "[PLACEHOLDER: Two or three sentences expanding on the mission and the company's approach.]",
    image: { slot: "about-hero", size: "1920×1080", alt: "[PLACEHOLDER: Image description]" } as ImageRef,
  },
  team: {
    eyebrow: "Team",
    title: "[PLACEHOLDER: Team heading]",
    members: [
      { name: "[PLACEHOLDER: Name]", role: "[PLACEHOLDER: Role]", image: { slot: "team-1", size: "800×1000", alt: "[PLACEHOLDER: Portrait of name]" } },
      { name: "[PLACEHOLDER: Name]", role: "[PLACEHOLDER: Role]", image: { slot: "team-2", size: "800×1000", alt: "[PLACEHOLDER: Portrait of name]" } },
      { name: "[PLACEHOLDER: Name]", role: "[PLACEHOLDER: Role]", image: { slot: "team-3", size: "800×1000", alt: "[PLACEHOLDER: Portrait of name]" } },
      { name: "[PLACEHOLDER: Name]", role: "[PLACEHOLDER: Role]", image: { slot: "team-4", size: "800×1000", alt: "[PLACEHOLDER: Portrait of name]" } },
    ] as TeamMember[],
  },
  timeline: {
    eyebrow: "Timeline",
    title: "[PLACEHOLDER: Timeline heading]",
    entries: [
      { date: "[PLACEHOLDER: Year]", title: "[PLACEHOLDER: Milestone]", body: "[PLACEHOLDER: One sentence on this milestone.]" },
      { date: "[PLACEHOLDER: Year]", title: "[PLACEHOLDER: Milestone]", body: "[PLACEHOLDER: One sentence on this milestone.]" },
      { date: "[PLACEHOLDER: Year]", title: "[PLACEHOLDER: Milestone]", body: "[PLACEHOLDER: One sentence on this milestone.]" },
      { date: "[PLACEHOLDER: Year]", title: "[PLACEHOLDER: Milestone]", body: "[PLACEHOLDER: One sentence on this milestone.]" },
      { date: "[PLACEHOLDER: Year]", title: "[PLACEHOLDER: Milestone]", body: "[PLACEHOLDER: One sentence on this milestone.]" },
    ] as TimelineEntry[],
  },
};

// ---------- Updates page ----------

export const updatesPage = {
  eyebrow: "Updates",
  title: "[PLACEHOLDER: Updates page heading]",
  intro: "[PLACEHOLDER: One line on what is posted here.]",
  allLabel: "All",
};

// ---------- Contact page ----------

export const contactPage = {
  eyebrow: "Contact",
  title: "[PLACEHOLDER: Contact heading]",
  intro: "[PLACEHOLDER: One or two sentences on who should get in touch and why.]",
  address: ["[PLACEHOLDER: Street address]", "[PLACEHOLDER: City, postcode]", "[PLACEHOLDER: Country]"],
  email: "[PLACEHOLDER: email@company]",
  emailHref: "mailto:hello@example.com", // PLACEHOLDER
  form: {
    name: "Name",
    email: "Email",
    organisation: "Organisation",
    message: "Message",
    submit: "Send message",
    success: "Thanks. Your message is ready to send once the form is connected.",
  },
};

// ---------- Footer ----------

export const footer = {
  tagline: "[PLACEHOLDER: Short company tagline.]",
  columns: [
    { title: "Company", links: [{ label: "About", href: "/about" }, { label: "Updates", href: "/updates" }, { label: "Contact", href: "/contact" }] },
    { title: "Product", links: [{ label: "Overview", href: "/product" }, { label: "[PLACEHOLDER: Link]", href: "#" }, { label: "[PLACEHOLDER: Link]", href: "#" }] },
    { title: "Resources", links: [{ label: "[PLACEHOLDER: Press kit]", href: "#" }, { label: "[PLACEHOLDER: Careers]", href: "#" }, { label: "Style guide", href: "/styleguide" }] },
  ] as { title: string; links: Link[] }[],
  social: [
    { label: "X", href: "#", icon: "x" },
    { label: "LinkedIn", href: "#", icon: "linkedin" },
    { label: "YouTube", href: "#", icon: "youtube" },
    { label: "Instagram", href: "#", icon: "instagram" },
  ] as SocialLink[],
  legal: "© [PLACEHOLDER: Year] [PLACEHOLDER: Company legal name]. All rights reserved.",
  legalLinks: [{ label: "[PLACEHOLDER: Privacy]", href: "#" }, { label: "[PLACEHOLDER: Terms]", href: "#" }] as Link[],
};
