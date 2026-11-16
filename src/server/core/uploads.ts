import { ApiError } from "@/src/lib/errors";

export type ValidatedUpload = { file: File; bytes: Uint8Array; contentType: string };

export async function validateFile(file: File, options: { types: string[]; maxBytes: number }): Promise<ValidatedUpload> {
  if (file.size > options.maxBytes) throw new ApiError(422, "ATTACHMENT_TOO_LARGE", "Attachment must be 10MB or smaller.", [{ field: "attachment", message: "Attachment exceeds 10MB." }]);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectType(bytes);
  if (!detected || !options.types.includes(detected) || file.type !== detected) throw new ApiError(422, "UNSUPPORTED_ATTACHMENT_TYPE", "This attachment type is not supported.", [{ field: "attachment", message: "File content does not match a supported type." }]);
  return { file, bytes, contentType: detected };
}

function detectType(bytes: Uint8Array): string | null {
  if (bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-") return "application/pdf";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}
