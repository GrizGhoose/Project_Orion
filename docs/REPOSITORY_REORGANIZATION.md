# Repository reorganization

The reorganization groups whole projects by function. Detection algorithms, scenario timings, UI designs, datasets, protocols, and PCB contents are preserved. No projects are merged.

## Location changes

| Previous root location | Current location |
| --- | --- |
| `astronaut-eva-hud-ZX/` | [apps/astronaut-eva-hud-ZX/](../apps/astronaut-eva-hud-ZX/) |
| `tablet/` | [apps/tablet/](../apps/tablet/) |
| `astronaut-eva-hud-hardware/` | [apps/astronaut-eva-hud-hardware/](../apps/astronaut-eva-hud-hardware/) |
| `tablet-hardware/` | [apps/tablet-hardware/](../apps/tablet-hardware/) |
| `esp32-vitals/` | [firmware/esp32-vitals/](../firmware/esp32-vitals/) |
| `raspberry-pi-gateway/` | [services/raspberry-pi-gateway/](../services/raspberry-pi-gateway/) |
| `HERBv1_PCB/` | [hardware/HERBv1_PCB/](../hardware/HERBv1_PCB/) |
| `HYPOXIA/` | [research/HYPOXIA/](../research/HYPOXIA/) |
| `MAX30102_raw_reading-test/` | [research/MAX30102_raw_reading-test/](../research/MAX30102_raw_reading-test/) |

The shared [demo](../demo/), documentation, GitHub documentation, and existing tracked root dependency snapshot remain at root. The current HUD is named `astronaut-eva-hud-ZX`; no duplicate of it is created under the former HUD name.

## Preservation

Before moving files, the local migration created SHA-256 inventories, captured the existing index/status and uncommitted patch, and verified a copy of the HUD's nested Git metadata. Both the copied metadata and original metadata are retained under the ignored local `.local-preserved/reorganization-20261115/` folder. That nested repository had no commits or tracked files. Its source now belongs to the parent repository as regular files, not a submodule.

Modified and untracked tablet source is preserved. Existing local environment files, deployment metadata, virtual environments, dependencies, and build directories move with their applications and remain excluded from new staging. Credential values are not included in this document. Generated build/cache files may change during validation; source preservation is checked separately against the pre-move inventory.

## Dependencies updated

- Demo imports, build working directories, served build locations, dataset location, and test fixture paths now use `apps/`.
- The Python tablet locates the repository root at its new depth and defaults to `research/HYPOXIA`; `HYPOXIA_DIR` remains supported.
- The gateway defaults to `apps/astronaut-eva-hud-hardware/dist`; `HUD_DIST` remains supported.
- The research dataset builder retains repository-root external input directories and writes into its relocated data pack.
- Documentation links, setup commands, and the tablet workspace's external relative reference follow the new locations.
- Ignore rules expose the approved source categories while excluding credentials, backups, generated files, and oversized raw datasets.

HTTP routes, ports, Vite proxy targets, physiological rules, and manual-mode behavior are unchanged. The Node demo still imports the HUD detector directly; maintain these imports together with the HUD source.

## Teammate actions

- Update saved terminal directories, IDE settings, service working directories, and deployment project roots. Local deployment metadata is retained but remote settings are not changed automatically.
- Recreate a virtual environment if relocation leaves absolute interpreter paths stale. Existing Unix virtual environments cannot run directly on Windows.
- Update absolute `HUD_DIST` and `HYPOXIA_DIR` overrides where used. The supplied code defaults already use the new layout.
- Run the synchronized build before presenting after any standalone build, since both use the same output folders with different asset bases.
- The raw dataset builder still needs external downloads absent from this checkout. The hardware tablet's older WebSocket firmware reference also remains a separate integration concern.

## Validation results

| Check | Result |
| --- | --- |
| Demo session, reset access, real HTTP/SSE transport | 12 tests passed |
| Current HUD | 167 tests passed; lint and standalone build passed |
| Hardware HUD | 153 tests passed; lint and build passed |
| Current tablet backend | 32 tests passed |
| Hardware tablet backend | 32 tests passed |
| Raspberry Pi gateway | 25 tests passed |
| Firmware capture inspection tools | 4 Python tests passed |
| Raw-capture recorder | 3 Python tests passed |
| Both tablet frontends | TypeScript checks and standalone production builds passed |
| Synchronized production builds | Both passed; output folders rebuilt in synchronized mode last |
| Browser smoke test | Both interfaces loaded, displayed Critical, and returned to Normal following tablet response completion |
| Source import scan | No missing relative JavaScript/TypeScript imports |
| Preservation | All pre-move files accounted for at relocated or protected-backup paths; all non-generated differences limited to documented path/configuration/documentation changes |
| Staging safety | No local credentials, private keys, generated output, dependency additions, backup files, or submodule entries staged |

The automated suites total **428 passing tests**. Python checks used an isolated environment under the ignored preservation folder, with the existing requirements installed through an official pip zipapp; no system packages or project dependency manifests were changed. The tests emit Python 3.14 compatibility/deprecation warnings, and the gateway suite reports an unclosed SQLite connection warning after passing.

The full demo tests cover 15-second activation, natural Warning/Critical boundaries, GET/POST reset, late connections, reconnects, valid response completion, duplicate completion, stale-command rejection, and replay. Browser/server observations confirmed matching current-app telemetry and the completed response transition back to Normal. The demo remains in memory for the lifetime of its server process.

Native C++ firmware tests and an ESP32 board build could not run because C++/Arduino toolchains are unavailable. Actual sensor, MQTT-network, PCB electrical/manufacturing, and device-browser validation remain teammate hardware checks. Historical dataset-audit links reference external AppleDouble sidecars absent before reorganization; those documents are preserved rather than replacing their evidence with unrelated datasets.

Git's default rename threshold reports one heavily updated, pre-existing tablet API file as a deletion/addition pair; `git diff --cached --find-renames=20%` recognizes its relocation. The before/after inventory independently verifies that its latest source is retained. A whitespace check also flags one pre-existing trailing space in the unchanged Orbitron license; the license bytes were preserved.

No commit, push, deployment, remote change, or branch change is part of this work.
