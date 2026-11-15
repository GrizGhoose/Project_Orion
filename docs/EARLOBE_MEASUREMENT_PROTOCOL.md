# Earlobe measurement and personal-reference design

Status: proposed experimental protocol, not a firmware implementation or measurement validation. The user currently has only the MAX30102 and no reference oximeter. No new physiological data has been collected for this document.

## What this experiment can establish

Separate three objectives:

1. Optical coupling: whether a particular mounting and LED setting yield repeatable raw waveforms.
2. Pulse rate: whether recognizable repeating pulses can be measured consistently, with a rough independent check by counting the pulse manually over 60 seconds.
3. Oxygen saturation: requires a validated relationship between the pulsatile red/IR ratio and reference oxygen saturation. Resting data from a presumed healthy person cannot supply that relationship or establish detection accuracy at low saturation.

Do not label a recording “healthy” merely because its subject feels well, or adjust the conversion until it prints 98%. Label the collection condition “resting, no oxygen reference.” A personal resting baseline is not a population normal range or a clinical threshold.

The MAX30102 is a reflective optical sensor: its LEDs and photodetector are on the same side of the tissue. Use the optical face against the earlobe; a backing support holds the position, rather than acting as an opposite-side detector. See the [MAX30102 product description](https://www.analog.com/en/products/max30102.html).

## 1. Establish reproducible contact before estimating a baseline

Use a support that keeps the optical window flat against the same part of the earlobe without squeezing it. Support the cable separately. Reduce variable light entering around the sensor while leaving the optical window unobstructed. Record the mounting arrangement so it can be repeated.

These are proposed adaptations of general reflective-PPG integration principles, not a manufacturer-validated MAX30102 earlobe fixture. Optical coupling and stray light affect waveform quality; the [manufacturer's ear-wearable integration guide](https://www.analog.com/en/resources/technical-articles/guidelines-for-the-optomechanical-integration-of-heartrate-monitors-in-wearable-earbud-devices.html) explains these mechanisms for other optical modules.

Begin at LED code 31, 25 FIFO pairs/s, 411 microsecond pulse width, ADC range 4096 nA. Keep all settings fixed throughout a recording. Changing LED drive, mounting, sensor, or body site starts a different session, not an extension of the old baseline. Higher DC counts are not the optimization target; repeatable pulse structure without clipping or motion artifacts is.

## 2. Immediate pilot using the existing firmware

The existing `w` command captures only four seconds (100 pairs). It works even if the algorithm rejects the window.

1. Capture an uncovered sensor window as an ambient/no-contact comparison. It is not a physiological reference or a complete electronics-noise measurement.
2. Place the board on a nonconductive support and rest a fingertip gently over its window. Keep the hand supported and stationary for 10–15 seconds; collect three complete `w` captures, at least five seconds apart.
3. Repeat with supported earlobe placement and collect three complete captures at the same LED setting.
4. Keep the BEGIN/END markers, every sample 0–99, settings, and surrounding diagnostics. Use `firmware/esp32-vitals/tools/inspect_ppg.py` to plot the captures.
5. Inspect for recurring pulses, abrupt steps, drift, clipping, and plausible agreement between channels. A large correlation alone does not distinguish pulse from shared motion.

Stop baseline development if no consistent pulse is visible in either placement. Investigate mounting, LED operation, power, and the breakout before selecting a mathematical “normal” range. If a stable signal is weak, compare LED code 47 in a separate session; reject clipping and do not select a setting because its SpO2 output looks normal.

## 3. Proposed continuous raw recording mode

This is a software addition still to implement. The present 90-second log contains derived results, not 90 seconds of raw optical samples. Do not concatenate separated `w` windows and pretend their gaps are continuous data, or feed four-second captures into a proposed ten-second filter window.

The new mode should record 90 seconds of raw red/IR pairs (nominally 2,250 pairs at 25 Hz) to the Mac, retaining rejected and motion-contaminated data. It should not discard samples based on the current 10,000-count brightness heuristic.

Per sample, save:

```text
session_id,boot_id,sample_index,device_read_uptime_ms,red_raw,ir_raw,
red_led_code,ir_led_code,adc_range_na,pulse_width_us,fifo_rate_hz,gap_marker
```

Host receive time is optional metadata, not the sample clock. For FIFO batches, preserve ordering and distinguish nominal 40 ms sample spacing from actual MCU read timestamps. Explicitly mark gaps, resets, dropped logger records and configuration changes. The logger must not block acquisition; count dropped log records rather than hiding them. Do not commit raw personal recordings to the public repository by default.

A session manifest should record a pseudonymous participant ID, fingertip/left-earlobe/right-earlobe location, mounting description, LED setting, ambient-light condition, firmware commit, trial number, and any movement or removal timestamps. Do not claim reference SpO2 when none exists.

## 4. Collection schedule once continuous capture exists

The durations below are an engineering experiment design, not a clinical calibration protocol.

| Trial | Recording | Purpose |
| --- | --- | --- |
| A | 30 seconds uncovered, stationary | Identify the no-contact/ambient pattern |
| B | 90 seconds stationary fingertip | Determine whether a pulse is detectable at a simpler comparison site |
| C1 | Rest quietly for five minutes, then 90 seconds stationary supported earlobe | First personal resting reference |
| C2 | Remove and reapply the earlobe mount; settle 15 seconds; record 90 seconds | Test whether the result survives remounting |
| C3 | Repeat removal/reapplication and record another 90 seconds | Held-out validation trial; do not tune parameters on it |
| D | A short separate recording with ordinary small head movements, then removal | Test artifact/no-contact rejection; not physiological high/low labels |

Where feasible, count the pulse independently for 60 seconds during a stationary trial and record the counting interval. This is a coarse pulse-rate sanity check, not an SpO2 reference or proof of beat-to-beat accuracy. Avoid sharing the sensor between people without an appropriate hygienic interface.

Do not induce low oxygen, hold the breath, or restrict breathing to create test cases. Use synthetic or appropriately sourced recorded data to exercise low-oxygen alert logic. Synthetic data can test code behavior but cannot validate the earlobe measurement.

## 5. Proposed offline processing

Keep all original samples. Implement processing offline before changing the live firmware.

For each uninterrupted ten-second window, advanced once per second:

1. Check acquisition continuity, clipping, abrupt level changes, and mounting/settings identity.
2. Preserve each channel's slow/DC component. Analyze the pulsating component separately; do not calculate oxygen saturation from a DC-removed signal alone.
3. Trial the same band-pass processing on red and IR. A candidate experimental passband is 0.5–4 Hz (30–240 cycles/minute), not a guarantee of valid heart-rate detection. Record filter coefficients, initialization/warm-up and phase behavior. Reset filter state after gaps or reattachment. Match causal behavior before deploying a filter tested offline.
4. Estimate pulse intervals from IR peaks and check pulse periodicity with an independent method such as autocorrelation. Investigate disagreements, harmonics, irregular intervals and channel mismatch rather than forcing an expected BPM.
5. For accepted cycles, compute BPM from the median interval. Compute red/IR AC amplitudes consistently and retain the associated DC levels. Record the definition of AC (e.g. per-beat baseline-to-peak) and DC; changing these definitions changes the SpO2 conversion.
6. Save the candidate ratio R = (red_AC/red_DC)/(IR_AC/IR_DC), its dispersion, and rejection reasons. An R change without calibration is an optical-ratio change, not established oxygen deterioration.

Numerical quality gates should be assessed using pulse-bearing, no-contact and motion recordings. Do not select windows because their calculated SpO2 happens to lie in an expected range. Do not treat a filtered sinusoid as proof of a real pulse: noise can become rhythmic after filtering.

The manufacturer describes system-dependent calibration of the ratio-to-SpO2 relationship in its [SpO2 measurement guide](https://www.analog.com/en/resources/technical-articles/guidelines-for-spo2-measurement--maxim-integrated.html). A single resting oxygen level cannot identify that conversion over a wider range. Even a future finger-oximeter comparison at rest would assess agreement only near the observed values, not validate low-saturation performance.

## 6. Build two separate references

Build each reference from accepted, stationary C1/C2 windows, using non-overlapping ten-second blocks for summary statistics. Keep C3 entirely separate. Do not count overlapping one-second updates as independent evidence.

| Reference | Saved values | Intended use |
| --- | --- | --- |
| Optical/setup reference | Settings and site; median and spread of DC, AC/DC, pulse quality, channel agreement and candidate R | Detect changed coupling or unstable measurement; request reacquisition |
| Personal resting pulse reference | Median BPM, median absolute deviation (MAD), usable fraction, trial count and manual-count comparison if available | Describe pulse rate as above/below/within this person's resting reference |

Example candidate pulse-change rule for offline evaluation only:

```text
B = median resting BPM
S = 1.4826 * MAD(resting BPM)
band = max(10 BPM, 3*S)

if acquisition or pulse quality fails:
    show measurement unavailable; interrupt any change timer
elif BPM > B + band for 10 seconds of usable updates:
    show above personal resting reference
elif BPM < B - band for 10 seconds of usable updates:
    show below personal resting reference
else:
    show within reference, or change pending
```

The 10 BPM floor, multiplier and hold duration are proposed demo parameters requiring evaluation, not medical high/low pulse thresholds. A rate above a resting reference may reflect ordinary activity. Freeze the reference during monitoring; do not continuously relearn a change as normal. A moved/reapplied sensor requires a coupling check before reusing a reference. A new person/site/settings combination requires a new reference.

Do not map `red_raw < baseline_red` to low oxygen or `IR_raw > baseline_IR` to high heart rate. Likewise, do not make low DC an illness alert. DC changes can indicate an optical-path change.

## 7. Display and validation limits

For this stage, the intended experimental output is:

```text
Acquisition: OK / interrupted
Pulse quality: usable / unavailable, with reason
Pulse rate: BPM only when usable
Resting comparison: above / below / within reference / insufficient baseline
Optical ratio R: experimental diagnostic only
SpO2: uncalibrated — no oxygen-health classification
```

This proposed display is not yet implemented; current firmware still emits its existing experimental SpO2 estimates and prototype oxygen alerts. Do not use those existing outputs as reference labels for this experiment.

On C3, report the fraction of usable data, pulse-rate repeatability, coarse agreement with manual counting, and false pulse outputs during no-contact/motion trials. A proposed first engineering target is at least 80% usable stationary time and pulse-rate differences within 5 BPM of the independent count in repeated trials; neither criterion validates SpO2 or clinical accuracy. If a threshold or filter changes after looking at C3, collect a new held-out trial.

Without an oxygen reference, the justified milestone is reproducible pulse detection and personal pulse trending. To evaluate oxygen saturation later, use an appropriate reference device and a properly designed validation process; consumer/wellness oximeters also have accuracy limitations, as explained in [FDA pulse-oximeter guidance](https://www.fda.gov/consumers/consumer-updates/pulse-oximeter-basics).
