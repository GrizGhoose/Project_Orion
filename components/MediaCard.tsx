import type { ProgressItem } from "@/content/site";
import { cn } from "@/lib/cn";
import { ImageSlot } from "./ImageSlot";
import { Reveal } from "./Reveal";

/** Large image beside a heading and caption. `reverse` puts the image on the right. */
export function MediaCard({ item, index, reverse = false }: { item: ProgressItem; index?: number; reverse?: boolean }) {
  return (
    <Reveal>
      <article className="grid items-center gap-8 md:grid-cols-12 md:gap-12">
        <ImageSlot
          {...item.image}
          ticks
          sizes="(min-width: 768px) 58vw, 100vw"
          className={cn("aspect-[4/3] md:col-span-7", reverse && "md:order-2")}
        />
        <div className={cn("md:col-span-5", reverse && "md:order-1")}>
          {index !== undefined && (
            <p className="mb-4 font-display text-small tabular-nums text-gold">{String(index + 1).padStart(2, "0")}</p>
          )}
          <h3 className="text-h3">{item.title}</h3>
          <p className="mt-4 max-w-prose">{item.caption}</p>
          {item.videoHref && (
            <a href={item.videoHref} className="link-gold mt-6 inline-flex items-center gap-2 text-small uppercase tracking-[0.12em]">
              <span aria-hidden className="text-gold">▶</span> Watch video
            </a>
          )}
        </div>
      </article>
    </Reveal>
  );
}
