import { cn } from "@/lib/cn";
import { Eyebrow } from "./Eyebrow";
import { Hairline } from "./Hairline";
import { Reveal } from "./Reveal";

type SectionProps = {
  children: React.ReactNode;
  id?: string;
  /** Alternate background (bg-alt) */
  alt?: boolean;
  /** Gold hairline along the top edge */
  divider?: boolean;
  className?: string;
  /** Inner container classes */
  innerClassName?: string;
};

/** Page section: vertical rhythm, background and page-width container. */
export function Section({ children, id, alt, divider, className, innerClassName }: SectionProps) {
  return (
    <section id={id} className={cn("py-section", alt ? "bg-bg-alt" : "bg-bg", divider && "border-t border-gold/40", className)}>
      <div className={cn("container-page", innerClassName)}>{children}</div>
    </section>
  );
}

/** Eyebrow + heading + drawn gold hairline. */
export function SectionHeading({ eyebrow, title, className }: { eyebrow?: string; title: string; className?: string }) {
  return (
    <Reveal className={cn("max-w-3xl", className)}>
      {eyebrow && <Eyebrow className="mb-5">{eyebrow}</Eyebrow>}
      <h2 className="text-h2">{title}</h2>
      <Hairline className="mt-6" />
    </Reveal>
  );
}
