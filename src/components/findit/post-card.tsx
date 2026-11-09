import Link from "next/link";
import { CalendarDays, MapPin, PackageSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FoundPost } from "@/src/lib/api/types";
import { StatusBadge } from "./status-badge";

export function PostCard({ post }: { post: FoundPost }) {
  const image = post.images[0];

  return (
    <Link
      href={`/findit/${encodeURIComponent(post.id)}`}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      aria-label={`View ${post.title}, found at ${post.location_found ?? "unknown location"}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {image ? (
          // API image URLs are short-lived and may point at a signed object store URL.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={post.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground" aria-label="No image available">
            <PackageSearch aria-hidden="true" className="size-10" strokeWidth={1.5} />
            <span className="sr-only">No image available</span>
          </div>
        )}
        <div className="absolute left-3 top-3"><StatusBadge post={post} /></div>
      </div>
      <div className="p-4">
        <h2 className="truncate text-base font-semibold tracking-tight text-foreground">{post.title}</h2>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="inline-flex max-w-full min-w-0 items-center gap-1.5 font-normal">
            <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{post.location_found ?? "Unknown location"}</span>
          </Badge>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
            <time dateTime={post.found_on ?? undefined}>{post.found_on ?? "Date unknown"}</time>
          </span>
        </div>
      </div>
    </Link>
  );
}
