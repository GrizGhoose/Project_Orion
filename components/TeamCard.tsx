import type { TeamMember } from "@/content/site";
import { ImageSlot } from "./ImageSlot";

/** Portrait, name and role. */
export function TeamCard({ member }: { member: TeamMember }) {
  return (
    <article>
      <ImageSlot {...member.image} ticks sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="aspect-[4/5]" />
      <h3 className="mt-5 text-h3">{member.name}</h3>
      <p className="mt-1 text-eyebrow uppercase text-gold">{member.role}</p>
    </article>
  );
}
