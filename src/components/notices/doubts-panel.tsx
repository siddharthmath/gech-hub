"use client";
import { useState } from "react";
import { useSessionStore } from "@/src/store/session";
import { useDoubts } from "@/src/viewmodels/use-doubts";
import { AskDoubtForm } from "./ask-doubt-form";
import { DoubtFilterChips } from "./doubt-filter-chips";
import { DoubtItem } from "./doubt-item";

export type DoubtFilter = "all" | "unanswered" | "answered";
export function DoubtsPanel({ noticeId, archived }: { noticeId: string; archived: boolean }) {
  const [filter, setFilter] = useState<DoubtFilter>("all");
  const profile = useSessionStore((state) => state.profile);
  const answered = filter === "all" ? null : filter === "answered";
  const query = useDoubts(noticeId, answered);
  const doubts = query.data?.pages.flatMap((page) => page.items) ?? [];
  return <section className="grid content-start gap-5 rounded-2xl border bg-card p-5" aria-label="Doubts"><h2 className="text-xl font-semibold">Doubts</h2>{profile?.role === "admin" ? null : archived ? <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">Doubts are closed for this notice</p> : <AskDoubtForm noticeId={noticeId}/>}<DoubtFilterChips value={filter} onChange={setFilter}/>{query.isPending ? <p className="text-sm text-muted-foreground">Loading doubts…</p> : query.isError ? <p role="alert" className="text-sm text-destructive">Doubts could not be loaded. {query.error.message}</p> : doubts.length ? <div className="grid gap-3">{doubts.map((doubt) => <DoubtItem key={doubt.id} doubt={doubt}/>)}</div> : <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">No doubts yet. Be the first to ask.</p>}{query.hasNextPage && <button type="button" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage} className="min-h-10 rounded-lg border text-sm">{query.isFetchingNextPage ? "Loading…" : "Load more"}</button>}</section>;
}
