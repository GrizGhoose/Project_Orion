import type { PressQuote as PressQuoteType } from "@/content/site";

/** Short press quote with the publication name. */
export function PressQuote({ item }: { item: PressQuoteType }) {
  return (
    <figure className="flex h-full flex-col border-t border-gold pt-8">
      <span aria-hidden className="font-display text-h2 leading-none text-gold">
        “
      </span>
      <blockquote className="mt-2 flex-1 font-display text-h3 text-ink">{item.quote}</blockquote>
      <figcaption className="mt-8 text-eyebrow uppercase text-ink-muted">
        {item.href ? (
          <a href={item.href} className="link-gold">
            {item.publication}
          </a>
        ) : (
          item.publication
        )}
      </figcaption>
    </figure>
  );
}
