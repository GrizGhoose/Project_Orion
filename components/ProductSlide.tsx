"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Callout, ShowcaseProduct } from "@/content/site";
import { cn } from "@/lib/cn";
import { GhostButton } from "./Buttons";
import { ImageSlot } from "./ImageSlot";
import { InfoBox } from "./InfoBox";
import { SpecTable } from "./SpecTable";

const EASE = [0.22, 1, 0.36, 1] as const;
// Entrance: word → Device box → image → leader lines → callouts 01–03 → Anchor box (~1.5 s)
const T_DEVICE = 0.15;
const T_IMAGE = 0.3;
const T_LINES = 0.7;
const T_CALLOUTS = 0.8;
const STAGGER = 0.15;
const T_ANCHOR = T_CALLOUTS + 2 * STAGGER + 0.2;

type Line = { d: string; dot: { x: number; y: number } };

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Number · name on one line, model in gold below, then body and an optional smaller secondary line. */
function CalloutText({ c }: { c: Callout }) {
  return (
    <>
      <p className="font-display text-h3">
        <span className="tabular-nums text-gold">{c.number}</span>
        <span className="text-gold"> · </span>
        <span className="text-ink">{c.name}</span>
      </p>
      <p className="mt-1 font-display text-body text-gold">{c.model}</p>
      <p className="mt-3 text-body">{c.body}</p>
      {c.secondary && <p className="mt-3 text-small">{c.secondary}</p>}
    </>
  );
}

type ProductSlideProps = {
  product: ShowcaseProduct;
  index: number;
  total: number;
  /** The slide currently shown (others are inert) */
  active: boolean;
  /** Run the entrance sequence; false resets it so it replays next time */
  play: boolean;
  /** Reports the image's vertical centre (px from the slide top), used to place the mobile arrows */
  onImageCenter?: (y: number) => void;
};

/**
 * One product: huge background word, cut-out image (or ImageSlot), three callouts with dots and leader lines,
 * Device box (top left), Anchor box (bottom right) and spec strip. Layout per breakpoint is `.showcase-grid`.
 */
