import type { Metadata } from "next";
import { ImageSlot } from "@/components/ImageSlot";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { Section, SectionHeading } from "@/components/Section";
import { SpecTable } from "@/components/SpecTable";
import { productPage, specs } from "@/content/site";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Product" };

// Gallery rhythm: wide, square, square / square, square, wide
const wide = { span: "md:col-span-2", aspect: "aspect-[4/3] md:aspect-[2/1]" };
const square = { span: "", aspect: "aspect-square" };
const galleryLayout = [wide, square, square, square, square, wide];

export default function ProductPage() {
  const { hero, specsIntro, howItWorks, gallery } = productPage;
  return (
    <>
      <PageHero eyebrow={hero.eyebrow} title={hero.title} supporting={hero.supporting} image={hero.image} large />

      <Section>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading eyebrow={specsIntro.eyebrow} title={specsIntro.title} intro={specsIntro.body} />
            <Reveal delay={0.1}>
              <SpecTable specs={specs} className="mt-10" />
            </Reveal>
          </div>
          <Reveal className="lg:col-span-7">
            <ImageSlot {...specsIntro.image} ticks sizes="(min-width: 1024px) 58vw, 100vw" className="aspect-[4/3] lg:sticky lg:top-28" />
          </Reveal>
        </div>
      </Section>

      <Section alt divider>
        <SectionHeading eyebrow={howItWorks.eyebrow} title={howItWorks.title} />
        <ol className="mt-16 grid gap-12 md:grid-cols-3 md:gap-10">
          {howItWorks.steps.map((step, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <li className="border-t border-gold pt-8">
                <p className="font-display text-h1 font-medium tabular-nums text-gold">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-6 text-h3">{step.title}</h3>
                <p className="mt-3 max-w-prose">{step.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </Section>

      <Section divider>
        <SectionHeading eyebrow={gallery.eyebrow} title={gallery.title} />
        <div className="mt-14 grid gap-4 md:grid-cols-4 md:gap-6">
          {gallery.images.map((img, i) => (
            <Reveal key={img.slot} delay={(i % 3) * 0.08} className={galleryLayout[i % galleryLayout.length].span}>
              <ImageSlot {...img} ticks sizes="(min-width: 768px) 50vw, 100vw" className={cn("h-full w-full", galleryLayout[i % galleryLayout.length].aspect)} />
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}
