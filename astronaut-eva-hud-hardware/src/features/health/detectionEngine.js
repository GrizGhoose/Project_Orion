import { DETECTION_RULES } from './detectionConfig';
import { DATA_QUALITY, measurementQuality } from './measurementQuality';

const finite = Number.isFinite;
const rank = (severity) => (severity === 'critical' ? 2 : severity === 'warning' ? 1 : 0);
export const sortAlerts = (alerts) =>
  [...alerts].sort((a, b) => rank(b.severity) - rank(a.severity) || a.id.localeCompare(b.id));

/** Least-squares slope across timestamped samples; never a two-reading derivative. */
export function estimateSpo2Trend(samples, now, rules = DETECTION_RULES) {
  const window = samples.filter((s) => s.time >= now - rules.trendWindowMs && s.time <= now);
  if (window.length < rules.trendMinSamples) return null;
  const span = window.at(-1).time - window[0].time;
  if (span < rules.trendMinSpanMs) return null;
  const xs = window.map((s) => (s.time - window[0].time) / 60000);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = window.reduce((a, b) => a + b.value, 0) / window.length;
  const denominator = xs.reduce((sum, x) => sum + (x - mx) ** 2, 0);
  if (!denominator) return null;
  return {
    declinePerMinute: Number(
      (-xs.reduce((sum, x, i) => sum + (x - mx) * (window[i].value - my), 0) / denominator).toFixed(
        6,
      ),
    ),
    samples: window.length,
    spanMs: span,
    source: 'derived-regression',
  };
}

const emptyCrew = () => ({
  samples: [],
  amberSince: null,
  redSince: null,
  healthySince: null,
  slowSince: null,
  lastSampleMs: null,
  lastSpo2: null,
  lastHeartRate: null,
  lastHeartTime: null,
  bradyCombined: false,
  activeHypoxia: null,
  activeSuit: {},
  reaction: null,
});

export function qualityAlert(astronautId, parameter, quality, source) {
  return {
    id: `${astronautId}-${parameter}-quality`,
    astronautId,
    parameter,
    category: 'data-quality',
    severity: 'warning',
    source,
    label: `${parameter === 'spo2' ? 'SpO₂' : parameter} DATA ${quality.toUpperCase()}`,
    action: DATA_QUALITY.action,
    reason: `Measurement ${quality}; physiological interpretation inhibited.`,
  };
}

function supportingEvidence(a, b, now, rules) {
  const valid = (key) => measurementQuality(a, key, { now }) === 'valid';
  const expected = finite(a.expectedHeartRate) ? a.expectedHeartRate : b.expectedHeartRate;
  const hrDelta = valid('heartRate') && finite(expected) ? a.heartRate - expected : null;
  const brDelta =
    valid('breathingRate') && finite(b.breathingRate) ? a.breathingRate - b.breathingRate : null;
  const hrvDrop =
    valid('hrvRmssdMs') && finite(b.hrvRmssdMs) && b.hrvRmssdMs > 0
      ? 1 - a.hrvRmssdMs / b.hrvRmssdMs
      : null;
  return [
    {
      signal: 'heartRate',
      available: hrDelta !== null,
      delta: hrDelta,
      reference: finite(expected) ? expected : null,
      level:
        hrDelta === null
          ? 'unavailable'
          : hrDelta >= rules.hrCriticalAboveExpected
            ? 'critical-support'
            : hrDelta >= rules.hrWarningAboveExpected
              ? 'warning-support'
              : 'none',
    },
    {
      signal: 'breathingRate',
      available: brDelta !== null,
      delta: brDelta,
      level:
        brDelta === null
          ? 'unavailable'
          : brDelta >= rules.breathingWarningAboveBaseline
            ? 'warning-support'
            : 'none',
    },
    {
      signal: 'hrvRmssdMs',
      available: hrvDrop !== null,
      dropFraction: hrvDrop,
      level:
        hrvDrop === null
          ? 'unavailable'
          : hrvDrop >= rules.hrvWarningDropFraction
            ? 'warning-support'
            : 'none',
    },
  ];
}

