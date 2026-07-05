import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCampBySlug } from "@/lib/camps-data";
import { ApplyForm } from "./ApplyForm";

// Applications are for the long tail too — render on demand, no static params.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const camp = getCampBySlug(slug);
  if (!camp) return {};
  return {
    title: `Apply to ${camp.name}`,
    description: `Apply to ${camp.name} through Camp Matching — one form, sent to the camp for you.`,
  };
}

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const camp = getCampBySlug(slug);
  if (!camp) notFound();

  return <ApplyForm camp={camp} />;
}
