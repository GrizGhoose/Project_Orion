import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Eyebrow } from "@/components/Eyebrow";
import { Hairline } from "@/components/Hairline";
import { ImageSlot } from "@/components/ImageSlot";
import { NewsRow } from "@/components/NewsRow";
import { Reveal } from "@/components/Reveal";
import { Section } from "@/components/Section";
import { news, ui } from "@/content/site";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return news.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = news.find((n) => n.slug === slug);
  return { title: item?.headline ?? "Update" };
}

// Posts without their own body show this until written
const fallbackBody = ["[PLACEHOLDER: Post body. Two to four short paragraphs.]"];

export default async function UpdatePost({ params }: Props) {
  const { slug } = await params;
  const item = news.find((n) => n.slug === slug);
  if (!item) notFound();
  const more = news.filter((n) => n.slug !== slug).slice(0, 3);

  return (
    <>
      <article className="pb-section pt-40">
        <div className="container-page">
          <Reveal className="max-w-4xl">
            <Link href="/updates" className="link-gold text-small uppercase tracking-[0.12em]">
              ← {ui.allUpdates}
            </Link>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Eyebrow>{item.category}</Eyebrow>
              <span aria-hidden className="h-px w-6 bg-gold/60" />
              <p className="text-small">{item.date}</p>
            </div>
            <h1 className="mt-6 text-h1">{item.headline}</h1>
            <Hairline className="mt-8" />
            <p className="mt-8 max-w-prose text-lead text-ink">{item.excerpt}</p>
          </Reveal>
          <Reveal className="mt-14">
            <ImageSlot {...item.image} ticks priority sizes="(min-width: 1440px) 1344px, 100vw" className="aspect-[16/9]" />
          </Reveal>
          <div className="mx-auto mt-14 max-w-prose space-y-6">
            {(item.body ?? fallbackBody).map((p, i) => (
              <p key={i} className="text-lead">
                {p}
              </p>
            ))}
          </div>
        </div>
      </article>
      <Section alt divider>
        <Eyebrow>{ui.moreUpdates}</Eyebrow>
        <ul className="mt-8 border-t border-gold/40">
          {more.map((n) => (
            <NewsRow key={n.slug} item={n} />
          ))}
        </ul>
      </Section>
    </>
  );
}
