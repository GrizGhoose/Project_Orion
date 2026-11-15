import Image from "next/image";
import { linkPreview, type MilestoneImage } from "@/content/site";
import { CornerTicks } from "./CornerTicks";

/**
 * Live-app preview: the screenshot in a slim browser window (dots + address bar with the bare domain), the whole
 * card one link that opens the app in a new tab. Hover/focus brightens the border, zooms the screenshot slightly and
 * slides up an "Open live demo" chip (always shown on touch screens).
 */
export function LinkPreview({ image, url, label, sizes }: { image: MilestoneImage; url: string; label: string; sizes: string }) {
  const domain = new URL(url).host;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={linkPreview.ariaLabel(label)}
      className="group relative block border border-gold bg-bg-alt transition-colors duration-200 hover:border-gold-bright focus-visible:border-gold-bright focus-visible:outline-2 focus-visible:outline-gold"
    >
      {/* Browser chrome */}
      <span aria-hidden="true" className="flex items-center gap-3 border-b border-gold/40 px-5 py-2.5 sm:gap-4 sm:px-7">
        <span className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-2 w-2 rounded-pill bg-ink-muted/40" />
          ))}
        </span>
        <span className="min-w-0 flex-1 truncate rounded-pill bg-bg px-4 py-1 text-center font-eyebrow text-[0.6875rem] tracking-[0.06em] text-ink-muted">
          {domain}
        </span>
        <span className="hidden w-9 sm:block" />
      </span>

      {/* Screenshot */}
      <span className="relative block aspect-[16/10] overflow-hidden">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] group-focus-visible:scale-[1.03]"
        />
        <span className="absolute bottom-3 right-3 z-20 translate-y-2 bg-bg/85 px-2.5 py-1.5 font-eyebrow text-[0.6875rem] font-medium uppercase leading-none tracking-[0.18em] text-gold opacity-0 transition-[opacity,transform] duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100">
          {linkPreview.chip}
        </span>
      </span>

      <CornerTicks className="inset-1" />
    </a>
  );
}
