import type { Metadata } from "next";
import { PersonalDetailsPage } from "@/components/pages/personal-details/personal-details-page";

export const metadata: Metadata = { title: "Personal details" };

export default function Page() {
  return <PersonalDetailsPage />;
}
