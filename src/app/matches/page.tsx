import type { Metadata } from "next";
import { MatchesView } from "./MatchesView";

export const metadata: Metadata = {
  title: "Your camp matches",
  description: "Your personalized, ranked camp matches.",
};

export default function MatchesPage() {
  return <MatchesView />;
}
