"use client";

import { useReducedMotion } from "framer-motion";
import Image from "next/image";
import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { lightbox, type MilestoneImage } from "@/content/site";
import { cn } from "@/lib/cn";
import { CornerTicks } from "./CornerTicks";

const PAD = 16; // panel padding around the image
const BORDER = 1;
const CTRL = 48; // control button size
const INSET = 16; // controls' distance from the viewport edge
const CAPTION_H = 40; // caption line below the enlarged image
const DURATION = 350;
const MAX_ZOOM = 3;
const TAP_ZOOM = 2.5;
const STEP = 1.5; // + / − buttons

type Rect = { left: number; top: number; width: number; height: number };
type Layout = { frame: Rect; img: { w: number; h: number }; controls: "row" | "column" };
type View = { s: number; x: number; y: number };

const IDENTITY: View = { s: 1, x: 0, y: 0 };

/**
 * Fits the enlarged panel into ~94vw × 88vh, keeping the controls clear of it: either controls in reserved strips
 * at the sides (landscape: close/zoom column on the right, prev/next arrows at mid-height on both sides) or in a
 * reserved top strip (portrait), whichever gives a bigger image.
 */
function computeLayout(aspect: number): Layout {
  const vw = window.innerWidth;
  const vh = document.documentElement.clientHeight;
  const chrome = 2 * (PAD + BORDER);
  const reserve = 2 * (INSET + CTRL + INSET);
  const fit = (w: number, h: number) => {
    const iw = Math.max(0, Math.min(w - chrome, (h - chrome) * aspect));
    return { w: iw, h: iw / aspect };
  };
  const column = fit(Math.min(vw * 0.94, vw - reserve), Math.min(vh * 0.88, vh - 2 * INSET) - CAPTION_H);
  const row = fit(Math.min(vw * 0.94, vw - 2 * INSET), Math.min(vh * 0.88, vh - reserve) - CAPTION_H);
  const controls = column.w >= row.w ? "column" : "row";
  const img = controls === "column" ? column : row;
  const width = img.w + chrome;
  const height = img.h + chrome;
  return { frame: { left: (vw - width) / 2, top: (vh - height - CAPTION_H) / 2, width, height }, img, controls };
}

export function Icon({ d }: { d: string }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d={d} />
    </svg>
  );
}

export const CHEVRON = { left: "M15 4 7 12l8 8", right: "M9 4l8 8-8 8" };

/**
 * The framed image on the page (off-white panel, gold hairline, corner ticks, "Click to enlarge" hint) as a button
 * that opens the overlay. The ref points at the frame, the overlay's grow animation starts from its rect.
 */
export const FramedImage = forwardRef<
  HTMLButtonElement,
  { image: MilestoneImage; label: string; sizes: string; onOpen: () => void; className?: string }
>(function FramedImage({ image, label, sizes, onOpen, className }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-haspopup="dialog"
      onClick={onOpen}
      className={cn("group relative block h-full w-full cursor-zoom-in border border-gold bg-paper p-4 text-left transition-colors duration-200 hover:border-gold-bright focus-visible:border-gold-bright", className)}
    >
      <span className="relative block h-full w-full overflow-hidden">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          className="object-contain transition-transform duration-300 ease-out group-hover:scale-[1.02] group-focus-visible:scale-[1.02]"
        />
      </span>
      <CornerTicks className="inset-1" />
      {/* Hint chip, pinned to the frame's bottom-right corner */}
      <span className="absolute bottom-3 right-3 z-20 flex items-center gap-2 bg-bg/85 px-2.5 py-1.5 font-eyebrow text-[0.6875rem] font-medium uppercase leading-none tracking-[0.18em] text-gold">
        <Icon d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" />
        <span className="[@media(hover:none)]:hidden">{lightbox.hintMouse}</span>
        <span className="hidden [@media(hover:none)]:inline">{lightbox.hintTouch}</span>
      </span>
    </button>
  );
});

