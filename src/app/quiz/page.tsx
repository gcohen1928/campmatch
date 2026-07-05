import type { Metadata } from "next";
import { QuizWizard } from "./QuizWizard";

export const metadata: Metadata = {
  title: "The Camp Matching Questionnaire",
  description:
    "Answer a few questions about your child and get matched with the summer camps where they'll thrive.",
};

export default function QuizPage() {
  return <QuizWizard />;
}
