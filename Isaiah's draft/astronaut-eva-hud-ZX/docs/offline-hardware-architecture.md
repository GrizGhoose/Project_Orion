# Offline sensor and gateway decision — recommendation only

No backend, Bluetooth driver, database, service worker or new runtime dependency is implemented. Simulation remains the only active telemetry source. Hardware selection is a prerequisite to implementation. Phase 3 is helmet-only: the companion tablet belongs to an independent repository. References below to that device describe an external consumer, not a local UI/route. See the [shared JSON contract](./telemetry-contract.md).

## Decision

For the **current single-computer Windows/Chrome demonstration**, try **Web Bluetooth first**, conditional on a chosen sensor exposing readable/documented BLE GATT SpO₂ and pulse/heart-rate characteristics in a supported browser. It adds no Python service and can share one connection's snapshots with the existing same-origin tabs. Confirm the device protocol and browser/OS combination before committing to this option.

For a **physically separate helmet display and monitoring tablet**, or an unsupported browser, recommend **one local Python process using Bleak + FastAPI + WebSocket**. This is the smallest gateway option that gives multiple devices the same source without requiring every display to pair with a sensor. BLE is only the short-range sensor-to-host link. The local Wi-Fi/Ethernet demonstration link is a separate choice; neither is evidence for a flight EVA-to-spacecraft communications design.

Do not implement both ingestion options initially. Choose using the actual device and display topology.

## Options compared

| Criterion              | A — direct Web Bluetooth                                                                                                                                                                                     | B — local Python BLE gateway                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Complexity             | Lowest for a single controlled browser host: a connect button, GATT decoder, notifications, status handling and reconnect UI                                                                                 | One process to start/manage, plus BLE decoder, WebSocket lifecycle and shared authoritative state                                                                                    |
| Compatibility          | Limited browser support. Chrome documents desktop Windows/macOS/ChromeOS and Android support; do not assume Safari, iPad Safari, Firefox, Linux or embedded webviews work. Verify the exact OS/browser build | Bleak supports desktop OS backends; receiving displays only need ordinary browser WebSocket support. Adapter/OS/device behaviour still needs testing                                 |
| Permissions/security   | Secure context required: loopback is generally trustworthy; arbitrary HTTP LAN origins are not. Device chooser requires a user gesture. GATT services must be requested/allowed                              | Host requires OS Bluetooth permissions/pairing as needed; browser needs only the local application connection. Restrict gateway access to the demonstration host/network             |
| Reliability            | Browser suspension, tab closure, permission state and radio disconnect can stop acquisition. Existing tab election does not transfer a BLE handle                                                            | Acquisition independent of browser tab lifetime. Still dependent on the host process, OS BLE stack, adapter and power. Use disconnect notifications and an explicit reconnect policy |
| Offline                | Works without internet once the frontend/assets are locally installed and served                                                                                                                             | Works without internet once Python wheels, frontend assets and reference files are installed locally                                                                                 |
| Two same-host tabs     | One acquisition tab; BroadcastChannel replicas. Source loss means unavailable readings until explicit successful reconnect, never synthetic continuation                                                     | Each tab connects to the same process; no tab owns the sensor                                                                                                                        |
| Separate tablet/device | BroadcastChannel does not cross devices; requires an additional transport/gateway                                                                                                                            | Both displays subscribe over local network WebSocket to the same source                                                                                                              |
| Existing frontend      | Replace the provider implementation, not components. Add measurement validity first                                                                                                                          | Use one WebSocket provider instead of browser simulation election in hardware mode; keep Zustand and both routes                                                                     |

