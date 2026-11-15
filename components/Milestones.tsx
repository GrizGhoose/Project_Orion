import { milestones } from "@/content/site";
import { cn } from "@/lib/cn";
import { ImageLightbox } from "./ImageLightbox";
import { ImageSlot } from "./ImageSlot";
import { Reveal } from "./Reveal";
import { Section, SectionHeading } from "./Section";

const SIZES = "(min-width: 768px) 58vw, 100vw";

/**
 * Milestones: entries alternate image-left / image-right from md (image above text on mobile).
 * An image with `zoomable` opens in the click-to-enlarge overlay; entries without an image show an ImageSlot.
 */
export function Milestones() {
  return (
    <Section alt divider id="milestones">
      <SectionHeading eyebrow={milestones.eyebrow} title={milestones.title} />
      <div className="mt-16 space-y-20 md:mt-24 md:space-y-28">
        {milestones.items.map((m, i) => {
          const reverse = i % 2 === 1;
          return (
            <Reveal key={m.number}>
              <article className="grid items-center gap-8 md:grid-cols-12 md:gap-12">
                <div className={cn("md:col-span-7", reverse && "md:order-2")}>
                  {m.image?.zoomable ? (
                    <ImageLightbox image={m.image} caption={`${m.number} · ${m.title}`} sizes={SIZES} />
                  ) : (
                    <ImageSlot
                      slot={m.slot}
                      size="1200×900"
                      src={m.image?.src}
                      alt={m.image?.alt ?? m.title}
                      ticks
                      sizes={SIZES}
                      className="aspect-[4/3]"
                    />
                  )}
                </div>
                <div className={cn("md:col-span-5", reverse && "md:order-1")}>
                  <p className="mb-4 font-display text-small tabular-nums text-gold">{m.number}</p>
                  <h3 className="text-h3">{m.title}</h3>
                  <p className="mt-4 max-w-prose">{m.caption}</p>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
