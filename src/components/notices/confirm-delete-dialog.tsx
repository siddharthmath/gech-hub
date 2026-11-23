"use client";

export function ConfirmDeleteDialog({ noticeId, pending, onCancel, onConfirm }: { noticeId: string; pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby={`delete-${noticeId}`} className="grid w-full max-w-md gap-4 rounded-2xl bg-background p-6 shadow-xl"><h2 id={`delete-${noticeId}`} className="text-lg font-semibold">Delete this notice?</h2><p className="text-sm text-muted-foreground">Doubts and answers on this notice will also be deleted.</p><div className="flex justify-end gap-2"><button type="button" onClick={onCancel} className="min-h-10 rounded-lg px-4 text-sm">Cancel</button><button type="button" disabled={pending} onClick={onConfirm} className="min-h-10 rounded-lg bg-destructive px-4 text-sm font-semibold text-destructive-foreground">{pending ? "Deleting…" : "Delete"}</button></div></section></div>;
}
