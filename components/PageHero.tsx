import type { ImageRef, Link } from "@/content/site";
import { cn } from "@/lib/cn";
import { GoldButton } from "./Buttons";
import { Eyebrow } from "./Eyebrow";
import { Hairline } from "./Hairline";
import { HeroMedia } from "./HeroMedia";
import { Reveal } from "./Reveal";

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  supporting?: string;
  cta?: Link;
  image: ImageRef;
  video?: string;
  /** Full screen (home) or 80% height (inner pages) */
  full?: boolean;
  /** Display-size headline */
  large?: boolean;
};

/** Full-bleed image (or video) hero with text anchored bottom-left. */
export function PageHero({ eyebrow, title, supporting, cta, image, video, full = false, large = false }: PageHeroProps) {
  return (
    <section className={cn("relative flex items-end overflow-hidden bg-bg", full ? "min-h-[100svh]" : "min-h-[80svh]")}>
      <HeroMedia video={video} poster={image} />
      <div className="container-page relative pb-16 pt-32 md:pb-24">
        <Reveal className="max-w-4xl">
          {eyebrow && <Eyebrow className="mb-6">{eyebrow}</Eyebrow>}
          <h1 className={large ? "text-display" : "text-h1"}>{title}</h1>
          <Hairline className="mt-8" />
          {supporting && <p className="mt-8 max-w-prose text-lead text-ink">{supporting}</p>}
          {cta && (
            <div className="mt-10">
              <GoldButton href={cta.href}>{cta.label}</GoldButton>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}
