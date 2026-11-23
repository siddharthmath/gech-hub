"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/src/lib/api/errors";
import type { Doubt } from "@/src/lib/api/types";
import { useDoubtMutations } from "@/src/viewmodels/use-doubts";
import { toast } from "@/components/ui/toast";
import { EditDoubtForm } from "./edit-doubt-form";

export function DoubtActionsMenu({ doubt }: { doubt: Doubt }) {
  const client = useQueryClient();
  const mutations = useDoubtMutations(doubt.notice_id);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  if (!doubt.is_mine) return null;

  async function save(question: string) {
    try {
      await mutations.update.mutateAsync({ id: doubt.id, question });
      setEditing(false);
      toast.add({ title: "Doubt updated" });
    } catch (error) {
      if (error instanceof ApiError && error.code === "DOUBT_ANSWERED") {
        setEditing(false);
        toast.add({ title: "Doubt could not be edited", description: error.message, priority: "high" });
        await client.invalidateQueries({ queryKey: ["doubts", doubt.notice_id] });
      } else toast.add({ title: "Doubt could not be updated", description: error instanceof Error ? error.message : "Please try again.", priority: "high" });
    }
  }
  async function remove() {
    if (!window.confirm("Delete this doubt? This also deletes the answer, if any.")) return;
    try {
      await mutations.remove.mutateAsync(doubt.id);
      toast.add({ title: "Doubt deleted" });
    } catch (error) { toast.add({ title: "Doubt could not be deleted", description: error instanceof Error ? error.message : "Please try again.", priority: "high" }); }
  }

  return <div className="mt-2" onClick={(event) => event.stopPropagation()}>
    <button type="button" aria-label="Doubt actions" aria-expanded={open} onClick={() => setOpen(!open)} className="rounded-lg px-2 py-1 text-xl text-muted-foreground hover:bg-muted">⋯</button>
    {doubt.response && <p className="text-xs text-muted-foreground">Answered doubts can&apos;t be edited.</p>}
    {open && <div className="grid w-fit rounded-xl border bg-background p-1 shadow-lg">{!doubt.response && <button type="button" onClick={() => { setEditing(true); setOpen(false); }} className="min-h-9 rounded-lg px-3 text-left text-sm hover:bg-muted">Edit</button>}<button type="button" onClick={() => { setOpen(false); void remove(); }} className="min-h-9 rounded-lg px-3 text-left text-sm text-destructive hover:bg-muted">Delete</button></div>}
    {editing && <EditDoubtForm question={doubt.question} pending={mutations.update.isPending} onSave={(question) => void save(question)} onCancel={() => setEditing(false)} />}
  </div>;
}
