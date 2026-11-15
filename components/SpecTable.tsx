import type { Spec } from "@/content/site";
import { cn } from "@/lib/cn";

/** Labelled stats separated by gold hairlines. */
export function SpecTable({ specs, className }: { specs: Spec[]; className?: string }) {
  return (
    <dl className={cn("border-t border-gold/40", className)}>
      {specs.map((spec, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-baseline gap-4 border-b border-gold/40 py-5">
          <dt className="text-eyebrow uppercase text-ink-muted">{spec.label}</dt>
          <dd className="font-display text-h3 text-ink">
            {spec.value}
            {spec.unit && <span className="ml-2 text-small text-gold">{spec.unit}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
