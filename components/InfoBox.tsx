import type { InfoBoxContent } from "@/content/site";
import { cn } from "@/lib/cn";
import { CornerTicks } from "./CornerTicks";

/**
 * Standalone caption box (Device / Anchor in the product carousel). Every line uses the eyebrow font
 * (font-eyebrow); only size, weight, colour and casing differ. Gold corner ticks, focusable, with a gold-bright
 * border on hover/focus. An optional gold link (opens in a new tab) sits below the body.
 */
export function InfoBox({ content, className }: { content: InfoBoxContent; className?: string }) {
  return (
    <div
      tabIndex={0}
      className={cn(
        "relative w-full max-w-[380px] border border-gold/30 bg-bg-alt/95 p-6 font-eyebrow outline-none transition-colors duration-200 hover:border-gold-bright focus-visible:border-gold-bright",
        className,
      )}
    >
      <CornerTicks className="inset-1.5" />
      <p className="text-eyebrow font-medium uppercase text-gold">{content.label}</p>
      <p className="mt-3 text-h3 font-medium tracking-normal text-ink">{content.title}</p>
      <p className="mt-3 text-body leading-relaxed text-ink-muted">{content.body}</p>
      {content.link && (
        <a
          href={content.link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block whitespace-nowrap text-body text-gold underline decoration-gold/60 decoration-1 underline-offset-[6px] transition-colors duration-200 hover:text-gold-bright hover:decoration-gold-bright focus-visible:text-gold-bright"
        >
          {content.link.label}
        </a>
      )}
    </div>
  );
}
