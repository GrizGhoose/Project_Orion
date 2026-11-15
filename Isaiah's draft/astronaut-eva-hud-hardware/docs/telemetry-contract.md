# Shared JSON telemetry contract

This is the current offline simulation contract, not an implemented network API. The spacecraft tablet is developed separately. No sensor driver, backend or silent hardware-to-simulation fallback exists.

## Authoritative pipeline

[Raw generator](../src/simulation/telemetrySimulator.js) → [stateful detector](../src/features/health/detectionEngine.js) → [simulation provider](../src/services/telemetry/simulationProvider.js) → [Zustand snapshots](../src/store/telemetryStore.js) → helmet presentation. The raw generator alone does not calculate alerts. The source evaluates once; replicas receive classifications and detector checkpoints. See [policy and recovery](./phase6-detection.md).

## Frame

| Field               | Type / unit              | Meaning                                                           |
| ------------------- | ------------------------ | ----------------------------------------------------------------- |
| scenario / tick     | string / integer seconds | Scenario identifier and time since scenario start                 |
| timestampMs         | finite number, ms        | Common detector clock; logical mission milliseconds in simulation |
| elapsed / remaining | seconds                  | Mission elapsed / estimated remaining                             |
| simulated           | boolean                  | Always true from the current provider                             |
| detectionVersion    | integer                  | Detector schema version, currently 1 on assessed frames           |
| astronauts          | array                    | EV1 and EV2 telemetry records                                     |
| baselines           | object by astronaut ID   | Individual pre-EVA references and source/revision                 |
| alerts              | array                    | Authoritative active alerts, critical first                       |
| assessments         | object by ID             | Derived changes, trend, support and data quality                  |
| reactionChecks      | object by ID             | Null or simulated reaction workflow state                         |
| detectionEvents     | array                    | Transitions emitted by this detector step                         |

Each astronaut has `id`, `name`, `role`, `sampleTimeMs`, `heartRate` (BPM), `breathingRate` (breaths/min), `spo2` (%), `oxygen` (estimated reserve %), `pressure` (kPa), `co2` (mmHg), `communication` (boolean), `suitFaults` (array), `source` and `breathingSource`. All current readings are simulated. Legacy `temperature` is retained but unused by the HUD and detector. Optional `hrvRmssdMs` is explicit RMSSD milliseconds or null, never derived from mean BPM. Optional `expectedHeartRate` is the explicitly declared current-work expectation; an absent value falls back only to an explicitly configured workload expectation, never resting HR. Optional `breathingPattern: 'irregular'` participates in a simulation-only combined rule, not actual ECG analysis.

### Quality and timestamps

Required physiology uses null/missing for unavailable and an optional quality object per field:

```json
{
  "id": "EV1",
  "sampleTimeMs": 10000,
  "spo2": 92.5,
  "quality": { "spo2": { "status": "valid", "receivedAt": 10000 } }
}
```

Status accepts valid, invalid, stale, unavailable or disconnected. A status string is also accepted. Per-field `receivedAt` overrides `sampleTimeMs`. Every measurement requires a finite timestamp on the same clock as `frame.timestampMs`; missing/future timestamps are invalid, and age greater than 5000 ms is stale. SpO2 outside 0–100 and nonfinite/negative physiology are invalid. A hardware adapter must add sensor-specific validity/confidence checks; these numerical checks do not establish accuracy. Source delivery is separately watched with wall time in the HUD. Paused simulation source snapshots maintain the delivery heartbeat while logical measurement time stays frozen.

### Baselines, assessments and alerts

Baseline records contain `source`, `revision`, nullable `spo2`, `heartRate`, `breathingRate`, `hrvRmssdMs`, `reactionTimeMs` and `expectedHeartRate`. The current source is `simulated-pre-eva`. Missing references remain null. A future measured baseline must have its real provenance and acquisition process, not inherit simulated defaults.

Assessments contain `spo2Quality`, `baselineSource`, `spo2Delta` (current minus baseline, percentage points), `heartRateDelta`, `breathingDelta`, `trend` (null or declinePerMinute, samples, spanMs, derived-regression source), `support` entries, cardiac availability, `amberDurationMs` and `redDurationMs`. Support levels: unavailable, none, warning-support, critical-support. They do not independently create hypoxia alerts. Optional missing HRV is unavailable context rather than a fabricated measurement.

Alerts contain stable `id`, `astronautId`, `parameter`, `category`, `severity` (warning/critical), `source`, `label`, `reason`, `action` and optional `value`/`unit`/`supportingEvidence`. Categories are hypoxia, suit, cognitive, cardiac (reserved/disabled), data-quality and operational (communications). These classifications are experimental, not diagnoses. Suit messages require `code`, `active` and `verified`; simulated faults explicitly carry `source: 'simulated'`. Missing fault entries in an authoritative frame mean cleared; partial hardware updates must be merged by the adapter before detection.

Reaction state contains `id`, `startedAt`, `stimulusAt`, `deadline`, `status` (waiting/answered/timeout), `source: 'simulated-keyboard'`, `baselineMs`, `responseTimeMs` and optional correct, ratio, severity, reason, acknowledged. Reaction keyboard timing is a development aid, not a synchronized physical timing guarantee.

## Snapshot and channel

Snapshots contain `frame`, `history`, `events`, `paused` and `detectorState`. The checkpoint is serializable with per-crew onset/recovery times, regression samples, last measurements, suit severity and reaction state. It preserves continuity when a browser source takes over. The store presents frame/history/events/paused; the provider owns the checkpoint.

History is bounded to 120 samples with `tick` (mission seconds), `timestampMs`, `EV1Hr`/`EV2Hr`, `EV1Spo2`/`EV2Spo2`, `EV1Co2`/`EV2Co2` and `EV1Breathing`/`EV2Breathing`. Same-timestamp commands replace a sample. Events retain the newest 40 entries: id, time (mission seconds), kind, category/astronautId when applicable, text, severity and source. Kinds include raised, severity-change, cleared, suppressed, reaction-result, buddy-escalation-intent, scenario and configuration. Buddy intent is explicitly NOT TRANSMITTED.

BroadcastChannel uses `eva-telemetry-v2`; v1 peers are intentionally incompatible. Messages carry `type: 'snapshot'`, sender and snapshot. Discovery, heartbeat, welcome and forwarded commands are internal browser coordination. Commands include scenario/scenario, pause, reset, advance/seconds (1–600), baselines/astronautId/values, reaction-start/astronautId, reaction-response/astronautId/reactionId/key/responseMs and reaction-ack/astronautId. Commands and snapshots are demonstration-local, not an authenticated external API.

## Future local hardware and partner boundary

A replacement provider keeps `start(onSnapshot, onConnection)`, `command(command)`, `stop()`. Feed normalized timestamped hardware readings and real baselines through one authoritative detector; do not reset state on every packet. Sources must be explicit per measurement if simulation and hardware coexist. Unsupported signals are unavailable. Do not substitute simulated readings after disconnect.

BroadcastChannel requires the same origin/storage partition and cannot connect independent ports or devices. Before adding the proposed local gateway/WebSocket, agree mission/session ID, sequence/clock semantics, per-field provenance, validity, baseline revisions, rule version and authoritative alert ownership with the partner team. A gateway can own the same detection policy or provide a reviewed equivalent; do not independently compute conflicting alert states in both apps. [Offline hardware recommendations](./offline-hardware-architecture.md) remain recommendations, not installed services.
