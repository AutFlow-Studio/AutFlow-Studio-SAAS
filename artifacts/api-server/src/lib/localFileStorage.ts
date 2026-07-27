/**
 * Local disk-based file storage.
 *
 * Used automatically as a fallback when PRIVATE_OBJECT_DIR is not set
 * (i.e. Replit Object Storage is not configured).  Files are saved under
 * LOCAL_UPLOAD_DIR (defaults to <workspace>/data/uploads/).
 *
 * Object paths follow the convention /objects/local/<uuid> so they are
 * distinguishable from GCS-backed paths and routed correctly in storage.ts.
 */

import { promises as fs } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

function getUploadDir(): string {
  return (
    process.env.LOCAL_UPLOAD_DIR ??
    join(process.cwd(), "..", "..", "data", "uploads")
  );
}

export async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(getUploadDir(), { recursive: true });
}

/** Generate a new upload ID and return the matching object path. */
export function newLocalUpload(): { id: string; objectPath: string } {
  const id = randomUUID();
  return { id, objectPath: `/objects/local/${id}` };
}

export function isLocalObjectPath(objectPath: string): boolean {
  return objectPath.startsWith("/objects/local/");
}

export function extractLocalId(objectPath: string): string {
  return objectPath.slice("/objects/local/".length);
}

export async function saveLocalFile(
  id: string,
  data: Buffer,
  contentType: string,
): Promise<void> {
  await ensureUploadDir();
  const dir = getUploadDir();
  await fs.writeFile(join(dir, id), data);
  await fs.writeFile(
    join(dir, `${id}.meta`),
    JSON.stringify({ contentType }),
  );
}

export async function readLocalFile(
  id: string,
): Promise<{ data: Buffer; contentType: string }> {
  const dir = getUploadDir();
  const data = await fs.readFile(join(dir, id));
  let contentType = "application/octet-stream";
  try {
    const meta = JSON.parse(
      await fs.readFile(join(dir, `${id}.meta`), "utf8"),
    );
    if (typeof meta.contentType === "string") contentType = meta.contentType;
  } catch {
    // metadata file missing — fall back to octet-stream
  }
  return { data, contentType };
}

export async function deleteLocalFile(id: string): Promise<void> {
  const dir = getUploadDir();
  await fs.unlink(join(dir, id)).catch(() => {});
  await fs.unlink(join(dir, `${id}.meta`)).catch(() => {});
}
