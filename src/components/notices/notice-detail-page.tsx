"use client";
import Link from "next/link";
import { ApiError } from "@/src/lib/errors";
import type { NoticeStatus } from "@/src/lib/api/types";
import { useNotice, useNoticeAttachment } from "@/src/viewmodels/use-notices";
import { NoticeDetail } from "./notice-detail";
import { DoubtsPanel } from "./doubts-panel";

export function NoticeDetailPage({ noticeId, feedStatus }: { noticeId: string; feedStatus: NoticeStatus }) {
  const query = useNotice(noticeId);
  const download = useNoticeAttachment();
  const back = `/noticehub?status=${feedStatus}`;
  async function saveAttachment() {
    if (!query.data?.attachment) return;
    try {
      const blob = await download.mutateAsync(noticeId);
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = query.data.attachment.file_name;
      anchor.click();
      URL.revokeObjectURL(href);
    } catch { /* The failed request is shown below. */ }
  }
  return <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
    <Link href={back} className="mb-5 inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline">← Back to notices</Link>
    {query.isPending ? <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]" aria-label="Loading notice"><div className="h-96 animate-pulse rounded-2xl border bg-muted/50"/><div className="hidden h-60 rounded-2xl border bg-muted/30 lg:block"/></div> : query.isError && query.error instanceof ApiError && query.error.code === "NOT_FOUND" ? <div className="rounded-2xl border border-dashed px-6 py-16 text-center"><h1 className="text-xl font-semibold">This notice isn&apos;t available</h1><Link href={back} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">Back to notices</Link></div> : query.isError ? <p role="alert" className="rounded-xl border p-6 text-sm text-destructive">Notice could not be loaded. {query.error.message}</p> : query.data ? <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]"><div><NoticeDetail notice={query.data} onDownload={saveAttachment} downloading={download.isPending}/>{download.isError && <p role="alert" className="mt-3 text-sm text-destructive">Download failed. {download.error.message}</p>}</div><div className="lg:sticky lg:top-6 lg:self-start"><DoubtsPanel noticeId={noticeId} archived={query.data.status === "archived"}/></div></div> : null}
  </main>;
}
