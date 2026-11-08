import { ApiError } from "@/src/lib/errors";
import { decodeCursor, parseLimit } from "@/src/lib/pagination";

export const MAX_IMAGES = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export type UploadedImage = { file: File; bytes: Uint8Array; contentType: string };

function validation(field: string, message: string): never {
  throw new ApiError(422, "VALIDATION_ERROR", "Request validation failed.", [{ field, message }]);
}

export async function parseCreatePost(form: FormData) {
  const title = form.get("title");
  const description = form.get("description");
  const location = form.get("location_found");
  const foundOn = form.get("found_on");
  if (typeof title !== "string" || title.trim().length < 3 || title.trim().length > 100) validation("title", "Title must be 3 to 100 characters.");
  if (description !== null && (typeof description !== "string" || description.length > 2000)) validation("description", "Description must not exceed 2000 characters.");
  if (location !== null && (typeof location !== "string" || location.trim().length < 2 || location.trim().length > 120)) validation("location_found", "Location must be 2 to 120 characters.");
  let foundDate: Date | null = null;
  if (foundOn !== null) {
    if (typeof foundOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(foundOn)) validation("found_on", "Date must use YYYY-MM-DD format.");
    const parsed = new Date(`${foundOn}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== foundOn || parsed.getTime() > new Date().setUTCHours(0, 0, 0, 0)) validation("found_on", "Date must be valid and not in the future.");
    foundDate = parsed;
  }
  const entries = form.getAll("images");
  if (entries.length > MAX_IMAGES) throw new ApiError(422, "TOO_MANY_IMAGES", "At most 5 images are allowed.", entries.map((entry) => ({ field: entry instanceof File ? entry.name : "images", message: "At most 5 images are allowed." })));
  const images: UploadedImage[] = [];
  for (const entry of entries) {
    if (!(entry instanceof File)) validation("images", "Each image must be a file.");
    if (entry.size > MAX_IMAGE_BYTES) throw new ApiError(422, "IMAGE_TOO_LARGE", "Each image must be 5MB or smaller.", [{ field: entry.name, message: "Image exceeds 5MB." }]);
    const bytes = new Uint8Array(await entry.arrayBuffer());
    const detected = detectType(bytes);
    if (!allowedTypes.has(entry.type) || detected !== entry.type) throw new ApiError(422, "UNSUPPORTED_IMAGE_TYPE", "Only JPEG, PNG, and WebP images are supported.", [{ field: entry.name, message: "File content does not match a supported image type." }]);
    images.push({ file: entry, bytes, contentType: detected });
  }
  return { title: title.trim(), description: typeof description === "string" && description ? description : null, locationFound: typeof location === "string" && location ? location.trim() : null, foundOn: foundDate, images };
}

function detectType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export function parsePostListQuery(query: URLSearchParams) {
  const status = query.get("status") ?? "active";
  if (status !== "active" && status !== "archived") validation("status", "Status must be active or archived.");
  const limit = parseLimit(query.get("limit"));
  const rawCursor = query.get("cursor");
  return { status, limit, cursor: rawCursor ? decodeCursor(rawCursor) : null };
}