export function ProductSlide({ product, index, total, active, play, onImageCenter }: ProductSlideProps) {
  const { name, backgroundWord, image, imageSlot, device, anchor, callouts, specs, cta } = product;
  const reduce = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const imageBoxRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [activeCallout, setActiveCallout] = useState<number | null>(null);

  // Leader lines in stage pixels: dot → bend just inside the image edge, level with the label's title → label.
  // Layout offsets only (not getBoundingClientRect): entrance transforms and the track's translateX don't move them.
  const measure = useCallback(() => {
    const el = imageBoxRef.current;
    const stage = stageRef.current;
    if (!el || !stage) return;
    const box = { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight };
    onImageCenter?.(stage.offsetTop + box.top + box.height / 2);
    setLines(
      callouts.map((c, i) => {
        const dot = { x: box.left + (c.x / 100) * box.width, y: box.top + (c.y / 100) * box.height };
        const label = labelRefs.current[i];
        if (!label || label.offsetWidth === 0) return { d: "", dot };
        // Which side the label landed on decides the line's direction
        const left = label.offsetLeft + label.offsetWidth / 2 < box.left + box.width / 2;
        const y = label.offsetTop + 15; // middle of the title line
        const end = left ? label.offsetLeft + label.offsetWidth + 24 : label.offsetLeft - 24; // clear of the label's backing
        const edge = left ? box.left + box.width * 0.04 : box.left + box.width * 0.96;
        const bendX = left ? Math.min(dot.x, edge) : Math.max(dot.x, edge);
        const d = Math.abs(y - dot.y) < 2 ? `M${dot.x},${dot.y} L${end},${dot.y}` : `M${dot.x},${dot.y} L${bendX},${y} L${end},${y}`;
        return { d, dot };
      }),
    );
  }, [callouts, onImageCenter]);

  useIsoLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (stageRef.current) ro.observe(stageRef.current);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [measure]);

  const state = reduce || play ? "show" : "hidden";
  const initial = reduce ? false : "hidden";
  // Only animate y when asked: an animated transform would override Tailwind's translate classes (e.g. centring)
  const fadeAt = (delay: number, y?: number): Variants => ({
    hidden: { opacity: 0, ...(y !== undefined && { y }), transition: { duration: 0 } },
    show: { opacity: 1, ...(y !== undefined && { y: 0 }), transition: { duration: 0.5, delay, ease: EASE } },
  });
  const lineV = (i: number): Variants => ({
    hidden: { pathLength: 0, opacity: 0, transition: { duration: 0 } },
    show: { pathLength: 1, opacity: 1, transition: { duration: 0.45, delay: T_LINES + i * STAGGER, ease: EASE } },
  });
  const dotV = (i: number): Variants => ({
    hidden: { opacity: 0, scale: 0, transition: { duration: 0 } },
    show: { opacity: 1, scale: 1, transition: { duration: 0.2, delay: T_LINES + i * STAGGER } },
  });
  const dim = (i: number) => activeCallout !== null && activeCallout !== i;
  const hover = (i: number) => ({ onMouseEnter: () => setActiveCallout(i), onMouseLeave: () => setActiveCallout(null) });

  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${total}: ${name}`}
      inert={!active}
      className="relative flex w-full shrink-0 flex-col justify-center overflow-hidden px-4 pb-32 pt-20 sm:px-gutter lg:px-[6.5rem] lg:pt-24 xl:px-[7rem]"
    >
      <h2 className="sr-only">{name}</h2>

      {/* Stage: one grid; lettering, dots and lines share its coordinates */}
      <div
        ref={stageRef}
        className="showcase-grid relative isolate mx-auto w-full max-w-page [--img-w:min(66vw,22rem)] lg:[--img-w:40vw] xl:[--img-w:min(32vw,calc((100svh-10rem)*0.775),38rem)]"
      >
        <motion.div initial={initial} animate={state} variants={fadeAt(T_DEVICE, 24)} className="[grid-area:device]">
          <InfoBox content={device} />
        </motion.div>

        {/* Background word (decorative): outlined gold with a faint gradient fill, centred on the image */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 [grid-area:img]">
          <motion.p
            initial={initial}
            animate={state}
            variants={fadeAt(0)}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap bg-gradient-to-b from-gold/[0.16] to-gold/[0.03] bg-clip-text font-display text-[clamp(140px,31vw,620px)] font-bold uppercase leading-[0.8] tracking-[-0.05em] text-transparent [-webkit-text-stroke:1.5px_theme(colors.gold/35%)]"
          >
            {backgroundWord}
          </motion.p>
        </div>

        {/* Product image (or placeholder slot) with a soft dark shadow underneath */}
        <motion.div
          ref={imageBoxRef}
          initial={initial}
          animate={state}
          variants={fadeAt(T_IMAGE, 32)}
          className="relative mx-auto w-[var(--img-w)] self-center [grid-area:img]"
        >
          <div
            aria-hidden="true"
            className="absolute inset-x-[-10%] bottom-[-6%] h-[30%] bg-[radial-gradient(closest-side,theme(colors.black/80%),transparent)]"
          />
          {image ? (
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              sizes="(min-width: 1280px) 38rem, (min-width: 1024px) 40vw, 66vw"
              className="relative h-auto w-full"
            />
          ) : (
            <ImageSlot
              slot={imageSlot?.slot ?? `${product.id}.png`}
              size={imageSlot?.size ?? "transparent PNG"}
              alt={imageSlot?.alt ?? name}
              className="aspect-[4/5] w-full"
            />
          )}
          {/* Mobile: numbered markers on the parts */}
          {callouts.map((c, i) => (
            <span
              key={c.number}
              aria-hidden="true"
              className="absolute z-10 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center border border-gold bg-bg text-[0.6875rem] font-medium tabular-nums text-gold lg:hidden"
              style={{ left: `${c.x}%`, top: `${c.y}%` }}
            >
              {i + 1}
            </span>
          ))}
        </motion.div>

        {/* Desktop callout labels in grid areas c1–c3 (left of the image at xl for 01 and 03) */}
        {callouts.map((c, i) => (
          <motion.div
            key={c.number}
            ref={(el) => {
              labelRefs.current[i] = el;
            }}
            tabIndex={0}
            {...hover(i)}
            onFocus={() => setActiveCallout(i)}
            onBlur={() => setActiveCallout(null)}
            initial={initial}
            animate={state}
            variants={fadeAt(T_CALLOUTS + i * STAGGER)}
            style={{ gridArea: `c${i + 1}` }}
            className={cn(
              "hidden w-full max-w-[340px] cursor-default self-center outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-8 focus-visible:outline-gold-bright lg:block",
              i !== 1 && "xl:ml-auto xl:text-right",
            )}
          >
            {/* Dimming lives on this inner layer: Framer Motion owns the li's opacity */}
            {/* Semi-opaque backing keeps the text readable over the background word's outline */}
            <div
              className={cn(
                "-m-3 bg-bg/80 p-3 transition-opacity duration-200",
                dim(i) && "opacity-40",
                activeCallout === i && "[&_.text-gold]:text-gold-bright",
              )}
            >
              <CalloutText c={c} />
            </div>
          </motion.div>
        ))}

        {/* Mobile: numbered list; each "01" matches marker 1 on the image */}
        <ol className="border-t border-gold/40 [grid-area:mlist] lg:hidden">
          {callouts.map((c) => (
            <li key={c.number} className="border-b border-gold/40 py-6">
              <CalloutText c={c} />
            </li>
          ))}
        </ol>

        <motion.div initial={initial} animate={state} variants={fadeAt(T_ANCHOR)} className="self-end [grid-area:anchor] lg:flex lg:justify-end">
          <InfoBox content={anchor} />
        </motion.div>

        {/* Desktop: leader lines and dots */}
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible lg:block">
          {lines.map((line, i) => (
            <g key={i} className={cn("transition-opacity duration-200", dim(i) && "opacity-30")}>
              {line.d && (
                <motion.path
                  d={line.d}
                  fill="none"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  className={cn("transition-colors duration-200", activeCallout === i ? "stroke-gold-bright" : "stroke-gold")}
                  initial={initial}
                  animate={state}
                  variants={lineV(i)}
                />
              )}
            </g>
          ))}
        </svg>
        {lines.map((line, i) => (
          <motion.span
            key={i}
            aria-hidden="true"
            {...hover(i)}
            initial={initial}
            animate={state}
            variants={dotV(i)}
            className="absolute hidden h-4 w-4 -translate-x-1/2 -translate-y-1/2 lg:block"
            style={{ left: line.dot.x, top: line.dot.y }}
          >
            <span className={cn("absolute inset-0 flex items-center justify-center transition-opacity duration-200", dim(i) && "opacity-30")}>
              <span className={cn("absolute inset-0 border bg-bg/70 transition-colors", activeCallout === i ? "border-gold-bright" : "border-gold/60")} />
              <span className={cn("relative h-1.5 w-1.5 transition-colors", activeCallout === i ? "bg-gold-bright" : "bg-gold")} />
            </span>
          </motion.span>
        ))}
      </div>

      {(specs?.length || cta) && (
        <div className="mx-auto w-full max-w-page">
          {specs && specs.length > 0 && <SpecTable specs={specs} layout="strip" className="mt-16" />}
          {cta && (
            <GhostButton href={cta.href} className="mt-10">
              {cta.label}
            </GhostButton>
          )}
        </div>
      )}
    </div>
  );
}
