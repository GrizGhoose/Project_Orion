import type { TimelineEntry } from "@/content/site";
import { Reveal } from "./Reveal";

/** Vertical timeline on a gold hairline, with square gold markers. Dates sit left of the line from md up. */
export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ol>
      {entries.map((entry, i) => (
        <li key={i} className="md:grid md:grid-cols-[14rem_minmax(0,1fr)] md:gap-10">
          <p className="hidden whitespace-nowrap pt-1.5 text-right text-eyebrow uppercase text-gold md:block">{entry.date}</p>
          <div className="relative border-l border-gold/40 pb-12 pl-8 md:pl-12">
            <span aria-hidden className="absolute -left-[5px] top-2 h-[9px] w-[9px] border border-gold bg-bg" />
            <Reveal delay={i * 0.05}>
              <p className="text-eyebrow uppercase text-gold md:hidden">{entry.date}</p>
              <h3 className="mt-2 text-h3 md:mt-0">{entry.title}</h3>
              <p className="mt-2 max-w-prose">{entry.body}</p>
            </Reveal>
          </div>
        </li>
      ))}
    </ol>
  );
}
