import { Download, FileImage, FileText, Paperclip } from "lucide-react";
import type { Notice } from "@/src/lib/api/types";

export function AttachmentCard({ attachment, onDownload, downloading }: { attachment: NonNullable<Notice["attachment"]>; onDownload: () => void; downloading: boolean }) {
  const image = attachment.content_type === "image/jpeg" || attachment.content_type === "image/png";
  const Icon = image ? FileImage : attachment.content_type === "application/pdf" ? FileText : Paperclip;
  return <section className="rounded-2xl border p-4" aria-label="Notice attachment">
    <div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted"><Icon className="size-5"/></span><div className="min-w-0 flex-1"><p className="break-all text-sm font-medium">{attachment.file_name}</p>{attachment.size !== null && <p className="mt-1 text-xs text-muted-foreground">{formatSize(attachment.size)}</p>}</div><button type="button" onClick={onDownload} disabled={downloading} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-60"><Download className="size-4"/>Download</button></div>
    {image && <img src={attachment.url} alt={attachment.file_name} className="mt-4 max-h-96 w-full rounded-xl border object-contain"/>}
  </section>;
}

function formatSize(size: number) { return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`; }
