import { GhostButton } from "@/components/Buttons";
import { ImageSlot } from "@/components/ImageSlot";
import { MediaCard } from "@/components/MediaCard";
import { NewsletterForm } from "@/components/NewsletterForm";
import { NewsRow } from "@/components/NewsRow";
import { PageHero } from "@/components/PageHero";
import { ProductCarousel } from "@/components/ProductCarousel";
import { PressQuote } from "@/components/PressQuote";
import { Reveal } from "@/components/Reveal";
import { Section, SectionHeading } from "@/components/Section";
import { StatBand } from "@/components/StatBand";
import { hero, homeSections, mission, news, newsletter, press, progress, stats } from "@/content/site";

export default function HomePage() {
  return (
    <>
      <PageHero
        full
        large
        eyebrow={hero.eyebrow}
        title={hero.headline}
        supporting={hero.supporting}
        cta={hero.cta}
        image={hero.poster}
        video={hero.video}
      />

      <ProductCarousel />

      {/* Progress feed */}
      <Section alt divider>
        <SectionHeading eyebrow={progress.eyebrow} title={progress.title} />
        <div className="mt-16 space-y-20 md:mt-24 md:space-y-28">
          {progress.items.map((item, i) => (
            <MediaCard key={i} item={item} index={i} reverse={i % 2 === 1} />
          ))}
        </div>
      </Section>

      {/* Stats band */}
      <Section divider>
        <StatBand stats={stats} />
      </Section>

      {/* Mission split */}
      <Section alt divider>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <ImageSlot {...mission.image} ticks sizes="(min-width: 1024px) 50vw, 100vw" className="aspect-[7/8]" />
          </Reveal>
          <div>
            <SectionHeading eyebrow={mission.eyebrow} title={mission.title} />
            <Reveal delay={0.1} className="mt-8 max-w-prose space-y-5">
              {mission.body.map((p, i) => (
                <p key={i} className="text-lead">
                  {p}
                </p>
              ))}
              <GhostButton href={mission.cta.href} className="!mt-10">
                {mission.cta.label}
              </GhostButton>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* Updates list */}
      <Section divider>
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionHeading eyebrow={homeSections.updates.eyebrow} title={homeSections.updates.title} />
          <GhostButton href={homeSections.updates.cta.href}>{homeSections.updates.cta.label}</GhostButton>
        </div>
        <Reveal>
          <ul className="mt-14 border-t border-gold/40">
            {news.slice(0, 4).map((item) => (
              <NewsRow key={item.slug} item={item} />
            ))}
          </ul>
        </Reveal>
      </Section>

      {/* Press */}
      <Section alt divider>
        <SectionHeading eyebrow={homeSections.press.eyebrow} title={homeSections.press.title} />
        <div className="mt-14 grid gap-12 md:grid-cols-3 md:gap-10">
          {press.map((item, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <PressQuote item={item} />
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Newsletter */}
      <Section divider>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-end lg:gap-20">
          <SectionHeading eyebrow={newsletter.eyebrow} title={newsletter.title} intro={newsletter.body} />
          <Reveal delay={0.1}>
            <NewsletterForm />
          </Reveal>
        </div>
      </Section>
    </>
  );
}
