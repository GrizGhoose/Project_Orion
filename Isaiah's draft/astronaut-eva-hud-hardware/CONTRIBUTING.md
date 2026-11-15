# Contributing

This repository contains one application: the helmet HUD. The spacecraft tablet is developed separately. Do not reintroduce its pages, navigation, charts or exclusive dependencies.

Use JavaScript ES modules, `.jsx` components and `.js` logic; no TypeScript. Run `npm install`, `npm run dev`, and verify changes with `npm run lint`, `npm test`, `npm run build` and `npm run format:check`.

Keep essential readings minimal, use context on request or when relevant, and preserve central vision. Critical alerts must name astronaut, hazard, severity and action in every mode. Combine text/icons with severity colour. Preserve keyboard focus, source labels and reduced-motion support. Use Tailwind utilities/tokens for ordinary styling and CSS for HUD optics/placement. Do not alter or darken the photograph globally to improve checks.

All projected content must use the central optical geometry model and optical-local placement zones. Do not add browser-edge anchors or breakpoint reflow for HUD content. Keep the scene mask full-width and 100dvh; scale the optical content isotropically inside it. Geometry changes must preserve rounded-aperture containment, disjoint zones, central clearance and actual rendered critical-action fit. Calibration boundaries must stay development-only. Drawing units and the illustrative angular fields are not a physical display resolution or measured helmet FOV; see [the geometry rationale](./docs/optical-geometry.md).

Keep rule limits outside presentation. Document units, provenance, measured/estimated/derived status and validity for new fields. Preserve NASA datasets and processing logic. The legacy temperature field stays for compatibility but must never affect the helmet. Demonstration limits are not flight or medical validation.

Preserve the documented JSON contract and agree schema changes with the independent companion developer. Components must not own transports. Clean up listeners, timers and channels. Check two same-origin helmet instances after coordination changes, including late join, pause, source closure and commands from a replica. BroadcastChannel does not connect separate ports or devices.

No backend, BLE driver, database, ML or cloud infrastructure belongs in this phase. Do not commit dependencies, builds, secrets or private data. Human-factors and domain review are required before use beyond this demonstration.

Keep all demo controls outside the oval visor, in the labelled panel below it. Keep the timer at the highest usable optical centre, breathing/HR on its left and SpO2/oxygen on its right. Reference axes are not medical safe ranges; do not add breathing alert rules without reviewed criteria. Astronaut presentation must hide controls, shortcuts and calibration, while retaining source provenance and alerts. Never put interactive navigation inside the visor.

SpO2 demo limits use strict comparisons (<93 warning, <80 critical) and require valid data. Test exactly 93 and 80, missing/nonfinite readings, stale/disconnected metadata and the actual below-scale number. Do not substitute a physiological alert for a data-quality fault.
