"use client";
import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { createNoticeRequest, updateNoticeRequest } from "@/src/lib/api/endpoints";
import type { Notice } from "@/src/lib/api/types";
import { AttachmentDropzone } from "./attachment-dropzone";
import { SchedulePicker } from "./schedule-picker";

export function ComposerDialog({ onClose, notice }: { onClose: () => void; notice?: Notice }) {
  const editing = Boolean(notice); const client = useQueryClient();
  const [title, setTitle] = useState(notice?.title ?? ""); const [body, setBody] = useState(notice?.body ?? ""); const [pinned, setPinned] = useState(notice?.pinned ?? false); const [file, setFile] = useState<File | null>(null); const [removeFile, setRemoveFile] = useState(false);
  const [schedule, setSchedule] = useState(notice?.status === "scheduled"); const [date, setDate] = useState(notice?.publish_at ? new Date(new Date(notice.publish_at).getTime() + 330 * 60_000).toISOString().slice(0, 16) : ""); const [fileError, setFileError] = useState(""); const [dateError, setDateError] = useState("");
  const mutation = useMutation({ mutationFn: (input: { title: string; body: string; pinned: boolean; publish_at?: string | null; attachment?: File }) => {
    if (editing) return updateNoticeRequest(notice!.id, { ...input, ...(removeFile ? { remove_attachment: true } : {}) });
    const { publish_at, ...rest } = input;
    return createNoticeRequest({ ...rest, ...(publish_at ? { publish_at } : {}) });
  }, onSuccess: async () => { await client.invalidateQueries({ queryKey: ["notices"] }); if (notice) await client.invalidateQueries({ queryKey: ["notice", notice.id] }); toast.add({ title: editing ? "Notice updated" : schedule ? "Notice scheduled" : "Notice published" }); onClose(); }, onError: (error) => toast.add({ title: editing ? "Notice could not be updated" : "Notice could not be published", description: error instanceof Error ? error.message : "Please try again.", priority: "high" }) });
  function submit(event: FormEvent) { event.preventDefault(); setDateError(""); if (schedule && (!date || new Date(`${date}:00+05:30`).getTime() < Date.now() + 60_000)) { setDateError("Choose a time at least one minute from now."); return; } mutation.mutate({ title, body, pinned, ...(notice?.status === "scheduled" ? { publish_at: schedule ? date : null } : schedule ? { publish_at: date } : {}), ...(file ? { attachment: file } : {}) }); }
  return <div className="fixed inset-0 z-50 grid items-end bg-black/40 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form onSubmit={submit} className="mx-auto grid max-h-[92dvh] w-full max-w-xl gap-4 overflow-y-auto rounded-t-3xl bg-background p-5 shadow-xl sm:rounded-3xl sm:p-7">
    <div><h2 className="text-xl font-semibold">{editing ? "Edit notice" : "New notice"}</h2><p className="mt-1 text-sm text-muted-foreground">{editing ? "Update this notice." : "Share an update with everyone."}</p></div>
    <label className="grid gap-1.5 text-sm font-medium">Title<input required minLength={3} maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 rounded-lg border bg-background px-3"/></label>
    <label className="grid gap-1.5 text-sm font-medium">Message<textarea required minLength={3} maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} rows={6} className="resize-y rounded-lg border bg-background p-3"/><span className="text-right text-xs font-normal text-muted-foreground">{body.length}/5000</span></label>
    <div className="grid gap-1">{editing && notice?.attachment && <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={removeFile} onChange={(e) => setRemoveFile(e.target.checked)}/>Remove current attachment</label>}{!removeFile && <AttachmentDropzone file={file} onChange={(next) => { setFile(next); if (next) setRemoveFile(false); }} onError={setFileError}/ >}{editing && notice?.attachment && !file && !removeFile && <p className="text-xs text-muted-foreground">Current file: {notice.attachment.file_name}. Choose a file to replace it.</p>}{fileError && <p role="alert" className="text-sm text-destructive">{fileError}</p>}</div>
    <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)}/>Pin this notice</label>
    {(!editing || notice?.status === "scheduled") && <SchedulePicker scheduled={schedule} onScheduled={setSchedule} value={date} onValue={(next) => { setDate(next); setDateError(""); }}/ >}{dateError && <p role="alert" className="text-sm text-destructive">{dateError}</p>}
    <div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={onClose} className="min-h-11 rounded-lg px-4 text-sm">Cancel</button><button disabled={mutation.isPending} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{mutation.isPending ? "Saving…" : editing ? "Save changes" : schedule ? "Schedule notice" : "Publish notice"}</button></div>
  </form></div>;
}
