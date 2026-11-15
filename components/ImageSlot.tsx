import Image from "next/image";
import { cn } from "@/lib/cn";
import { CornerTicks } from "./CornerTicks";

type ImageSlotProps = {
  /** Slot name shown on the placeholder, e.g. "hero-bg" */
  slot: string;
  /** Intended size shown on the placeholder, e.g. "1920×1080" */
  size: string;
  /** Real image path; when set, the image replaces the placeholder */
  src?: string;
  alt: string;
  /** Sizing/aspect classes, e.g. "aspect-[4/3]" */
  className?: string;
  /** Fill the nearest positioned parent (full-bleed backgrounds) instead of sizing itself */
  fill?: boolean;
  /** Gold corner ticks */
  ticks?: boolean;
  /** Thin gold border (off for full-bleed backgrounds) */
  bordered?: boolean;
  /** Load eagerly (above the fold only) */
  priority?: boolean;
  /** Responsive sizes hint for the real image */
  sizes?: string;
  /** Where the placeholder label sits: centred, or top-right (for heroes, clear of the headline) */
  labelPlacement?: "center" | "corner";
};

/**
 * Image placeholder until a real image is supplied: a dark block with a thin gold border
 * and a label like "hero-bg · 1920×1080". With `src`, renders the image (object-fit cover, lazy).
 */
export function ImageSlot({
  slot,
  size,
  src,
  alt,
  className,
  ticks = false,
  bordered = true,
  priority = false,
  sizes = "100vw",
  labelPlacement = "center",
  fill = false,
}: ImageSlotProps) {
  return (
    <div
      className={cn(fill ? "absolute inset-0" : "relative", "overflow-hidden bg-slot", bordered && "border border-gold/40", className)}
    >
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className={cn(
            "pointer-events-none absolute inset-0 z-10 flex p-4", // above any overlay drawn after the slot
            labelPlacement === "center" ? "items-center justify-center" : "items-start justify-end px-gutter pt-28",
          )}
        >
          <span className="flex items-center gap-2 text-center text-small text-ink-muted">
            <span aria-hidden className="inline-block h-1.5 w-1.5 bg-gold" />
            {slot} · {size}
          </span>
        </div>
      )}
      {ticks && <CornerTicks />}
    </div>
  );
}
