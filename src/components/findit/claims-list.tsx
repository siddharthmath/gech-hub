"use client";

import { useState } from "react";
import { Phone, UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ClaimStatusBadge } from "@/src/components/findit/claim-status-badge";
import { ApiError } from "@/src/lib/api/errors";
import type { Claim, Profile } from "@/src/lib/api/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase() || "?";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value));
}

export function ClaimsList({ claims, profile, withdrawingClaimId, onWithdraw, resolved = false, resolutionClaimId, onResolve, onUpdateResolution }: {
  claims: Claim[];
  profile: Profile | null;
  withdrawingClaimId: string | null;
  onWithdraw: (claimId: string) => Promise<void>;
  resolved?: boolean;
  resolutionClaimId?: string;
  onResolve?: (claimId: string, note?: string) => Promise<void>;
  onUpdateResolution?: (claimId: string, note?: string) => Promise<void>;
}) {
  const [lockedClaims, setLockedClaims] = useState<string[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [savingResolution, setSavingResolution] = useState(false);
  const isStaff = profile?.role === "office_staff";
  const canManageResolution = isStaff && (resolved ? Boolean(onUpdateResolution) : Boolean(onResolve));

  async function saveResolution() {
    if (!selectedClaim) return;
    setSavingResolution(true); setResolutionError(null);
    try {
      if (resolved) await onUpdateResolution?.(selectedClaim, note.trim() || undefined);
      else await onResolve?.(selectedClaim, note.trim() || undefined);
      setSelectedClaim(null);
    } catch (error) {
      setResolutionError(error instanceof Error ? error.message : "Resolution could not be saved.");
    } finally { setSavingResolution(false); }
  }

  return (
    <section aria-labelledby="claims-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-7">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">Community claims</p>
          <h2 id="claims-heading" className="mt-1 text-xl font-semibold tracking-tight">Claims</h2>
        </div>
        <span className="text-sm text-muted-foreground">{claims.length} {claims.length === 1 ? "claim" : "claims"}</span>
      </div>
      {claims.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">No claims yet.</p>
      ) : (
        <ul className="mt-5 space-y-4">
          {claims.map((claim) => {
            const locked = lockedClaims.includes(claim.id);
            const isClaimant = claim.claimant.email_id.toLowerCase() === profile?.email_id.toLowerCase();
            const canWithdraw = isClaimant && claim.decision === "pending" && !locked;
            return (
              <li key={claim.id} className="rounded-xl border border-border p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <Avatar aria-hidden="true" className="size-10"><AvatarFallback>{initials(claim.claimant.name)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{claim.claimant.name}</h3>
                        <p className="text-sm capitalize text-muted-foreground">{claim.claimant.role.replaceAll("_", " ")}</p>
                      </div>
                      <ClaimStatusBadge decision={claim.decision} />
                    </div>
                    {isStaff && (
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5"><UserRound aria-hidden="true" className="size-3.5" />{claim.claimant.email_id}</span>
                        {claim.claimant.phone_number && <a className="inline-flex min-h-8 items-center gap-1.5 underline-offset-4 hover:underline" href={`tel:${claim.claimant.phone_number}`}><Phone aria-hidden="true" className="size-3.5" />{claim.claimant.phone_number}</a>}
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground">{claim.message}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>Submitted <time dateTime={claim.created_at}>{formatDate(claim.created_at)}</time></span>
                </div>
                {canWithdraw && (
                  <Button type="button" variant="outline" className="mt-4 min-h-11" disabled={withdrawingClaimId === claim.id} onClick={() => void onWithdraw(claim.id).catch((error: unknown) => {
                    if (error instanceof ApiError && error.code === "CLAIM_LOCKED") {
                      setLockedClaims((current) => current.includes(claim.id) ? current : [...current, claim.id]);
                    }
                  })}>
                    {withdrawingClaimId === claim.id ? "Withdrawing…" : "Withdraw"}
                  </Button>
                )}
                {canManageResolution && !resolved && claim.decision === "pending" && (
                  <Button type="button" className="mt-4 min-h-11" onClick={() => { setSelectedClaim(claim.id); setNote(""); setResolutionError(null); }}>Resolve with this claim</Button>
                )}
                {canManageResolution && resolved && claim.id === resolutionClaimId && (
                  <Button type="button" variant="outline" className="mt-4 min-h-11" onClick={() => { setSelectedClaim(claim.id); setNote(""); setResolutionError(null); }}>Edit resolution</Button>
                )}
                {locked && <p className="mt-4 text-sm text-muted-foreground" role="status">This claim can no longer be withdrawn because staff have started reviewing it.</p>}
              </li>
            );
          })}
        </ul>
      )}
      <Dialog open={Boolean(selectedClaim)} onOpenChange={(open) => { if (!open && !savingResolution) setSelectedClaim(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{resolved ? "Change resolution" : "Resolve found item"}</DialogTitle><DialogDescription>{resolved ? "Choose the approved claim and update the optional staff note." : "This claim will be approved and all other claims will be rejected."}</DialogDescription></DialogHeader>
          {resolved && <div><label htmlFor="resolution-claim" className="mb-1.5 block font-medium">Approved claim</label><select id="resolution-claim" className="min-h-11 w-full rounded-lg border border-input bg-background px-3" value={selectedClaim ?? ""} onChange={(event) => setSelectedClaim(event.target.value)}>{claims.map((claim) => <option key={claim.id} value={claim.id}>{claim.claimant.name} · {claim.id}</option>)}</select></div>}
          <div><label htmlFor="resolution-note" className="mb-1.5 block font-medium">Note (optional)</label><Textarea id="resolution-note" value={note} maxLength={1000} onChange={(event) => setNote(event.target.value)} /></div>
          {resolutionError && <p className="text-sm text-destructive" role="alert">{resolutionError}</p>}
          <DialogFooter><Button type="button" variant="outline" className="min-h-11" onClick={() => setSelectedClaim(null)} disabled={savingResolution}>Cancel</Button><Button type="button" className="min-h-11" onClick={() => void saveResolution()} disabled={savingResolution || !selectedClaim}>{savingResolution ? "Saving…" : resolved ? "Save resolution" : "Resolve item"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
