import { BASELINE_FIELDS } from '../../features/health/detectionConfig';

export function BaselineControls({ astronautId, baseline = {}, command }) {
  return (
    <form
      className="grid gap-3 border-t border-line pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        command({
          type: 'baselines',
          astronautId,
          values: Object.fromEntries(
            BASELINE_FIELDS.map(({ key }) => [
              key,
              data.get(key) === '' ? null : Number(data.get(key)),
            ]),
          ),
        });
      }}
    >
      <h3 className="eyebrow">{astronautId} · SIMULATED PRE-EVA BASELINES</h3>
      <p className="text-xs text-slate-300">
        Blank means unavailable. Expected workload HR is separate from resting baseline HR. Applying
        changes restarts only this astronaut's detector history.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {BASELINE_FIELDS.map(({ key, label, min, max, step }) => (
          <label key={key} className="grid gap-1 text-xs">
            {label}
            <input
              className="rounded border border-slate-500 bg-space px-2 py-2"
              name={key}
              type="number"
              min={min}
              max={max}
              step={step}
              defaultValue={baseline[key] ?? ''}
            />
          </label>
        ))}
      </div>
      <button className="control-button" type="submit">
        Apply simulated baselines
      </button>
    </form>
  );
}
