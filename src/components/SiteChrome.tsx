"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoMark, Wordmark } from "./Logo";

const NAV = [
  { href: "/quiz", label: "The questionnaire" },
  { href: "/camps", label: "The collection" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/for-camps", label: "For camps" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between px-4 py-4 sm:px-6 lg:px-12">
        <Link
          href="/"
          aria-label="Camp Matching home"
          className="flex items-center gap-3 text-pine"
        >
          <LogoMark className="h-8 w-8" />
          <Wordmark className="text-ink" />
        </Link>
        <nav className="hidden items-center gap-8 text-[11.5px] font-semibold uppercase tracking-[0.16em] md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`border-b pb-0.5 transition-colors ${
                pathname.startsWith(item.href)
                  ? "border-gold text-ink"
                  : "border-transparent text-ink/60 hover:border-gold/60 hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/quiz"
          className="hidden rounded-full bg-pine px-7 py-[13px] text-[11.5px] font-semibold uppercase tracking-[0.14em] text-cream transition-colors hover:bg-ember md:block"
        >
          Find your match
        </Link>
        <button
          className="rounded-lg p-2 text-pine md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
      {open && (
        <nav className="border-t border-ink/10 bg-cream px-4 py-3 md:hidden">
          {[...NAV, { href: "/quiz", label: "Find your match" }].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-ink hover:bg-pine-light"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

const FOOTER_LINKS = [
  { href: "/quiz", label: "Take the questionnaire" },
  { href: "/camps", label: "The collection" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/for-camps", label: "Claim your camp" },
  { href: "/admin", label: "Admin" },
];

export function Footer() {
  return (
    <footer className="border-t-2 border-gold/70 bg-pine-deep text-cream">
      <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-7 px-4 py-12 sm:flex-row sm:px-6 lg:px-12">
        <div className="flex flex-col items-center gap-2.5 sm:items-start">
          <Link href="/" className="flex items-center gap-3 text-cream">
            <LogoMark className="h-7 w-7" />
            <Wordmark className="text-[16px]" />
          </Link>
          <p className="font-display text-[15px] italic text-cream/60">
            Exceptional camps, thoughtfully matched.
          </p>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-cream/60">
          {FOOTER_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-gold">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
