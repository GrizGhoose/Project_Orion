import type { InfoBoxContent } from "@/content/site";
import { cn } from "@/lib/cn";

/**
 * Standalone caption box (Device / Anchor in the product showcase). Every line uses the eyebrow font
 * (font-eyebrow); only size, weight, colour and casing differ. Focusable, with a gold-bright border on hover/focus.
 */
export function InfoBox({ content, className }: { content: InfoBoxContent; className?: string }) {
  return (
    <div
      tabIndex={0}
      className={cn(
        "w-full max-w-[380px] border border-gold/40 bg-bg-alt p-6 font-eyebrow outline-none transition-colors duration-200 hover:border-gold-bright focus-visible:border-gold-bright",
        className,
      )}
    >
      <p className="text-eyebrow font-medium uppercase text-gold">{content.label}</p>
      <p className="mt-3 text-h3 font-medium tracking-normal text-ink">{content.title}</p>
      <p className="mt-3 text-body leading-relaxed text-ink-muted">{content.body}</p>
    </div>
  );
}
