"use client";
import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { createNoticeRequest } from "@/src/lib/api/endpoints";
import { AttachmentDropzone } from "./attachment-dropzone";
import { SchedulePicker } from "./schedule-picker";

export function ComposerDialog({ onClose }: { onClose: () => void }) {
  const client = useQueryClient(); const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [pinned, setPinned] = useState(false); const [file, setFile] = useState<File | null>(null); const [schedule, setSchedule] = useState(false); const [date, setDate] = useState(""); const [fileError, setFileError] = useState(""); const [dateError, setDateError] = useState("");
  const mutation = useMutation({ mutationFn: createNoticeRequest, onSuccess: async (notice) => { await client.invalidateQueries({ queryKey: ["notices"] }); toast.add({ title: notice.status === "scheduled" ? "Notice scheduled" : "Notice published", description: notice.status === "scheduled" ? `Scheduled for ${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(notice.publish_at!))} IST` : undefined }); onClose(); }, onError: (error) => toast.add({ title: "Notice could not be published", description: error instanceof Error ? error.message : "Please try again.", priority: "high" }) });
  function submit(event: FormEvent) { event.preventDefault(); setDateError(""); if (schedule && (!date || new Date(`${date}:00+05:30`).getTime() < Date.now() + 60_000)) { setDateError("Choose a time at least one minute from now."); return; } mutation.mutate({ title, body, pinned, ...(schedule ? { publish_at: date } : {}), ...(file ? { attachment: file } : {}) }); }
  return <div className="fixed inset-0 z-50 grid items-end bg-black/40 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form onSubmit={submit} className="mx-auto grid max-h-[92dvh] w-full max-w-xl gap-4 overflow-y-auto rounded-t-3xl bg-background p-5 shadow-xl sm:rounded-3xl sm:p-7"><div><h2 className="text-xl font-semibold">New notice</h2><p className="mt-1 text-sm text-muted-foreground">Share an update with everyone.</p></div>
    <label className="grid gap-1.5 text-sm font-medium">Title<input required minLength={3} maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 rounded-lg border bg-background px-3"/></label>
    <label className="grid gap-1.5 text-sm font-medium">Message<textarea required minLength={3} maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} rows={6} className="resize-y rounded-lg border bg-background p-3"/><span className="text-right text-xs font-normal text-muted-foreground">{body.length}/5000</span></label>
    <div className="grid gap-1"><AttachmentDropzone file={file} onChange={setFile} onError={setFileError}/>{fileError && <p role="alert" className="text-sm text-destructive">{fileError}</p>}</div>
    <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)}/>Pin this notice</label>
    <SchedulePicker scheduled={schedule} onScheduled={setSchedule} value={date} onValue={(next) => { setDate(next); setDateError(""); }}/>{dateError && <p role="alert" className="text-sm text-destructive">{dateError}</p>}
    <div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={onClose} className="min-h-11 rounded-lg px-4 text-sm">Cancel</button><button disabled={mutation.isPending} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{mutation.isPending ? "Publishing…" : schedule ? "Schedule notice" : "Publish notice"}</button></div>
  </form></div>;
}
