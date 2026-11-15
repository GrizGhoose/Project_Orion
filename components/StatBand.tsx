import type { Stat } from "@/content/site";
import { CountUp } from "./CountUp";
import { Reveal } from "./Reveal";

/** Huge gold numbers with small uppercase labels, split by gold hairlines. */
export function StatBand({ stats }: { stats: Stat[] }) {
  return (
    <dl className="grid border-y border-gold/40 sm:grid-cols-3">
      {stats.map((stat, i) => (
        <Reveal key={i} delay={i * 0.1} className="border-gold/40 py-10 sm:px-8 sm:py-14 [&:not(:first-child)]:border-t sm:[&:not(:first-child)]:border-l sm:[&:not(:first-child)]:border-t-0">
          <dd className="font-display text-stat font-medium text-gold">
            <CountUp value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
          </dd>
          <dt className="mt-4 text-eyebrow uppercase text-ink-muted">{stat.label}</dt>
        </Reveal>
      ))}
    </dl>
  );
}
