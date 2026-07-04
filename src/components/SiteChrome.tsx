"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./Logo";

const NAV = [
  { href: "/quiz", label: "Take the quiz" },
  { href: "/camps", label: "Browse camps" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/for-camps", label: "For camps" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="CampMatch home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                pathname.startsWith(item.href)
                  ? "bg-pine text-cream"
                  : "text-ink-soft hover:bg-pine-light hover:text-pine"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/quiz"
            className="ml-3 rounded-full bg-ember px-5 py-2.5 text-sm font-semibold text-white shadow-lift transition hover:bg-ember-deep"
          >
            Find my camp
          </Link>
        </nav>
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

export function Footer() {
  return (
    <footer className="mt-24 border-t border-ink/10 bg-pine-deep text-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo light />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-cream/70">
            Match.com for summer camps. Tell us about your kid, and we&apos;ll
            match them with the sleepaway or day camps where they&apos;ll thrive.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-cream/60">Parents</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/quiz" className="hover:text-gold">Take the match quiz</Link></li>
            <li><Link href="/camps" className="hover:text-gold">Browse all camps</Link></li>
            <li><Link href="/how-it-works" className="hover:text-gold">How matching works</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-cream/60">Camps</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/for-camps" className="hover:text-gold">Claim your camp</Link></li>
            <li><Link href="/for-camps#create" className="hover:text-gold">Add a new listing</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-cream/10 py-5 text-center text-xs text-cream/50">
        © {new Date().getFullYear()} CampMatch. Camp details are compiled estimates until verified by the camp.
      </div>
    </footer>
  );
}