Browser requirements and platform notes: [Chrome Web Bluetooth documentation](https://developer.chrome.com/docs/capabilities/bluetooth). API availability is limited and requires a secure context: [MDN Web Bluetooth](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API). Bleak's desktop backends and notification capabilities are documented in [Bleak](https://bleak.readthedocs.io/en/latest/). FastAPI supports local WebSocket endpoints and disconnect handling: [FastAPI WebSockets](https://fastapi.tiangolo.com/advanced/websockets/).

## Hardware information required before a driver

Obtain manufacturer/model, firmware version, host OS/browser, intended sensor site, number of simultaneous devices, sample/update rate, advertised services, characteristic UUIDs, payload format/endian/flags/scaling, notifications versus indications, quality/contact flags, invalid/sentinel values, timestamps and pairing/encryption requirements. Establish whether “heart rate” is ECG-derived HR or oximeter pulse rate. Do not turn pulse rate into ECG data by relabelling it.

Standard service candidates include [Heart Rate Service](https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/HRS_v1.0/out/en/index-en.html) and [Pulse Oximeter Service](https://www.bluetooth.com/specifications/specs/pulse-oximeter-service-1-0-1/). A Heart Rate Service does not supply SpO₂. A device advertised as a pulse oximeter may instead expose a proprietary protocol. The standard PLX protocol includes flags, status and encoded numbers; do not assume a two-byte payload. Inspect manufacturer documentation and actual characteristics before choosing a decoder. Use manufacturer validation information, not just a BLE service name, to assess measurement suitability.

## Minimal local backend, if Option B is selected

One Python process on the demonstration computer/gateway:

```text
SpO₂/HR sensor(s) -- BLE --> Bleak receiver
                                 |
                       decode + validate + timestamp
                                 |
                    current readings + reviewed rule state
                                 |
              FastAPI /telemetry WebSocket + local static frontend
                      /                         \
                 Helmet HUD                 Crew tablet
                                 |
                    optional local SQLite recorder
```

Use FastAPI to serve the built Vite files, local reference assets and one WebSocket endpoint from the same local host. Return the helmet SPA entry document for `/helmet`; the partner deploys the companion frontend independently. No Vite development server is required in normal demonstration operation. A loopback-only host suffices for one computer. To support a separate tablet, bind intentionally to the local network and configure host firewall, origin checks and trusted local TLS where needed. An HTTPS page must use an appropriate secure WebSocket (`wss`); a remote client cannot connect to the gateway by using its own `localhost`. Secure context does not require an internet or Earth-hosted service.

Keep a bounded ring buffer for current-session telemetry history, current per-astronaut readings and alert state in that process. Publish one sequenced snapshot on connection, then small timestamped updates/heartbeats. Clients keep a recent cache but do not each generate new hardware state. Do not allow slow clients or optional database writes to block sensor acquisition and alert evaluation. Reconnect with bounded backoff; mark stream loss before trying again.

Keep the active rule policy and its version explicit. In hardware mode, the gateway should publish authoritative reviewed alert events; clients must not independently invent different medical interpretations. Retain the existing JavaScript demonstration rules for simulation. If rules are later ported to Python, use shared fixtures and versioned configuration to verify parity; do not silently present the current constants as validated hardware policy. Safety processing runs locally and never waits for Earth. This single-host design is a demonstration architecture, not a redundant flight control system; a failed host is a known single point of failure.

### Minimal dependencies

- Now: **none**; existing React/Vite stack remains sufficient.
- Option A later: browser Web Bluetooth API; no BLE npm library required if a small documented decoder suffices.
- Option B later: Python, `bleak`, `fastapi`, and `uvicorn[standard]` (including its WebSocket support). Pin/test compatible versions when implementation starts; no Python packages are installed now.
- SQLite later: Python standard-library `sqlite3`; no ORM or database server needed.
- CSV audit later: standard-library `csv`, `json`, `hashlib` and `statistics` first. Add Pandas only if restored files warrant large joins, resampling or repeatable tabular analysis; do not add it to the live ingestion path for two vital signals.

## Shared telemetry contract and source separation

Keep `frame.astronauts`, astronaut IDs, existing `heartRate` and `spo2` fields and the provider lifecycle `start(onSnapshot, onConnection)`, `command(command)`, `stop()`. Extend the shared frame **before** attaching real hardware:

```js
// Proposed contract only; not current runtime data.
{
  source: 'hardware', // or explicit 'simulation' / 'replay'
  simulated: false,
  sessionId: 'local-session-id',
  sequence: 123,
  receivedAt: '2026-11-14T02:00:00Z',
  astronauts: [{
    id: 'EV1',
    spo2: null,
    heartRate: null,
    measurementMeta: {
      spo2: {
        status: 'disconnected', // valid / stale / invalid / unavailable / disconnected
        unit: '%',
        deviceId: 'paired-device-id',
        method: 'pulse-oximetry',
        measuredAt: null,
        receivedAt: null,
        quality: 'unknown',
        source: 'hardware'
      }
      // heartRate has equivalent metadata, with method 'pulse-rate' or 'ecg'.
    }
  }]
}
```

Device-to-astronaut mapping must be explicit. Per-field provenance is needed if physiological hardware and simulated suit data coexist in a lab demo: label suit values **SIMULATED**, physiological values **HARDWARE**, and the session **MIXED DEMO**. Missing real suit sensors must not acquire simulated “normal” values by default. Explicit simulation mode continues to generate all demo fields as it does now. Hardware mode never starts the simulator as an automatic fallback.

**Phase 5 status and remaining limits:** SpO2 now validates finite 0-100 values, explicit quality states and receipt age, with an amber data warning replacing physiological alerts for bad data. The HUD checks receipt age each second. Breathing can be unavailable without a synthetic value. Other readings still need complete per-field quality formatting; missing communication is still treated as lost. The application is not hardware-ready merely because its provider interface exists. Before hardware ingestion, supply source, quality and timestamps, verify device payloads, and define shared source-side event authority. No transport, sensor driver, backend or persistence was implemented in Phase 5.

## Failure behaviour to implement before hardware use

| Condition                          | Local processing                                                                                                                                                  | Helmet and tablet behaviour                                                                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No internet                        | Continue from installed local build, rules and reference files                                                                                                    | No cloud dependency or CDN/fonts/API calls. Initial dependency installation must be completed beforehand; an arbitrary remote URL is not offline storage           |
| BLE disconnect                     | Detect OS/GATT disconnect; invalidate affected measurements immediately; retry pairing/connection according to device policy                                      | `SENSOR DISCONNECTED` + affected astronaut/signal. Current numeric value becomes unavailable; optional last valid sample is timestamped. No simulated substitution |
| Missing notifications / stale data | Track age using monotonic receiver time, separately per field. Choose freshness budget from actual sample rate, delivery latency and reviewed safety requirements | `DATA STALE`, age and unavailable current value; break chart line. A transport heartbeat is not a new physiological measurement                                    |
| Invalid quality/contact/number     | Reject device sentinel values, nonfinite numbers and failed quality checks; do not evaluate them against physiological cutoffs                                    | `INVALID / CHECK SENSOR`; never interpret invalid as zero or as normal                                                                                             |
| Local backend down / network lost  | Local display detects missing stream/heartbeat, reconnects with bounded backoff. No new central measurements or authoritative alerts can be obtained              | `TELEMETRY UNAVAILABLE`; retain labelled history and last-known alert context. Never report current health normal based on a silent connection                     |
| Backend returns                    | Receive a new session/epoch and sequence, discard out-of-order frames, resubscribe, obtain fresh readings before clearing unavailable state                       | Show recovery only after valid fresh samples. Previously active critical context is not silently erased by missing-data transitions                                |
| Database unavailable/full          | Continue acquisition and current alerts in memory; surface recording failure independently                                                                        | `HISTORY RECORDING FAILED`; distinguish lost persistence from lost sensor connectivity                                                                             |

Browser clients need their own freshness deadline even when the gateway reports field status. After host reboot, monotonic times are not comparable across epochs; use session/epoch IDs and reception times. Rate/persistence/freshness parameters are not clinical truths and need explicit review. A browser's background timer behaviour must be tested on the intended device.

## SQLite decision

**Defer implementation now.** The current phase is a simulation and architecture investigation. Its 120-sample/40-event in-memory history is enough for a short demo and has no persistent mission-history guarantee. A database would not restore missing NASA data or make experimental alerts valid.

**Use SQLite once restart recovery, historical review or retained EVA missions become an accepted requirement.** A local embedded file fits this use; displays access it through the single process, not as a shared database file over the network. This matches SQLite's [documented embedded/local application uses](https://www.sqlite.org/whentouse.html). Do not make persistence a prerequisite for current alert evaluation.

Minimal proposed schema, not a migration:

| Table      | Columns and keys                                                                                                                                                                                                                                                                         | Purpose                                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `missions` | `id` TEXT PK, `started_at` TEXT UTC, `ended_at` TEXT nullable, `mode` TEXT, `rule_version` TEXT                                                                                                                                                                                          | EVA session history and provenance                                                                                                 |
| `readings` | `id` INTEGER PK, `mission_id` FK, `astronaut_id` TEXT, `device_id` TEXT nullable, `sequence` INTEGER, `signal` TEXT (`spo2`/`heartRate`), `value` REAL nullable, `unit` TEXT, `measured_at` TEXT nullable, `received_at` TEXT UTC, `status` TEXT, `source` TEXT, `quality` TEXT nullable | Each signal's measurements/invalidity without inventing a simultaneous pair; UNIQUE `(mission_id, astronaut_id, sequence, signal)` |
| `events`   | `id` TEXT PK, `mission_id` FK, `astronaut_id` TEXT nullable, `occurred_at` TEXT UTC, `kind` TEXT, `severity` TEXT nullable, `parameter` TEXT nullable, `reading_id` FK nullable, `rule_version` TEXT nullable, `message` TEXT, `details_json` TEXT nullable                              | Sensor/stream events and alert raised/escalated/resolved/acknowledged transitions                                                  |

Enable foreign keys, index `(mission_id, astronaut_id, received_at)` for review queries, write small transactions through one writer, and record source on every reading. Record acquisition timestamps separately from persistence timestamps. Add retention/export rules before long runs. Do not infer normal physiology from the absence of an alert row. Rule configuration, hardware identity and calibration references should be retained with mission metadata when available.

## Implementation order after this review

1. The supplied photograph is integrated in Phase 3. Recover the ordinary dataset package to complete the scientific review; evaluate the actual visor optics separately from photograph readability.
2. Select sensor, placement, OS/browser and single-host versus separate-tablet topology. Verify GATT payloads and device measurement quality with a bench test.
3. Extend shared telemetry and UI handling for nullable/invalid/stale/disconnected readings and explicit source labels; test without any BLE driver first.
4. Implement only the selected ingestion option. Preserve simulation behind explicit mode selection. Use reviewed alert criteria, not a claimed NASA calibration from filenames.
5. Verify actual sensor loss, source/host loss, recovery, offline cold start and two-display consistency. Add SQLite when retained mission history is in scope.
