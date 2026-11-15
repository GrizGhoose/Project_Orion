# Images needed

Every image on the site. Slots without a file show a dark placeholder labelled with their name and size.

**How to add one:** put the file in `public/images/`, then set it in `content/site.ts` (see each row). Use JPG/WebP for photos.

| Slot | Where | Size | What |
|---|---|---|---|
| `herb-hardware` ✅ | Product carousel, slide 1 "H.E.R.B" | 1240×1600 cut-out (done) | Transparent cut-out of the prototype hardware, made from `herb-hardware-raw.jpg` by `scripts/cutout_herb.py`. Replace both if the hardware changes, then re-check the callout dot positions. |
| `hera-console.png` ✅ | Product carousel, slide 2 "H.E.R.A" | 2640×1980 (4:3) | Screenshot of the H.E.R.A crew console on the angled tablet. Captured from crew-health-tablet.vercel.app at 1320×990 @2×. Replace with any 4:3 capture, then re-check the dot positions. |
| `aegis-hud.png` ✅ | Product carousel, slide 3 "Aegis" | 2310×1732 (4:3) | Capture of the live helmet HUD over the lunar landscape, shown inside the angled visor. Captured from astronaut-eva-hud.vercel.app at 1155×866 @2×. |
| `hero-eva.jpg` ✅ | Hero background | 4928×2768 (NASA original) | NASA photo iss072e487421 (see credits.md). A muted hero loop can be added later: set `hero.video`; this image stays as its poster. |
| `milestone-1-schematic.png` ✅ | Milestones, entry 01 (image 1) | 1280×1059 | KiCad schematic of the custom PCB, zoomable. A larger export (or SVG) set as `fullSrc` would read better at 3×. |
| `milestone-1-pcb-3d.png` ✅ | Milestones, entry 01 (image 2) | 1280×705 | KiCad 3D render of the H.E.R.B v1 board, zoomable. |
| `videos/milestone-2/prototype-demo-web*` ✅ | Milestones, entry 02 (item 1) | 1920×1080 MP4 + WebM, 1280px MP4, poster | Prototype demo. Made from `media-src/prototype-demo.mp4` (git-ignored original) with `CRF=24 POSTER_AT=5 SMALL=1 scripts/prepare_video.sh media-src/prototype-demo.mp4 public/videos/milestone-2 prototype-demo-web`. |
| `images/deck/page-01…07.webp` ✅ | Milestones, entry 02 (item 2) | 2400×1351 | Pages of `public/docs/project-orion-deck.pdf`, rendered at 2400px wide. Re-render them whenever the PDF changes (see README). |
| `milestone-3-aegis-preview.webp` ✅ | Milestones, entry 03 (preview card) | 2880×1800 (16:10) | Capture of astronaut-eva-hud.vercel.app at 1440×900 @2×, 3 s after load. |
| `milestone-4-hera-preview.webp` ✅ | Milestones, entry 04 (preview card) | 2880×1800 (16:10) | Capture of crew-health-tablet.vercel.app at 1440×900 @2×, 30 s after "Begin monitoring". |

## Also needed

- Favicon / app icons in `app/` (`icon.png`, `apple-icon.png`)
- Social sharing image (`app/opengraph-image.png`, 1200×630)
