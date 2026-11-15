import Image from "next/image";
import { cn } from "@/lib/cn";
import { CornerTicks } from "./CornerTicks";

type ImageSlotProps = {
  /** Slot name shown on the placeholder, e.g. "milestone-2.png" */
  slot: string;
  /** Intended size shown on the placeholder, e.g. "1200×900" */
  size: string;
  /** Real image path; when set, the image replaces the placeholder */
  src?: string;
  alt: string;
  /** Sizing/aspect classes, e.g. "aspect-[4/3]" */
  className?: string;
  /** Gold corner ticks */
  ticks?: boolean;
  /** Responsive sizes hint for the real image */
  sizes?: string;
};

/**
 * Image placeholder until a real image is supplied: a dark block with a thin gold border
 * and a label like "milestone-2.png · 1200×900". With `src`, renders the image (object-fit cover, lazy).
 */
export function ImageSlot({ slot, size, src, alt, className, ticks = false, sizes = "100vw" }: ImageSlotProps) {
  return (
    <div className={cn("relative overflow-hidden border border-gold/40 bg-slot", className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
      ) : (
        <div role="img" aria-label={alt} className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4">
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
