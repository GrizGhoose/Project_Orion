import { useEffect } from 'react';
import { useTelemetryCommands } from '../../../app/providers/TelemetryProvider';

/** Keyboard is a development substitute for a chest button, not a hardware driver. */
export function useReactionInput(frame, astronautId) {
  const provider = useTelemetryCommands();
  const check = frame.reactionChecks?.[astronautId];
  const checkId = check?.id;
  const ready = check?.status === 'waiting' && frame.timestampMs >= check.stimulusAt;
  useEffect(() => {
    if (!import.meta.env.DEV || !ready || !provider) return;
    const shownAt = performance.now();
    const respond = (event) => {
      if (
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.target.isContentEditable ||
        /INPUT|SELECT|TEXTAREA/.test(event.target.tagName)
      )
        return;
      const key = event.key.toUpperCase();
      if (!['J', 'K'].includes(key)) return;
      event.preventDefault();
      provider.command({
        type: 'reaction-response',
        astronautId,
        reactionId: checkId,
        key,
        responseMs: performance.now() - shownAt,
      });
    };
    window.addEventListener('keydown', respond);
    return () => window.removeEventListener('keydown', respond);
  }, [provider, ready, checkId, astronautId]);
}
