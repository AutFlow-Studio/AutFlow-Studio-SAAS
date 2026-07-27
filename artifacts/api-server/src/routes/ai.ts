import { Router, type IRouter } from "express";
import { eq, and, sql, desc, lte } from "drizzle-orm";
import {
  db,
  clientsTable,
  projectsTable,
  paymentsTable,
  tasksTable,
  meetingsTable,
  activityTable,
  notesTable,
} from "@workspace/db";
import OpenAI from "openai";

const router: IRouter = Router();

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  return new OpenAI({ apiKey });
}

// ── Gather workspace context snapshot ────────────────────────────────────────

async function buildWorkspaceContext(wid: number): Promise<string> {
  const now = new Date();
  const nowStr = now.toISOString().split("T")[0]!;
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [clients, projects, payments, tasks, meetings, recentActivity] =
    await Promise.all([
      db.select().from(clientsTable).where(eq(clientsTable.workspaceId, wid)),
      db
        .select({ p: projectsTable, clientName: clientsTable.companyName })
        .from(projectsTable)
        .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
        .where(eq(projectsTable.workspaceId, wid)),
      db
        .select({ pay: paymentsTable, clientName: clientsTable.companyName })
        .from(paymentsTable)
        .leftJoin(clientsTable, eq(paymentsTable.clientId, clientsTable.id))
        .where(eq(paymentsTable.workspaceId, wid)),
      db.select().from(tasksTable).where(eq(tasksTable.workspaceId, wid)),
      db
        .select({ m: meetingsTable, clientName: clientsTable.companyName })
        .from(meetingsTable)
        .leftJoin(clientsTable, eq(meetingsTable.clientId, clientsTable.id))
        .where(eq(meetingsTable.workspaceId, wid))
        .orderBy(desc(meetingsTable.date))
        .limit(20),
      db
        .select()
        .from(activityTable)
        .where(eq(activityTable.workspaceId, wid))
        .orderBy(desc(activityTable.createdAt))
        .limit(30),
    ]);

  const overduePayments = payments.filter(
    ({ pay }) =>
      (pay.status === "pending" || pay.status === "overdue") &&
      pay.dueDate &&
      pay.dueDate < nowStr,
  );
  const pendingPayments = payments.filter(
    ({ pay }) => pay.status === "pending" || pay.status === "overdue",
  );
  const paidRevenue = payments
    .filter(({ pay }) => pay.status === "paid")
    .reduce((s, { pay }) => s + Number(pay.amount), 0);
  const outstanding = pendingPayments.reduce(
    (s, { pay }) => s + Number(pay.amount),
    0,
  );

  const delayedProjects = projects.filter(
    ({ p }) =>
      p.deadline &&
      p.deadline < nowStr &&
      p.status !== "delivered" &&
      p.status !== "cancelled",
  );
  const atRiskProjects = projects.filter(
    ({ p }) =>
      (p.progress ?? 0) < 30 &&
      p.deadline &&
      p.deadline <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0]! &&
      p.status !== "delivered" &&
      p.status !== "cancelled",
  );

  const openTasks = tasks.filter((t) => t.status !== "done");
  const overdueTasks = tasks.filter(
    (t) => t.deadline && t.deadline < nowStr && t.status !== "done",
  );
  const highPriorityTasks = openTasks.filter((t) => t.priority === "high" || t.priority === "urgent");

  // Clients with no meeting in last 30 days
  const clientsWithRecentMeeting = new Set(
    meetings
      .filter(({ m }) => new Date(m.date) >= thirtyDaysAgo)
      .map(({ m }) => m.clientId),
  );
  const activeClients = clients.filter((c) => c.status === "active");
  const clientsNeedingFollowUp = activeClients.filter(
    (c) => !clientsWithRecentMeeting.has(c.id),
  );

  const lines: string[] = [
    `Today: ${nowStr}`,
    ``,
    `=== CLIENTS (${clients.length} total) ===`,
    ...clients.map(
      (c) =>
        `- ${c.companyName} | status: ${c.status} | industry: ${c.industry ?? "N/A"} | email: ${c.email ?? "N/A"}`,
    ),
    ``,
    `=== PROJECTS (${projects.length} total) ===`,
    ...projects.map(
      ({ p, clientName }) =>
        `- "${p.name}" | client: ${clientName ?? "?"} | status: ${p.status} | progress: ${p.progress}% | deadline: ${p.deadline ?? "none"} | priority: ${p.priority}`,
    ),
    ``,
    `=== DELAYED PROJECTS (${delayedProjects.length}) ===`,
    ...delayedProjects.map(
      ({ p, clientName }) =>
        `- "${p.name}" (${clientName}) — deadline was ${p.deadline}, progress: ${p.progress}%`,
    ),
    ``,
    `=== AT-RISK PROJECTS (${atRiskProjects.length}) ===`,
    ...atRiskProjects.map(
      ({ p, clientName }) =>
        `- "${p.name}" (${clientName}) — deadline: ${p.deadline}, only ${p.progress}% done`,
    ),
    ``,
    `=== PAYMENTS ===`,
    `Total revenue (paid): $${paidRevenue.toLocaleString()}`,
    `Outstanding: $${outstanding.toLocaleString()} across ${pendingPayments.length} invoices`,
    `Overdue invoices: ${overduePayments.length}`,
    ...overduePayments.map(
      ({ pay, clientName }) =>
        `- Invoice ${pay.invoiceNumber} | ${clientName} | $${Number(pay.amount).toLocaleString()} | due: ${pay.dueDate}`,
    ),
    ``,
    `=== TASKS ===`,
    `Open: ${openTasks.length} | Overdue: ${overdueTasks.length} | High-priority: ${highPriorityTasks.length}`,
    ...overdueTasks
      .slice(0, 10)
      .map((t) => `- [OVERDUE] "${t.title}" | priority: ${t.priority} | due: ${t.deadline}`),
    ...highPriorityTasks
      .slice(0, 10)
      .map((t) => `- [HIGH] "${t.title}" | status: ${t.status} | due: ${t.deadline ?? "none"}`),
    ``,
    `=== CLIENTS NEEDING FOLLOW-UP (no meeting in 30 days) ===`,
    ...clientsNeedingFollowUp.map((c) => `- ${c.companyName} (${c.status})`),
    ``,
    `=== RECENT ACTIVITY (last 30 events) ===`,
    ...recentActivity.map(
      (a) => `- [${new Date(a.createdAt).toISOString().split("T")[0]}] ${a.description}`,
    ),
  ];

  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are AutFlow's AI business assistant — an intelligent operating assistant for a digital agency. You have full access to the workspace's business data (clients, projects, payments, tasks, meetings). 

