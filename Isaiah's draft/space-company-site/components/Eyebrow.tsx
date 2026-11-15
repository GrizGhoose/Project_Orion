import { cn } from "@/lib/cn";

/** Small uppercase gold label above headings. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("font-eyebrow text-eyebrow font-medium uppercase text-gold", className)}>{children}</p>;
}
