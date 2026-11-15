import { linkPreview, milestones } from "@/content/site";
import { cn } from "@/lib/cn";
import { ImageSlot } from "./ImageSlot";
import { LinkPreview } from "./LinkPreview";
import { MilestoneGallery } from "./MilestoneGallery";
import { Reveal } from "./Reveal";
import { Section, SectionHeading } from "./Section";

const SIZES = "(min-width: 768px) 58vw, 100vw";

/**
 * Milestones: entries alternate image-left / image-right from md (media above text on mobile).
 * An entry with `link` shows its first image as a live-app preview card; other media go in a MilestoneGallery
 * (arrows and counter when there is more than one); entries without media show an ImageSlot.
 */
export function Milestones() {
  return (
    <Section alt divider id="milestones">
      <SectionHeading eyebrow={milestones.eyebrow} title={milestones.title} />
      <div className="mt-16 space-y-20 md:mt-24 md:space-y-28">
        {milestones.items.map((m, i) => {
          const reverse = i % 2 === 1;
          const first = m.media[0];
          return (
            <Reveal key={m.number}>
              <article className="grid items-center gap-8 md:grid-cols-12 md:gap-12">
                <div className={cn("min-w-0 md:col-span-7", reverse && "md:order-2")}>
                  {m.link && first?.type === "image" ? (
                    <LinkPreview image={first} url={m.link.url} label={m.link.label} sizes={SIZES} />
                  ) : first ? (
                    <MilestoneGallery items={m.media} caption={`${m.number} · ${m.title}`} sizes={SIZES} />
                  ) : (
                    <ImageSlot slot={m.slot} size="16:9" alt={m.title} ticks className="aspect-video" />
                  )}
                </div>
                <div className={cn("md:col-span-5", reverse && "md:order-1")}>
                  <p className="mb-4 font-display text-small tabular-nums text-gold">{m.number}</p>
                  <h3 className="text-h3">{m.title}</h3>
                  {m.caption && <p className="mt-4 max-w-prose">{m.caption}</p>}
                  {m.link && (
                    <a href={m.link.url} target="_blank" rel="noopener noreferrer" className="link-gold mt-6 inline-block">
                      {linkPreview.launch(m.link.label)}
                    </a>
                  )}
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
