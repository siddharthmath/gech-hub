"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardList, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { hasValidSession, useSessionStore } from "@/src/store/session";
import { LostRequestEntry } from "@/src/components/lost/lost-request-entry";
import { LostRequestFormDialog } from "@/src/components/lost/lost-request-form-dialog";
import { useCreateLostRequest, useLostRequests } from "@/src/viewmodels/use-lost-requests";
import type { LostRequestStatus } from "@/src/lib/api/endpoints";

const statuses: { label: string; value: LostRequestStatus }[] = [
  { label: "Active", value: "active" },
  { label: "Archived", value: "archived" },
];

export default function LostRequestsPage() {
  const profile = useSessionStore((state) => state.profile);
  const token = useSessionStore((state) => state.token);
  const expiresAt = useSessionStore((state) => state.expiresAt);
  const [status, setStatus] = useState<LostRequestStatus>("active");
  const [mine, setMine] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const create = useCreateLostRequest();
  const isStaff = profile?.role === "office_staff";
  const isAdmin = profile?.role === "admin";
  const enabled = Boolean(profile && !isAdmin && hasValidSession({ token, expiresAt }));
  const query = useLostRequests({ status, ...(isStaff && mine ? { mine: true } : {}) }, enabled);
  const requests = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  useEffect(() => {
    if (!query.error) return;
    toast.add({ title: "Couldn’t load lost reports", description: query.error.message, priority: "high" });
  }, [query.error]);

  return <main className="min-h-screen bg-background">
    <section className="mx-auto w-full max-w-none px-5 pb-16 pt-9 sm:px-8 sm:pt-12 lg:px-12 2xl:px-16">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <Link href="/findit" className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><Search aria-hidden="true" className="size-4" /> FindIt · Lost &amp; Found</Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Lost item reports</h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">Share what you lost and where. Staff can compare reports with items turned in around campus.</p>
        </div>
        {!isAdmin && <Button type="button" className="min-h-11 w-full gap-2 px-4 sm:w-auto" onClick={() => setDialogOpen(true)}><Plus aria-hidden="true" className="size-4" /> Report lost item</Button>}
      </div>

      {isAdmin ? (
        <div className="mt-8 rounded-xl border border-border bg-card px-6 py-12 text-center">
          <ClipboardList aria-hidden="true" className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Lost requests aren’t available for admin</h2>
          <p className="mt-2 text-sm text-muted-foreground">Switch to a student, faculty, or office staff account to use lost item reports.</p>
          <Button nativeButton={false} render={<Link href="/findit" />} variant="outline" className="mt-5 min-h-11">Back to found items</Button>
        </div>
      ) : <>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter lost reports by status">
            {statuses.map((filter) => <Button key={filter.value} type="button" aria-pressed={filter.value === status} onClick={() => setStatus(filter.value)} variant={filter.value === status ? "default" : "outline"} className="min-h-11 rounded-full px-4 text-sm font-medium">{filter.label}</Button>)}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isStaff && <Button type="button" aria-pressed={mine} onClick={() => setMine((value) => !value)} variant={mine ? "default" : "outline"} className="min-h-11 rounded-full px-4">{mine ? "Mine" : "Everyone"}</Button>}
            <p className="text-sm text-muted-foreground" aria-live="polite">{query.isPending ? "Loading reports" : `${requests.length} ${requests.length === 1 ? "report" : "reports"}`}</p>
          </div>
        </div>

        {query.isPending ? <div className="mt-6 grid grid-cols-12 gap-4" aria-label="Loading lost reports">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="col-span-12 h-52 animate-pulse rounded-xl border border-border bg-muted/60 md:col-span-6 2xl:col-span-4" />)}
        </div> : query.isError ? <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-6" role="alert">
          <h2 className="font-semibold">Lost reports couldn’t be loaded</h2><p className="mt-1 text-sm text-muted-foreground">{query.error.message}</p>
          <Button type="button" variant="outline" className="mt-4 min-h-11" onClick={() => void query.refetch()}>Try again <ArrowRight aria-hidden="true" className="size-4" /></Button>
        </div> : requests.length === 0 ? <div className="mt-8 flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <ClipboardList aria-hidden="true" className="size-8 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">No {status} reports</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{status === "active" ? "Reports for lost items will appear here." : "Reports marked as found will appear here."}</p>
        </div> : <>
          <div className="mt-6 grid grid-cols-12 gap-4">
            {requests.map((request) => <div key={request.id} className={`col-span-12 min-w-0 ${requests.length === 1 ? "" : "md:col-span-6 2xl:col-span-4"}`}><LostRequestEntry request={request} profile={profile!} isStaff={isStaff} wide={requests.length === 1} /></div>)}
          </div>
          {query.hasNextPage && <div className="mt-10 flex justify-center"><Button type="button" variant="outline" className="min-h-11 min-w-40 gap-2" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? "Loading more…" : "Load more"}{!query.isFetchingNextPage && <ArrowRight aria-hidden="true" className="size-4" />}</Button></div>}
        </>}
      </>}
    </section>
    {!isAdmin && <LostRequestFormDialog open={dialogOpen} onOpenChange={setDialogOpen} submitting={create.isPending} onSubmit={async (input) => {
      try {
        await create.mutateAsync(input);
        toast.add({ title: "Lost item report submitted", description: "Your report is now in your active list." });
      } catch (error) {
        toast.add({ title: "Couldn’t submit lost item report", description: error instanceof Error ? error.message : "Please try again.", priority: "high" });
        throw error;
      }
    }} />}
  </main>;
}
