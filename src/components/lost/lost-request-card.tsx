import { CalendarDays, MapPin, Phone, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LostRequestStatusBadge } from "@/src/components/lost/lost-request-status-badge";
import type { LostRequest } from "@/src/lib/api/types";

export function LostRequestCard({ request, isOwner, showPhone, busy, wide, onEdit, onArchive, onReactivate, onDelete }: {
  request: LostRequest;
  isOwner: boolean;
  showPhone: boolean;
  busy: boolean;
  wide: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}) {
  const wideLayout = wide && isOwner;

  return <article className={`flex flex-col justify-between gap-5 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6 ${wideLayout ? "2xl:grid 2xl:grid-cols-[minmax(0,1fr)_auto] 2xl:items-center 2xl:gap-8" : ""}`}>
    <div className={wideLayout ? "2xl:grid 2xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.55fr)] 2xl:items-center 2xl:gap-8" : undefined}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{request.title}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><UserRound aria-hidden="true" className="size-4" />{request.requester.name} <span className="capitalize">· {request.requester.role.replace("_", " ")}</span></p>
        </div>
        <LostRequestStatusBadge status={request.status} />
      </div>
      {request.description && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground/85">{request.description}</p>}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        {request.location_lost && <span className="inline-flex items-center gap-1.5"><MapPin aria-hidden="true" className="size-4" />{request.location_lost}</span>}
        {request.lost_on && <span className="inline-flex items-center gap-1.5"><CalendarDays aria-hidden="true" className="size-4" />{request.lost_on}</span>}
        {showPhone && request.requester.phone_number && <a className="inline-flex min-h-11 items-center gap-1.5 underline-offset-4 hover:underline" href={`tel:${request.requester.phone_number}`}><Phone aria-hidden="true" className="size-4" />{request.requester.phone_number}</a>}
      </div>
    </div>
    {isOwner && <div className={`flex flex-wrap gap-2 border-t border-border pt-4 ${wideLayout ? "2xl:justify-end 2xl:border-0 2xl:pt-0" : ""}`}>
      <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onEdit}>Edit</Button>
      {request.status === "active" ? <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onArchive}>Mark as found</Button> : <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onReactivate}>Reactivate</Button>}
      <Button type="button" variant="destructive" className="min-h-11" disabled={busy} onClick={onDelete}>Delete</Button>
    </div>}
  </article>;
}
