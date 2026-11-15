# Images needed

Every image on the site. Slots without a file show a dark placeholder labelled with their name and size.

**How to add one:** put the file in `public/images/`, then set it in `content/site.ts` (see each row). Use JPG/WebP for photos.

| Slot | Where | Size | What |
|---|---|---|---|
| `herb-hardware` ✅ | Product carousel, slide 1 "H.E.R.B" | 1240×1600 cut-out (done) | Transparent cut-out of the prototype hardware, made from `herb-hardware-raw.jpg` by `scripts/cutout_herb.py`. Replace both if the hardware changes, then re-check the callout dot positions. |
| `hera-console.png` ✅ | Product carousel, slide 2 "H.E.R.A" | 2310×1732 (4:3) | Screenshot of the H.E.R crew console on the angled tablet. Captured from crew-health-tablet.vercel.app at 1155×866 @2×. Replace with any 4:3 capture, then re-check the dot positions. |
| `aegis-hud.png` ✅ | Product carousel, slide 3 "Aegis" | 2310×1732 (4:3) | Capture of the live helmet HUD over the lunar landscape, shown inside the angled visor. Captured from astronaut-eva-hud.vercel.app at 1155×866 @2×. |
| `milestone-1-schematic.jpg` ✅ | Milestones, entry 01 | 800×647 (KiCad export) | Circuit schematic of the custom PCB. Shown on an off-white panel and zoomable. A higher-resolution export (a larger PNG, or an SVG) would read better when zoomed: add it and set `fullSrc` on milestone 01 so the overlay loads it, or replace `src`, `width` and `height` outright. |
| `milestone-2.png` | Milestones, entry 02 | 1200×900 | To be decided. Set `image` on milestone 02. |
| `milestone-3.png` | Milestones, entry 03 | 1200×900 | To be decided. Set `image` on milestone 03. |
| `milestone-4.png` | Milestones, entry 04 | 1200×900 | To be decided. Set `image` on milestone 04. |

## Also needed

- Favicon / app icons in `app/` (`icon.png`, `apple-icon.png`)
- Social sharing image (`app/opengraph-image.png`, 1200×630)