function reactionStep(c, a, b, time, commands, rules, source, events) {
  for (const command of commands.filter((cmd) => cmd.astronautId === a.id)) {
    const r = c.reaction;
    if (
      command.type === 'reaction-start' &&
      (!r || time - r.startedAt >= rules.reactionCooldownMs)
    ) {
      c.reaction = {
        id: `${a.id}-reaction-${time}`,
        startedAt: time,
        stimulusAt: time + rules.reactionDelayMs,
        deadline: time + rules.reactionDelayMs + rules.reactionTimeoutMs,
        status: 'waiting',
        source: 'simulated-keyboard',
        baselineMs: finite(b.reactionTimeMs) && b.reactionTimeMs > 0 ? b.reactionTimeMs : null,
        responseTimeMs: null,
      };
    }
    if (command.type === 'reaction-ack' && r && r.status !== 'waiting') r.acknowledged = true;
    if (
      command.type === 'reaction-response' &&
      r?.status === 'waiting' &&
      command.reactionId === r.id &&
      time >= r.stimulusAt &&
      time < r.deadline
    ) {
      const duration = finite(command.responseMs) ? command.responseMs : time - r.stimulusAt;
      if (duration < 0) continue;
      if (duration >= rules.reactionTimeoutMs) {
        r.deadline = time;
        continue;
      }
      r.status = 'answered';
      r.responseTimeMs = duration;
      r.correct = command.key === 'J';
      const ratio = r.baselineMs ? duration / r.baselineMs : null;
      r.ratio = ratio;
      r.severity =
        !r.correct || ratio >= rules.reactionCriticalRatio
          ? 'critical'
          : ratio >= rules.reactionWarningRatio
            ? 'warning'
            : null;
      r.reason = !r.correct
        ? 'Incorrect chest-button response'
        : ratio === null
          ? 'Recorded; pre-EVA reaction baseline unavailable'
          : `Reaction ${Math.round(duration)} ms (${ratio.toFixed(2)}× baseline)`;
      events.push({
        id: `${r.id}-answered`,
        kind: 'reaction-result',
        category: 'cognitive',
        astronautId: a.id,
        time: time / 1000,
        severity: r.severity || 'normal',
        text: r.reason,
        source: r.source,
      });
    }
  }
  const r = c.reaction;
  if (r?.status === 'waiting' && time >= r.deadline) {
    r.status = 'timeout';
    r.severity = 'warning';
    r.reason = `No reaction response within ${rules.reactionTimeoutMs / 1000} s`;
    events.push({
      id: `${r.id}-buddy-intent`,
      kind: 'buddy-escalation-intent',
      category: 'cognitive',
      astronautId: a.id,
      time: time / 1000,
      severity: 'warning',
      source,
      text: `${a.id}: buddy escalation requested (simulation; NOT TRANSMITTED).`,
    });
  }
  return r?.severity && !r.acknowledged
    ? {
        id: `${a.id}-reaction`,
        astronautId: a.id,
        parameter: 'reaction',
        category: 'cognitive',
        severity: r.severity,
        source: r.source,
        label: 'REACTION CHECK',
        reason: r.reason,
        action: rules.reactionAction,
        ...(finite(r.responseTimeMs) ? { value: Math.round(r.responseTimeMs), unit: 'ms' } : {}),
      }
    : null;
}

/**
 * Pure serializable detector step. Frame/sample timestamps share one millisecond clock.
 * Checkpoints include independent crew timers and samples for cross-tab source takeover.
 */
