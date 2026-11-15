import Link from "next/link";
import { footer } from "@/content/site";
import { SocialIcon } from "./SocialIcon";
import { Wordmark } from "./Wordmark";

export function Footer() {
  return (
    <footer className="border-t border-gold/40 bg-bg-alt">
      <div className="container-page grid gap-12 py-16 md:grid-cols-12 md:py-20">
        <div className="md:col-span-4">
          <Wordmark />
          <p className="mt-5 max-w-xs text-small">{footer.tagline}</p>
          <ul className="mt-8 flex gap-3">
            {footer.social.map((s) => (
              <li key={s.icon}>
                <a
                  href={s.href}
                  aria-label={s.label}
                  className="flex h-11 w-11 items-center justify-center border border-gold/40 text-gold transition-colors hover:border-gold-bright hover:text-gold-bright"
                >
                  <SocialIcon icon={s.icon} />
                </a>
              </li>
            ))}
          </ul>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:col-span-8">
          {footer.columns.map((col) => (
            <div key={col.title}>
              <p className="text-eyebrow uppercase text-gold">{col.title}</p>
              <ul className="mt-5 space-y-3">
                {col.links.map((link, i) => (
                  <li key={i}>
                    <Link href={link.href} className="text-small text-ink-muted transition-colors hover:text-gold-bright">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-gold/40">
        <div className="container-page flex flex-col gap-4 py-6 text-small sm:flex-row sm:items-center sm:justify-between">
          <p>{footer.legal}</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {footer.legalLinks.map((link, i) => (
              <li key={i}>
                <Link href={link.href} className="transition-colors hover:text-gold-bright">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
