import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Header, Footer } from "@/components/SiteChrome";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "CampMatch — Find the summer camp your kid was made for",
    template: "%s · CampMatch",
  },
  description:
    "Match.com for summer camps. Take a 3-minute quiz about your child and get matched with the sleepaway and day camps across the USA where they'll thrive.",
  openGraph: {
    title: "CampMatch — Find the summer camp your kid was made for",
    description:
      "Take a 3-minute quiz and get matched with the perfect sleepaway or day camp.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
