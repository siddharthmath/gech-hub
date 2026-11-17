"use client";
import type { Notice } from "@/src/lib/api/types";
import { ComposerDialog } from "./composer-dialog";

export function NoticeEditDialog({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  return <ComposerDialog notice={notice} onClose={onClose}/>;
}