type OverlayProps = {
  images: MilestoneImage[];
  index: number;
  onIndexChange: (i: number) => void;
  /** e.g. "01 · Mock-up schematics" */
  caption: string;
  /** Rect of the on-page frame for the current image (grow / shrink animation) */
  originRect: () => DOMRect | undefined;
  /** Called once the close animation has finished */
  onClosed: () => void;
};

/**
 * Near-full-screen overlay over a darkened page. Grows from the on-page frame (fade only with reduced motion).
 * Wheel / double-click / pinch / double-tap zoom up to 3×, drag to pan, + − Reset buttons, ← → (and arrow buttons)
 * between images, Esc or backdrop click to close. Images load unoptimised (`fullSrc` or `src`), only once opened.
 */
export function LightboxOverlay({ images, index, onIndexChange, caption, originRect, onClosed }: OverlayProps) {
  const reduce = useReducedMotion();
  const image = images[index];
  const aspect = image.width / image.height;
  const many = images.length > 1;
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const [layout, setLayout] = useState<Layout>(() => computeLayout(aspect));
  const [from, setFrom] = useState<Rect | null>(() => originRect() ?? null);
  const [view, setViewState] = useState<View>(IDENTITY);
  const [smooth, setSmooth] = useState(false);
  const viewRef = useRef<View>(IDENTITY);
  const layoutRef = useRef<Layout>(layout);
  layoutRef.current = layout;

  const setView = useCallback((v: View, animate = false) => {
    viewRef.current = v;
    setSmooth(animate);
    setViewState(v);
  }, []);

  const close = useCallback(() => {
    setFrom(originRect() ?? null);
    setShown(false);
    window.setTimeout(onClosed, reduce ? 200 : DURATION);
  }, [onClosed, originRect, reduce]);

  const go = useCallback(
    (i: number) => {
      if (i < 0 || i >= images.length) return;
      onIndexChange(i);
    },
    [images.length, onIndexChange],
  );

  // New image: refit and reset the zoom
  useEffect(() => {
    setLayout(computeLayout(aspect));
    setView(IDENTITY);
  }, [aspect, index, setView]);

  // Start the grow (or fade) after the overlay is painted in its start position
  useLayoutEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => (raf2 = requestAnimationFrame(() => setShown(true))));
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  // While open: lock page scroll (padding replaces the scrollbar so nothing shifts), Esc, ← →, focus trap, resize
  useEffect(() => {
    const body = document.body;
    const prev = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    return () => {
      body.style.overflow = prev.overflow;
      body.style.paddingRight = prev.paddingRight;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        go(e.key === "ArrowLeft" ? index - 1 : index + 1);
      } else if (e.key === "Tab") {
        const focusables = Array.from(overlayRef.current?.querySelectorAll<HTMLElement>("button") ?? []);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const inside = overlayRef.current?.contains(document.activeElement);
        if (e.shiftKey && (document.activeElement === first || !inside)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    const onResize = () => {
      setLayout(computeLayout(aspect));
      setView(IDENTITY);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [close, go, index, aspect, setView]);

  // Zoom to `next` keeping the image point under (cx, cy) in place; panning stays within the image's edges
  const zoomAt = useCallback(
    (next: number, cx: number, cy: number, animate = false) => {
      const l = layoutRef.current;
      const { s, x, y } = viewRef.current;
      const s2 = Math.min(MAX_ZOOM, Math.max(1, next));
      const clamp = (v: number, size: number) => Math.min(0, Math.max(size * (1 - s2), v));
      setView({ s: s2, x: clamp(cx - ((cx - x) / s) * s2, l.img.w), y: clamp(cy - ((cy - y) / s) * s2, l.img.h) }, animate);
    },
    [setView],
  );
  const panTo = (x: number, y: number) => {
    const l = layoutRef.current;
    const s = viewRef.current.s;
    setView({ s, x: Math.min(0, Math.max(l.img.w * (1 - s), x)), y: Math.min(0, Math.max(l.img.h * (1 - s), y)) });
  };
  const local = (clientX: number, clientY: number) => {
    const r = stageRef.current!.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };
  const zoomCentre = (next: number) => zoomAt(next, layout.img.w / 2, layout.img.h / 2, true);

  // Wheel needs a non-passive listener to stop the page from handling it
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = local(e.clientX, e.clientY);
      zoomAt(viewRef.current.s * Math.exp(-e.deltaY * 0.002), p.x, p.y);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // Pointers: one drags (when zoomed), two pinch; a quick second tap toggles 1× / 2.5×
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ view: View; a: { x: number; y: number }; dist: number; moved: boolean } | null>(null);
  const lastTap = useRef({ t: 0, x: 0, y: 0 });
  const lastPointerType = useRef("mouse");

  const startGesture = () => {
    const pts = Array.from(pointers.current.values());
    const a = pts.length === 2 ? { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 } : pts[0];
    const dist = pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
    gesture.current = { view: viewRef.current, a, dist, moved: false };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    lastPointerType.current = e.pointerType;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e.clientX, e.clientY));
    startGesture();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, local(e.clientX, e.clientY));
    const g = gesture.current;
    const pts = Array.from(pointers.current.values());
    if (pts.length === 2) {
      g.moved = true;
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const s2 = Math.min(MAX_ZOOM, Math.max(1, (g.view.s * Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)) / g.dist));
      // Keep the image point first under the fingers' midpoint under the moving midpoint
      const ux = (g.a.x - g.view.x) / g.view.s;
      const uy = (g.a.y - g.view.y) / g.view.s;
      viewRef.current = { ...viewRef.current, s: s2 };
      panTo(mid.x - ux * s2, mid.y - uy * s2);
    } else {
      const dx = pts[0].x - g.a.x;
      const dy = pts[0].y - g.a.y;
      if (Math.hypot(dx, dy) > 4) g.moved = true;
      if (g.view.s > 1) panTo(g.view.x + dx, g.view.y + dy);
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    const p = pointers.current.get(e.pointerId);
    pointers.current.delete(e.pointerId);
    if (pointers.current.size) return startGesture();
    gesture.current = null;
    if (e.pointerType !== "touch" || !p || g?.moved) return;
    const now = performance.now();
    const t = lastTap.current;
    if (now - t.t < 300 && Math.hypot(p.x - t.x, p.y - t.y) < 30) {
      lastTap.current = { t: 0, x: 0, y: 0 };
      if (viewRef.current.s > 1) setView(IDENTITY, true);
      else zoomAt(TAP_ZOOM, p.x, p.y, true);
    } else lastTap.current = { t: now, ...p };
  };
  const onDoubleClick = (e: React.MouseEvent) => {
    if (lastPointerType.current === "touch") return; // handled as a double-tap
    if (viewRef.current.s > 1) return setView(IDENTITY, true);
    const p = local(e.clientX, e.clientY);
    zoomAt(TAP_ZOOM, p.x, p.y, true);
  };

  const ease = "cubic-bezier(0.22, 1, 0.36, 1)";
  const flip = from
    ? `translate(${from.left - layout.frame.left}px, ${from.top - layout.frame.top}px) scale(${from.width / layout.frame.width}, ${from.height / layout.frame.height})`
    : "none";
  const fade = reduce ? "lightbox-fade transition-opacity duration-200" : "transition-opacity duration-[350ms]";
  const ctrl =
    "flex h-12 w-12 items-center justify-center border border-gold bg-bg/80 text-gold transition-[background-color,color,opacity] duration-200 hover:bg-gold hover:text-bg focus-visible:bg-gold focus-visible:text-bg aria-disabled:pointer-events-none aria-disabled:opacity-30";
  const zoomed = view.s > 1;
  const visible = shown || reduce ? "opacity-100" : "opacity-0";
  const column = layout.controls === "column";

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={image.alt}
      className={cn("fixed inset-0 z-[100]", reduce && fade, reduce && (shown ? "opacity-100" : "opacity-0"))}
    >
      {/* Darkened page; a click here closes */}
      <div aria-hidden="true" onClick={close} className={cn("absolute inset-0 bg-scrim/90 backdrop-blur-[4px]", !reduce && fade, visible)} />

      {/* Enlarged image on its off-white panel */}
      <div
        className="absolute origin-top-left border border-gold bg-paper p-4"
        style={{
          ...layout.frame,
          transform: shown || reduce ? "none" : flip,
          transition: reduce ? undefined : `transform ${DURATION}ms ${ease}`,
        }}
      >
        <div
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={onDoubleClick}
          className={cn("relative h-full w-full touch-none select-none overflow-hidden", zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in")}
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: layout.img.w,
              height: layout.img.h,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`,
              transition: smooth && !reduce ? `transform 250ms ${ease}` : undefined,
            }}
          >
            <Image key={image.src} src={image.fullSrc ?? image.src} alt={image.alt} fill unoptimized draggable={false} className="object-contain" />
          </div>
        </div>
        <CornerTicks className="inset-1" />
      </div>

      {/* Caption */}
      <p
        className={cn("pointer-events-none absolute pt-3 text-center text-small text-ink-muted", fade, visible)}
        style={{ left: layout.frame.left, top: layout.frame.top + layout.frame.height, width: layout.frame.width }}
      >
        {caption}
        {many && (
          <>
            <span className="mx-2 text-gold">·</span>
            <span className="whitespace-nowrap">
              {image.label} {String(index + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
            </span>
          </>
        )}
        <span className="mx-2 text-gold">·</span>
        <span className="whitespace-nowrap">{lightbox.escHint}</span>
      </p>

      {/* Controls: close first, zoom beside it (a column on wide screens, a row on narrow ones) */}
      <div className={cn("absolute right-4 top-4 flex gap-2", column ? "flex-col" : "flex-row-reverse", fade, visible)}>
        <button ref={closeRef} type="button" aria-label={lightbox.close} onClick={close} className={ctrl}>
          <Icon d="M5 5l14 14M19 5L5 19" />
        </button>
        <button type="button" aria-label={lightbox.zoomIn} aria-disabled={view.s >= MAX_ZOOM} onClick={() => zoomCentre(view.s * STEP)} className={ctrl}>
          <Icon d="M12 5v14M5 12h14" />
        </button>
        <button type="button" aria-label={lightbox.zoomOut} aria-disabled={!zoomed} onClick={() => zoomCentre(view.s / STEP)} className={ctrl}>
          <Icon d="M5 12h14" />
        </button>
        <button type="button" aria-label={lightbox.reset} aria-disabled={!zoomed} onClick={() => setView(IDENTITY, true)} className={ctrl}>
          <Icon d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" />
        </button>
      </div>

      {/* Previous / next: mid-height at the sides on wide screens, top-left on narrow ones */}
      {many && (
        <>
          {index > 0 && (
            <button
              type="button"
              aria-label={lightbox.previous}
              onClick={() => go(index - 1)}
              className={cn(ctrl, "absolute", fade, visible, column ? "left-4 top-1/2 -translate-y-1/2" : "left-4 top-4")}
            >
              <Icon d={CHEVRON.left} />
            </button>
          )}
          {index < images.length - 1 && (
            <button
              type="button"
              aria-label={lightbox.next}
              onClick={() => go(index + 1)}
              className={cn(ctrl, "absolute", fade, visible, column ? "right-4 top-[max(50%,17rem)] -translate-y-1/2" : "left-[4.5rem] top-4")}
            >
              <Icon d={CHEVRON.right} />
            </button>
          )}
        </>
      )}
    </div>,
    document.body,
  );
}
