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

/** Eyebrow + heading + drawn gold hairline, with an optional intro line. */
export function SectionHeading({
  eyebrow,
  title,
  intro,
  as: Tag = "h2",
  className,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <Reveal className={cn("max-w-3xl", className)}>
      {eyebrow && <Eyebrow className="mb-5">{eyebrow}</Eyebrow>}
      <Tag className={Tag === "h1" ? "text-h1" : "text-h2"}>{title}</Tag>
      <Hairline className="mt-6" />
      {intro && <p className="mt-6 max-w-prose text-lead">{intro}</p>}
    </Reveal>
  );
}
