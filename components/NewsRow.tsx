import Link from "next/link";
import type { NewsItem } from "@/content/site";

/** One update in a list: category tag, date, headline. */
export function NewsRow({ item }: { item: NewsItem }) {
  return (
    <li className="border-b border-gold/40">
      <Link
        href={`/updates/${item.slug}`}
        className="group grid gap-3 py-6 md:grid-cols-[16rem_11rem_minmax(0,1fr)_auto] md:items-center md:gap-8 md:py-8"
      >
        <span className="w-fit whitespace-nowrap border border-gold/60 px-2.5 py-1 text-eyebrow uppercase text-gold">{item.category}</span>
        <span className="text-small text-ink-muted">{item.date}</span>
        <span className="font-display text-h3 text-ink transition-colors duration-200 group-hover:text-gold-bright">{item.headline}</span>
        <span aria-hidden className="hidden text-gold transition-transform duration-200 group-hover:translate-x-1 md:block">
          →
        </span>
      </Link>
    </li>
  );
}
