"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { ClaimStatusBadge } from "@/src/components/findit/claim-status-badge";
import { ApiError } from "@/src/lib/api/errors";
import { getPostRequest } from "@/src/lib/api/endpoints";
import { useSessionStore, hasValidSession } from "@/src/store/session";
import { useMyClaims, useWithdrawClaim } from "@/src/viewmodels/use-claims";
import { useQueries } from "@tanstack/react-query";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(value));
}

export default function MyClaimsPage() {
  const token = useSessionStore((state) => state.token);
  const expiresAt = useSessionStore((state) => state.expiresAt);
  const enabled = hasValidSession({ token, expiresAt });
  const claimsQuery = useMyClaims(enabled);
  const claims = useMemo(() => claimsQuery.data?.pages.flatMap((page) => page.items) ?? [], [claimsQuery.data]);
  const posts = useQueries({ queries: claims.map((claim) => ({
    queryKey: ["post", claim.post_id],
    queryFn: () => getPostRequest(claim.post_id),
    enabled: enabled && Boolean(claim.post_id),
    staleTime: 60_000,
  })) });
  const withdraw = useWithdrawClaim("");

  useEffect(() => {
    if (claimsQuery.error) toast.add({ title: "Couldn’t load your claims", description: claimsQuery.error.message, priority: "high" });
  }, [claimsQuery.error]);

  async function withdrawClaim(claimId: string) {
    try {
      await withdraw.mutateAsync(claimId);
      toast.add({ title: "Claim withdrawn", description: "Your pending claim has been withdrawn." });
    } catch (error) {
      const locked = error instanceof ApiError && error.code === "CLAIM_LOCKED";
      toast.add({ title: locked ? "Claim is being reviewed" : "Couldn’t withdraw claim", description: error instanceof Error ? error.message : "Please try again.", priority: "high" });
    }
  }

  return <main className="min-h-screen bg-background">
    <section className="mx-auto w-full max-w-none px-5 pb-16 pt-9 sm:px-8 sm:pt-12 lg:px-12 2xl:px-16">
      <p className="text-sm font-semibold text-primary">FindIt · Your activity</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">My claims</h1>
      <p className="mt-3 text-base leading-7 text-muted-foreground">Track the claims you’ve submitted for found items.</p>
      {claimsQuery.isPending ? <div className="mt-8 grid grid-cols-12 gap-4" aria-label="Loading your claims">{Array.from({ length: 3 }, (_, i) => <div key={i} className="col-span-12 rounded-xl border border-border p-5 sm:col-span-6 2xl:col-span-4"><Skeleton className="h-6 w-2/3"/><Skeleton className="mt-4 h-4 w-full"/><Skeleton className="mt-3 h-4 w-1/3"/></div>)}</div>
        : claimsQuery.isError ? <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-6" role="alert"><h2 className="font-semibold">Your claims couldn’t be loaded</h2><p className="mt-1 text-sm text-muted-foreground">{claimsQuery.error.message}</p><Button type="button" variant="outline" className="mt-4 min-h-11" onClick={() => void claimsQuery.refetch()}>Try again</Button></div>
        : claims.length === 0 ? <div className="mt-8 flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center"><ClipboardCheck aria-hidden="true" className="size-8 text-muted-foreground"/><h2 className="mt-4 text-lg font-semibold">You haven’t claimed anything yet.</h2><p className="mt-2 text-sm text-muted-foreground">Browse found items to submit your first claim.</p><Button nativeButton={false} render={<Link href="/findit"/>} className="mt-5 min-h-11">Browse found items</Button></div>
        : <><ul className="mt-8 grid grid-cols-12 gap-4">{claims.map((claim, index) => { const postQuery = posts[index]; const post = postQuery?.data; const busy = withdraw.isPending && withdraw.variables === claim.id; const canWithdraw = claim.decision === "pending";
          return <li key={claim.id} className={`col-span-12 flex min-w-0 flex-col rounded-xl border border-border bg-card p-5 sm:p-6 ${claims.length === 1 ? "" : "sm:col-span-6 2xl:col-span-4"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Found item</p>{post ? <Link className="mt-1 inline-block max-w-full truncate text-lg font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring" href={`/findit/${encodeURIComponent(claim.post_id)}`}>{post.title}</Link> : <p className="mt-1 truncate text-lg font-semibold">{postQuery?.isPending ? "Loading item…" : "Item details unavailable"}</p>}</div><ClaimStatusBadge decision={claim.decision}/></div>
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6">{claim.message}</p>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 mt-5"><p className="text-sm text-muted-foreground">Submitted <time dateTime={claim.created_at}>{formatDate(claim.created_at)}</time></p>{canWithdraw && <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => void withdrawClaim(claim.id)}>{busy ? "Withdrawing…" : "Withdraw"}</Button>}</div>
          </li>;
        })}</ul>{claimsQuery.hasNextPage && <div className="mt-8 flex justify-center"><Button type="button" variant="outline" className="min-h-11 gap-2" disabled={claimsQuery.isFetchingNextPage} onClick={() => void claimsQuery.fetchNextPage()}>{claimsQuery.isFetchingNextPage ? "Loading more…" : "Load more"}<ArrowRight aria-hidden="true" className="size-4"/></Button></div>}</>}
    </section>
  </main>;
}
