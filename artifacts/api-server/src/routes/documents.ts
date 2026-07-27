import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, documentsTable, activityTable, clientsTable } from "@workspace/db";
import { createNotification } from "../lib/createNotification";
import {
  ListDocumentsParams,
  CreateDocumentParams,
  CreateDocumentBody,
  UpdateDocumentParams,
  UpdateDocumentBody,
  DeleteDocumentParams,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const objectStorage = new ObjectStorageService();

const router: IRouter = Router();

function mapDocument(d: typeof documentsTable.$inferSelect) {
  return { ...d, createdAt: d.createdAt.toISOString() };
}

router.get("/documents", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;

  const rows = await db
    .select({ document: documentsTable, clientName: clientsTable.companyName })
    .from(documentsTable)
    .leftJoin(clientsTable, eq(documentsTable.clientId, clientsTable.id))
    .where(eq(documentsTable.workspaceId, wid))
    .orderBy(documentsTable.createdAt);

  res.json(
    rows.map(({ document, clientName }) => ({
      ...mapDocument(document),
      clientName: clientName ?? "Unknown",
    })),
  );
});

router.get("/clients/:clientId/documents", async (req, res): Promise<void> => {
  const params = ListDocumentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const docs = await db
    .select()
    .from(documentsTable)
    .where(and(eq(documentsTable.clientId, params.data.clientId), eq(documentsTable.workspaceId, wid)))
    .orderBy(documentsTable.createdAt);

  res.json(docs.map(mapDocument));
});

router.post("/clients/:clientId/documents", async (req, res): Promise<void> => {
  const params = CreateDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  // Verify the client belongs to this workspace
  const [client] = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.id, params.data.clientId), eq(clientsTable.workspaceId, wid)));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const [doc] = await db
    .insert(documentsTable)
    .values({ ...parsed.data, clientId: params.data.clientId, workspaceId: wid })
    .returning();

  await db.insert(activityTable).values({
    type: "document_added",
    entityType: "document",
    entityId: doc.id,
    description: `Document "${doc.title}" added`,
    clientId: doc.clientId,
    workspaceId: wid,
  });

  void createNotification(
    {
      type: "document_uploaded",
      title: "Document uploaded",
      message: `"${doc.title}" uploaded${client ? ` for ${client.companyName}` : ""}.`,
      entityType: "document",
      entityId: doc.id,
      href: `/documents`,
    },
    wid,
  );

  res.status(201).json(mapDocument(doc));
});

router.patch("/documents/:id", async (req, res): Promise<void> => {
  const params = UpdateDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const [doc] = await db
    .update(documentsTable)
    .set(parsed.data)
    .where(and(eq(documentsTable.id, params.data.id), eq(documentsTable.workspaceId, wid)))
    .returning();

  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.json(mapDocument(doc));
});

router.delete("/documents/:id", async (req, res): Promise<void> => {
  const params = DeleteDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const [doc] = await db
    .delete(documentsTable)
    .where(and(eq(documentsTable.id, params.data.id), eq(documentsTable.workspaceId, wid)))
    .returning();

  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  if (doc.url?.startsWith("/objects/")) {
    objectStorage
      .getObjectEntityFile(doc.url)
      .then((file) => file.delete())
      .catch((err: unknown) => {
        if (err instanceof ObjectNotFoundError) return;
        console.error("[documents] GCS cleanup failed:", err);
      });
  }

  res.sendStatus(204);
});

export default router;