Your job: give concise, actionable intelligence. Not generic advice. Reference actual client names, project names, amounts, and dates from the data. Be direct and specific. If asked about something not in the data, say so clearly.

Format responses with clear sections when helpful. Use bullet points for lists. Keep answers focused and practical.`;

// ── 1. AI Chat Assistant (streaming SSE) ────────────────────────────────────

router.post("/ai/chat", async (req, res): Promise<void> => {
  const { message, history = [] } = req.body as {
    message: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  };

  if (!message?.trim()) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  let openai: OpenAI;
  try {
    openai = getOpenAI();
  } catch {
    res.status(503).json({ error: "AI not configured. Set OPENAI_API_KEY." });
    return;
  }

  const wid = req.session.workspaceId!;
  const context = await buildWorkspaceContext(wid);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\n\n=== CURRENT WORKSPACE DATA ===\n${context}`,
      },
      ...history.slice(-10).map((h) => ({
        role: h.role,
        content: h.content,
      })) as OpenAI.ChatCompletionMessageParam[],
      { role: "user", content: message },
    ];

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI request failed";
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  }
});

// ── 2. Daily Business Briefing ───────────────────────────────────────────────

router.get("/ai/briefing", async (req, res): Promise<void> => {
  let openai: OpenAI;
  try {
    openai = getOpenAI();
  } catch {
    res.status(503).json({ error: "AI not configured. Set OPENAI_API_KEY." });
    return;
  }

  const wid = req.session.workspaceId!;
  const context = await buildWorkspaceContext(wid);

  const today = new Date().toISOString().split("T")[0];

  const prompt = `Based on the workspace data below, generate a concise executive business briefing for today (${today}).

Structure your response as JSON with this exact shape:
{
  "headline": "One sentence executive summary of the overall business state today",
  "goingWell": ["specific positive item 1", "specific positive item 2"],
  "needsAttention": ["concern requiring attention 1", "concern 2"],
  "criticalRisks": ["critical risk that needs immediate action 1"],
  "recommendedActions": ["concrete recommended action 1", "action 2", "action 3"]
}

Rules:
- Be specific — use actual client names, project names, dollar amounts, and dates from the data
- goingWell: positive achievements, on-track projects, paid invoices, active clients — what IS working
- needsAttention: non-urgent but important issues — slow progress, upcoming deadlines, quiet clients
- criticalRisks: overdue invoices, overdue projects, at-risk deliverables, churn risks — what NEEDS immediate action
- recommendedActions: concrete next steps the owner should take TODAY, in order of priority
- Max 4 items per array. If a category has nothing relevant, return an empty array.
- criticalRisks should only contain genuinely urgent items; empty array is fine if nothing is critical.

WORKSPACE DATA:
${context}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const briefing = JSON.parse(raw);
    res.json({ briefing, generatedAt: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI briefing failed";
    res.status(500).json({ error: msg });
  }
});

// ── 3. Client Health Score ───────────────────────────────────────────────────

router.get("/ai/client-health/:clientId", async (req, res): Promise<void> => {
  const clientId = parseInt(req.params.clientId ?? "", 10);
  if (isNaN(clientId)) {
    res.status(400).json({ error: "Invalid clientId" });
    return;
  }

  let openai: OpenAI;
  try {
    openai = getOpenAI();
  } catch {
    res.status(503).json({ error: "AI not configured." });
    return;
  }

  const wid = req.session.workspaceId!;
  const nowStr = new Date().toISOString().split("T")[0]!;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [clients, projects, payments, meetings, activity, tasks] =
    await Promise.all([
      db
        .select()
        .from(clientsTable)
        .where(
          and(eq(clientsTable.id, clientId), eq(clientsTable.workspaceId, wid)),
        ),
      db
        .select()
        .from(projectsTable)
        .where(
          and(
            eq(projectsTable.clientId, clientId),
            eq(projectsTable.workspaceId, wid),
          ),
        ),
      db
        .select()
        .from(paymentsTable)
        .where(
          and(
            eq(paymentsTable.clientId, clientId),
            eq(paymentsTable.workspaceId, wid),
          ),
        ),
      db
        .select()
        .from(meetingsTable)
        .where(
          and(
            eq(meetingsTable.clientId, clientId),
            eq(meetingsTable.workspaceId, wid),
          ),
        )
        .orderBy(desc(meetingsTable.date))
        .limit(5),
      db
        .select()
        .from(activityTable)
        .where(
          and(
            eq(activityTable.clientId, clientId),
            eq(activityTable.workspaceId, wid),
          ),
        )
        .orderBy(desc(activityTable.createdAt))
        .limit(10),
      db
        .select()
        .from(tasksTable)
        .where(
          and(
            eq(tasksTable.clientId, clientId),
            eq(tasksTable.workspaceId, wid),
          ),
        ),
    ]);

  const client = clients[0];
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const lastMeeting = meetings[0];
  const daysSinceLastMeeting = lastMeeting
    ? Math.floor(
        (Date.now() - new Date(lastMeeting.m?.date ?? lastMeeting.date).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const overduePayments = payments.filter(
    (p) =>
      (p.status === "pending" || p.status === "overdue") &&
      p.dueDate &&
      p.dueDate < nowStr,
  );
  const pendingPayments = payments.filter(
    (p) => p.status === "pending" || p.status === "overdue",
  );
  const activeProjects = projects.filter(
    (p) => p.status !== "delivered" && p.status !== "cancelled",
  );
  const delayedProjects = activeProjects.filter(
    (p) => p.deadline && p.deadline < nowStr,
  );

  const dataStr = [
    `Client: ${client.companyName} | Status: ${client.status}`,
    `Last meeting: ${lastMeeting ? new Date((lastMeeting as any).date ?? lastMeeting).toISOString().split("T")[0] : "never"} (${daysSinceLastMeeting !== null ? daysSinceLastMeeting + " days ago" : "no meetings"})`,
    `Projects: ${projects.length} total, ${activeProjects.length} active, ${delayedProjects.length} delayed`,
    `Payments: ${payments.length} total, ${overduePayments.length} overdue, ${pendingPayments.length} pending`,
    `Overdue payment amounts: $${overduePayments.reduce((s, p) => s + Number(p.amount), 0).toLocaleString()}`,
    `Recent activity events: ${activity.length} in history`,
    `Tasks: ${tasks.length} total, ${tasks.filter((t) => t.status !== "done").length} open`,
    `Project details: ${activeProjects.map((p) => `"${p.name}" (${p.status}, ${p.progress}% done, deadline: ${p.deadline ?? "none"})`).join("; ")}`,
  ].join("\n");

  const prompt = `Analyze this client and return a JSON health assessment:
{
  "score": <0-100 integer>,
  "status": "<Healthy|Needs Attention|At Risk>",
  "summary": "<one sentence>",
  "reasons": ["reason 1", "reason 2", "reason 3"]
}

Scoring guide:
- 80-100: Healthy — active, paying on time, regular meetings, projects on track
- 50-79: Needs Attention — some concerns but manageable
- 0-49: At Risk — overdue payments, long inactivity, delayed projects, or churned

CLIENT DATA:
${dataStr}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 512,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const health = JSON.parse(raw);
    res.json({ clientId, clientName: client.companyName, ...health });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Health analysis failed";
    res.status(500).json({ error: msg });
  }
});

