"use client";
import { useState } from "react";
import { Plus, Megaphone } from "lucide-react";
import { useNotices } from "@/src/viewmodels/use-notices";
import { useSessionStore } from "@/src/store/session";
import type { NoticeStatus } from "@/src/lib/api/types";
import { FeedTabs } from "@/src/components/notices/feed-tabs";
import { NoticeCard } from "@/src/components/notices/notice-card";
import { PinnedStrip } from "@/src/components/notices/pinned-strip";
import { ComposerDialog } from "@/src/components/notices/composer-dialog";

export default function NoticehubPage() {
  const [status, setStatus] = useState<NoticeStatus>("active"); const [compose, setCompose] = useState(false);
  const profile = useSessionStore((state) => state.profile); const publisher = profile?.role === "admin" || profile?.role === "faculty" || profile?.role === "office_staff";
  const pinned = useNotices("active", true); const latest = useNotices("active", false); const other = useNotices(status, null);
  const active = status === "active"; const query = active ? latest : other;
  const pinnedItems = pinned.data?.pages.flatMap((page) => page.items) ?? []; const list = query.data?.pages.flatMap((page) => page.items) ?? [];
  return <main className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-8 sm:px-6 sm:py-12">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><div className="mb-3 inline-flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Megaphone className="size-5"/></div><p className="text-sm font-medium text-primary">Campus updates</p><h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Notices</h1><p className="mt-2 text-muted-foreground">Updates and announcements from your campus.</p></div>{publisher && <button onClick={() => setCompose(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 font-medium text-primary-foreground"><Plus className="size-4"/>New notice</button>}</header>
    {publisher && <FeedTabs status={status} onChange={setStatus} publisher={publisher}/>}
    {active && <PinnedStrip items={pinnedItems}/>}
    {query.isPending || (active && pinned.isPending) ? <div className="grid gap-4" aria-label="Loading notices">{[0,1,2].map((i) => <div key={i} className="grid gap-3 rounded-2xl border p-6"><div className="h-5 w-1/3 animate-pulse rounded bg-muted"/><div className="h-4 w-full animate-pulse rounded bg-muted"/><div className="h-4 w-2/3 animate-pulse rounded bg-muted"/></div>)}</div> : query.isError ? <p role="alert" className="rounded-xl border p-6 text-sm text-destructive">Notices could not be loaded. {query.error.message}</p> : list.length ? <section className="grid gap-4">{active && <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Latest</h2>}{list.map((item) => <NoticeCard key={item.id} item={item}/>)}</section> : <div className="rounded-2xl border border-dashed px-6 py-12 text-center"><h2 className="font-semibold">{status === "active" ? "No notices yet" : `No ${status} notices`}</h2><p className="mt-2 text-sm text-muted-foreground">{publisher ? "Publish an update to keep everyone informed." : "Check back later for campus updates."}</p>{publisher && status === "active" && <button onClick={() => setCompose(true)} className="mt-4 min-h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">Create a notice</button>}</div>}
    {query.hasNextPage && <button onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage} className="mx-auto min-h-11 rounded-xl border px-5 text-sm font-medium">{query.isFetchingNextPage ? "Loading…" : "Load more"}</button>}
    {compose && <ComposerDialog onClose={() => setCompose(false)}/>}
  </main>;
}
