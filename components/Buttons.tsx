import Link from "next/link";
import { cn } from "@/lib/cn";

type ButtonProps = {
  children: React.ReactNode;
  /** Renders a link when set, a button otherwise */
  href?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  className?: string;
};

const base =
  "inline-flex min-h-12 items-center justify-center gap-3 px-6 text-small font-medium uppercase tracking-[0.12em] transition-colors duration-200";

function ButtonBase({ children, href, type = "button", onClick, className }: ButtonProps) {
  return href ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <button type={type} onClick={onClick} className={className}>
      {children}
    </button>
  );
}

/** Primary action: solid gold, dark text. */
export function GoldButton(props: ButtonProps) {
  return (
    <ButtonBase {...props} className={cn(base, "bg-gold text-bg hover:bg-gold-bright focus-visible:bg-gold-bright", props.className)} />
  );
}

/** Secondary action: gold hairline outline. */
export function GhostButton(props: ButtonProps) {
  return (
    <ButtonBase
      {...props}
      className={cn(
        base,
        "border border-gold text-ink hover:border-gold-bright hover:text-gold-bright focus-visible:border-gold-bright",
        props.className,
      )}
    />
  );
}
