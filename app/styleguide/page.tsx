import type { Metadata } from "next";
import { GhostButton, GoldButton } from "@/components/Buttons";
import { CornerTicks } from "@/components/CornerTicks";
import { Eyebrow } from "@/components/Eyebrow";
import { Hairline } from "@/components/Hairline";
import { ImageSlot } from "@/components/ImageSlot";
import { MediaCard } from "@/components/MediaCard";
import { NewsletterForm } from "@/components/NewsletterForm";
import { PressQuote } from "@/components/PressQuote";
import { Section, SectionHeading } from "@/components/Section";
import { SpecTable } from "@/components/SpecTable";
import { StatBand } from "@/components/StatBand";
import { TeamCard } from "@/components/TeamCard";
import { Timeline } from "@/components/Timeline";
import { UpdatesList } from "@/components/UpdatesList";
import { aboutPage, news, press, progress, specs, stats, updateCategories } from "@/content/site";
import tailwindConfig from "@/tailwind.config";

export const metadata: Metadata = { title: "Style guide", robots: { index: false } };

// Tokens come straight from tailwind.config.ts, so this page always shows the live values
const extend = tailwindConfig.theme?.extend ?? {};
// Nested groups (e.g. frame: { hi, DEFAULT, … }) flatten to "frame-hi", "frame", …
const colors = Object.fromEntries(
  Object.entries(extend.colors as Record<string, string | Record<string, string>>).flatMap(([name, value]) =>
    typeof value === "string"
      ? [[name, value]]
      : Object.entries(value).map(([k, v]) => [k === "DEFAULT" ? name : `${name}-${k}`, v]),
  ),
) as Record<string, string>;
const fontSizes = extend.fontSize as Record<string, [string, { lineHeight: string; letterSpacing?: string }]>;

const colorUse: Record<string, string> = {
  bg: "Main background",
  "bg-alt": "Alternate sections, footer",
  slot: "Image placeholders",
  gold: "Accents: buttons, eyebrows, numbers, lines",
  "gold-bright": "Hover and focus only",
  ink: "Headings, emphasised text",
  "ink-muted": "Body text",
  danger: "Form errors",
  frame: "Tablet frame (product carousel)",
};

// WCAG 2 contrast ratio between two hex colours
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const textTokens = ["ink", "ink-muted", "gold", "gold-bright", "danger"];
const surfaceTokens = ["bg", "bg-alt", "slot"];

const sections = [
  "Colours",
  "Contrast",
  "Typography",
  "Buttons & links",
  "Lines & accents",
  "Image slot",
  "Spec table",
  "Media card",
  "Stat band",
  "News rows",
  "Press quote",
  "Team card",
  "Timeline",
  "Forms",
];
const anchor = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, "-");

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div id={anchor(title)} className="scroll-mt-28 border-t border-gold/40 py-16">
      <Eyebrow className="mb-10">{title}</Eyebrow>
      {children}
    </div>
  );
}

