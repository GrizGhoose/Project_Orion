# H.E.R site

A single-page site for H.E.R (Hypoxia Emergency Responder): a product carousel (H.E.R.B, H.E.R.A, Aegis) followed by a Milestones section. Built with Next.js (App Router), TypeScript, Tailwind CSS and Framer Motion, in a black-and-gold design system.

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
  ProductCarousel    Carousel: arrows, pager, ← → keys, swipe
  ProductSlide       One product: visual, callouts with leader lines, Device / Anchor boxes
  Milestones         Alternating image/text entries
  ImageLightbox      Click-to-enlarge overlay with zoom and pan (any milestone image with zoomable: true)
  InfoBox, ImageSlot, SpecTable, Section, Eyebrow, Hairline, Reveal, CornerTicks, MotionProvider
content/site.ts      ALL copy and data, as typed objects
lib/cn.ts            Class-name helper
public/images/       Images (see images-needed.md)
scripts/             cutout_herb.py: makes the H.E.R.B cut-out
tailwind.config.ts   Design tokens: colours, fonts, type scale, spacing
```

## Change colours and fonts

- **Colours:** edit the `colors` block in `tailwind.config.ts`. Components only use these names, so a change applies everywhere.
- **Fonts:** edit `app/fonts.ts`. The `font-display`, `font-sans` and `font-eyebrow` tokens pick them up.
- **Type scale:** the `fontSize` block in `tailwind.config.ts`.

## Content

- **Text and data:** everything is in `content/site.ts`. Search for `[PLACEHOLDER` to find what is still open.
- **Carousel:** `productShowcase.products`. Add an entry to add a slide.
- **Milestones:** `milestones.items`. To give an entry an image, put it in `public/images/` and set `image` (`src`, `width`, `height`, `alt`). Set `zoomable: true` to open it in the lightbox; `fullSrc` optionally points at a larger file (or SVG) that is loaded only when the overlay opens.

## Motion

- Carousel slide entrance (word, visual, leader lines, callouts) and track slide
- Fade-and-rise reveals on scroll (`Reveal`) and the gold hairline under the section heading
- Lightbox: the image grows from its place on the page into the overlay

All of it respects `prefers-reduced-motion` (no movement; the lightbox only fades).
