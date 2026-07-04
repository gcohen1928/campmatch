import type { Metadata } from "next";
import { Newsreader, Archivo } from "next/font/google";
import { Header, Footer } from "@/components/SiteChrome";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
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
    <html lang="en" className={`${newsreader.variable} ${archivo.variable}`}>
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
