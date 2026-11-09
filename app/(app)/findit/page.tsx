"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { hasValidSession, useSessionStore } from "@/src/store/session";
import { useFoundPosts } from "@/src/viewmodels/use-found-posts";
import type { FoundPostStatus } from "@/src/lib/api/endpoints";
import { EmptyState } from "@/src/components/findit/empty-state";
import { PostCard } from "@/src/components/findit/post-card";
import { PostCardSkeleton } from "@/src/components/findit/post-card-skeleton";
import { PostFormDialog } from "@/src/components/findit/post-form-dialog";
import { useCreatePost } from "@/src/viewmodels/use-staff-workflows";

const filters: { label: string; value: FoundPostStatus }[] = [
  { label: "Active", value: "active" },
  { label: "Archived", value: "archived" },
];

export default function FindItFeedPage() {
  const profile = useSessionStore((state) => state.profile);
  const token = useSessionStore((state) => state.token);
  const expiresAt = useSessionStore((state) => state.expiresAt);
  const [status, setStatus] = useState<FoundPostStatus>("active");
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const createPost = useCreatePost();
  const postsQuery = useFoundPosts(status, hasValidSession({ token, expiresAt }));
  const posts = useMemo(
    () => (postsQuery.data?.pages.flatMap((page) => page.items) ?? [])
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
    [postsQuery.data],
  );

  useEffect(() => {
    if (!postsQuery.error) return;
    toast.add({
      title: "Couldn’t load found items",
      description: postsQuery.error instanceof Error
        ? postsQuery.error.message
        : "Please try again.",
      priority: "high",
    });
  }, [postsQuery.error]);

  const isStaff = profile?.role === "office_staff";

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto w-full max-w-none px-5 pb-16 pt-9 sm:px-8 sm:pt-12 lg:px-12 2xl:px-16">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <Search aria-hidden="true" className="size-4" /> FindIt · Lost &amp; Found
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Found on campus</h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Browse the latest items turned in around campus. Something look familiar? Open it to learn more.
            </p>
          </div>
          {isStaff && (
            <Button type="button" className="min-h-11 w-full gap-2 px-4 sm:w-auto" onClick={() => setPostDialogOpen(true)}>
              <Plus aria-hidden="true" className="size-4" /> Post found item
            </Button>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter found items by status">
            {filters.map((filter) => {
              const selected = filter.value === status;
              return (
                <Button
                  key={filter.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setStatus(filter.value)}
                  variant={selected ? "default" : "outline"}
                  className="min-h-11 rounded-full px-4 text-sm font-medium"
                >
                  {filter.label}
                </Button>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {postsQuery.isPending ? "Loading items" : `${posts.length} ${posts.length === 1 ? "item" : "items"}`}
          </p>
        </div>

        {postsQuery.isPending ? (
          <div className="mt-6 grid grid-cols-12 gap-4" aria-label="Loading found items">
            {Array.from({ length: 8 }, (_, index) => <div key={index} className="col-span-12 sm:col-span-6 lg:col-span-4 2xl:col-span-3"><PostCardSkeleton /></div>)}
          </div>
        ) : postsQuery.isError ? (
          <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-6" role="alert">
            <h2 className="font-semibold">Found items couldn’t be loaded</h2>
            <p className="mt-1 text-sm text-muted-foreground">{postsQuery.error.message}</p>
            <Button type="button" variant="outline" className="mt-4 min-h-11" onClick={() => void postsQuery.refetch()}>
              Try again <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        ) : posts.length === 0 ? (
          <div className="mt-8">
            <EmptyState archived={status === "archived"} />
            {status === "active" && <Button nativeButton={false} render={<Link href="/findit/lost-requests" />} variant="outline" className="mt-4 min-h-12 w-full">
              Report a lost item
            </Button>}
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-12 gap-4">
              {posts.map((post) => <div key={post.id} className="col-span-12 min-w-0 sm:col-span-6 lg:col-span-4 2xl:col-span-3"><PostCard post={post} /></div>)}
            </div>
            {postsQuery.hasNextPage && (
              <div className="mt-10 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 min-w-40 gap-2"
                  disabled={postsQuery.isFetchingNextPage}
                  onClick={() => void postsQuery.fetchNextPage()}
                >
                  {postsQuery.isFetchingNextPage ? "Loading more…" : "Load more"}
                  {!postsQuery.isFetchingNextPage && <ArrowRight aria-hidden="true" className="size-4" />}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
      {isStaff && <PostFormDialog key={String(postDialogOpen)} open={postDialogOpen} onOpenChange={setPostDialogOpen} submitting={createPost.isPending} onSubmit={async (input) => {
        try { await createPost.mutateAsync(input); toast.add({ title: "Found item posted", description: "It is now at the top of the gallery." }); }
        catch (error) { toast.add({ title: "Couldn’t post item", description: error instanceof Error ? error.message : "Please try again.", priority: "high" }); throw error; }
      }} />}
    </main>
  );
}
