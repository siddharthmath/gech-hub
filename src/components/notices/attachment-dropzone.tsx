"use client";
import { useRef } from "react";
const TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export function AttachmentDropzone({ file, onChange, onError }: { file: File | null; onChange: (file: File | null) => void; onError: (message: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  function setFile(next: File | null) { if (next && next.size > 10 * 1024 * 1024) { onChange(null); onError(`${next.name} is larger than 10MB.`); return; } if (next && !TYPES.includes(next.type)) { onChange(null); onError(`${next.name} is not a supported file type.`); return; } onChange(next); onError(""); }
  return <div className="rounded-xl border border-dashed p-4"><label className="block cursor-pointer text-sm"><span className="font-medium">Attachment</span><span className="mt-1 block text-muted-foreground">PDF, JPEG, PNG or WebP, up to 10MB</span><input ref={ref} className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)}/></label>{file && <div className="mt-2 flex items-center justify-between gap-2 text-sm"><span className="truncate">{file.name}</span><button type="button" className="text-destructive" onClick={() => { setFile(null); if (ref.current) ref.current.value = ""; }}>Remove</button></div>}</div>;
}
