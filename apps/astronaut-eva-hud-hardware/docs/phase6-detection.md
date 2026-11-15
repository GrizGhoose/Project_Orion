# Phase 6: baseline-based gated detection

All thresholds, durations, actions and simulated baselines are experimental demonstration policy. They are not medically validated, NASA-approved limits or flight procedures. This work implements the proposed rules; it does not establish their scientific validity. Existing datasets and processing metadata are preserved and do not feed the detector.

## Architecture and changed behaviour

[The raw generator](../src/simulation/telemetrySimulator.js) emits timestamped readings. [The source-owned simulation provider](../src/services/telemetry/simulationProvider.js) passes each frame and individual baselines through [the pure stateful detector](../src/features/health/detectionEngine.js). Authoritative snapshots contain classified alerts, assessments, reaction results and a serializable detector checkpoint. Zustand replaces snapshots; React presents them without running a second stateful detector. A local delivery watchdog inhibits physiological interpretation if snapshots stop for more than five wall-clock seconds.

The browser source coordinates same-origin peers on `eva-telemetry-v2`. Detector timers, regression history, baseline revisions and reaction checks survive source takeover. This remains a best-effort browser demonstration mechanism, not a flight communications protocol or a connection to the partner's independently developed tablet.

The old instantaneous HR 125/155 BPM and independent raw oxygen-reserve/pressure threshold alarms are removed. Estimated reserve alone cannot manufacture a supply fault. Legacy temperature data is preserved in the raw schema but has no detector or HUD role. Explicit simulated scrubber faults and loss of communications remain separate from hypoxia.

## Rule configuration

[detectionConfig.js](../src/features/health/detectionConfig.js) centralizes policy, demo baselines, field bounds and action text. [measurementQuality.js](../src/features/health/measurementQuality.js) centralizes freshness. Display scales remain separate.

| Category / signal      | Implemented rule                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hypoxia amber          | SpO₂ <93% **or** ≥3 percentage points below baseline, continuously 30 seconds                                                                                   |
| Hypoxia red            | SpO₂ <90% **or** ≥6 points below baseline, continuously 15 seconds                                                                                              |
| Immediate red          | Valid SpO₂ <85%; equality does not qualify                                                                                                                      |
| Falling speed          | Decline >1 pp/min amber; >2 pp/min red, without waiting for slower persistence                                                                                  |
| HR support             | ≥10 / ≥20 BPM above an explicitly defined workload expectation; context only                                                                                    |
| HR combined red        | A valid crossing from ≥50 to <50 BPM within five seconds, while low SpO₂ is already confirmed by a qualifying gate                                              |
| HRV support            | Explicit RMSSD ≥30% below individual RMSSD baseline supports amber only; no undefined red cutoff                                                                |
| Breathing support      | ≥4 breaths/min above individual baseline supports amber only                                                                                                    |
| Breathing combined red | **Simulation-only assumption:** confirmed low SpO₂ plus valid breathing <8/min for ≥5 seconds, or an explicit simulated `breathingPattern: 'irregular'` flag    |
| Suit safety            | An active, verified explicit oxygen-pressure, oxygen-flow or suit-pressure fault warns independently; an established declining SpO₂ regression escalates to red |
| Cognitive amber/red    | Correct response ≥1.25× / ≥2× individual reaction baseline; incorrect response red                                                                              |
| Cognitive timeout      | Ten seconds after stimulus with no accepted response: warning plus a buddy-escalation **intent event**, not a transmitted message                               |
| Cardiac safety         | Reserved category; no rhythm detector or arrhythmia inference from BPM                                                                                          |
| Data quality           | Invalid, missing, stale or disconnected readings warn; bad SpO₂ inhibits hypoxia confirmation                                                                   |

Neither supporting signals nor their combination opens the hypoxia gate by itself. HRV is not calculated from mean BPM. Breathing is simulated and is not ECG-derived. Physiological evidence strengthens an explanation but does not automatically turn an amber gate red, except for the explicitly defined combined rules above. The HR crossing, slow-breathing threshold/duration, trend parameters and recovery policy are additional engineering assumptions requiring review.