export function advanceDetection(
  previous,
  frame,
  baselines = {},
  commands = [],
  rules = DETECTION_RULES,
) {
  const time = frame.timestampMs;
  if (!finite(time)) throw new Error('Detection requires a finite timestampMs.');
  if (previous && time < previous.time)
    return {
      state: previous,
      alerts: previous.alerts,
      assessments: previous.assessments,
      events: [],
    };
  const state = structuredClone(previous || { crew: {}, time: null, alerts: [], assessments: {} });
  const alerts = [],
    events = [],
    assessments = {};
  const source = frame.simulated ? 'simulated' : 'telemetry';
  for (const a of frame.astronauts) {
    const b = baselines[a.id] || {};
    const c = (state.crew[a.id] ||= emptyCrew());
    const sampleTime = a.quality?.spo2?.receivedAt ?? a.sampleTimeMs;
    let quality = measurementQuality(a, 'spo2', { now: time });
    if (quality === 'valid' && (!finite(sampleTime) || sampleTime > time)) quality = 'invalid';
    if (
      quality === 'valid' &&
      c.lastSampleMs !== null &&
      (sampleTime < c.lastSampleMs || (sampleTime === c.lastSampleMs && a.spo2 !== c.lastSpo2))
    )
      quality = 'invalid';
    const newSample =
      quality === 'valid' &&
      finite(sampleTime) &&
      sampleTime <= time &&
      (c.lastSampleMs === null || sampleTime > c.lastSampleMs);
    const gap = c.lastSampleMs !== null && sampleTime - c.lastSampleMs > rules.maxSampleGapMs;
    const drop = quality === 'valid' && finite(b.spo2) ? b.spo2 - a.spo2 : null;
    const support = supportingEvidence(a, b, time, rules);
    let trend = null;
    if (quality !== 'valid' || !finite(sampleTime) || sampleTime > time) {
      alerts.push(qualityAlert(a.id, 'spo2', quality === 'valid' ? 'invalid' : quality, source));
      Object.assign(c, {
        samples: [],
        amberSince: null,
        redSince: null,
        healthySince: null,
        slowSince: null,
        activeHypoxia: null,
        bradyCombined: false,
      });
      c.lastSampleMs = null;
    } else {
      if (gap) {
        c.samples = [];
        c.amberSince = null;
        c.redSince = null;
        c.healthySince = null;
        c.slowSince = null;
      }
      const amber = a.spo2 < rules.warningSpo2 || (drop !== null && drop >= rules.warningDrop);
      const red = a.spo2 < rules.criticalSpo2 || (drop !== null && drop >= rules.criticalDrop);
      if (newSample) {
        c.samples.push({ time: sampleTime, value: a.spo2 });
        c.samples = c.samples.filter((s) => s.time >= time - rules.trendWindowMs).slice(-600);
        c.amberSince = amber ? (c.amberSince ?? sampleTime) : null;
        c.redSince = red ? (c.redSince ?? sampleTime) : null;
      }
      trend = estimateSpo2Trend(c.samples, time, rules);
      const amberDuration = c.amberSince === null ? 0 : sampleTime - c.amberSince;
      const redDuration = c.redSince === null ? 0 : sampleTime - c.redSince;
      const candidates = [];
      const add = (severity, reason) => candidates.push({ severity, reason });
      if (a.spo2 < rules.immediateSpo2)
        add('critical', `SpO₂ below ${rules.immediateSpo2}%: immediate rule`);
      if (red && redDuration >= rules.criticalMs)
        add(
          'critical',
          `${a.spo2 < rules.criticalSpo2 ? 'SpO₂ below ' + rules.criticalSpo2 + '%' : 'Baseline drop ≥ ' + rules.criticalDrop + ' pp'} sustained for ${Math.floor(redDuration / 1000)} s`,
        );
      if (amber && amberDuration >= rules.warningMs)
        add(
          'warning',
          `${a.spo2 < rules.warningSpo2 ? 'SpO₂ below ' + rules.warningSpo2 + '%' : 'Baseline drop ≥ ' + rules.warningDrop + ' pp'} sustained for ${Math.floor(amberDuration / 1000)} s`,
        );
      if (trend?.declinePerMinute > rules.criticalFallPerMinute)
        add('critical', `SpO₂ falling ${trend.declinePerMinute.toFixed(2)} pp/min`);
      else if (trend?.declinePerMinute > rules.warningFallPerMinute)
        add('warning', `SpO₂ falling ${trend.declinePerMinute.toFixed(2)} pp/min`);
      const confirmedLow = amber && (candidates.length > 0 || c.activeHypoxia !== null);
      const hrValid = measurementQuality(a, 'heartRate', { now: time }) === 'valid';
      if (
        newSample &&
        hrValid &&
        confirmedLow &&
        a.heartRate < rules.suddenLowHr &&
        c.lastHeartRate >= rules.suddenLowHr &&
        c.lastHeartTime !== null &&
        sampleTime - c.lastHeartTime <= rules.maxSampleGapMs
      )
        c.bradyCombined = true;
      if (!confirmedLow || !hrValid || a.heartRate >= rules.suddenLowHr) c.bradyCombined = false;
      if (c.bradyCombined)
        add(
          'critical',
          `Low SpO₂ with a sudden heart-rate crossing below ${rules.suddenLowHr} BPM`,
        );
      const brValid = measurementQuality(a, 'breathingRate', { now: time }) === 'valid';
      const slow = frame.simulated && brValid && a.breathingRate < rules.simulatedSlowBreathing;
      if (newSample) c.slowSince = slow ? (c.slowSince ?? sampleTime) : null;
      if (
        frame.simulated &&
        confirmedLow &&
        brValid &&
        (a.breathingPattern === 'irregular' ||
          (slow && sampleTime - c.slowSince >= rules.simulatedSlowBreathingMs))
      )
        add('critical', 'Low SpO₂ with slow/irregular breathing (simulation-only combined rule)');
      const candidate = candidates.sort((x, y) => rank(y.severity) - rank(x.severity))[0];
      if (candidate) {
        c.healthySince = null;
        if (!c.activeHypoxia || rank(candidate.severity) >= rank(c.activeHypoxia.severity))
          c.activeHypoxia = candidate;
      } else if (!amber && !(trend?.declinePerMinute > rules.warningFallPerMinute)) {
        if (newSample) c.healthySince ??= sampleTime;
        if (newSample && sampleTime - c.healthySince >= rules.recoveryMs) c.activeHypoxia = null;
      } else c.healthySince = null;
      if (c.activeHypoxia)
        alerts.push({
          id: `${a.id}-hypoxia`,
          astronautId: a.id,
          parameter: 'spo2',
          category: 'hypoxia',
          source,
          severity: c.activeHypoxia.severity,
          label: c.healthySince !== null ? 'SpO₂ RECOVERY HOLD' : 'LOW SpO₂',
          value: a.spo2,
          unit: '%',
          reason:
            c.healthySince !== null
              ? `Gate clear for ${Math.floor((sampleTime - c.healthySince) / 1000)}/${rules.recoveryMs / 1000} s; prior severity retained`
              : c.activeHypoxia.reason,
          supportingEvidence: support.filter((s) => s.level.endsWith('-support')),
          action: rules.hypoxiaAction,
        });
      if (newSample) {
        c.lastSampleMs = sampleTime;
        c.lastSpo2 = a.spo2;
        if (hrValid) {
          c.lastHeartRate = a.heartRate;
          c.lastHeartTime = sampleTime;
        }
      }
    }
    // Supporting signal faults are data quality, never evidence for confirmed hypoxia.
    for (const parameter of ['heartRate', 'breathingRate']) {
      const status = measurementQuality(a, parameter, { now: time });
      if (status !== 'valid') alerts.push(qualityAlert(a.id, parameter, status, source));
    }
    const activeSuit = {};
    for (const fault of a.suitFaults || []) {
      if (!fault.active || !fault.verified) continue;
      const oxygenFault = ['oxygen-pressure', 'oxygen-flow', 'suit-pressure'].includes(fault.code);
      const combined = oxygenFault && quality === 'valid' && trend?.declinePerMinute > 0;
      const retainedCritical = c.activeSuit?.[fault.code] === 'critical';
      const severity = combined || retainedCritical ? 'critical' : 'warning';
      activeSuit[fault.code] = severity;
      alerts.push({
        id: `${a.id}-suit-${fault.code}`,
        astronautId: a.id,
        parameter: 'suitFault',
        category: 'suit',
        source: fault.source || source,
        severity,
        label: fault.message || fault.code,
        reason: combined
          ? 'Verified suit fault with a timestamped declining SpO₂ trend'
          : retainedCritical
            ? 'Prior combined escalation retained until explicit suit fault clears'
            : 'Verified explicit suit fault message',
        action: rules.suitAction,
      });
    }
    c.activeSuit = activeSuit;
    if (a.communication === false)
      alerts.push({
        id: `${a.id}-communication`,
        astronautId: a.id,
        parameter: 'communication',
        category: 'operational',
        source,
        severity: 'critical',
        label: 'Communication lost',
        action: 'Pause activity. Re-establish crew contact.',
      });
    const reactionAlert = reactionStep(c, a, b, time, commands, rules, source, events);
    if (reactionAlert) alerts.push(reactionAlert);
    assessments[a.id] = {
      spo2Quality: quality,
      baselineSource: b.source || 'unavailable',
      spo2Delta: drop === null ? null : -drop,
      heartRateDelta: finite(b.heartRate) && finite(a.heartRate) ? a.heartRate - b.heartRate : null,
      breathingDelta:
        finite(b.breathingRate) && finite(a.breathingRate)
          ? a.breathingRate - b.breathingRate
          : null,
      trend,
      support,
      cardiac: 'unavailable: no verified rhythm detector',
      amberDurationMs: c.amberSince === null ? 0 : Math.max(0, sampleTime - c.amberSince),
      redDurationMs: c.redSince === null ? 0 : Math.max(0, sampleTime - c.redSince),
    };
  }
  const sorted = sortAlerts(alerts);
  for (const alert of sorted) {
    const old = state.alerts.find((a) => a.id === alert.id);
    if (!old || old.severity !== alert.severity)
      events.push({
        id: `${time}-${alert.id}-${alert.severity}`,
        time: time / 1000,
        kind: old ? 'severity-change' : 'raised',
        category: alert.category,
        astronautId: alert.astronautId,
        severity: alert.severity,
        source: alert.source,
        text: `${alert.astronautId} · ${alert.category} · ${alert.severity}: ${alert.reason || alert.label}`,
      });
  }
  for (const old of state.alerts)
    if (!sorted.some((a) => a.id === old.id)) {
      const suppressed =
        old.category === 'hypoxia' && assessments[old.astronautId]?.spo2Quality !== 'valid';
      events.push({
        id: `${time}-${old.id}-${suppressed ? 'suppressed' : 'cleared'}`,
        time: time / 1000,
        kind: suppressed ? 'suppressed' : 'cleared',
        category: old.category,
        astronautId: old.astronautId,
        severity: 'normal',
        source: old.source,
        text: `${old.astronautId}: ${old.label} ${suppressed ? 'interpretation inhibited by data quality' : 'cleared by recovery/reset'}`,
      });
    }
  state.time = time;
  state.alerts = sorted;
  state.assessments = assessments;
  return { state, alerts: sorted, assessments, events };
}
