import Link from "next/link";
import { site } from "@/content/site";

/** Logo placeholder: gold outlined mark + company name. TODO: replace with the real logo SVG. */
export function Wordmark({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/" onClick={onClick} className="flex items-center gap-3 font-display text-small font-medium tracking-wide text-ink">
      <span aria-hidden className="relative h-5 w-5 border border-gold">
        <span className="absolute inset-[5px] bg-gold" />
      </span>
      <span>{site.name}</span>
    </Link>
  );
}
