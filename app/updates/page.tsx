import type { Metadata } from "next";
import { Section, SectionHeading } from "@/components/Section";
import { UpdatesList } from "@/components/UpdatesList";
import { news, updateCategories, updatesPage } from "@/content/site";

export const metadata: Metadata = { title: "Updates" };

export default function UpdatesPage() {
  return (
    <Section className="pt-40">
      <SectionHeading as="h1" eyebrow={updatesPage.eyebrow} title={updatesPage.title} intro={updatesPage.intro} />
      <div className="mt-14">
        <UpdatesList items={news} categories={updateCategories} allLabel={updatesPage.allLabel} />
      </div>
    </Section>
  );
}
