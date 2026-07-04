import type { Metadata } from "next";
import { CampsExplorer } from "./CampsExplorer";

export const metadata: Metadata = {
  title: "Browse camps",
  description:
    "Explore sleepaway and day camps across the USA — filter by type, region, gender, interests and budget.",
};

export default function CampsPage() {
  return <CampsExplorer />;
}
