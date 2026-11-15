"use client";

import { useState } from "react";
import { ui, type NewsItem } from "@/content/site";
import { cn } from "@/lib/cn";
import { NewsRow } from "./NewsRow";

/** Updates with category filter chips. */
export function UpdatesList({ items, categories, allLabel }: { items: NewsItem[]; categories: string[]; allLabel: string }) {
  const [active, setActive] = useState<string | null>(null);
  const shown = active ? items.filter((i) => i.category === active) : items;

  const chip = (label: string, value: string | null) => (
    <button
      key={label}
      type="button"
      aria-pressed={active === value}
      onClick={() => setActive(value)}
      className={cn(
        "min-h-11 border px-4 text-eyebrow uppercase transition-colors",
        active === value ? "border-gold bg-gold text-bg" : "border-gold/40 text-ink hover:border-gold-bright hover:text-gold-bright",
      )}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div role="group" aria-label={ui.filterLabel} className="flex flex-wrap gap-3">
        {chip(allLabel, null)}
        {categories.map((c) => chip(c, c))}
      </div>
      <p aria-live="polite" className="mt-8 text-small">
        {ui.updateCount(shown.length)}
      </p>
      <ul className="mt-4 border-t border-gold/40">
        {shown.map((item) => (
          <NewsRow key={item.slug} item={item} />
        ))}
      </ul>
    </div>
  );
}
