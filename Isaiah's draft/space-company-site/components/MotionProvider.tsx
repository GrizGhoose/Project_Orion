"use client";

import { MotionConfig } from "framer-motion";

/** reducedMotion="user": with prefers-reduced-motion, Framer Motion skips movement (opacity fades remain). */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
