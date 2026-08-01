import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "accent" | "success" | "warning" | "danger" }) {
  const tones = {
    neutral: "bg-[#F3F4F6] text-[var(--text-secondary)]",
    accent: "bg-[var(--surface-soft)] text-[#1565C0]",
    success: "bg-[#ECFDF5] text-[var(--success)]",
    warning: "bg-[#FFFBEB] text-[var(--warning)]",
    danger: "bg-[#FEF2F2] text-[var(--danger)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
