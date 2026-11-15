import type { Spec } from "@/content/site";
import { cn } from "@/lib/cn";

/**
 * Labelled stats separated by gold hairlines.
 * layout="rows" (default): one stat per row. layout="strip": stats side by side (stacked on small screens).
 */
export function SpecTable({ specs, className, layout = "rows" }: { specs: Spec[]; className?: string; layout?: "rows" | "strip" }) {
  if (layout === "strip") {
    return (
      <dl className={cn("grid border-y border-gold/40 sm:grid-cols-2 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none", className)}>
        {specs.map((spec, i) => (
          <div
            key={i}
            className="flex flex-col justify-between gap-3 border-gold/40 py-5 sm:px-6 lg:py-6 [&:not(:first-child)]:border-t sm:[&:nth-child(2)]:border-t-0 sm:[&:nth-child(even)]:border-l lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:border-t-0 lg:first:pl-0"
          >
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
