"use client";
import { useState } from "react";

export function EditDoubtForm({ question, pending, onSave, onCancel }: { question: string; pending: boolean; onSave: (question: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(question);
  const valid = value.trim().length >= 5 && value.trim().length <= 1000;
  return <form className="mt-3 grid gap-2" onSubmit={(event) => { event.preventDefault(); if (valid && !pending) onSave(value.trim()); }}>
    <label htmlFor="edit-doubt-question" className="sr-only">Edit your question</label>
    <textarea id="edit-doubt-question" value={value} onChange={(event) => setValue(event.target.value)} maxLength={1000} rows={3} aria-invalid={!valid} className="w-full resize-y rounded-xl border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    <div className="flex gap-2"><button type="submit" disabled={!valid || pending} className="min-h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50">{pending ? "Saving…" : "Save"}</button><button type="button" disabled={pending} onClick={onCancel} className="min-h-9 rounded-lg border px-3 text-sm">Cancel</button></div>
    {!valid && <p className="text-xs text-destructive">Question must be 5 to 1000 characters.</p>}
  </form>;
}
