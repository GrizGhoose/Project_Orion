# Upper-arc telemetry indicators

These are simulation visualisations, not validated medical instruments. [Indicator scales](../src/constants/telemetryIndicators.js) configure units, precision and axes centrally. No chart library is required.

| Signal         | Display axis     | Rendering       | Interpretation                                                                    |
| -------------- | ---------------- | --------------- | --------------------------------------------------------------------------------- |
| Breathing rate | 6–40 breaths/min | Position marker | Illustrative respiratory-rate reference axis; **not** a medically normal interval |
| Heart rate     | 40–200 BPM       | Position marker | Illustrative exertion demonstration axis; **not** a medically safe interval       |
| SpO₂           | 80–100%          | Position marker | Truncated saturation axis to show change; **not** a safety score or reserve gauge |
| Oxygen reserve | 0–100%           | Filled bar      | Estimated fraction of simulated suit reserve remaining                            |

Marker position is `(value - minimum) / (maximum - minimum)`, clamped to the axis. Only reserve uses filled length. End labels and actual numbers remain visible. Out-of-range numbers are never replaced by endpoint values: the marker stops at the endpoint with BELOW DISPLAY SCALE or ABOVE DISPLAY SCALE text. Unavailable/nonfinite values have no marker or fill, show an em dash and UNAVAILABLE, and do not become zero or nominal measurements. Accessible meter text includes the actual reading, source, severity and axis limitation.

The [stateful demonstration policy](../src/features/health/detectionConfig.js) determines SpO2 severity independently of axis position. HR and breathing are supporting context only and never open the hypoxia gate. Oxygen reserve does not imply an explicit supply fault. Cyan indicates presentation status, not medical clearance. Amber/red are supplemented by words, icons and the actionable alert strip. Display endpoints are not medical thresholds.

[The simulator](../src/simulation/telemetrySimulator.js) emits deterministic `breathingRate` values in breaths/min for both crew members. It adds no random timer or separate React-side signal. All bars and numbers consume the same provider snapshot. Breathing is explicitly labelled SIMULATED with its group. This is an additive optional field in [the shared contract](./telemetry-contract.md); a future sensor provider can supply it if supported, or omit it/send null. The planned SpO₂/HR sensor is not assumed to measure breathing. No Bluetooth, backend, or automatic simulation fallback is implemented.

[Visor geometry](./optical-geometry.md) anchors a raised optical aperture inside the wider oval. A configurable 0.4–0.8-degree upper inset and a small symmetric side drop form a stepped upper arc. Text stays horizontal. The countdown is the largest reading, while bars remain thin and locally contrasted. The lunar photograph is unmodified and the developer controls remain below the oval. CSS geometry and browser checks do not validate real optical see-through contrast, eye-box alignment or physical viewing angles.

DISPLAY SCALE identifies the visual axis. SpO2 uses the [Phase 6 baseline, persistence and trend rules](./phase6-detection.md). A valid below-scale reading retains its actual number. Invalid/stale/unavailable/disconnected physiology has no active marker. The upper display and timer are at top: 0; left and right groups remain at exactly 50 CSS pixels. The scene fills the first viewport, and developer controls begin below it.
