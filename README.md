# H.E.R.A site

A single-page site for Project Orion: a hero introduction, a product carousel (H.E.R.B, H.E.R.A, Aegis) and a Milestones section. Built with Next.js (App Router), TypeScript, Tailwind CSS and Framer Motion, in a black-and-gold design system.

## Run

Requires Node.js 20+.

```sh
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run lint
```

## File structure

```
app/                 The one route (/) + layout, global CSS, fonts
  fonts.ts           Font choices (Google Fonts via next/font)
  globals.css        Base styles, carousel grid areas, tablet/visor poses
components/
  Hero, HeroMedia    Project Orion introduction: background, headline, buttons, key facts
  ProductCarousel    Carousel: arrows, pager, ← → keys, swipe
  ProductSlide       One product: visual, callouts with leader lines, Device / Anchor boxes
  Milestones         Alternating image/text entries
  MilestoneGallery   One or more milestone images/videos in one frame, with arrows and a counter
  ImageLightbox      Framed image button + click-to-enlarge overlay with zoom, pan and prev/next
  VideoPlayer        Framed video: poster and play button, then native controls
  LinkPreview        Browser-window preview card that opens a live app (any milestone with a link)
  Buttons, InfoBox, ImageSlot, Section, Eyebrow, Hairline, Reveal, CornerTicks, MotionProvider
content/site.ts      ALL copy and data, as typed objects
lib/cn.ts            Class-name helper
public/images/       Images (see images-needed.md)
scripts/             cutout_herb.py (H.E.R.B cut-out), prepare_video.sh (web-ready milestone videos)
tailwind.config.ts   Design tokens: colours, fonts, type scale, spacing
```

## Change colours and fonts

- **Colours:** edit the `colors` block in `tailwind.config.ts`. Components only use these names, so a change applies everywhere.
- **Fonts:** edit `app/fonts.ts`. The `font-display`, `font-sans` and `font-eyebrow` tokens pick them up.
- **Type scale:** the `fontSize` block in `tailwind.config.ts`.

## Content

- **Text and data:** everything is in `content/site.ts`. Search for `[PLACEHOLDER` to find what is still open.
- **Carousel:** `productShowcase.products`. Add an entry to add a slide.
- **Hero:** `hero` (headline, buttons, key facts, background image and optional `video`). Image credits are in `credits.md`.
- **Milestones:** `milestones.items`. Each entry has a `media` array of images (`type: "image"`, with `zoomable` for the lightbox) and/or videos (`type: "video"`); more than one item adds arrows and a counter. Set `link` (`url`, `label`) to show the first image as a preview card that opens a live app. For a video, run `scripts/prepare_video.sh <file>` and paste the entry it prints.

## Motion

- Carousel slide entrance (word, visual, leader lines, callouts) and track slide
- Fade-and-rise reveals on scroll (`Reveal`) and the gold hairline under the section heading
- Hero: staggered text entrance, a very slow background zoom and a drawing "Scroll" line
- Milestone galleries slide between items; the lightbox grows from the image on the page

All of it respects `prefers-reduced-motion` (no movement; the lightbox only fades).
