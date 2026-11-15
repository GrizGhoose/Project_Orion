import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { Section, SectionHeading } from "@/components/Section";
import { TeamCard } from "@/components/TeamCard";
import { Timeline } from "@/components/Timeline";
import { aboutPage } from "@/content/site";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  const { hero, team, timeline } = aboutPage;
  return (
    <>
      <PageHero eyebrow={hero.eyebrow} title={hero.statement} image={hero.image} />

      <Section>
        <Reveal className="grid gap-8 lg:grid-cols-12">
          <p className="text-eyebrow uppercase text-gold lg:col-span-4">{hero.bodyEyebrow}</p>
          <p className="font-display text-h3 text-ink lg:col-span-8">{hero.body}</p>
        </Reveal>
      </Section>

      <Section alt divider>
        <SectionHeading eyebrow={team.eyebrow} title={team.title} />
        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {team.members.map((member, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <TeamCard member={member} />
            </Reveal>
          ))}
        </div>
      </Section>

      <Section divider>
        <SectionHeading eyebrow={timeline.eyebrow} title={timeline.title} />
        <div className="mt-14">
          <Timeline entries={timeline.entries} />
        </div>
      </Section>
    </>
  );
}
