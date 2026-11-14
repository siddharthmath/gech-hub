"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";
import type { LostRequest, Profile } from "@/src/lib/api/types";
import { useDeleteLostRequest, useUpdateLostRequest } from "@/src/viewmodels/use-lost-requests";
import { LostRequestCard } from "@/src/components/lost/lost-request-card";
import { LostRequestFormDialog } from "@/src/components/lost/lost-request-form-dialog";

export function LostRequestEntry({ request, profile, isStaff, wide = false }: {
  request: LostRequest;
  profile: Profile;
  isStaff: boolean;
  wide?: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const update = useUpdateLostRequest(request.id);
  const remove = useDeleteLostRequest(request.id);
  const isOwner = request.requester.email_id.toLowerCase() === profile.email_id.toLowerCase();
  const busy = update.isPending || remove.isPending;

  async function changeStatus(status: "active" | "archived") {
    try {
      await update.mutateAsync({ status });
      toast.add({ title: status === "archived" ? "Marked as found" : "Report reactivated" });
    } catch (error) {
      toast.add({ title: "Couldn’t update report", description: error instanceof Error ? error.message : "Please try again.", priority: "high" });
    }
  }

  async function deleteRequest() {
    if (!window.confirm(`Delete the report “${request.title}”? This cannot be undone.`)) return;
    try {
      await remove.mutateAsync();
      toast.add({ title: "Lost item report deleted" });
    } catch (error) {
      toast.add({ title: "Couldn’t delete report", description: error instanceof Error ? error.message : "Please try again.", priority: "high" });
    }
  }

  return <>
    <LostRequestCard
      request={request}
      isOwner={isOwner}
      showPhone={isStaff}
      busy={busy}
      wide={wide}
      onEdit={() => setEditOpen(true)}
      onArchive={() => void changeStatus("archived")}
      onReactivate={() => void changeStatus("active")}
      onDelete={() => void deleteRequest()}
    />
    {isOwner && <LostRequestFormDialog
      key={`${request.id}-${String(editOpen)}`}
      open={editOpen}
      onOpenChange={setEditOpen}
      request={request}
      submitting={update.isPending}
      onSubmit={async (input) => {
        try { await update.mutateAsync(input); toast.add({ title: "Report updated" }); }
        catch (error) {
          toast.add({ title: "Couldn’t update report", description: error instanceof Error ? error.message : "Please try again.", priority: "high" });
          throw error;
        }
      }}
    />}
  </>;
}
