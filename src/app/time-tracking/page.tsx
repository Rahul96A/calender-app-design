import type { Metadata } from "next";
import { TimeTrackingPage } from "@/components/pages/time-tracking/time-tracking-page";

export const metadata: Metadata = { title: "Time tracking" };

export default function Page() {
  return <TimeTrackingPage />;
}
