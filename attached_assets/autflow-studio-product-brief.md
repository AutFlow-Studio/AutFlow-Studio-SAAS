# AutFlow Studio — Product Brief
*Generated from founder interview — August 2026*

---

## 1. Product Definition

**AutFlow Studio** is an AI-powered business workspace that adapts to the industry of the business using it. Instead of forcing owners to connect five generic tools, it delivers one intelligent workspace where clients, projects, tasks, documents, invoices, and an AI assistant all live together and understand each other.

**One-liner:** An AI workspace built for small service businesses that replaces disconnected tools with one intelligent platform that knows how your business works.

**Primary market (now):** Small digital agencies — 1 to 10 people — running marketing, web development, design, branding, or AI automation services.

**Business model:** Custom implementation fee ($800–$2,000) during MVP → SaaS subscription after pattern recognition across 5–10 clients.

---

## 2. Features to Keep (MVP — Agency Focus)

These are the features that must be polished, stable, and demo-ready:

| Feature | Status | Priority |
|---|---|---|
| Industry-specific onboarding (agency) | Working | Must be flawless |
| Agency Dashboard (KPIs, activity, deadlines) | Working | Must be flawless |
| Client management | Working | Must be flawless |
| Project management | Working | Must be flawless |
| Task management | Working | Must be flawless |
| AI Assistant (workspace context, Q&A) | Partial | Upgrade to "wow moment" |
| Campaigns | Partial | Polish for agency demo |
| Deliverables | Partial | Polish for agency demo |
| Invoices / Payments | Partial | Needs minimum viable billing |
| Calendar | Partial | Needs to show real events |
| Documents | Partial | Basic upload/view is enough |

**The agency workflow to support end-to-end:**
> Lead → Client → Project → Tasks & Milestones → Deliverables → Client Review → Invoice → Payment → Completion

---

## 3. Features to Remove or Hide (MVP)

Hide everything that would embarrass the product in a live demo:

- ❌ Clinic workspace (not production-ready)
- ❌ Freelancer Developer workspace (not production-ready)
- ❌ Empty Reports page
- ❌ Incomplete Automations section
- ❌ Placeholder Integrations section
- ❌ Any navigation items leading to blank or broken pages
- ❌ Advanced analytics (show placeholder only if needed)
- ❌ Team collaboration features beyond the basics
- ❌ Complex permissions

**Rule:** If a page cannot impress a prospect, it should not exist in the navigation for now.

---

## 4. The AI "Wow Moment"

This is the single most important thing in the demo. The AI must:

1. Instantly understand the workspace context (clients, projects, tasks, invoices)
2. Summarize the current business state in one clear response
3. Answer real questions: *"Which projects are behind?"* *"Which clients need attention?"* *"What are my priorities this week?"*
4. Deliver responses that feel personalized and business-aware — not generic ChatGPT answers

**What makes it different from ChatGPT:** It knows the user's actual business data — not general knowledge.

**Target capability for demo:**
- Read-only intelligence (summaries, priorities, risk detection) — must work perfectly
- Basic write actions (create task, update status) — nice to have for demo impact

---

## 5. Demo Workspace Requirements

Every demo must use a **pre-loaded agency workspace** with realistic data:

- 4–6 active clients with names, industries, contact info
- 6–10 projects in various stages (active, in review, completed)
- 15–25 tasks with statuses and due dates
- 3–5 invoices (paid, pending, overdue)
- 5–10 calendar events (deadlines, meetings)
- Enough activity history for the AI to give meaningful summaries

The demo workspace must be seeded via a script so it can be reset instantly before a call.

---

## 6. 12-Day MVP Roadmap

### Days 1–3: Strip and stabilize
- Hide all incomplete, non-agency navigation items
- Fix the "Something went wrong" error
- Ensure all visible pages load without crashing
- Remove placeholder/empty pages from navigation

### Days 4–6: Polish the core flow
- Agency dashboard — make KPIs real and visually strong
- Client → Project → Task flow must be seamless
- Campaigns and Deliverables — polish to demo quality
- Calendar must show actual tasks and project deadlines
- Invoices — create/view/mark paid must work

### Days 7–9: AI upgrade
- AI must answer the top 10 questions an agency owner would ask
- Responses must reference actual workspace data (not generic)
- Introduce at least one write action (create task from AI)
- Remove error states when no OpenAI key — show clear fallback

