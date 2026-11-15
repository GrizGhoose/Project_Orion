"use client";

import { useInView, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { productShowcase } from "@/content/site";
import { cn } from "@/lib/cn";
import { ProductSlide } from "./ProductSlide";

const SWIPE_PX = 50;
const SLIDE_MS = 800;

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d={dir === "left" ? "M15 4 7 12l8 8" : "M9 4l8 8-8 8"} />
    </svg>
  );
}

/**
 * Horizontal product carousel for the Home page. One slide per entry in `productShowcase.products`;
 * arrows, pager bars and counter follow the array length. ← → keys (while in view or focused) and touch swipe
 * also move between slides. No autoplay, no looping.
 */
export function ProductCarousel() {
  const { label, products } = productShowcase;
  const total = products.length;
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { amount: 0.3 });
  const [index, setIndex] = useState(0);
  // Which slide is still visible while the track moves; the one we left resets after the transition
  const [settled, setSettled] = useState(0);
  const [imageCenters, setImageCenters] = useState<number[]>([]);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback((i: number) => setIndex(Math.max(0, Math.min(total - 1, i))), [total]);

  useEffect(() => {
    if (reduce) return setSettled(index);
    const t = window.setTimeout(() => setSettled(index), SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [index, reduce]);

  // ← → while the carousel is in view or focused; never inside form fields
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      const focused = sectionRef.current?.contains(document.activeElement);
      if (!inView && !focused) return;
      e.preventDefault();
      go(e.key === "ArrowLeft" ? index - 1 : index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, inView]);

  const onImageCenter = useCallback((i: number, y: number) => {
    setImageCenters((prev) => (prev[i] === y ? prev : Object.assign([...prev], { [i]: y })));
  }, []);
  const centerCallbacks = useRef<((y: number) => void)[]>([]);
  const centerFor = (i: number) => (centerCallbacks.current[i] ??= (y: number) => onImageCenter(i, y));

  const arrow =
    "absolute z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-gold bg-bg/80 text-gold transition-[background-color,color,opacity] duration-200 hover:bg-gold hover:text-bg focus-visible:bg-gold focus-visible:text-bg disabled:pointer-events-none disabled:opacity-25 lg:h-14 lg:w-14";
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section
      ref={sectionRef}
      aria-roledescription="carousel"
      aria-label={label}
      className="relative overflow-hidden bg-bg"
      style={{ "--arrow-y": `${imageCenters[index] ?? 320}px` } as React.CSSProperties}
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const start = touch.current;
        touch.current = null;
        if (!start) return;
        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? index + 1 : index - 1);
      }}
    >
      <div
        className={cn("flex min-h-[max(760px,100svh)]", !reduce && "transition-transform duration-[800ms] ease-[cubic-bezier(.7,0,.2,1)]")}
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {products.map((p, i) => (
          <ProductSlide
            key={p.id}
            product={p}
            index={i}
            total={total}
            active={i === index}
            play={inView && (i === index || i === settled)}
            onImageCenter={centerFor(i)}
          />
        ))}
      </div>

      {/* Arrows: level with the image on mobile, vertically centred from lg */}
      <button
        type="button"
        aria-label="Previous product"
        disabled={index === 0}
        onClick={() => go(index - 1)}
        className={cn(arrow, "left-2 top-[var(--arrow-y)] lg:left-8 lg:top-1/2")}
      >
        <Chevron dir="left" />
      </button>
      <button
        type="button"
        aria-label="Next product"
        disabled={index === total - 1}
        onClick={() => go(index + 1)}
        className={cn(arrow, "right-2 top-[var(--arrow-y)] lg:right-8 lg:top-1/2")}
      >
        <Chevron dir="right" />
      </button>

      {/* Pager: counter · bars · product name */}
      <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-5 whitespace-nowrap">
        <p className="font-eyebrow text-eyebrow font-medium uppercase tabular-nums text-gold">
          {pad(index + 1)} / {pad(total)}
        </p>
        <div className="flex items-center gap-2">
          {products.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={`Go to ${p.name}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => go(i)}
              className="group flex h-6 w-11 items-center"
            >
              <span className={cn("h-[2px] w-full transition-colors duration-300", i === index ? "bg-gold" : "bg-gold/30 group-hover:bg-gold/60")} />
            </button>
          ))}
        </div>
        <p className="hidden max-w-[16rem] truncate text-small text-ink-muted lg:block">{products[index].name}</p>
      </div>

      <p aria-live="polite" className="sr-only">
        {`${index + 1} of ${total}: ${products[index].name}`}
      </p>
    </section>
  );
}