export default function StyleguidePage() {
  return (
    <>
      <Section className="pb-0 pt-40">
        <SectionHeading
          as="h1"
          eyebrow="Design system"
          title="Style guide"
          intro="Every token, type size and component in one place. Colours, fonts and the type scale are edited in tailwind.config.ts and app/fonts.ts."
        />
        <nav aria-label="Style guide sections" className="mt-12 flex flex-wrap gap-x-6 gap-y-3">
          {sections.map((s) => (
            <a key={s} href={`#${anchor(s)}`} className="link-gold text-small">
              {s}
            </a>
          ))}
        </nav>
      </Section>

      <Section className="pt-16">
        <Block title="Colours">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(colors).map(([name, hex]) => (
              <div key={name} className="border border-gold/40">
                <div className="h-28 border-b border-gold/40" style={{ background: hex }} />
                <div className="p-4">
                  <p className="font-display text-ink">{name}</p>
                  <p className="text-small tabular-nums">{hex}</p>
                  <p className="mt-2 text-small">{colorUse[name]}</p>
                </div>
              </div>
            ))}
          </div>
        </Block>

        <Block title="Contrast">
          <p className="mb-8 max-w-prose">WCAG 2 contrast of each text colour on each surface. AA needs 4.5:1 for body text and 3:1 for large text.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-left text-small">
              <thead>
                <tr className="border-b border-gold/40">
                  <th className="py-3 pr-4 font-normal text-eyebrow uppercase text-ink-muted">Text \ surface</th>
                  {surfaceTokens.map((s) => (
                    <th key={s} className="py-3 pr-4 font-normal text-eyebrow uppercase text-ink-muted">
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {textTokens.map((t) => (
                  <tr key={t} className="border-b border-gold/20">
                    <th scope="row" className="py-3 pr-4 font-normal" style={{ color: colors[t] }}>
                      {t}
                    </th>
                    {surfaceTokens.map((s) => {
                      const ratio = contrast(colors[t], colors[s]);
                      return (
                        <td key={s} className="py-3 pr-4 tabular-nums text-ink">
                          {ratio.toFixed(1)}:1 <span className="text-gold">{ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA large" : "Fail"}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <th scope="row" className="py-3 pr-4 font-normal text-ink">
                    bg on gold (gold button)
                  </th>
                  <td colSpan={3} className="py-3 tabular-nums text-ink">
                    {contrast(colors.bg, colors.gold).toFixed(1)}:1 <span className="text-gold">AA</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Block>

        <Block title="Typography">
          <div className="mb-10 grid gap-6 sm:grid-cols-2">
            <div className="border border-gold/40 p-6">
              <p className="text-eyebrow uppercase text-ink-muted">font-display</p>
              <p className="mt-3 font-display text-h2 text-ink">Space Grotesk</p>
              <p className="mt-2 text-small">Headings, numbers, quotes</p>
            </div>
            <div className="border border-gold/40 p-6">
              <p className="text-eyebrow uppercase text-ink-muted">font-sans</p>
              <p className="mt-3 font-sans text-h2 text-ink">Inter</p>
              <p className="mt-2 text-small">Body text, labels, buttons</p>
            </div>
          </div>
          <div className="space-y-8">
            {Object.entries(fontSizes).map(([name, [size, opts]]) => (
              <div key={name} className="grid gap-3 border-b border-gold/20 pb-8 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8">
                <div className="text-small">
                  <p className="font-display text-ink">text-{name}</p>
                  <p className="break-all">{size}</p>
                  <p>line {opts.lineHeight}</p>
                </div>
                <p
                  className={
                    name === "eyebrow"
                      ? "text-eyebrow uppercase text-gold"
                      : name === "stat"
                        ? "font-display text-stat text-gold"
                        : ["display", "h1", "h2", "h3"].includes(name)
                          ? `font-display text-${name} text-ink`
                          : `text-${name}`
                  }
                >
                  {name === "stat" ? "1,234" : name === "eyebrow" ? "Eyebrow label" : "Reach orbit, return safely"}
                </p>
              </div>
            ))}
          </div>
          {/* Safelist for the dynamic class names above */}
          <span className="hidden text-display text-h1 text-h2 text-h3 text-lead text-body text-small" />
        </Block>

        <Block title="Buttons & links">
          <div className="flex flex-wrap items-center gap-4">
            <GoldButton href="#">Gold button</GoldButton>
            <GoldButton className="bg-gold-bright">Hover / focus</GoldButton>
            <GhostButton href="#">Ghost button</GhostButton>
            <GhostButton className="!border-gold-bright !text-gold-bright">Hover / focus</GhostButton>
            <GoldButton arrow={false}>No arrow</GoldButton>
          </div>
          <p className="mt-10 max-w-prose">
            Body text with an <a href="#" className="link-gold">inline gold link</a>. Links use a thin gold underline that brightens on hover.
          </p>
        </Block>

        <Block title="Lines & accents">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <p className="mb-4 text-small">Hairline divider (border-gold/40)</p>
              <div className="border-t border-gold/40" />
            </div>
            <div>
              <p className="mb-4 text-small">Drawn heading hairline</p>
              <Hairline />
            </div>
            <div>
              <p className="mb-4 text-small">Corner ticks</p>
              <div className="relative h-32 border border-gold/40 bg-bg-alt">
                <CornerTicks />
              </div>
            </div>
          </div>
          <div className="mt-10">
            <SectionHeading eyebrow="Eyebrow" title="Section heading" intro="Optional intro line under the heading and hairline." />
          </div>
        </Block>

        <Block title="Image slot">
          <div className="grid gap-6 md:grid-cols-2">
            <ImageSlot slot="example-slot" size="1600×900" alt="Example placeholder" className="aspect-video" />
            <ImageSlot slot="example-slot" size="1600×900" alt="Example placeholder with ticks" ticks className="aspect-video" />
          </div>
        </Block>

        <Block title="Spec table">
          <SpecTable specs={specs} className="max-w-xl" />
        </Block>

        <Block title="Media card">
          <MediaCard item={progress.items[0]} index={0} />
        </Block>

        <Block title="Stat band">
          <StatBand stats={stats} />
        </Block>

        <Block title="News rows">
          <UpdatesList items={news.slice(0, 3)} categories={updateCategories} allLabel="All" />
        </Block>

        <Block title="Press quote">
          <div className="max-w-md">
            <PressQuote item={press[0]} />
          </div>
        </Block>

        <Block title="Team card">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <TeamCard member={aboutPage.team.members[0]} />
          </div>
        </Block>

        <Block title="Timeline">
          <Timeline entries={aboutPage.timeline.entries.slice(0, 3)} />
        </Block>

        <Block title="Forms">
          <div className="max-w-xl">
            <NewsletterForm />
          </div>
        </Block>
      </Section>

      <Section alt divider>
        <Eyebrow>bg-alt surface</Eyebrow>
        <p className="mt-4 max-w-prose">Alternate sections use bg-alt and a gold hairline divider on top.</p>
      </Section>
    </>
  );
}
