# Isaiah's draft

Everything from Isaiah's local `NASA_SAC_Hackathon` folder, combined into this one folder on the `isaiahs-draft` branch so it can't clash with files on `main` or other branches.

## What's here
- `space-company-site/`: the Project Orion website (live at https://project-orion-delta.vercel.app). Its own history is on the `project-orion-website` branch.
- `astronaut-eva-hud-ZX/`, `astronaut-eva-hud-hardware/`: Aegis helmet HUD (live at https://astronaut-eva-hud.vercel.app)
- `tablet/`, `tablet-hardware/`: H.E.R.A crew tablet (live at https://crew-health-tablet.vercel.app)
- `hardware/`, `HYPOXIA/`, `Acute_WI/`, `01_…` to `07_…`, `all_csvs/`: research data and NASA sources
- `Project_Orion.pptx` / `.pdf`, `HER_pitch_deck.pptx`, mission briefing and dataset docs

## Left out
- Files over GitHub's 100 MB limit (raw 100–325 MB waveform / dose-rate CSVs in `Acute_WI/`, `all_csvs/` and `HYPOXIA/`, and the 166 MB raw demo video). `HYPOXIA/scripts/build_hypoxia_dataset.py` rebuilds the HYPOXIA ones; the web-ready demo video is in `space-company-site/public/videos/milestone-2/`.
- Zips that duplicate folders already here (`HYPOXIA.zip`, `tablet-hardware.zip`, `astronaut-eva-hud-hardware.zip`)
- `node_modules/`, build output (`.next/`, `dist/`), local `.env` files (secrets) and `.DS_Store`

## Note
The repo's root `.gitignore` ignores new top-level folders, so to add new files in here use `git add -f "Isaiah's draft/<path>"`.
