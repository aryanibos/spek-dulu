import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--accent)] text-white hover:bg-[#1B86DB] shadow-[0_8px_20px_rgba(33,150,243,0.25)]",
  secondary:
    "bg-white text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-soft)]",
  ghost: "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-soft)]",
  danger: "bg-[var(--danger)] text-white hover:bg-[#B91C1C]",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[12px] px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
