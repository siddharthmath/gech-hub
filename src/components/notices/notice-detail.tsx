import { Pin } from "lucide-react";
import type { Notice } from "@/src/lib/api/types";
import { NoticeStatusBadge } from "./notice-status-badge";
import { AttachmentCard } from "./attachment-card";

export function NoticeDetail({ notice, onDownload, downloading }: { notice: Notice; onDownload: () => void; downloading: boolean }) {
  const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(notice.created_at));
  return <article className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
    <header><div className="flex flex-wrap items-center gap-2">{notice.pinned && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"><Pin className="size-3"/>Pinned</span>}<NoticeStatusBadge status={notice.status}/>{notice.status === "scheduled" && notice.publish_at && <span className="text-sm text-muted-foreground">Scheduled for {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(notice.publish_at))} IST</span>}</div>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{notice.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{notice.published_by.name} · {notice.published_by.role}{notice.published_by.dept ? `/${notice.published_by.dept}` : ""} · {date} IST</p>
    </header>
    <p className="mt-6 whitespace-pre-wrap break-words text-sm leading-7">{notice.body}</p>
    {notice.attachment && <div className="mt-7"><AttachmentCard attachment={notice.attachment} onDownload={onDownload} downloading={downloading}/></div>}
  </article>;
}