## Time, trend and recovery

Frame and measurement timestamps share one millisecond clock. Simulation uses logical mission milliseconds, independent of wall time. Advance processes each intervening second rather than jumping over persistence checks. Real sensor adapters must use a documented common clock, normally monotonic session time or normalized host timestamps; they must not mix device ticks with epoch time.

SpO₂ trend is ordinary least-squares regression over the last 60 seconds, requiring at least eight distinct valid samples spanning at least 20 seconds. Positive decline is expressed in percentage points/minute. Slopes are rounded to six decimals to stabilize strict numerical boundary comparisons; this is not a noise filter or sensor uncertainty model. Two readings cannot establish a trend. The 20-second collection delay is intentional, while <85% still triggers immediately. Normal simulated SpO₂ variation is kept below the decline-rate threshold.

Gaps greater than five seconds or invalid SpO₂ reset persistence and trend history. Duplicate per-signal sample timestamps do not accumulate duration. Future, older or conflicting same-time readings are invalid; globally older frames are ignored. Missing baselines do not disable absolute SpO₂ cutoffs. Baseline drop rules are unavailable when that astronaut's baseline is absent.

Active physiological critical severity cannot be downgraded by a warning. It clears after ten continuous seconds with neither the amber condition nor a qualifying decline trend. During this recovery hold the current number remains visible, with explicit hold text. Bad data suppresses the physiological classification and records a `suppressed` event rather than claiming medical recovery. Valid data restarts persistence; immediate rules remain available. Explicit suit faults clear when the next authoritative fault set marks them inactive or omits them. Once a suit fault has escalated red, that severity is retained until the fault clears. Cognitive results remain until acknowledged or a new check replaces them after cooldown. Scenario/reset controls intentionally restart detector history; baseline edits restart only the selected crew member's history.

Alerts use stable IDs by astronaut/category/condition. Events occur on raise, severity change, clearing or quality suppression, rather than once per sample. Concurrent categories remain separate; critical entries sort first. Multiple alerts occupy a bounded, scrollable upper strip and never expand into the central clear zone.

## Individual baselines and reaction workflow

EV1/EV2 demo baselines differ and carry `source: 'simulated-pre-eva'`. SpO₂, resting HR, breathing, optional HRV, reaction time and explicit current-work expected HR can be edited below the visor. Blank fields are `null`, not invented normal values. Resting HR is never used as a workload expectation. Exertion scenarios explicitly declare their expected HR. Input bounds are numerical plausibility constraints, not safe operating ranges.

The external Start reaction check control schedules a stimulus after one logical second. A small upper HUD ring appears for one logical second, away from the forward clear zone. J represents the correct chest button; K an incorrect response. The development keyboard adapter records elapsed `performance.now()` from cue presentation and forwards it to the authoritative source. The no-response deadline and 60-second cooldown follow logical simulation time. Pause freezes logical deadlines, and fast-forward can expire a check immediately. This deliberate test behaviour is not an operational timing implementation. A missing reaction baseline permits recording and wrong-response detection but disables relative timing classification. No actual chest hardware, cue synchronization guarantees or buddy communications are claimed.

## Scenarios and retained interface

Fourteen scenarios: normal, physical exertion, scrubber fault, low reserve alone, buddy decline, communications loss, gradual decline (1.2 pp/min), rapid decline (4.8 pp/min), startle with stable SpO₂, explicit oxygen-flow fault, oxygen-pressure fault with decline, failed reaction check, disconnection and invalid SpO₂. Controls support +1/+15/+30/+60 seconds while paused or running. The failed-reaction scenario supplies an explicitly simulated wrong response; manual checks also support timeout/keyboard input.

