import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "My claims | GECHhub FindIt" };

export default function ClaimsLayout({ children }: { children: ReactNode }) {
  return children;
}