// ── 4. AI Meeting Analyzer ───────────────────────────────────────────────────

router.post("/ai/analyze-meeting", async (req, res): Promise<void> => {
  const { notes, clientName } = req.body as {
    notes: string;
    clientName?: string;
  };

  if (!notes?.trim()) {
    res.status(400).json({ error: "Meeting notes are required" });
    return;
  }

  let openai: OpenAI;
  try {
    openai = getOpenAI();
  } catch {
    res.status(503).json({ error: "AI not configured." });
    return;
  }

  const prompt = `Analyze these meeting notes${clientName ? ` from a meeting with ${clientName}` : ""} and return structured JSON:
{
  "summary": "<2-3 sentence summary of what was discussed>",
  "decisions": ["decision 1", "decision 2"],
  "actionItems": ["action item with owner/deadline if mentioned"],
  "followUpTasks": [
    { "title": "task title", "priority": "high|medium|low", "notes": "optional context" }
  ],
  "clientIntel": ["important fact about client needs, concerns, or opportunities"]
}

Be specific and extract only what's actually in the notes. Don't invent items.

MEETING NOTES:
${notes}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const analysis = JSON.parse(raw);
    res.json(analysis);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Meeting analysis failed";
    res.status(500).json({ error: msg });
  }
});

// ── 5. AI Smart Search ───────────────────────────────────────────────────────

router.post("/ai/smart-search", async (req, res): Promise<void> => {
  const { query } = req.body as { query: string };

  if (!query?.trim()) {
    res.status(400).json({ error: "Query is required" });
    return;
  }

  let openai: OpenAI;
  try {
    openai = getOpenAI();
  } catch {
    res.status(503).json({ error: "AI not configured." });
    return;
  }

  const wid = req.session.workspaceId!;
  const context = await buildWorkspaceContext(wid);

  const prompt = `The user asked: "${query}"

Based on the workspace data, answer this query directly. Return JSON:
{
  "answer": "<direct answer to the question>",
  "results": [
    { "type": "client|project|payment|task|meeting", "title": "name", "detail": "relevant detail", "url": "/path" }
  ],
  "insight": "<one actionable recommendation based on the answer>"
}

Max 10 results. Be specific — use real names and numbers from the data.

WORKSPACE DATA:
${context}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const result = JSON.parse(raw);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Smart search failed";
    res.status(500).json({ error: msg });
  }
});

export default router;
