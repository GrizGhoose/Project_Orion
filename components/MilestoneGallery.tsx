"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { gallery, type MilestoneImage, type MilestoneMedia } from "@/content/site";
import { cn } from "@/lib/cn";
import { CornerTicks } from "./CornerTicks";
import { CHEVRON, FramedImage, Icon, LightboxOverlay } from "./ImageLightbox";
import { VideoPlayer } from "./VideoPlayer";

const SWIPE_PX = 50;

/**
 * One or more milestone images / videos in a single fixed frame (sized to fit the tallest item, so switching never
 * changes the layout). With more than one: arrows on the frame edges, horizontal slide, swipe, ← → while the gallery
 * has focus, and a counter with the item's label underneath. Zoomable images open the lightbox, which can step
 * through the gallery's zoomable images too. Switching away pauses a playing video.
 */
export function MilestoneGallery({ items, caption, sizes }: { items: MilestoneMedia[]; caption: string; sizes: string }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const slides = useRef<(HTMLDivElement | null)[]>([]);
  const refocus = useRef(false);

  const many = items.length > 1;
  const aspect = Math.min(...items.map((m) => m.width / m.height));
  const videos = items.every((m) => m.type === "video");
  const zoomable = items.map((m, i) => ({ m, i })).filter((x): x is { m: MilestoneImage; i: number } => x.m.type === "image" && x.m.zoomable);

  const go = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(items.length - 1, i));
      // Focus inside the slide being left would be lost when it turns inert: carry it to the new slide
      refocus.current = slides.current.some((el) => el?.contains(document.activeElement));
      setIndex(next);
      // The arrow that was used may disappear at either end: keep focus on the one that remains
      if (next === 0 && document.activeElement === prevRef.current) nextRef.current?.focus();
      if (next === items.length - 1 && document.activeElement === nextRef.current) prevRef.current?.focus();
    },
    [items.length],
  );

  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    slides.current[index]?.querySelector<HTMLElement>("button, video")?.focus({ preventScroll: true });
  }, [index]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!many || open || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    if ((e.target as HTMLElement).tagName === "VIDEO") return; // native seeking
    e.preventDefault();
    e.stopPropagation(); // never reaches the product carousel's shortcut
    go(e.key === "ArrowLeft" ? index - 1 : index + 1);
  };

  const arrow =
    "absolute top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-gold bg-bg/80 text-gold transition-colors duration-200 hover:bg-gold hover:text-bg focus-visible:bg-gold focus-visible:text-bg";
  const pad = (n: number) => String(n).padStart(2, "0");
  const current = items[index];

  return (
    <div role="group" aria-roledescription={many ? "gallery" : undefined} aria-label={caption} onKeyDown={onKeyDown}>
      <div className="relative" style={{ aspectRatio: aspect }}>
        <div
          className="h-full overflow-hidden"
          onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
          onTouchEnd={(e) => {
            const start = touch.current;
            touch.current = null;
            if (!start || !many) return;
            const dx = e.changedTouches[0].clientX - start.x;
            const dy = e.changedTouches[0].clientY - start.y;
            if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? index + 1 : index - 1);
          }}
        >
          <div
            className="flex h-full transition-transform duration-500 ease-in-out motion-reduce:transition-none"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {items.map((m, i) => (
              <div
                key={m.src}
                ref={(el) => {
                  slides.current[i] = el;
                }}
                inert={i !== index}
                aria-hidden={i !== index}
                className="h-full w-full shrink-0"
              >
                {m.type === "video" ? (
                  <VideoPlayer video={m} active={i === index} sizes={sizes} />
                ) : m.zoomable ? (
                  <FramedImage
                    ref={(el) => {
                      triggers.current[i] = el;
                    }}
                    image={m}
                    label={gallery.enlarge(m.label)}
                    sizes={sizes}
                    onOpen={() => setOpen(true)}
                  />
                ) : (
                  <div className="relative h-full w-full border border-gold bg-paper p-4">
                    <span className="relative block h-full w-full">
                      <Image src={m.src} alt={m.alt} fill sizes={sizes} className="object-contain" />
                    </span>
                    <CornerTicks className="inset-1" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {many && index > 0 && (
          <button ref={prevRef} type="button" aria-label={videos ? gallery.previousVideo : gallery.previous} onClick={() => go(index - 1)} className={cn(arrow, "left-3")}>
            <Icon d={CHEVRON.left} />
          </button>
        )}
        {many && index < items.length - 1 && (
          <button ref={nextRef} type="button" aria-label={videos ? gallery.nextVideo : gallery.next} onClick={() => go(index + 1)} className={cn(arrow, "right-3")}>
            <Icon d={CHEVRON.right} />
          </button>
        )}
      </div>

      {many && (
        <p aria-live="polite" className="mt-4 flex items-center gap-3 font-eyebrow text-eyebrow uppercase">
          <span className="tabular-nums text-gold">
            {pad(index + 1)} / {pad(items.length)}
          </span>
          <span className="h-px w-6 bg-gold/40" aria-hidden="true" />
          <span className="text-ink-muted">{current.type === "image" ? current.label : current.title}</span>
        </p>
      )}

      {open && zoomable.length > 0 && (
        <LightboxOverlay
          images={zoomable.map((z) => z.m)}
          index={Math.max(0, zoomable.findIndex((z) => z.i === index))}
          onIndexChange={(k) => setIndex(zoomable[k].i)}
          caption={caption}
          originRect={() => triggers.current[index]?.getBoundingClientRect()}
          onClosed={() => {
            setOpen(false);
            triggers.current[index]?.focus({ preventScroll: true });
          }}
        />
      )}
    </div>
  );
}
