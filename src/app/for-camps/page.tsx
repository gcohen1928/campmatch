import type { Metadata } from "next";
import { Suspense } from "react";
import { CampPortal } from "./CampPortal";

export const metadata: Metadata = {
  title: "For camps — claim or create your listing",
  description:
    "Camp directors: claim your CampMatch listing or create a new one, verify your details, and reach matched families.",
};

export default function ForCampsPage() {
  return (
    <Suspense>
      <CampPortal />
    </Suspense>
  );
}
