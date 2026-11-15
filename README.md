# Space company site: first-pass skeleton

Marketing site skeleton: every page and section is laid out, and the content is placeholders. Built with Next.js (App Router), TypeScript, Tailwind CSS and Framer Motion, in a black-and-gold design system.

## Run

Requires Node.js 20+.

```sh
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run lint
```

## Pages

| Route | What |
|---|---|
| `/` | Hero, product spec, progress feed, stats band, mission, updates, press, newsletter |
| `/product` | Hero, specs table, how it works (3 steps), gallery |
| `/about` | Mission statement, team (4), timeline (5) |
| `/updates` | Updates list with category filter |
| `/updates/[slug]` | Post page (`sample-post` has a full sample body) |
| `/contact` | Contact form (client-side validation) and address/email |
| `/styleguide` | Every token, type size and component, with live contrast checks |

## File structure

```
app/                 Routes (one folder per page) + layout, global CSS, fonts
  fonts.ts           Font choices (Google Fonts via next/font)
  globals.css        Base styles and a few component classes (.container-page, .link-gold)
components/          Reusable components (Header, Footer, Section, Eyebrow, GoldButton,
                     GhostButton, SpecTable, MediaCard, StatBand, NewsRow, PressQuote,
                     TeamCard, Timeline, ImageSlot, plus motion helpers and forms)
content/site.ts      ALL copy and data, as typed objects
lib/cn.ts            Class-name helper
public/images/       Put real images here (see images-needed.md)
public/video/        Put the hero video here
tailwind.config.ts   Design tokens: colours, fonts, type scale, spacing
images-needed.md     Every image slot: name, page, size, kind of photo
```

## Change colours and fonts

- **Colours:** edit the `colors` block in `tailwind.config.ts` (`bg`, `bg-alt`, `slot`, `gold`, `gold-bright`, `ink`, `ink-muted`, `danger`). Components only use these names, so a change applies everywhere. Check `/styleguide` afterwards: its contrast table recalculates from the config.
- **Fonts:** edit `app/fonts.ts` (swap `Space_Grotesk` / `Inter` for any `next/font/google` font). The `font-display` and `font-sans` tokens pick them up.
- **Type scale:** the `fontSize` block in `tailwind.config.ts` (`text-display`, `text-h1` … `text-eyebrow`).
- **Sharpness:** `borderRadius` is set to 0 for everything in `tailwind.config.ts`.

## Fill in content and images

- **Text and data:** everything is in `content/site.ts`. Search for `[PLACEHOLDER` and replace each one. Pages render only from this file. To add an update, add an object to `news` (its `slug` becomes `/updates/<slug>`).
- **Images:** put the file in `public/images/`, then set `src` (and a real `alt`) on the matching slot in `content/site.ts`. Without `src`, a slot shows a labelled placeholder. All slots are listed in `images-needed.md`.
- **Hero video:** put an MP4 in `public/video/` and set `hero.video`. The `hero-bg` image is used as the poster and for visitors who prefer reduced motion.
- **Logo:** replace the placeholder mark in `components/Wordmark.tsx`.

## Motion

- Fade-and-rise reveals on scroll (`Reveal`)
- Gold hairline that draws under section headings (`Hairline`)
- Count-up numbers in the stats band (`CountUp`)
- Header: transparent at the top, solid with a gold hairline after scrolling
- Full-screen overlay menu on mobile

All of it respects `prefers-reduced-motion`: no movement, the final numbers show straight away, and the hero video is replaced by its poster.

## TODO (out of scope for this pass)

- [ ] Real content and images (see `content/site.ts` and `images-needed.md`)
- [ ] Logo, favicon and social sharing image
- [ ] Backend for the contact form (API route or form service). The form only validates on the client today. See `components/ContactForm.tsx`.
- [ ] Newsletter sign-up integration (mailing-list provider). See `components/NewsletterForm.tsx`.
- [ ] CMS for updates and other content (currently `content/site.ts`)
- [ ] Analytics and cookie consent
- [ ] Heavier motion, such as parallax on hero media (marked `TODO(motion)` in `components/HeroMedia.tsx`)
- [ ] Real privacy/terms pages and social links (currently `#`)
- [ ] SEO metadata per page and an Open Graph image
