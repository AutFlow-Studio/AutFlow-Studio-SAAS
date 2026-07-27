import { Readable } from "stream";
import express, { Router, type IRouter, type Request, type Response } from "express";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";
import {
  newLocalUpload,
  isLocalObjectPath,
  extractLocalId,
  saveLocalFile,
  readLocalFile,
  deleteLocalFile,
} from "../lib/localFileStorage";

const router: IRouter = Router();

// Shared service instance — stateless, safe to reuse across routes
export const objectStorageService = new ObjectStorageService();

/** True when Replit Object Storage (GCS) is configured. */
function isGcsConfigured(): boolean {
  return Boolean(process.env.PRIVATE_OBJECT_DIR);
}

/**
 * Allowed MIME types for uploads.
 * Mirrors the frontend ACCEPTED_FILE_TYPES constant.
 */
const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/msword",                                                       // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel",                                                // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",       // .xlsx
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/octet-stream",
]);

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /storage/uploads/request-url
 *
 * When GCS is configured: returns a presigned GCS PUT URL.
 * When GCS is NOT configured: returns a local API PUT URL so the client
 * uploads directly to this server and files are saved to disk.
 */
router.post(
  "/storage/uploads/request-url",
  async (req: Request, res: Response) => {
    const { name, size, contentType } = req.body ?? {};

    // ── Presence checks ──────────────────────────────────────────────────────
    if (!name || size == null || !contentType) {
      res.status(400).json({ error: "name, size, and contentType are required" });
      return;
    }
    if (typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "name must be a non-empty string" });
      return;
    }

    // ── Content-type allowlist ───────────────────────────────────────────────
    const ct = String(contentType).toLowerCase().split(";")[0].trim();
    if (!ALLOWED_CONTENT_TYPES.has(ct)) {
      res.status(415).json({
        error: "File type not allowed. Accepted types: PDF, DOCX, DOC, XLSX, XLS, PNG, JPG, WebP, GIF.",
      });
      return;
    }

    // ── Size validation ──────────────────────────────────────────────────────
    const numericSize = Number(size);
    if (!Number.isFinite(numericSize) || numericSize <= 0) {
      res.status(400).json({ error: "size must be a positive number" });
      return;
    }
    if (numericSize > MAX_UPLOAD_BYTES) {
      res.status(413).json({ error: "File too large. Maximum allowed size is 50 MB." });
      return;
    }

    // ── Storage backend selection ────────────────────────────────────────────
    if (isGcsConfigured()) {
      // GCS path: return a presigned PUT URL
      try {
        const uploadURL = await objectStorageService.getObjectEntityUploadURL();
        const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
        res.json({
          uploadURL,
          objectPath,
          metadata: { name: name.trim(), size: numericSize, contentType: ct },
        });
      } catch (error) {
        req.log.error({ err: error }, "Error generating GCS upload URL");
        res.status(500).json({ error: "Failed to generate upload URL. Storage may not be configured." });
      }
    } else {
      // Local fallback: return an upload URL pointing back to this API
      const { id, objectPath } = newLocalUpload();
      const uploadURL = `/api/storage/uploads/local/${id}`;
      res.json({
        uploadURL,
        objectPath,
        metadata: { name: name.trim(), size: numericSize, contentType: ct },
      });
    }
  },
);

/**
 * PUT /storage/uploads/local/:id
 *
 * Local-storage fallback receiver.  The client PUTs the raw file body here
 * (same interface as a GCS presigned URL) and we persist it to disk.
 * Only active when GCS is not configured.
 */
router.put(
  "/storage/uploads/local/:id",
  express.raw({ type: "*/*", limit: "50mb" }),
  async (req: Request, res: Response) => {
    if (isGcsConfigured()) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id || !UUID_RE.test(id)) {
      res.status(400).json({ error: "Invalid upload ID" });
      return;
    }

    const body = req.body as Buffer;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      res.status(400).json({ error: "Empty or missing file body" });
      return;
    }

    const ct = String(req.headers["content-type"] ?? "application/octet-stream")
      .split(";")[0]
      .trim();

    try {
      await saveLocalFile(id as string, body, ct);
      res.status(200).json({ ok: true });
    } catch (error) {
      req.log.error({ err: error }, "Error saving local upload");
      res.status(500).json({ error: "Failed to save file." });
    }
  },
);

/**
 * GET /storage/objects/*path
 *
 * Streams a stored object to the client.
 * Routes to local disk or GCS depending on the object path prefix.
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;

    if (!wildcardPath) {
      res.status(400).json({ error: "Object path is required" });
      return;
    }

    const objectPath = `/objects/${wildcardPath}`;

    // ── Local storage path ───────────────────────────────────────────────────
    if (isLocalObjectPath(objectPath)) {
      const id = extractLocalId(objectPath);
      if (!id || !UUID_RE.test(id)) {
        res.status(400).json({ error: "Invalid object ID" });
        return;
      }
      const { data, contentType } = await readLocalFile(id);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.setHeader("Content-Length", String(data.length));
      if (!contentType.startsWith("image/") && contentType !== "application/pdf") {
        const rawFilename = req.query.filename;
        const filename = rawFilename
          ? String(rawFilename).replace(/[^\w.\- ]/g, "_").slice(0, 200)
          : "download";
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      }
      res.send(data);
      return;
    }

    // ── GCS path ─────────────────────────────────────────────────────────────
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    const ct = response.headers.get("content-type") || "";
    if (!ct.startsWith("image/") && ct !== "application/pdf") {
      const rawFilename = req.query.filename;
      const filename = rawFilename
        ? String(rawFilename).replace(/[^\w.\- ]/g, "_").slice(0, 200)
        : "download";
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    }

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "File not found. It may have been deleted." });
      return;
    }
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError?.code === "ENOENT") {
      res.status(404).json({ error: "File not found." });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to retrieve file." });
  }
});

/**
 * DELETE /storage/objects/*path
 *
 * Deletes a stored object.
 * Idempotent: returns 204 even if the object is already gone.
 */
router.delete("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;

    if (!wildcardPath) {
      res.status(400).json({ error: "Object path is required" });
      return;
    }

    const objectPath = `/objects/${wildcardPath}`;

    // ── Local storage path ───────────────────────────────────────────────────
    if (isLocalObjectPath(objectPath)) {
      const id = extractLocalId(objectPath);
      await deleteLocalFile(id);
      res.sendStatus(204);
      return;
    }

    // ── GCS path ─────────────────────────────────────────────────────────────
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    await objectFile.delete();
    res.sendStatus(204);
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.sendStatus(204); // already deleted — idempotent
      return;
    }
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError?.code === "ENOENT") {
      res.sendStatus(204); // already deleted — idempotent
      return;
    }
    req.log.error({ err: error }, "Error deleting object");
    res.status(500).json({ error: "Failed to delete file." });
  }
});

export default router;
