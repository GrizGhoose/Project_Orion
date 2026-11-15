"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gallery, type MilestoneVideo } from "@/content/site";
import { CornerTicks } from "./CornerTicks";

/**
 * Framed milestone video: the poster with a centred gold play button until pressed, then the native player with
 * sound. Loads metadata only, never autoplays. `active` false (e.g. its gallery moved on) pauses it.
 */
export function VideoPlayer({ video, active = true, sizes }: { video: MilestoneVideo; active?: boolean; sizes: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!active) ref.current?.pause();
  }, [active]);

  const play = () => {
    setStarted(true);
    ref.current?.play();
  };

  return (
    <div className="relative h-full w-full border border-gold bg-bg">
      <video
        ref={ref}
        className="absolute inset-0 h-full w-full bg-bg object-contain"
        controls={started}
        preload="metadata"
        playsInline
        poster={video.poster}
        title={video.title}
      >
        {video.srcSmall && <source src={video.srcSmall} type="video/mp4" media="(max-width: 1279px)" />}
        {video.srcWebm && <source src={video.srcWebm} type="video/webm" />}
        <source src={video.src} type="video/mp4" />
        {video.captions && <track kind="captions" src={video.captions} srcLang="en" label="English" default />}
      </video>
      {!started && (
        <button type="button" aria-label={gallery.play(video.title)} onClick={play} className="group absolute inset-0 z-10 flex items-center justify-center">
          <Image src={video.poster} alt="" fill sizes={sizes} className="object-cover" />
          <span className="absolute inset-0 bg-bg/30 transition-colors duration-200 group-hover:bg-bg/10" />
          <span className="relative flex h-16 w-16 items-center justify-center border border-gold bg-bg/80 text-gold transition-colors duration-200 group-hover:bg-gold group-hover:text-bg group-focus-visible:bg-gold group-focus-visible:text-bg">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 4.5v15L19.5 12z" />
            </svg>
          </span>
        </button>
      )}
      <CornerTicks className="inset-1" />
    </div>
  );
}
