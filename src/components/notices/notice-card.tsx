import Link from "next/link";
import { Pin, Paperclip } from "lucide-react";
import type { Notice } from "@/src/lib/api/types";
import { NoticeStatusBadge } from "./notice-status-badge";
export function NoticeCard({ item, feedStatus = "active" }: { item: Notice; feedStatus?: "active" | "scheduled" | "archived" }) { return <article className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
  <div className="flex flex-wrap items-start justify-between gap-3"><h2 className="text-lg font-semibold tracking-tight"><Link href={`/noticehub/${encodeURIComponent(item.id)}?status=${feedStatus}`} className="hover:underline">{item.title}</Link></h2><div className="flex items-center gap-2">{item.pinned && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"><Pin className="size-3"/>Pinned</span>}<NoticeStatusBadge status={item.status}/></div></div>
  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.body}</p>
  {item.attachment && <a className="mt-4 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted" href={item.attachment.url} target="_blank" rel="noreferrer"><Paperclip className="size-4"/>{item.attachment.file_name}</a>}
  <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs text-muted-foreground"><span>{item.published_by.name}{item.published_by.dept ? ` · ${item.published_by.dept}` : ""}</span><time dateTime={item.publish_at ?? item.created_at}>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(item.publish_at ?? item.created_at))} IST</time></div>
</article>; }
