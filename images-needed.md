# Images needed

Every image slot on the site. Until a real image is added, each slot shows a dark placeholder labelled with its name and size.

**How to add one:** put the file in `public/images/`, then in `content/site.ts` find the slot by name and set `src: "/images/<file>"` and a real `alt`. Sizes are the intended source size; larger is fine. Use JPG/WebP for photos.

| Slot | Page | Size | What kind of photo |
|---|---|---|---|
| `hero-bg` | Home (hero) | 1920×1080 | Signature wide shot: the vehicle or station against space or on the pad. Dark, with calm space at the bottom left for the headline. Also the poster for the optional hero video. |
| `herb-hardware` ✅ | Home (product showcase) | 1240×1600 cut-out (done) | Transparent cut-out of the prototype hardware, made from `herb-hardware-raw.jpg` by `scripts/cutout_herb.py`. Replace both if the hardware changes, then re-check the callout dot positions. |
| `progress-1` | Home (progress feed) | 1200×900 | Hardware being built or tested (factory floor, integration) |
| `progress-2` | Home (progress feed) | 1200×900 | Test campaign: test stand, chamber or rig |
| `progress-3` | Home (progress feed) | 1200×900 | Team at work on a milestone |
| `progress-4` | Home (progress feed) | 1200×900 | Recent milestone result, close-up detail |
| `mission` | Home (mission split) | 1400×1600 (portrait) | Atmospheric image that carries the mission: Earth from orbit, horizon, a person looking up |
| `update-1` … `update-6` | Updates list / post pages | 1600×900 | Lead image for each update (one per post) |
| `product-hero` | Product (hero) | 1920×1080 | Dramatic full-bleed product shot, dark with room for text at the bottom left |
| `product-specs` | Product (specs) | 1600×1200 | Cutaway, technical or detail view that goes with the spec table |
| `gallery-1` | Product (gallery) | 2000×1000 (wide) | Wide establishing shot |
| `gallery-2` | Product (gallery) | 1200×1200 | Detail: hardware close-up |
| `gallery-3` | Product (gallery) | 1200×1200 | Interior or crew area |
| `gallery-4` | Product (gallery) | 1200×1200 | Detail: materials or engineering |
| `gallery-5` | Product (gallery) | 1200×1200 | People with the hardware, for scale |
| `gallery-6` | Product (gallery) | 2000×1000 (wide) | Wide shot in its operating environment |
| `about-hero` | About (hero) | 1920×1080 | Team, facility or a launch: who the company is |
| `team-1` … `team-4` | About (team) | 800×1000 (portrait) | Consistent portraits: same background, lighting and crop for all four |

## Video (optional)

| Slot | Page | Size | What |
|---|---|---|---|
| `hero.video` | Home (hero) | 1920×1080, MP4 (H.264), under ~8 MB, 10–20 s loop, no audio | Slow ambient footage. Set `hero.video` in `content/site.ts` to its `/video/...` path. `hero-bg` is used as the poster and as the fallback when the visitor prefers reduced motion. |

## Also needed

- Logo: an SVG to replace the placeholder mark in `components/Wordmark.tsx`
- Favicon / app icons in `app/` (`icon.png`, `apple-icon.png`)
- Social sharing image (`app/opengraph-image.png`, 1200×630)
