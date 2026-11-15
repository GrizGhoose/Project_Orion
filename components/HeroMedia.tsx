"use client";

import { useReducedMotion } from "framer-motion";
import Image from "next/image";

/**
 * Full-bleed hero background: a muted looping video when `video` is set (the image is its poster, and is shown
 * instead with reduced motion), otherwise the image with a very slow zoom. Includes the dark overlays that keep
 * the text readable.
 */
export function HeroMedia({ video, image }: { video?: string; image: { src: string; alt: string } }) {
  const reduce = useReducedMotion();
  return (
    <div className="absolute inset-0 overflow-hidden">
      {video && !reduce ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={video}
          poster={image.src}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
        />
      ) : (
        <Image src={image.src} alt={image.alt} fill priority sizes="100vw" className="hero-zoom object-cover object-[60%_30%]" />
      )}
      {/* Readability overlays: darker towards the bottom-left where the text sits */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-bg via-bg/75 to-bg/25" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-bg/80 via-bg/30 to-transparent" />
    </div>
  );
}
