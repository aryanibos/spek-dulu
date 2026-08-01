import Image from "next/image";
import Link from "next/link";

export function AppShell({
  children,
  bare = false,
}: {
  children: React.ReactNode;
  bare?: boolean;
}) {
  return (
    <div className="min-h-[100dvh] bg-[var(--bg)] text-[var(--text)]">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <Image
              src="/spekdulu-mark.svg"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 shrink-0"
            />
            <span>SpekDulu</span>
          </Link>
          {!bare && (
            <p className="hidden text-sm text-[var(--text-muted)] sm:block">
              Jangan langsung coding. Spek dulu.
            </p>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
