"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Callout, ShowcaseProduct } from "@/content/site";
import { cn } from "@/lib/cn";
import { ImageSlot } from "./ImageSlot";
import { InfoBox } from "./InfoBox";
import { SpecTable } from "./SpecTable";

const EASE = [0.22, 1, 0.36, 1] as const;
// Entrance: word → Device box → visual → leader lines → callouts 01–03 → Anchor box (~1.5 s)
const T_DEVICE = 0.15;
const T_VISUAL = 0.3;
const T_LINES = 0.75;
const T_CALLOUTS = 0.85;
const STAGGER = 0.15;
const T_ANCHOR = T_CALLOUTS + 2 * STAGGER + 0.2;
// While the entrance runs, lines are redrawn every frame so they follow the moving visual (e.g. the swinging tablet)
const FOLLOW_MS = 2200;
// Same size on every slide
const WORD_SIZE = "clamp(140px, 31vw, 620px)";

type Line = { d: string };

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
  /** Reports the visual's vertical centre (px from the slide top), used to place the mobile arrows */
  onVisualCenter?: (y: number) => void;
};

/**
 * One product: background word, visual (cut-out photo, angled tablet or angled visor), three callouts with dots and
 * leader lines, Device box (top left), Anchor box (bottom right) and spec strip.
 * Layout per breakpoint is `.showcase-grid`; the tablet and visor poses are `.tablet` / `.visor` (all in globals.css).
 */
