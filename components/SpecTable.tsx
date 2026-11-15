import type { Spec } from "@/content/site";
import { cn } from "@/lib/cn";

/** Labelled stats side by side, separated by gold hairlines (stacked on small screens). */
export function SpecTable({ specs, className }: { specs: Spec[]; className?: string }) {
  // Wraps to 2–3 columns below xl. Cells draw their own top/left hairlines; the wrapper clips the outer ones.
  return (
    <div className={cn("overflow-hidden border-y border-gold/40", className)}>
      <dl className="-ml-px -mt-px grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-flow-col xl:auto-cols-fr xl:grid-cols-none">
        {specs.map((spec, i) => (
          <div key={i} className="flex flex-col justify-between gap-3 border-l border-t border-gold/40 px-px py-5 sm:px-6 lg:py-6">
            <dt className="text-eyebrow uppercase text-ink-muted">{spec.label}</dt>
            <dd className="font-display text-h3 text-ink">
              {spec.value}
              {spec.unit && <span className="ml-2 text-small text-gold">{spec.unit}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
