"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { hero } from "@/content/site";
import { cn } from "@/lib/cn";
import { GhostButton, GoldButton } from "./Buttons";
import { Eyebrow } from "./Eyebrow";
import { HeroMedia } from "./HeroMedia";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Project Orion introduction: full-viewport background, eyebrow, headline (the page's h1), supporting paragraph,
 * two buttons and a row of key facts, all bottom-left; a "Scroll" cue sits bottom-right. Text fades and rises in,
 * staggered over ~1.2 s (fade only with reduced motion).
 */
export function Hero() {
  const reduce = useReducedMotion();
  const item: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 24 },
    show: { opacity: 1, y: 0, transition: { duration: reduce ? 0.2 : 0.7, ease: EASE } },
  };
  const list: Variants = { hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.12, delayChildren: 0.1 } } };

  return (
    <section aria-labelledby="hero-heading" className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden bg-bg">
      <HeroMedia video={hero.video} image={hero.image} />

      <motion.div initial="hidden" animate="show" variants={list} className="container-page relative pb-8 pt-24 md:pb-14">
        <motion.div variants={item}>
          <Eyebrow className="mb-6 leading-relaxed">{hero.eyebrow}</Eyebrow>
        </motion.div>
        <motion.h1
          id="hero-heading"
          variants={item}
          className="max-w-5xl text-[clamp(2.25rem,5vw,4.5rem)] font-medium leading-[1.02] tracking-[-0.03em]"
        >
          {hero.headline}
        </motion.h1>
        <motion.p variants={item} className="mt-6 max-w-[46rem] text-lead text-ink md:mt-8">
          {hero.body}
        </motion.p>
        <motion.div variants={item} className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4 md:mt-10">
          <GoldButton href={hero.primary.href} className="w-full sm:w-auto">
            {hero.primary.label}
          </GoldButton>
          <GhostButton href={hero.secondary.href} className="w-full bg-bg/40 sm:w-auto">
            {hero.secondary.label}
          </GhostButton>
        </motion.div>

        {/* Key facts */}
        <motion.dl variants={item} className="mt-10 grid max-w-3xl grid-cols-3 border-t border-gold/40 md:mt-14">
          {hero.facts.map((f, i) => (
            // Label first for screen readers (dt before dd); the number shows on top
            <div
              key={f.label}
              className={cn("flex flex-col-reverse justify-end pt-5", i > 0 ? "border-l border-gold/40 pl-3 sm:pl-6" : "pr-3 sm:pr-6")}
            >
              <dt className="mt-3 font-eyebrow text-[0.6875rem] uppercase leading-snug tracking-[0.14em] text-ink-muted sm:text-eyebrow">
                {f.label}
              </dt>
              <dd className="font-display text-[clamp(1.75rem,4vw,2.75rem)] font-medium leading-none tracking-[-0.02em] text-gold">
                {f.value}
              </dd>
            </div>
          ))}
        </motion.dl>
      </motion.div>

      {/* Scroll cue */}
      <div aria-hidden="true" className="absolute bottom-10 right-gutter hidden flex-col items-center gap-3 md:flex md:bottom-14">
        <span className="font-eyebrow text-eyebrow uppercase text-ink-muted [writing-mode:vertical-rl]">{hero.scrollCue}</span>
        <span className="relative h-16 w-px bg-gold/20">
          <span className="scroll-line absolute inset-0 bg-gold" />
        </span>
      </div>
    </section>
  );
}
