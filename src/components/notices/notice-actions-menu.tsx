"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Notice } from "@/src/lib/api/types";
import { useSessionStore } from "@/src/store/session";
import { useNoticeMutations } from "@/src/viewmodels/use-notice-mutations";
import { toast } from "@/components/ui/toast";
import { NoticeEditDialog } from "./notice-edit-dialog";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";

export function NoticeActionsMenu({ notice }: { notice: Notice }) {
  const profile = useSessionStore((state) => state.profile); const client = useQueryClient(); const mutations = useNoticeMutations();
  const [open, setOpen] = useState(false); const [edit, setEdit] = useState(false); const [confirm, setConfirm] = useState(false);
  if (!profile || profile.email_id.toLowerCase() !== notice.published_by.email_id.toLowerCase() || !["faculty", "office_staff"].includes(profile.role)) return null;
  const refresh = async () => { await client.invalidateQueries({ queryKey: ["notices"] }); await client.invalidateQueries({ queryKey: ["notice", notice.id] }); };
  async function update(input: { pinned?: boolean; status?: "active" | "archived" }) { try { await mutations.update.mutateAsync({ id: notice.id, input }); await refresh(); toast.add({ title: "Notice updated" }); } catch (error) { toast.add({ title: "Notice could not be updated", description: error instanceof Error ? error.message : "Please try again.", priority: "high" }); } }
  async function remove() { try { await mutations.remove.mutateAsync(notice.id); await refresh(); toast.add({ title: "Notice deleted" }); setConfirm(false); setOpen(false); } catch (error) { toast.add({ title: "Notice could not be deleted", description: error instanceof Error ? error.message : "Please try again.", priority: "high" }); } }
  return <div className="relative" onClick={(event) => event.stopPropagation()}><button type="button" aria-label="Notice actions" aria-expanded={open} onClick={() => setOpen(!open)} className="grid size-10 place-items-center rounded-lg border text-xl hover:bg-muted">⋯</button>
    {open && <div className="absolute right-0 z-20 mt-1 grid min-w-44 rounded-xl border bg-background p-1 shadow-lg">{[["Edit", () => { setEdit(true); setOpen(false); }], [notice.pinned ? "Unpin" : "Pin", () => { setOpen(false); void update({ pinned: !notice.pinned }); }], [notice.status === "archived" ? "Restore" : "Archive", () => { setOpen(false); void update({ status: notice.status === "archived" ? "active" : "archived" }); }], ...(notice.status === "scheduled" ? [["Reschedule", () => { setEdit(true); setOpen(false); }] as [string, () => void]] : []), ["Delete", () => { setConfirm(true); setOpen(false); }]].map(([label, action]) => <button key={label as string} type="button" onClick={action as () => void} className="min-h-10 rounded-lg px-3 text-left text-sm hover:bg-muted">{label as string}</button>)}</div>}
    {edit && <NoticeEditDialog notice={notice} onClose={() => setEdit(false)}/>}
    {confirm && <ConfirmDeleteDialog noticeId={notice.id} pending={mutations.remove.isPending} onCancel={() => setConfirm(false)} onConfirm={() => void remove()}/>}
  </div>;
}
