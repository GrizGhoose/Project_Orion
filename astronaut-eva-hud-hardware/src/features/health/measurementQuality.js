/** Prototype freshness policy. Timestamps share the detector frame's millisecond clock. */
export const DATA_QUALITY = Object.freeze({
  staleAfterMs: 5000,
  action: 'Check sensor contact and local connection. Confirm a fresh reading.',
});

/** Optional quality metadata supplements numeric validation; never invent a fresh sample. */
export function measurementQuality(
  astronaut,
  parameter,
  { now = Date.now(), staleAfterMs = DATA_QUALITY.staleAfterMs } = {},
) {
  const metadata = astronaut.quality?.[parameter];
  const status = typeof metadata === 'string' ? metadata : metadata?.status;
  if (status && status !== 'valid')
    return ['invalid', 'stale', 'unavailable', 'disconnected'].includes(status)
      ? status
      : 'invalid';
  const value = astronaut[parameter];
  if (value == null) return 'unavailable';
  if (!Number.isFinite(value) || value < 0 || (parameter === 'spo2' && value > 100))
    return 'invalid';
  const sampledAt = metadata?.receivedAt ?? astronaut.sampleTimeMs;
  if (sampledAt === undefined) return 'invalid';
  if (sampledAt !== undefined) {
    if (!Number.isFinite(sampledAt) || sampledAt > now) return 'invalid';
    if (now - sampledAt > staleAfterMs) return 'stale';
  }
  return 'valid';
}
