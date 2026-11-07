import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Found items | GECHhub FindIt" };

export default function FindItLayout({ children }: { children: ReactNode }) {
  return children;
}
