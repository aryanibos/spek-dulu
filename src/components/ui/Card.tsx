import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[18px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_24px_rgba(17,24,39,0.06)]",
        className,
      )}
      {...props}
    />
  );
}
