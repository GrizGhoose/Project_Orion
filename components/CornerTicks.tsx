import { cn } from "@/lib/cn";

/** Gold crop-mark ticks in the four corners of a card or image. Parent must be `relative`. */
export function CornerTicks({ className }: { className?: string }) {
  const tick = "pointer-events-none absolute h-3 w-3 border-gold";
  return (
    <span aria-hidden className={cn("pointer-events-none absolute inset-2 z-10", className)}>
      <span className={cn(tick, "left-0 top-0 border-l border-t")} />
      <span className={cn(tick, "right-0 top-0 border-r border-t")} />
      <span className={cn(tick, "bottom-0 left-0 border-b border-l")} />
      <span className={cn(tick, "bottom-0 right-0 border-b border-r")} />
    </span>
  );
}
