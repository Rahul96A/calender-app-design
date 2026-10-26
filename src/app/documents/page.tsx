import type { Metadata } from "next";
import { DocumentsPage } from "@/components/pages/documents/documents-page";

export const metadata: Metadata = { title: "Documents" };

export default function Page() {
  return <DocumentsPage />;
}
