import type { Doubt } from "@/src/lib/api/types";
import { DoubtActionsMenu } from "./doubt-actions-menu";

export function DoubtItem({ doubt }: { doubt: Doubt }) {
  const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(doubt.created_at));
  return <article className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">{doubt.asker.name} · {doubt.asker.role} · {date} IST</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{doubt.question}</p>{doubt.response ? <div className="mt-3 rounded-lg bg-blue-500/10 p-3"><p className="text-xs font-medium text-blue-800">Answered by {doubt.response.responded_by.name}</p><p className="mt-1 whitespace-pre-wrap text-sm">{doubt.response.message}</p></div> : <span className="mt-3 inline-flex rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-800">Awaiting answer</span>}<DoubtActionsMenu doubt={doubt}/></article>;
}
