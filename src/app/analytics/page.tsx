import type { Metadata } from "next";
import { AnalyticsPage } from "@/components/pages/analytics/analytics-page";

export const metadata: Metadata = { title: "Analytics" };

export default function Page() {
  return <AnalyticsPage />;
}
