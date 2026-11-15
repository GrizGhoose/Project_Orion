import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { Reveal } from "@/components/Reveal";
import { Section, SectionHeading } from "@/components/Section";
import { contactPage, ui } from "@/content/site";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <Section className="pt-40">
      <div className="grid gap-16 lg:grid-cols-12 lg:gap-20">
        <div className="lg:col-span-5">
          <SectionHeading as="h1" eyebrow={contactPage.eyebrow} title={contactPage.title} intro={contactPage.intro} />
          <Reveal delay={0.1} className="mt-12 grid gap-8 border-t border-gold/40 pt-8 sm:grid-cols-2 lg:grid-cols-1">
            <div>
              <p className="text-eyebrow uppercase text-gold">{ui.addressLabel}</p>
              <address className="mt-3 not-italic text-ink">
                {contactPage.address.map((line, i) => (
                  <span key={i} className="block">
                    {line}
                  </span>
                ))}
              </address>
            </div>
            <div>
              <p className="text-eyebrow uppercase text-gold">{ui.emailLabel}</p>
              <a href={contactPage.emailHref} className="link-gold mt-3 inline-block break-all">
                {contactPage.email}
              </a>
            </div>
          </Reveal>
        </div>
        <Reveal delay={0.15} className="lg:col-span-7">
          <ContactForm />
        </Reveal>
      </div>
    </Section>
  );
}
