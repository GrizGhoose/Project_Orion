# H.E.R — NASA Space Apps 2026

H.E.R is a prototype astronaut health monitoring and response system for lunar EVA. It combines a helmet HUD, a companion crew tablet, ESP32 optical measurements, a Raspberry Pi gateway, PCB engineering, and research-based demonstrations. The synchronized demonstration uses simulated physiology; the live hardware path is a separate integration. This is a concept prototype, not a medically validated or flight-ready system.

## Repository map

```text
Project_Orion/
├── apps/
│   ├── astronaut-eva-hud-ZX/          Current HUD: manual and synchronized modes
│   ├── tablet/                        Current tablet: Python, browser replay, sync
│   ├── astronaut-eva-hud-hardware/     Live Raspberry Pi HUD variant
│   └── tablet-hardware/               Separate live WebSocket/HTTP sensor variant
├── demo/                              Shared Node timeline, server, build, tests
├── firmware/esp32-vitals/              Live ESP32 measurement and MQTT firmware
├── services/raspberry-pi-gateway/       MQTT ingestion, SQLite, API, HUD hosting
├── hardware/HERBv1_PCB/                KiCad project, schematic, and PCB
├── research/
│   ├── HYPOXIA/                       Datasets, source documents, processing script
│   └── MAX30102_raw_reading-test/      Sensor bring-up and timed raw-capture tools
├── docs/                              Shared wiring, transport, measurement guides
├── .github/                           Repository-facing documentation
├── node_modules/                      Existing tracked dependency snapshot
├── .gitignore
└── README.md
```

Each application keeps its own dependencies, assets, tests, and documentation. Install dependencies inside that application's folder. The existing root dependency snapshot is retained for preservation; it is not a root npm workspace. Earlier implementations retained inside applications remain in place.

## Run the synchronized demonstration

Use a Node.js version supported by the application lockfiles (Node 24.15+ is documented for the current HUD tooling). Run from the repository root:

```powershell
npm.cmd --prefix apps/astronaut-eva-hud-ZX ci
npm.cmd --prefix apps/tablet/frontend ci
node demo/build.mjs
node demo/server.mjs
```

On macOS/Linux, use `npm` in place of `npm.cmd`. Open:

- HUD: <http://localhost:8080/hud/?sync=1>
- Tablet: <http://localhost:8080/tablet/?sync=1>

The first event-stream connection starts one shared timeline. Scenario 3 activates at 15 seconds; the existing physiology and detector reach Warning at 21.1 seconds and Critical at 23.1 seconds. The tablet's successful final **Finish** resolves the shared incident and clears both displays. Refreshes and late connections adopt the existing server session. Browser audio/fullscreen permissions still require a user gesture.

Reset locally with <http://localhost:8080/sync/reset>, or use POST:

```powershell
Invoke-RestMethod -Method Post http://localhost:8080/sync/reset
```

GET is restricted to direct loopback development requests and disabled in production. POST also supports LAN clients. For multiple devices, replace `localhost` with the host's LAN address and allow TCP 8080; keep the server awake. `PORT` overrides the server port. See the [complete demo guide](demo/README.md) for lifecycle, access rules, and verification.

## Run applications independently

### Current HUD

```powershell
npm.cmd --prefix apps/astronaut-eva-hud-ZX ci
npm.cmd --prefix apps/astronaut-eva-hud-ZX run dev
```

Open the Vite URL for manual mode. Append `?sync=1` while the demo server runs to use the shared timeline through the existing `/sync` proxy. See the [HUD guide](apps/astronaut-eva-hud-ZX/README.md).

### Current tablet

The original Python backend workflow requires Python 3.11+ and the frontend's Node/npm dependencies. On macOS/Linux or a compatible Bash environment:

```sh
./apps/tablet/run.sh
```

It builds the frontend and serves the tablet at <http://localhost:8000>. For Windows PowerShell, from the repository root:

```powershell
python -m venv apps/tablet/backend/.venv
apps/tablet/backend/.venv/Scripts/python.exe -m pip install -r apps/tablet/backend/requirements.txt
npm.cmd --prefix apps/tablet/frontend ci
npm.cmd --prefix apps/tablet/frontend run build
Set-Location apps/tablet/backend
.venv/Scripts/python.exe -m uvicorn app.server:app --host 0.0.0.0 --port 8000
```

For hot reload, run the frontend's `npm run dev` alongside the backend; `/api` and `/ws` proxy to port 8000. The dataset default is now [research/HYPOXIA](research/HYPOXIA/README.md); `HYPOXIA_DIR` still overrides it. The tablet also retains its independent browser-only replay and Vercel configuration. See the [tablet guide](apps/tablet/README.md).

The synchronized build sets different asset bases in the same output folders. Run `node demo/build.mjs` again before presenting after any standalone production build.

## Hardware, firmware, and physical engineering

- [ESP32 ↔ Raspberry Pi Wi-Fi/MQTT guide](docs/ESP32_RASPBERRY_PI_MQTT.md): wiring, broker setup, firmware transport, and two-way communication tests.
- [ESP32 firmware and startup baseline](firmware/esp32-vitals/README.md): heart rate, SpO₂, signal validity, baseline, and prototype alert decisions; one report per second with up to 90 results from the trailing 90 seconds.
- [Raspberry Pi gateway](services/raspberry-pi-gateway/README.md): persists readings/calibration sessions in SQLite, exposes the HTTP API, and serves the built live HUD on port 8200. `HUD_DIST` and `EVA_DB` overrides remain supported.
- [Hardware HUD variant](apps/astronaut-eva-hud-hardware/README.md): Pi API by default; `?demo=1` selects its retained simulator. Its development `/api` proxy uses port 8200.
- [Hardware tablet variant](apps/tablet-hardware/README.md): separate sensor WebSocket/HTTP integration on port 8100, with bundled research data. It is not automatically connected to the MQTT gateway. Its documentation retains earlier WebSocket firmware references whose implementation is absent from this checkout.
- [PCB project](hardware/HERBv1_PCB/README.md): KiCad project, schematic, board, and library requirements. Board compatibility with the development firmware is a separate engineering check.
- [Raw-sensor experiment](research/MAX30102_raw_reading-test/README.md) and [earlobe measurement protocol](docs/EARLOBE_MEASUREMENT_PROTOCOL.md): preserve the distinction between hardware bring-up, experimental captures, and live measurement firmware.

The [HYPOXIA data pack](research/HYPOXIA/README.md) retains NASA and analog data, provenance, and source documents. Its two oversized raw waveform files remain excluded. Rebuilding requires the original external raw inputs; reorganization does not require dataset regeneration.

## Team workflow

1. Pull and review shared changes before starting work; coordinate edits to the same application or firmware.
2. Work inside the relevant project, use its lockfile, and preserve the independent application variants. Keep detection rules, scenario behavior, and UI changes separate from organizational changes.
3. Keep device credentials in ignored `secrets.h` or environment files. Local virtual environments, deployment metadata, recordings, and build output stay local. Only sanitized environment examples belong in Git.
4. Run the relevant project's documented checks. For the synchronized demo, run `node --test demo/session.test.mjs demo/resetAccess.test.mjs demo/transport.test.mjs`, both HUD test/lint suites as applicable, and `node demo/build.mjs`.
5. Review the staged diff and use a pull request for team review. No commits, pushes, or deployments are performed by the reorganization itself.

Existing clones should update IDE/service working directories and deployment project roots to the new locations. Recreate virtual environments if their embedded paths are stale, and update absolute `HUD_DIST`/`HYPOXIA_DIR` settings. See [migration and preservation notes](docs/REPOSITORY_REORGANIZATION.md).
