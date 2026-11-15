"use client";

import { useReducedMotion } from "framer-motion";
import type { ImageRef } from "@/content/site";
import { ImageSlot } from "./ImageSlot";

/**
 * Full-bleed background: a muted looping video when `video` is set (poster shown with reduced motion),
 * otherwise the poster image slot. Includes the dark overlays that keep hero text readable.
 */
export function HeroMedia({ video, poster }: { video?: string; poster: ImageRef }) {
  const reduce = useReducedMotion();
  return (
    <div className="absolute inset-0">
      {/* TODO(motion): subtle parallax on this layer could go here (left out of the first pass). */}
      {video && !reduce ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={video}
          poster={poster.src}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
        />
      ) : (
        <ImageSlot {...poster} bordered={false} priority labelPlacement="corner" fill />
      )}
      {/* Readability overlays: darker at the bottom where the text sits, and at the top under the header */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-bg/20" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-bg/70 to-transparent" />
    </div>
  );
}