The original lunar photo, full-width/full-height oval, top-zero timer, 50 CSS-pixel side groups, contextual modes and external developer panel are retained. SpO₂ bars use gated severity. HR/breathing remain contextual readings without standalone hypoxia alarms. Invalid/stale physiological bar values are withheld rather than drawn as valid normal readings. Actions, values, category and brief trigger reasons remain visible across display modes. Developer evidence and history stay outside the visor. No dependencies, backend, tablet, TypeScript or ML were added.

## Verification

Final checks: **92 tests passed across seven files**, ESLint passed with zero warnings, production build passed, and Prettier formatting passed. Domain tests cover exact persistence boundaries, relative and absolute thresholds, strict slope cutoffs, insufficient samples, duplicates/gaps, recovery, combined conditions, supporting-only signals, disabled rhythm detection, explicit suit faults, sensor quality, reaction failures/timeouts, deduplication, simultaneous categories and astronaut isolation. Provider tests cover fast-forward and detector/baseline continuity through source failover; React workflows exercise external controls, cue/button forwarding and alerts across modes.

Headless Chrome browser checks passed at 1366×768, 1920×1080, 1024×768, 390×844 and 2560×1080. Checks verified full viewport dimensions, developer controls beginning below the viewport, timer at top zero, side groups at 50 CSS pixels, primary/alert containment, a fully visible single critical alert/action, no controls inside the visor, health context fit, disconnection warnings, exertion without false hypoxia, manual reaction cue/incorrect-key response and hidden developer controls in astronaut mode. No browser runtime errors were recorded. A desktop screenshot was inspected for readability and preserved central clearance. Small displays remain scaled miniatures, not a claim of physical HUD legibility.

The photograph's SHA256 remains `EE05F9E8F371A6E4E7737D0267DC144A482FF30DC6064E0FD6E6141DB9A459E4`. No dataset files were changed. The temporary browser-testing dependency was pruned; no project dependencies were added.

## Files changed

- Detection: [policy/baselines](../src/features/health/detectionConfig.js), [engine](../src/features/health/detectionEngine.js), [quality](../src/features/health/measurementQuality.js), [presentation helper](../src/features/alerts/alertLogic.js), [alert component](../src/features/alerts/AlertList.jsx).
- Source/state: [generator](../src/simulation/telemetrySimulator.js), [scenarios](../src/simulation/scenarios.js), [provider](../src/services/telemetry/simulationProvider.js), [snapshot store](../src/store/telemetryStore.js), [mission constants](../src/constants/config.js).
- HUD/controls: [helmet page](../src/features/helmet/pages/HelmetPage.jsx), [alert hook](../src/features/helmet/hooks/useHelmetAlerts.js), [reaction input](../src/features/helmet/hooks/useReactionInput.js), [external controls](../src/components/layout/SimulationControls.jsx), [baseline form](../src/components/layout/BaselineControls.jsx), [alert placement height](../src/constants/opticalGeometry.js), [cue styling](../src/styles/index.css).
- Tests: [detector](../src/features/health/detectionEngine.test.js), [fixtures](../src/test/detectionFixtures.js), [HUD workflows](../src/test/workflows.test.jsx), [provider](../src/services/telemetry/simulationProvider.test.js), [store](../src/store/telemetryStore.test.js), [presentation](../src/features/alerts/alertLogic.test.js).
- Documentation: [README](../README.md), this report, [telemetry contract](./telemetry-contract.md), [indicator semantics](./telemetry-indicators.md).

No commit or push was made. The existing repository still reports its application files as untracked; that pre-existing state was preserved.

## Remaining validation and integration work

Obtain actual sensor specifications and validate forehead SpO₂ accuracy, motion artifacts, confidence/perfusion flags, ECG/HRV availability and workload expectations. Establish a real pre-EVA baseline acquisition process. Review all thresholds and persistence/recovery/trend windows with appropriate domain experts, including noise, missingness and false-alarm performance. Confirm whether independent rhythm or irregular-breathing detection is available before enabling hardware rules. Agree a versioned local telemetry/alert authority contract with the tablet team, then implement the chosen local transport. Never silently substitute simulation after a hardware disconnect. No scientific dataset has been manufactured to validate these rules.
