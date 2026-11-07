import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import ItemDetailClient from "./item-detail-client";

// The item ID is only available at request time for this dynamic detail route.
export const instant = false;

export const metadata: Metadata = { title: "Found item | GECHhub FindIt" };

export default function ItemDetailRoute({ params }: { params: Promise<{ postId: string }> }) {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-[120rem] px-5 py-8 sm:px-8 lg:px-12 2xl:px-16" aria-label="Loading item details"><Skeleton className="h-6 w-32" /><div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)] 2xl:grid-cols-[minmax(0,1.25fr)_minmax(24rem,0.75fr)]"><Skeleton className="aspect-[4/3] rounded-2xl" /><div className="space-y-4"><Skeleton className="h-10 w-3/4" /><Skeleton className="h-5 w-1/2" /><Skeleton className="h-32 w-full" /></div></div></main>}>
      <ItemDetailClient params={params} />
    </Suspense>
  );
}