export function ProductSlide({ product, index, total, active, play, onVisualCenter }: ProductSlideProps) {
  const { kind, name, backgroundWord, image, imageSlot, device, anchor, callouts, specs } = product;
  const reduce = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [activeCallout, setActiveCallout] = useState<number | null>(null);

  // One line function for every slide. Dots: screen position via getBoundingClientRect (so 3D-tilted dots on the
  // tablet and visor are exact), relative to the stage's rect; the track's translateX cancels out. Label ends: layout
  // offsets. Path: short horizontal run out of the label, then an angled run to the dot; when the dot is closer
  // than that run, one straight line instead, so a line never doubles back on itself.
  const measure = useCallback(() => {
    const stage = stageRef.current;
    const visual = visualRef.current;
    if (!stage || !visual) return;
    onVisualCenter?.(stage.offsetTop + visual.offsetTop + visual.offsetHeight / 2);
    const s = stage.getBoundingClientRect();
    const visualMid = visual.offsetLeft + visual.offsetWidth / 2;
    setLines(
      callouts.map((_, i) => {
        const dotEl = dotRefs.current[i];
        const label = labelRefs.current[i];
        if (!dotEl || !label || label.offsetWidth === 0) return { d: "" };
        const r = dotEl.getBoundingClientRect();
        const dot = { x: r.left - s.left, y: r.top - s.top };
        const left = label.offsetLeft + label.offsetWidth / 2 < visualMid;
        const y = label.offsetTop + 15; // middle of the title line
        const end = left ? label.offsetLeft + label.offsetWidth + 24 : label.offsetLeft - 24; // clear of the label backing
        const run = 48; // horizontal run out of the label
        const bendX = left ? end + run : end - run;
        const tooClose = left ? dot.x <= bendX : dot.x >= bendX;
        return { d: tooClose ? `M${dot.x},${dot.y} L${end},${y}` : `M${dot.x},${dot.y} L${bendX},${y} L${end},${y}` };
      }),
    );
  }, [callouts, onVisualCenter]);

  useIsoLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (stageRef.current) ro.observe(stageRef.current);
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  // Follow the visual while its entrance (rise or tablet swing) plays
  useEffect(() => {
    measure();
    if (!play || reduce) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      measure();
      if (now - start < FOLLOW_MS) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [play, reduce, measure]);

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

  // Dots sit inside the visual (inside the screen for the tablet), positioned in % so they move with it.
  // Each anchor is a 0×0 point: its rect is the exact dot position, even when tilted in 3D.
  const dots = callouts.map((c, i) => (
    <span
      key={c.number}
      ref={(el) => {
        dotRefs.current[i] = el;
      }}
      className="absolute z-10 h-0 w-0"
      style={{ left: `${c.x}%`, top: `${c.y}%` }}
    >
      {/* Desktop: gold diamond */}
      <motion.span
        aria-hidden="true"
        {...hover(i)}
        initial={initial}
        animate={state}
        variants={dotV(i)}
        className="absolute left-0 top-0 hidden lg:block"
      >
        <span
          className={cn(
            "absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border bg-bg/70 transition-[opacity,border-color] duration-200",
            activeCallout === i ? "border-gold-bright" : "border-gold",
            dim(i) && "opacity-30",
          )}
        >
          <span className={cn("absolute inset-[3px] transition-colors", activeCallout === i ? "bg-gold-bright" : "bg-gold")} />
        </span>
      </motion.span>
      {/* Mobile: numbered marker */}
      <span
        aria-hidden="true"
        className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center border border-gold bg-bg text-[0.6875rem] font-medium tabular-nums text-gold lg:hidden"
      >
        {i + 1}
      </span>
    </span>
  ));

  const tablet = kind === "tablet";
  const visor = kind === "visor";
  // Below 1280px the labels stack beside the visual in dot order (top dot first), so lines can't cross, unless `lgRow` says otherwise
  const lgRank = callouts.map((c) => c.lgRow ?? callouts.filter((o) => o.y < c.y).length + 1);
  const playing = Boolean(reduce || play);

  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${total}: ${name}`}
      inert={!active}
      className="relative flex w-full shrink-0 flex-col justify-center overflow-hidden px-4 pb-32 pt-20 sm:px-gutter lg:px-[6.5rem] lg:pt-24 xl:px-[7rem]"
    >
      <h2 className="sr-only">{name}</h2>

      {/* Stage: one grid; word, dots and lines share its coordinates */}
      <div
        ref={stageRef}
        className={cn(
          "showcase-grid relative isolate mx-auto w-full max-w-page",
          tablet
            ? "[--img-w:76%] lg:[--img-w:38vw] xl:[--img-w:min(38vw,700px)]"
            : visor
              ? "[--img-w:76%] lg:[--img-w:38vw] xl:[--img-w:min(40vw,740px)]"
            : "[--img-w:min(66vw,22rem)] lg:[--img-w:40vw] xl:[--img-w:min(32vw,calc((100svh-10rem)*0.775),38rem)]",
        )}
      >
        <motion.div initial={initial} animate={state} variants={fadeAt(T_DEVICE, 24)} className="[grid-area:device]">
          <InfoBox content={device} />
        </motion.div>

        {/* Background word (decorative): outlined gold with a faint gradient fill, centred on the visual */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 [grid-area:img]">
          <motion.p
            initial={initial}
            animate={state}
            variants={fadeAt(0)}
            style={{ fontSize: WORD_SIZE }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap bg-gradient-to-b from-gold/[0.16] to-gold/[0.03] bg-clip-text font-display font-bold uppercase leading-[0.8] tracking-[-0.05em] text-transparent [-webkit-text-stroke:1.5px_theme(colors.gold/35%)]"
          >
            {backgroundWord}
          </motion.p>
        </div>

        {/* Visual */}
        <motion.div
          ref={visualRef}
          initial={initial}
          animate={state}
          variants={tablet || visor ? fadeAt(T_VISUAL) : fadeAt(T_VISUAL, 32)}
          className="relative mx-auto w-[var(--img-w)] self-center [grid-area:img]"
        >
          {tablet && image ? (
            // Angled tablet, centred in its column. The tilt makes its outline lean right, so from xl it's nudged
            // left by 1.5vw to keep equal clearance from the callouts on both sides
            <div className="tablet-scene xl:-translate-x-[1.5vw]">
              <div
                role="img"
                aria-label={image.alt}
                data-play={playing}
                className="tablet"
                style={{ "--tablet-delay": `${T_VISUAL}s` } as React.CSSProperties}
              >
                <span aria-hidden="true" className="tablet-camera" />
                <div className="tablet-screen">
                  <Image
                    src={image.src}
                    alt=""
                    fill
                    quality={90}
                    sizes="(min-width: 1280px) min(38vw, 700px), (min-width: 1024px) 38vw, 76vw"
                    className="object-cover"
                  />
                  {/* Diagonal glare */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,theme(colors.white/10%),transparent_38%)]"
                  />
                  {dots}
                </div>
              </div>
            </div>
          ) : visor && image ? (
            // Angled visor, right side nearer, centred in its column. The tilt shifts its outline left, so from xl
            // it's nudged right by 0.7vw to keep equal clearance from the callouts on both sides
            <div className="tablet-scene xl:translate-x-[0.7vw]">
              <div
                role="img"
                aria-label={image.alt}
                data-play={playing}
                className="visor"
                style={{ "--tablet-delay": `${T_VISUAL}s` } as React.CSSProperties}
              >
                {/* Glass box: the clipped glass plus an unclipped layer for the dots, both % of the same box */}
                <div className="relative h-full">
                  <div className="visor-glass">
                    <Image
                      src={image.src}
                      alt=""
                      fill
                      quality={90}
                      sizes="(min-width: 1280px) min(40vw, 740px), (min-width: 1024px) 38vw, 76vw"
                      className="object-cover"
                    />
                  </div>
                  {dots}
                </div>
              </div>
            </div>
          ) : (
            <>
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
              {dots}
            </>
          )}
        </motion.div>

        {/* Desktop callout labels: placed by `position` from xl, stacked in dot order below that */}
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
            style={{ "--lg-area": `s${lgRank[i]}`, "--xl-area": c.position } as React.CSSProperties}
            className={cn(
              "showcase-label hidden w-full max-w-[340px] cursor-default outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-8 focus-visible:outline-gold-bright lg:block",
              c.labelAlign === "start" ? "self-start" : c.labelAlign === "end" ? "self-end" : "self-center",
              c.position.startsWith("left") && "xl:ml-auto xl:text-right",
            )}
          >
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

        {/* Mobile: numbered list; each "01" matches marker 1 on the visual */}
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

        {/* Desktop leader lines */}
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 hidden h-full w-full overflow-visible lg:block">
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
      </div>

      {specs && specs.length > 0 && (
        <div className="mx-auto w-full max-w-page">
          <SpecTable specs={specs} className="mt-16" />
        </div>
      )}
    </div>
  );
}
