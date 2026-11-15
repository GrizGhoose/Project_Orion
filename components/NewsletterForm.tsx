"use client";

import { useState } from "react";
import { newsletter } from "@/content/site";
import { GoldButton } from "./Buttons";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Front-end only sign-up. TODO(backend): post to the mailing-list provider. */
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setDone(true);
  }

  if (done) {
    return (
      <p role="status" className="border-l border-gold pl-4 text-lead text-ink">
        {newsletter.success}
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="w-full">
      <label htmlFor="newsletter-email" className="text-eyebrow uppercase text-ink-muted">
        Email address
      </label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          id="newsletter-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? "newsletter-error" : undefined}
          placeholder="you@example.com"
          className="min-h-12 flex-1 border border-gold/40 bg-bg px-4 text-ink placeholder:text-ink-muted focus:border-gold-bright focus:outline-none"
        />
        <GoldButton type="submit">{newsletter.button}</GoldButton>
      </div>
      <p id="newsletter-error" role="alert" className="mt-2 min-h-6 text-small text-danger">
        {error}
      </p>
    </form>
  );
}
