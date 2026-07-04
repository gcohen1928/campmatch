"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoMark } from "./Logo";

const NAV = [
  { href: "/quiz", label: "The quiz" },
  { href: "/camps", label: "Browse camps" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/for-camps", label: "For camps" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between px-4 py-4 sm:px-6 lg:px-12">
        <Link
          href="/"
          aria-label="CampMatch home"
          className="flex items-center gap-2 font-display text-[23px] font-semibold text-ink"
        >
          <LogoMark className="h-8 w-8 text-pine" />
          CampMatch
        </Link>
        <nav className="hidden items-center gap-1.5 rounded-full border border-ink/12 bg-white p-1.5 text-[13.5px] font-medium md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-[18px] py-[9px] transition-colors ${
                pathname.startsWith(item.href)
                  ? "bg-cream text-ink"
                  : "text-ink hover:bg-cream/70"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/quiz"
          className="hidden rounded-full bg-ember px-[26px] py-[13px] text-sm font-semibold text-white transition-colors hover:bg-pine md:block"
        >
          Find my camp →
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
          {[...NAV, { href: "/quiz", label: "Find my camp →" }].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 font-medium text-ink hover:bg-pine-light"
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
  { href: "/quiz", label: "Take the quiz" },
  { href: "/camps", label: "Browse camps" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/for-camps", label: "Claim your camp" },
  { href: "/admin", label: "Admin" },
];

export function Footer() {
  return (
    <footer className="border-t border-ink/12">
      <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-5 px-4 py-10 sm:flex-row sm:px-6 lg:px-12">
        <Link href="/" className="flex items-center gap-2 font-display text-[19px] font-semibold text-ink">
          <LogoMark className="h-6 w-6 text-pine" />
          CampMatch
        </Link>
        <nav className="flex flex-wrap justify-center gap-x-[30px] gap-y-2 text-[13.5px] text-ink/65">
          {FOOTER_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
