import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { Header, Footer } from "@/components/SiteChrome";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
});

const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
});

export const metadata: Metadata = {
  title: {
    default: "Camp Matching — Exceptional summer camps, expertly matched",
    template: "%s · Camp Matching",
  },
  description:
    "A discerning matchmaking service for summer camps. Answer a refined 3-minute questionnaire about your child and receive a curated shortlist of the sleepaway and day camps where they'll truly thrive.",
  openGraph: {
    title: "Camp Matching — Exceptional summer camps, expertly matched",
    description:
      "Answer a refined 3-minute questionnaire and receive a curated shortlist of exceptional sleepaway and day camps.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${jost.variable}`}>
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
