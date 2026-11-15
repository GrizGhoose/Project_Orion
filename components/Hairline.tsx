"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

/** Gold hairline that draws left to right when it scrolls into view. */
export function Hairline({ className }: { className?: string }) {
  return (
    <motion.span
      aria-hidden
      className={cn("block h-px w-24 origin-left bg-gold", className)}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}
