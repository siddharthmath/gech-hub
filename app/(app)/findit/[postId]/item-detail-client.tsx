"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, PackageSearch, Pencil, Archive, RotateCcw, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { ClaimForm } from "@/src/components/findit/claim-form";
import { ClaimsList } from "@/src/components/findit/claims-list";
import { ItemImageGallery } from "@/src/components/findit/item-image-gallery";
import { StatusBadge } from "@/src/components/findit/status-badge";
import { ApiError } from "@/src/lib/api/errors";
import { hasValidSession, useSessionStore } from "@/src/store/session";
import { useClaims, useCreateClaim, useWithdrawClaim } from "@/src/viewmodels/use-claims";
import { usePost } from "@/src/viewmodels/use-post";
import { useDeletePost, useResolution, useResolvePost, useUndoResolution, useUpdatePost, useUpdateResolution } from "@/src/viewmodels/use-staff-workflows";
import { PostFormDialog } from "@/src/components/findit/post-form-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value));
}

export default function ItemDetailPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = use(params);
  const router = useRouter();
  const token = useSessionStore((state) => state.token);
  const expiresAt = useSessionStore((state) => state.expiresAt);
  const profile = useSessionStore((state) => state.profile);
  const enabled = hasValidSession({ token, expiresAt });
  const postQuery = usePost(postId, enabled);
  const claimsQuery = useClaims(postId, enabled);
  const createClaim = useCreateClaim(postId);
  const withdrawClaim = useWithdrawClaim(postId);
  const isStaff = profile?.role === "office_staff";
  const isApprovedClaimant = Boolean(profile && claimsQuery.data?.items.some(
    (claim) => claim.decision === "approved" && claim.claimant.email_id.toLowerCase() === profile.email_id.toLowerCase(),
  ));
  const canViewResolution = isStaff || isApprovedClaimant;
  const resolutionQuery = useResolution(postId, enabled && canViewResolution);
  const resolvePost = useResolvePost(postId);
  const updateResolution = useUpdateResolution(postId);
  const undoResolution = useUndoResolution(postId);
  const updatePost = useUpdatePost(postId);
  const deletePost = useDeletePost(postId);
  const [editOpen, setEditOpen] = useState(false);
  const post = postQuery.data;
  const claims = claimsQuery.data?.items ?? [];
  const hasClaim = Boolean(profile && claims.some((claim) => claim.claimant.email_id.toLowerCase() === profile.email_id.toLowerCase()));
  const ownsPost = Boolean(isStaff && profile && post?.posted_by.email_id.toLowerCase() === profile.email_id.toLowerCase());

  async function runStaffAction(action: () => Promise<unknown>, success: string, failure: string) {
    try { await action(); toast.add({ title: success }); return true; }
    catch (error) {
      const blockedDelete = error instanceof ApiError && error.code === "POST_HAS_PENDING_CLAIMS";
      toast.add({ title: blockedDelete ? "Resolve or wait for claims before deleting" : failure, description: error instanceof Error ? error.message : "Please try again.", priority: "high" });
      return false;
    }
  }

  useEffect(() => {
    if (!createClaim.error) return;
    const duplicate = createClaim.error instanceof ApiError && createClaim.error.code === "ALREADY_EXISTS";
    toast.add({ title: duplicate ? "Claim already submitted" : "Couldn’t submit claim", description: createClaim.error.message, priority: "high" });
  }, [createClaim.error]);

  useEffect(() => {
    if (!withdrawClaim.error) return;
    toast.add({ title: "Couldn’t withdraw claim", description: withdrawClaim.error.message, priority: "high" });
  }, [withdrawClaim.error]);

  useEffect(() => {
    if (createClaim.isSuccess) toast.add({ title: "Claim submitted", description: "Staff can now review your claim." });
  }, [createClaim.isSuccess]);

  useEffect(() => {
    if (withdrawClaim.isSuccess) toast.add({ title: "Claim withdrawn" });
  }, [withdrawClaim.isSuccess]);

  if (postQuery.isPending) {
    return <main className="mx-auto w-full max-w-none px-5 py-8 sm:px-8 lg:px-12 2xl:px-16" aria-label="Loading item details">
      <Skeleton className="h-6 w-32" />
      <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <Skeleton className="aspect-[4/3] rounded-2xl" />
        <div className="space-y-4"><Skeleton className="h-10 w-3/4" /><Skeleton className="h-5 w-1/2" /><Skeleton className="h-32 w-full" /></div>
      </div>
    </main>;
  }

  if (postQuery.isError || !post) {
    return <main className="mx-auto w-full max-w-3xl px-5 py-16 text-center sm:px-8">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground"><PackageSearch aria-hidden="true" className="size-7" /></div>
      <h1 className="mt-5 text-2xl font-semibold">Item details couldn’t be loaded</h1>
      <p className="mt-2 text-muted-foreground">{postQuery.error instanceof Error ? postQuery.error.message : "Please try again."}</p>
      <div className="mt-6 flex justify-center gap-3"><Button type="button" variant="outline" onClick={() => void postQuery.refetch()}>Try again</Button><Button nativeButton={false} render={<Link href="/findit" />} variant="ghost">Back to found items</Button></div>
    </main>;
  }

  const isClosed = post.resolved || post.status === "archived";
  const banner = post.resolved ? "Item returned to owner" : post.status === "archived" ? "This post is archived" : null;

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto w-full max-w-none px-5 pb-16 pt-7 sm:px-8 sm:pt-9 lg:px-12 2xl:px-16">
        <Link href="/findit" className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <ArrowLeft aria-hidden="true" className="size-4" /> Back to found items
        </Link>

        {banner && <div className={`mt-5 rounded-xl border px-4 py-3 text-sm font-medium ${post.resolved ? "border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100" : "border-border bg-muted text-foreground"}`} role="status">{banner}</div>}

        <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)] lg:gap-12 2xl:grid-cols-[minmax(0,1.25fr)_minmax(24rem,0.75fr)] 2xl:gap-16">
          <ItemImageGallery images={post.images} title={post.title} />

          <div>
            <div className="flex flex-wrap items-center gap-3"><StatusBadge post={post} /><span className="text-xs text-muted-foreground">Post {post.id}</span></div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{post.title}</h1>
            <p className="mt-5 whitespace-pre-wrap text-base leading-7 text-muted-foreground">{post.description}</p>

            <dl className="mt-6 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
              <div className="flex items-start gap-3"><MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" /><div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Found at</dt><dd className="mt-1 text-sm font-medium">{post.location_found ?? "Unknown location"}</dd></div></div>
              <div className="flex items-start gap-3"><CalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" /><div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Found on</dt><dd className="mt-1 text-sm font-medium"><time dateTime={post.found_on ?? undefined}>{post.found_on ?? "Date unknown"}</time></dd></div></div>
            </dl>

            <div className="mt-5 space-y-2 text-sm text-muted-foreground">
              <p>Posted by <span className="font-medium text-foreground">{post.posted_by.email_id}</span></p>
              <p>Posted <time dateTime={post.created_at}>{formatDateTime(post.created_at)}</time></p>
              <p>Last updated <time dateTime={post.updated_at}>{formatDateTime(post.updated_at)}</time></p>
            </div>

            {canViewResolution && post.resolved && resolutionQuery.data && (
              <section className="mt-5 rounded-xl border border-sky-300 bg-sky-50 p-4 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100" aria-label="Resolution details">
                <h2 className="font-semibold">Resolution details</h2>
                <dl className="mt-3 space-y-2"><div><dt className="inline font-medium">Approved claim: </dt><dd className="inline">{resolutionQuery.data.claim_id}</dd></div><div><dt className="inline font-medium">Claimant: </dt><dd className="inline">{resolutionQuery.data.claimant_email}</dd></div>{resolutionQuery.data.note && <div><dt className="inline font-medium">Note: </dt><dd className="inline">{resolutionQuery.data.note}</dd></div>}<div><dt className="inline font-medium">Resolved by: </dt><dd className="inline">{resolutionQuery.data.resolved_by}</dd></div><div><dt className="inline font-medium">Resolved on: </dt><dd className="inline"><time dateTime={resolutionQuery.data.resolved_at}>{formatDateTime(resolutionQuery.data.resolved_at)}</time></dd></div></dl>
              </section>
            )}

            {(ownsPost || (isStaff && post.resolved)) && <div className="mt-5 flex flex-wrap gap-2" aria-label="Staff post actions">
              {isStaff && post.resolved && <Button type="button" variant="outline" className="min-h-11" disabled={undoResolution.isPending} onClick={() => void runStaffAction(() => undoResolution.mutateAsync(), "Resolution undone", "Couldn’t undo resolution")}><RotateCcw aria-hidden="true" className="mr-2 size-4" />Undo resolution</Button>}
              {ownsPost && <DropdownMenu><DropdownMenuTrigger render={<Button type="button" variant="outline" className="min-h-11" aria-label="Post actions" />}><MoreHorizontal aria-hidden="true" className="mr-2 size-4" />Post actions</DropdownMenuTrigger><DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}><Pencil aria-hidden="true" />Edit</DropdownMenuItem>
                {!post.resolved && <DropdownMenuItem onClick={() => void runStaffAction(() => updatePost.mutateAsync({ status: post.status === "active" ? "archived" : "active" }), post.status === "active" ? "Post archived" : "Post reopened", "Couldn’t update post")}><Archive aria-hidden="true" />{post.status === "active" ? "Archive" : "Reopen"}</DropdownMenuItem>}
                <DropdownMenuItem variant="destructive" onClick={() => { if (window.confirm("Delete this found item? This cannot be undone.")) void runStaffAction(() => deletePost.mutateAsync(), "Post deleted", "Couldn’t delete post").then((deleted) => { if (deleted) router.replace("/findit"); }); }}><Trash2 aria-hidden="true" />Delete</DropdownMenuItem>
              </DropdownMenuContent></DropdownMenu>}
            </div>}

            {!isClosed && <div className="mt-7 rounded-2xl border border-border bg-card p-5 sm:p-6"><h2 className="text-lg font-semibold">Recognise this item?</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Share a detail that only the owner would know. Staff will review your claim.</p><div className="mt-5"><ClaimForm submitting={createClaim.isPending} submitted={hasClaim || createClaim.isSuccess} onSubmit={async (message) => { await createClaim.mutateAsync(message); }} /></div></div>}
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.72fr)] 2xl:grid-cols-[minmax(0,1.3fr)_minmax(24rem,0.7fr)] 2xl:gap-16">
          {claimsQuery.isPending ? <section aria-label="Loading claims" className="rounded-2xl border border-border bg-card p-5 sm:p-7"><Skeleton className="h-7 w-32" /><div className="mt-5 space-y-4">{Array.from({ length: 2 }, (_, index) => <div key={index} className="rounded-xl border border-border p-4"><Skeleton className="h-5 w-1/2" /><Skeleton className="mt-4 h-16 w-full" /></div>)}</div></section> : <ClaimsList claims={claims} profile={profile} withdrawingClaimId={withdrawClaim.isPending ? withdrawClaim.variables ?? null : null} onWithdraw={(claimId) => withdrawClaim.mutateAsync(claimId)} resolved={post.resolved} resolutionClaimId={resolutionQuery.data?.claim_id} onResolve={isStaff ? (claimId, note) => runStaffAction(() => resolvePost.mutateAsync({ claimId, note }), "Item resolved", "Couldn’t resolve item").then(() => undefined) : undefined} onUpdateResolution={isStaff ? (claimId, note) => runStaffAction(() => updateResolution.mutateAsync({ claimId, note }), "Resolution updated", "Couldn’t update resolution").then(() => undefined) : undefined} />}
          <aside className="h-fit rounded-2xl border border-border bg-muted/50 p-5 sm:p-6">
            <h2 className="font-semibold">Item details</h2>
            <dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Item ID</dt><dd className="text-right font-medium">{post.id}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Photos</dt><dd className="text-right font-medium">{post.images.length}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Status</dt><dd className="text-right font-medium capitalize">{post.resolved ? "resolved" : post.status}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Created</dt><dd className="text-right font-medium"><time dateTime={post.created_at}>{formatDate(post.created_at)}</time></dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Updated</dt><dd className="text-right font-medium"><time dateTime={post.updated_at}>{formatDate(post.updated_at)}</time></dd></div></dl>
          </aside>
        </div>
        {claimsQuery.isError && <p className="mt-5 text-sm text-destructive" role="alert">Claims couldn’t be loaded: {claimsQuery.error.message}</p>}
        {ownsPost && <PostFormDialog key={String(editOpen)} open={editOpen} onOpenChange={setEditOpen} post={post} submitting={updatePost.isPending} onSubmit={async (input) => { const saved = await runStaffAction(() => updatePost.mutateAsync(input), "Post updated", "Couldn’t update post"); if (!saved) throw new Error("The post could not be updated."); }} />}
      </section>
    </main>
  );
}
