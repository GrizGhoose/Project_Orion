"use client";

import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { productShowcase, type Callout } from "@/content/site";
import { cn } from "@/lib/cn";
import { GhostButton } from "./Buttons";
import { InfoBox } from "./InfoBox";
import { SpecTable } from "./SpecTable";

const EASE = [0.22, 1, 0.36, 1] as const;
// Sequence: lettering → Device box → image rise → callouts (dot, line, label) → Anchor box, ~1.7 s in all
const T_DEVICE = 0.3;
const T_IMAGE = 0.35;
const T_CALLOUTS = 0.85;
const STAGGER = 0.15;
const T_ANCHOR = T_CALLOUTS + 3 * STAGGER + 0.35;

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

/**
 * Home product showcase: cut-out hardware over huge background lettering, three callouts and two standalone
 * caption boxes (Device top left, Anchor bottom right). Layout per breakpoint is `.showcase-grid` in globals.css.
 * Desktop (lg+): dots on the parts with leader lines to the labels. Mobile: numbered markers and a numbered list.
 * Renders only from `productShowcase` in content/site.ts.
 */
export function ProductShowcase() {
  const { word, heading, image, callouts, specs, cta, device, anchor } = productShowcase;
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageBoxRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLLIElement | null)[]>([]);
  const inView = useInView(sectionRef, { once: true, margin: "0px 0px -20% 0px" });
  const [lines, setLines] = useState<Line[]>([]);
  const [active, setActive] = useState<number | null>(null);

  // Leader lines in stage pixels: dot → bend just inside the image edge, level with the label's title → label.
  // Layout offsets (not getBoundingClientRect) so the image's rise animation doesn't shift the dots.
  const measure = useCallback(() => {
    const el = imageBoxRef.current;
    if (!el || !stageRef.current) return;
    const box = { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight };
    setLines(
      callouts.map((c, i) => {
        const dot = { x: box.left + (c.x / 100) * box.width, y: box.top + (c.y / 100) * box.height };
        const label = labelRefs.current[i];
        if (!label || label.offsetWidth === 0) return { d: "", dot };
        const left = c.side === "left";
        const y = label.offsetTop + 15; // middle of the title line
        const end = left ? label.offsetLeft + label.offsetWidth + 16 : label.offsetLeft - 16;
        const edge = left ? box.left + box.width * 0.04 : box.left + box.width * 0.96;
        const bendX = left ? Math.min(dot.x, edge) : Math.max(dot.x, edge);
        const d = Math.abs(y - dot.y) < 2 ? `M${dot.x},${dot.y} L${end},${dot.y}` : `M${dot.x},${dot.y} L${bendX},${y} L${end},${y}`;
        return { d, dot };
      }),
    );
  }, [callouts]);

  useIsoLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (stageRef.current) ro.observe(stageRef.current);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [measure]);

  const show = reduce || inView ? "show" : "hidden";
  const initial = reduce ? false : "hidden";
  const fadeAt = (delay: number): Variants => ({
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.5, delay, ease: EASE } },
  });
  const rise: Variants = {
    hidden: { opacity: 0, y: 32 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, delay: T_IMAGE, ease: EASE } },
  };
  const dotV = (i: number): Variants => ({
    hidden: { opacity: 0, scale: 0 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.2, delay: T_CALLOUTS + i * STAGGER } },
  });
  const lineV = (i: number): Variants => ({
    hidden: { pathLength: 0, opacity: 0 },
    show: { pathLength: 1, opacity: 1, transition: { duration: 0.45, delay: T_CALLOUTS + 0.1 + i * STAGGER, ease: EASE } },
  });
  const dim = (i: number) => active !== null && active !== i;
  const hover = (i: number) => ({ onMouseEnter: () => setActive(i), onMouseLeave: () => setActive(null) });

  const label = (c: Callout, i: number) => (
    <motion.li
      key={c.number}
      ref={(el) => {
        labelRefs.current[i] = el;
      }}
      tabIndex={0}
      {...hover(i)}
      onFocus={() => setActive(i)}
      onBlur={() => setActive(null)}
      initial={initial}
      animate={show}
      variants={fadeAt(T_CALLOUTS + 0.3 + i * STAGGER)}
      className={cn(
        "w-full max-w-[340px] cursor-default outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-8 focus-visible:outline-gold-bright",
        c.side === "left" ? "ml-auto text-right" : "mr-auto",
      )}
    >
      {/* Dimming lives on this inner layer: Framer Motion owns the li's opacity */}
      <div className={cn("transition-opacity duration-200", dim(i) && "opacity-40", active === i && "[&_.text-gold]:text-gold-bright")}>
        <CalloutText c={c} />
      </div>
    </motion.li>
  );
  const indexed = callouts.map((c, i) => ({ c, i }));

  return (
    <section ref={sectionRef} aria-labelledby="showcase-heading" className="relative overflow-hidden bg-bg py-section">
      <h2 id="showcase-heading" className="sr-only">
        {heading}
      </h2>

      {/* Stage: one grid (.showcase-grid); lettering, dots and lines share its coordinates */}
      <div
        ref={stageRef}
        className="showcase-grid container-page relative isolate [--img-w:min(76vw,26rem)] lg:[--img-w:34vw] xl:[--img-w:min(38vw,calc((100svh-10rem)*0.775),40rem)]"
      >
        <motion.div initial={initial} animate={show} variants={fadeAt(T_DEVICE)} className="[grid-area:device]">
          <InfoBox content={device} />
        </motion.div>

        {/* Background lettering (decorative), centred on the image and allowed to run past it */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 [grid-area:img]">
          <motion.p
            initial={initial}
            animate={show}
            variants={fadeAt(0)}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap font-display text-[clamp(5.5rem,23vw,26rem)] font-bold uppercase leading-none tracking-[-0.05em] text-gold/10"
          >
            {word}
          </motion.p>
        </div>

        {/* Product image with a soft dark shadow underneath */}
        <motion.div
          ref={imageBoxRef}
          initial={initial}
          animate={show}
          variants={rise}
          className="relative mx-auto w-[var(--img-w)] self-center [grid-area:img]"
        >
          <div
            aria-hidden="true"
            className="absolute inset-x-[-10%] bottom-[-6%] h-[30%] bg-[radial-gradient(closest-side,theme(colors.black/80%),transparent)]"
          />
          <Image
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            sizes="(min-width: 1280px) 40rem, (min-width: 1024px) 34vw, 76vw"
            className="relative h-auto w-full"
          />
          {/* Mobile: numbered markers on the parts */}
          {callouts.map((c, i) => (
            <span
              key={c.number}
              aria-hidden="true"
              className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center border border-gold bg-bg text-[0.6875rem] font-medium tabular-nums text-gold lg:hidden"
              style={{ left: `${c.x}%`, top: `${c.y}%` }}
            >
              {i + 1}
            </span>
          ))}
        </motion.div>

        {/* Desktop callout labels: left column stacks in list order with ≥48px gaps, right column holds the rest */}
        <ol className="hidden flex-col justify-around gap-12 [grid-area:left] lg:flex">
          {indexed.filter(({ c }) => c.side === "left").map(({ c, i }) => label(c, i))}
        </ol>
        <ol className="hidden flex-col justify-center gap-12 [grid-area:right] lg:flex">
          {indexed.filter(({ c }) => c.side === "right").map(({ c, i }) => label(c, i))}
        </ol>

        {/* Mobile: numbered list; each "01" matches marker 1 on the image */}
        <ol className="border-t border-gold/40 [grid-area:mlist] lg:hidden">
          {callouts.map((c) => (
            <li key={c.number} className="border-b border-gold/40 py-6">
              <CalloutText c={c} />
            </li>
          ))}
        </ol>

        <motion.div initial={initial} animate={show} variants={fadeAt(T_ANCHOR)} className="self-end [grid-area:anchor] lg:flex lg:justify-end">
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
                  className={cn("transition-colors duration-200", active === i ? "stroke-gold-bright" : "stroke-gold")}
                  initial={initial}
                  animate={show}
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
            animate={show}
            variants={dotV(i)}
            className="absolute hidden h-4 w-4 -translate-x-1/2 -translate-y-1/2 lg:block"
            style={{ left: line.dot.x, top: line.dot.y }}
          >
            <span className={cn("absolute inset-0 flex items-center justify-center transition-opacity duration-200", dim(i) && "opacity-30")}>
              <span className={cn("absolute inset-0 border bg-bg/70 transition-colors", active === i ? "border-gold-bright" : "border-gold/60")} />
              <span className={cn("relative h-1.5 w-1.5 transition-colors", active === i ? "bg-gold-bright" : "bg-gold")} />
            </span>
          </motion.span>
        ))}
      </div>

      <div className="container-page">
        <SpecTable specs={specs} layout="strip" className="mt-16" />
        <GhostButton href={cta.href} className="mt-10">
          {cta.label}
        </GhostButton>
      </div>
    </section>
  );
}
