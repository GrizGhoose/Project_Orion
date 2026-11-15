"use client";

import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { productShowcase } from "@/content/site";
import { cn } from "@/lib/cn";
import { GhostButton } from "./Buttons";
import { Eyebrow } from "./Eyebrow";
import { SpecTable } from "./SpecTable";

const EASE = [0.22, 1, 0.36, 1] as const;
// Sequence: lettering → image rise → callouts (dot, line, label), ~1.5 s in all
const T_IMAGE = 0.25;
const T_CALLOUTS = 0.75;
const STAGGER = 0.15;

type Line = { d: string; dot: { x: number; y: number } };

// Before the first measurement on the client, use the server-safe layout effect fallback
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Home product showcase: a cut-out product image over huge background lettering, with numbered callouts.
 * Desktop (lg+): gold dots on the parts, leader lines drawn to labels beside the image.
 * Mobile: numbered markers on the image and a numbered list below. Renders only from `productShowcase`.
 */
export function ProductShowcase() {
  const { eyebrow, word, heading, image, callouts, specs, cta } = productShowcase;
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageBoxRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLLIElement | null)[]>([]);
  const inView = useInView(sectionRef, { once: true, margin: "0px 0px -20% 0px" });
  const [lines, setLines] = useState<Line[]>([]);
  const [active, setActive] = useState<number | null>(null);

  // Leader lines in stage pixels: dot (on the part) → bend near the image edge, level with the label → label.
  // Uses layout offsets (not getBoundingClientRect) so the image's rise animation doesn't shift the dots.
  const measure = useCallback(() => {
    const el = imageBoxRef.current;
    if (!el || !stageRef.current) return;
    const box = { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight };
    setLines(
      callouts.map((c, i) => {
        const dot = { x: box.left + (c.x / 100) * box.width, y: box.top + (c.y / 100) * box.height };
        const label = labelRefs.current[i]; // positioned in a layer that shares the stage's origin
        if (!label || label.offsetWidth === 0) return { d: "", dot };
        const left = c.side === "left";
        const y = label.offsetTop + 9; // level with the number row
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
  const fade: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.6, ease: EASE } } };
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
  const labelV = (i: number): Variants => ({
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.35, delay: T_CALLOUTS + 0.3 + i * STAGGER } },
  });
  const dim = (i: number) => active !== null && active !== i;
  const hover = (i: number) => ({
    onMouseEnter: () => setActive(i),
    onMouseLeave: () => setActive(null),
  });

  return (
    <section ref={sectionRef} aria-labelledby="showcase-heading" className="relative overflow-hidden bg-bg py-section">
      <div className="container-page">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 id="showcase-heading" className="sr-only">
          {heading}
        </h2>
      </div>

      {/* Stage: lettering, image, dots, lines and desktop labels share these coordinates */}
      <div
        ref={stageRef}
        className="relative mx-auto mt-10 max-w-page px-gutter [--img-w:min(76vw,26rem)] lg:mt-6 lg:[--img-w:min(40vw,calc((100svh-12rem)*0.775),46rem)] xl:[--img-w:min(44vw,calc((100svh-12rem)*0.775),46rem)]"
      >
        {/* Background lettering (decorative) */}
        <motion.p
          aria-hidden="true"
          initial={initial}
          animate={show}
          variants={fade}
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none whitespace-nowrap text-center font-display text-[clamp(5.5rem,23vw,26rem)] font-bold uppercase leading-none tracking-[-0.05em] text-gold/10"
        >
          {word}
        </motion.p>

        {/* Product image with a soft dark shadow underneath */}
        <motion.div ref={imageBoxRef} initial={initial} animate={show} variants={rise} className="relative mx-auto w-[var(--img-w)]">
          <div
            aria-hidden="true"
            className="absolute inset-x-[-10%] bottom-[-6%] h-[30%] bg-[radial-gradient(closest-side,theme(colors.black/80%),transparent)]"
          />
          <Image
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            sizes="(min-width: 1024px) 46rem, 76vw"
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
            {/* Dimming lives on this inner layer: Framer Motion owns the outer span's opacity */}
            <span className={cn("absolute inset-0 flex items-center justify-center transition-opacity duration-200", dim(i) && "opacity-30")}>
              <span className={cn("absolute inset-0 border bg-bg/70 transition-colors", active === i ? "border-gold-bright" : "border-gold/60")} />
              <span className={cn("relative h-1.5 w-1.5 transition-colors", active === i ? "bg-gold-bright" : "bg-gold")} />
            </span>
          </motion.span>
        ))}

        {/* Desktop labels beside the image; vertical position follows labelY (or the dot's y) */}
        <ol className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden lg:block">
          {callouts.map((c, i) => {
            const left = c.side === "left";
            return (
              <motion.li
                key={c.number}
                ref={(el) => {
                  labelRefs.current[i] = el;
                }}
                tabIndex={0}
                aria-label={`${c.number} ${c.name}. ${c.description}`}
                {...hover(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                initial={initial}
                animate={show}
                variants={labelV(i)}
                className={cn(
                  "pointer-events-auto absolute w-[min(17rem,calc(50%-var(--img-w)/2-5rem))] cursor-default outline-none transition-opacity duration-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-8 focus-visible:outline-gold-bright",
                  left ? "right-[calc(50%+var(--img-w)/2+3rem)] text-right" : "left-[calc(50%+var(--img-w)/2+3rem)]",
                )}
                style={{ top: `${c.labelY ?? c.y}%` }}
              >
                <div className={cn("transition-opacity duration-200", dim(i) && "opacity-40")}>
                  <p className={cn("font-display text-small tabular-nums transition-colors", active === i ? "text-gold-bright" : "text-gold")}>
                    {c.number}
                  </p>
                  <p className="mt-2 font-display text-h3 text-ink">{c.name}</p>
                  <p className="mt-2 text-small">{c.description}</p>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>

      <div className="container-page">
        {/* Mobile: numbered list matching the markers */}
        <ol className="mt-12 border-t border-gold/40 lg:hidden">
          {callouts.map((c, i) => (
            <li key={c.number} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 border-b border-gold/40 py-6">
              <span className="flex h-6 w-6 items-center justify-center border border-gold text-[0.6875rem] font-medium tabular-nums text-gold">
                {i + 1}
              </span>
              <div>
                <p className="font-display text-h3 text-ink">{c.name}</p>
                <p className="mt-2 text-small">{c.description}</p>
              </div>
            </li>
          ))}
        </ol>

        <SpecTable specs={specs} layout="strip" className="mt-12 lg:mt-16" />
        <GhostButton href={cta.href} className="mt-10">
          {cta.label}
        </GhostButton>
      </div>
    </section>
  );
}
