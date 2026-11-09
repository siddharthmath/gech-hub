"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { FoundPost } from "@/src/lib/api/types";
import type { FoundPostInput } from "@/src/lib/api/endpoints";

const maxBytes = 5 * 1024 * 1024;
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function SelectedPhoto({ file, onRemove }: { file: File; onRemove: () => void }) {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    if (imageRef.current) imageRef.current.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <li className="flex min-w-0 items-center gap-3 rounded-lg border border-border p-2">
      {/* Object URLs are local previews, so use a native image and release each URL on cleanup. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imageRef} alt={`Preview of ${file.name}`} width={56} height={56} className="size-14 shrink-0 rounded-md object-cover" />
      <span className="min-w-0 flex-1 truncate text-sm">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
      <Button type="button" variant="ghost" className="min-h-11 min-w-11 shrink-0 px-2" aria-label={`Remove ${file.name}`} onClick={onRemove}>
        <X aria-hidden="true" className="size-4" />
      </Button>
    </li>
  );
}

export function PostFormDialog({ open, onOpenChange, post, submitting, onSubmit }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: FoundPost;
  submitting: boolean;
  onSubmit: (input: FoundPostInput) => Promise<void>;
}) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [description, setDescription] = useState(post?.description ?? "");
  const [location, setLocation] = useState(post?.location_found ?? "");
  const [foundOn, setFoundOn] = useState(post?.found_on ?? localDate());
  const [images, setImages] = useState<File[]>([]);
  const [removeImages, setRemoveImages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = localDate();

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const incoming = Array.from(fileList);
    const retainedPhotoCount = post && !removeImages ? post.images.length : 0;
    if (retainedPhotoCount + images.length + incoming.length > 5) {
      setError(`You can add ${Math.max(0, 5 - retainedPhotoCount - images.length)} more photo${5 - retainedPhotoCount - images.length === 1 ? "" : "s"}. Remove current photos first to replace them.`);
      return;
    }
    const invalidSize = incoming.find((file) => file.size > maxBytes);
    if (invalidSize) { setError(`${invalidSize.name} is larger than 5 MB.`); return; }
    const invalidType = incoming.find((file) => !allowedTypes.includes(file.type));
    if (invalidType) { setError(`${invalidType.name} must be JPEG, PNG, or WebP.`); return; }
    setImages((current) => [...current, ...incoming]); setError(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (title.trim().length < 3 || title.trim().length > 100) { setError("Title must be 3–100 characters."); return; }
    if (!description.trim()) { setError("Add a description."); return; }
    if (location.trim().length < 2 || location.trim().length > 120) { setError("Location must be 2–120 characters."); return; }
    if (!foundOn || foundOn > today) { setError("Choose a date that is not in the future."); return; }
    if (post && !title.trim() && !description.trim() && !location.trim() && !foundOn && !images.length && !removeImages) { setError("Update at least one field."); return; }
    setError(null);
    try {
      await onSubmit({ title: title.trim(), description, location_found: location.trim(), found_on: foundOn, images, ...(removeImages ? { remove_images: true } : {}) });
      onOpenChange(false);
    } catch (cause) {
      const code = typeof cause === "object" && cause && "code" in cause ? String(cause.code) : "";
      setError(code === "TOO_MANY_IMAGES" ? "You can upload up to 5 images." : code === "IMAGE_TOO_LARGE" ? "Each image must be 5 MB or smaller." : code === "UNSUPPORTED_IMAGE_TYPE" ? "Use JPEG, PNG, or WebP images." : cause instanceof Error ? cause.message : "The post could not be saved.");
    }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto">
      <DialogHeader><DialogTitle>{post ? "Edit found item" : "Post found item"}</DialogTitle><DialogDescription>Share enough detail to help its owner recognise it.</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div><label htmlFor="post-title" className="mb-1.5 block font-medium">Title <span aria-hidden="true">*</span></label><Input id="post-title" value={title} minLength={3} maxLength={100} required onChange={(e) => setTitle(e.target.value)} /></div>
        <div><label htmlFor="post-description" className="mb-1.5 block font-medium">Description <span aria-hidden="true">*</span></label><Textarea id="post-description" value={description} required onChange={(e) => setDescription(e.target.value)} className="min-h-24" /></div>
        <div><label htmlFor="post-location" className="mb-1.5 block font-medium">Location found <span aria-hidden="true">*</span></label><Input id="post-location" value={location} minLength={2} maxLength={120} required onChange={(e) => setLocation(e.target.value)} /></div>
        <div><label htmlFor="post-date" className="mb-1.5 block font-medium">Found on <span aria-hidden="true">*</span></label><Input id="post-date" type="date" value={foundOn} max={today} required onChange={(e) => setFoundOn(e.target.value)} /></div>
        {post?.images.length ? <fieldset className="space-y-2"><legend className="font-medium">Current photos</legend><div className="flex flex-wrap gap-2">{post.images.map((image) => <Image key={image.url} src={image.url} alt={`${post.title} current photo`} width={80} height={80} unoptimized className="size-20 rounded-lg border object-cover" />)}</div><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={removeImages} onChange={(e) => {
          const removing = e.target.checked;
          if (!removing && post.images.length + images.length > 5) {
            setError("Remove some replacement photos before keeping current photos.");
            return;
          }
          setRemoveImages(removing);
          setError(null);
        }} /> Remove current photos</label></fieldset> : null}
        <div><label htmlFor="post-images" className="mb-1.5 block font-medium">Photos (up to 5 total, 5 MB each){post?.images.length ? ` · ${removeImages ? 0 : post.images.length} current + ${images.length} new` : ""}</label><Input id="post-images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} /><ul className="mt-2 grid gap-2 sm:grid-cols-2">{images.map((image, index) => <SelectedPhoto key={`${image.name}-${index}`} file={image} onRemove={() => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))} />)}</ul></div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <DialogFooter><Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" className="min-h-11" disabled={submitting}>{submitting ? "Saving…" : post ? "Save changes" : "Post item"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
