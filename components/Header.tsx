"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { headerCta, nav } from "@/content/site";
import { cn } from "@/lib/cn";
import { GhostButton } from "./Buttons";
import { Wordmark } from "./Wordmark";

/** Transparent over the hero; solid with a gold bottom hairline once scrolled. Full-screen overlay menu on mobile. */
export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Menu open: lock page scroll, close on Escape, move focus in and back out
  useEffect(() => {
    if (!open) return;
    const button = menuButton.current;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      button?.focus();
    };
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 border-b transition-colors duration-300",
          scrolled ? "border-gold/40 bg-bg" : "border-transparent bg-transparent",
        )}
      >
        <div className="container-page flex h-20 items-center justify-between gap-6">
          <Wordmark />
          <nav aria-label="Main" className="hidden items-center gap-10 md:flex">
            <ul className="flex items-center gap-8">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={cn(
                      "text-small uppercase tracking-[0.12em] text-ink underline-offset-[10px] transition-colors hover:text-gold-bright",
                      isActive(item.href) && "underline decoration-gold decoration-1",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <GhostButton href={headerCta.href} className="min-h-10 px-4">
              {headerCta.label}
            </GhostButton>
          </nav>
          <button
            ref={menuButton}
            type="button"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen(true)}
            className="flex min-h-11 items-center gap-3 text-small uppercase tracking-[0.12em] text-ink md:hidden"
          >
            Menu
            <span aria-hidden className="flex w-6 flex-col gap-1.5">
              <span className="h-px w-full bg-gold" />
              <span className="h-px w-full bg-gold" />
            </span>
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-50 flex flex-col bg-bg md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="container-page flex h-20 items-center justify-between border-b border-gold/40">
              <Wordmark onClick={() => setOpen(false)} />
              <button
                ref={closeButton}
                type="button"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-3 text-small uppercase tracking-[0.12em] text-ink"
              >
                Close <span aria-hidden className="text-h3 leading-none text-gold">×</span>
              </button>
            </div>
            <nav aria-label="Mobile" className="container-page flex flex-1 flex-col justify-center">
              <ul>
                {nav.map((item, i) => (
                  <motion.li
                    key={item.href}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.05, duration: 0.4 }}
                    className="border-b border-gold/40"
                  >
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      className={cn("flex items-center justify-between py-5 font-display text-h2 text-ink", isActive(item.href) && "text-gold")}
                    >
                      {item.label}
                      <span aria-hidden className="text-h3 text-gold">→</span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
