"use client";

import { useState } from "react";
import { contactPage } from "@/content/site";
import { cn } from "@/lib/cn";
import { GoldButton } from "./Buttons";

type Field = "name" | "email" | "organisation" | "message";
type Values = Record<Field, string>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(v: Values): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  if (!v.name.trim()) errors.name = "Enter your name.";
  if (!EMAIL.test(v.email.trim())) errors.email = "Enter a valid email address.";
  if (v.message.trim().length < 10) errors.message = "Write a message of at least 10 characters.";
  return errors;
}

/** Client-side validation only. TODO(backend): send the message (API route or form service). */
export function ContactForm() {
  const labels = contactPage.form;
  const [values, setValues] = useState<Values>({ name: "", email: "", organisation: "", message: "" });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [sent, setSent] = useState(false);
  const errors = validate(values);
  const show = (f: Field) => (submitted || touched[f]) && errors[f];

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    const first = (Object.keys(errors) as Field[])[0];
    if (first) {
      e.currentTarget.querySelector<HTMLElement>(`#contact-${first}`)?.focus();
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p role="status" className="border-l border-gold pl-4 text-lead text-ink">
        {labels.success}
      </p>
    );
  }

  const input = (f: Field) =>
    cn(
      "w-full border bg-bg px-4 text-ink focus:outline-none",
      show(f) ? "border-danger" : "border-gold/40 focus:border-gold-bright",
    );

  const fieldProps = (f: Field) => ({
    id: `contact-${f}`,
    name: f,
    value: values[f],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues({ ...values, [f]: e.target.value }),
    onBlur: () => setTouched({ ...touched, [f]: true }),
    "aria-invalid": !!show(f),
    "aria-describedby": show(f) ? `contact-${f}-error` : undefined,
  });

  const row = (f: Field, label: string, control: React.ReactNode, optional = false) => (
    <div>
      <label htmlFor={`contact-${f}`} className="text-eyebrow uppercase text-ink-muted">
        {label}
        {optional && <span className="ml-2 normal-case tracking-normal">(optional)</span>}
      </label>
      <div className="mt-3">{control}</div>
      <p id={`contact-${f}-error`} className="mt-2 min-h-6 text-small text-danger">
        {show(f) || ""}
      </p>
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {row("name", labels.name, <input type="text" autoComplete="name" className={cn(input("name"), "min-h-12")} {...fieldProps("name")} />)}
        {row("email", labels.email, <input type="email" autoComplete="email" className={cn(input("email"), "min-h-12")} {...fieldProps("email")} />)}
      </div>
      {row(
        "organisation",
        labels.organisation,
        <input type="text" autoComplete="organization" className={cn(input("organisation"), "min-h-12")} {...fieldProps("organisation")} />,
        true,
      )}
      {row("message", labels.message, <textarea rows={6} className={cn(input("message"), "resize-y py-3")} {...fieldProps("message")} />)}
      <div>
        <GoldButton type="submit">{labels.submit}</GoldButton>
      </div>
    </form>
  );
}
