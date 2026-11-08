import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { ApiError } from "@/src/lib/errors";

export interface StorageDriver {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  signedUrl(key: string, ttlSeconds?: number): Promise<string>;
  remove(key: string): Promise<void>;
}

const root = path.resolve(process.env.FILE_STORAGE_DIR ?? path.join(process.cwd(), ".data", "files"));
const secret = process.env.FILE_SIGNING_SECRET ?? process.env.JWT_SECRET;
if (!secret || secret.length < 32) throw new Error("FILE_SIGNING_SECRET or JWT_SECRET (at least 32 characters) is required for file links.");

function filePath(key: string) {
  const resolved = path.resolve(root, key);
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error("Invalid storage key");
  return resolved;
}

function signature(key: string, expires: number) {
  return createHmac("sha256", secret).update(`${key}:${expires}`).digest("hex");
}

export const storage: StorageDriver = {
  async put(key, bytes) {
    const target = filePath(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  },
  async signedUrl(key, ttlSeconds = 900) {
    const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
    return `/api/files/${key.split("/").map(encodeURIComponent).join("/")}?expires=${expires}&signature=${signature(key, expires)}`;
  },
  async remove(key) {
    await rm(filePath(key), { force: true });
  },
};

export async function readSignedFile(key: string, expiresRaw: string | null, provided: string | null) {
  const expires = Number(expiresRaw);
  const expected = signature(key, expires);
  if (!Number.isSafeInteger(expires) || expires < Math.floor(Date.now() / 1000) || !provided || !/^[a-f0-9]{64}$/.test(provided) || !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) {
    throw new ApiError(403, "FORBIDDEN", "The file link is invalid or expired.");
  }
  try {
    return await readFile(filePath(key));
  } catch {
    throw new ApiError(404, "NOT_FOUND", "File not found.");
  }
}