### Days 10–12: Demo data + outreach
- Build and test the pre-loaded demo workspace script
- Record a 2–3 minute demo video
- Start outreach: target agency owners with 1–10 people on LinkedIn and communities
- Offer: "Founding customer setup — customized to your agency workflow"

---

## 7. Development Prompts

These are ready-to-use prompts for building the next features, focused on the digital agency MVP:

---

### Prompt 1 — Hide incomplete navigation items

```
In AutFlow Studio (artifacts/autflow-studio), audit the navigation and hide any items that lead to incomplete, placeholder, or embarrassing pages.

For the digital agency workspace, the only visible navigation items should be:
- Dashboard
- Clients
- Projects
- Tasks
- Campaigns
- Deliverables
- Calendar
- Invoices
- Documents
- AI Assistant

Hide or remove: Reports (if empty), Automations (if placeholder), Integrations (if placeholder), Clinic workspace, Freelancer workspace, and any other nav item leading to a broken or empty page.

Make this conditional — incomplete items should be hidden, not deleted, so they can be restored later.
```

---

### Prompt 2 — Demo data seed script

```
Create a seed script at scripts/src/seed-agency-demo.ts that populates a digital agency demo workspace with realistic data:

- Workspace name: "Velocity Creative Agency"
- 5 clients: mix of tech startups and e-commerce brands
- 8 projects: various stages (planning, in progress, in review, completed)
- 20 tasks distributed across projects with priorities and due dates
- 4 invoices: 2 paid, 1 pending, 1 overdue
- 8 calendar events: kickoff meetings, deadlines, review sessions
- 10 activity log entries

Make the script idempotent (safe to re-run). The demo user should log in with admin@autflow.io / admin123.
```

---

### Prompt 3 — AI assistant upgrade

```
Upgrade the AI assistant in AutFlow Studio (artifacts/api-server/src/routes/ai.ts and artifacts/autflow-studio/src/pages/ai-assistant/) to handle these 10 agency-specific questions with real workspace data:

1. What should I focus on today?
2. Which projects are behind schedule?
3. Which clients need attention?
4. What deadlines are coming this week?
5. Show me unpaid invoices.
6. Give me a business summary.
7. What happened since yesterday?
8. Which tasks are overdue?
9. How is my team's workload?
10. What's the status of [project name]?

Requirements:
- Responses must reference actual data from the workspace (client names, project names, real dates)
- Responses should be concise, professional, and action-oriented
- If the OpenAI API key is missing, show a clear "AI not configured" message instead of an error
- Add a "What can you help me with?" starter prompt on the empty state
```

---

### Prompt 4 — Agency dashboard polish

```
Polish the digital agency dashboard in artifacts/autflow-studio/src/pages/dashboard/ to be demo-ready:

Required KPI cards:
- Active clients (count + trend)
- Active projects (count + status breakdown)
- Tasks due this week (count + overdue warning)
- Revenue this month (from invoices)
- Upcoming deadlines (next 7 days)

Required sections:
- Recent activity feed (last 5 actions across the workspace)
- Projects at risk (overdue or no recent activity)
- Quick actions: Add Client, New Project, Create Task

The dashboard should look impressive even with 5–10 clients and projects. No empty states visible in the demo.
```

---

## 8. Positioning Statement

**For:** Small digital agency owners (1–10 people) juggling multiple clients and disconnected tools

**Who are frustrated by:** Switching between Notion, ClickUp, spreadsheets, and invoicing apps instead of running their business

**AutFlow Studio is:** An AI-powered workspace built specifically for agencies

**That:** Brings clients, projects, tasks, documents, and billing into one place, with an AI assistant that understands the entire business and tells owners exactly what to do next

**Unlike:** Generic project management tools that force agencies to adapt their workflow to the software

**The key difference:** AutFlow Studio is customized around how your agency actually works — not the other way around

---

## 9. Minimum Successful Outcome (12 days)

✅ One paying customer OR a strong qualified prospect ready to sign  
✅ A live demo that reliably delivers the AI "wow moment"  
✅ All core agency modules working without crashes  
✅ A pre-loaded demo workspace that resets in under 60 seconds  

---

*This brief should be revisited and updated after the first 3 customer conversations.*
