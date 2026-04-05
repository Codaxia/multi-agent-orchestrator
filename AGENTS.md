# Dashboard Agents — Instructions for AI Assistants

> This file contains the full instructions for any AI assistant working within a project
> supervised by this dashboard. It is LLM-agnostic: compatible with any assistant that
> can read files and execute shell commands.

---

## What this system is

This repo is a **real-time supervision dashboard** for AI agent pipelines.
The dashboard (React + Express) displays live agent statuses, tasks, and activity logs.

**The AI assistant is the engine. The dashboard is the control screen.**

When working on a project supervised by this dashboard, you MUST update the dashboard
via its local API so the human can follow what is happening in real-time.

---

## Before starting any work

### 1. Read the relevant agent definitions

Agent definitions are in `agents/default/`. Read the Orchestrator first — it contains the
scenario detection matrix that determines which agents to activate.

| ID | File | Role |
|----|------|------|
| `orchestrator` | `agents/default/01-orchestrator.md` | Pipeline coordination & scenario detection |
| `pm-discovery` | `agents/default/02-pm-discovery.md` | Scoping & user stories |
| `architect` | `agents/default/03-architect.md` | Architecture & technical breakdown |
| `developer` | `agents/default/04-developer.md` | Full-stack implementation |
| `cto-reviewer` | `agents/default/05-cto-reviewer.md` | Code review & mentoring |
| `qa` | `agents/default/06-qa.md` | Testing & validation |
| `security` | `agents/default/07-security.md` | OWASP audit |
| `deploy` | `agents/default/08-deploy.md` | Deployment & release |
| `estimation` | `agents/default/09-estimation.md` | Effort & complexity estimation |

### 2. Check that the dashboard server is running

```bash
node -e "const h=require('http');h.get('http://localhost:3001/api/workspace',r=>console.log('OK: port '+r.statusCode)).on('error',()=>console.log('SERVER OFF'))"
```

If it is off, start it from the `dashboard-agents` repo:

```bash
node server.js &
```

### 3. Tell the user where to open the dashboard

Before doing anything else, print this message to the user:

```
Dashboard open at: http://localhost:5173
Navigate to: [squad name] > [project name]
```

The user must have the correct project open in their browser before you start.
If you are creating a new project, tell the user the project name so they can find it in the sidebar once it is created.

---

## Scenarios

The Orchestrator detects the scenario from the user's brief and activates only the relevant agents:

| Scenario | When | Agents activated |
|----------|------|------------------|
| **full-build** | New project from scratch | All agents, full pipeline |
| **feature-ops** | Existing project, new feature, bug fix, refactor | orchestrator, pm-discovery (if needed), developer, cto-reviewer, qa, security (if needed) |
| **code-review** | Audit, review, security check | orchestrator, cto-reviewer, security, qa, developer |

A single project can receive tasks of different scenarios over time.

---

## Reading external tasks (feature-ops)

If the user provides a ClickUp task ID or URL, use the ClickUp MCP to read it:

```
Tool: clickup_get_task
Input: task_id (the ID from the URL, e.g. "abc123xyz")
```

The task response contains: title, description, acceptance criteria, status, assignees, comments.
Treat the ClickUp content as the task brief — apply the same PM skip/activate logic as for text tasks.

After the pipeline completes, update the ClickUp task:
```
Tool: clickup_update_task
Input: task_id, status: "complete" (or the appropriate status in the user's workspace)
```

**Do not update ClickUp status mid-pipeline** — only at the very end, when QA has passed.

---

## Dashboard API — http://localhost:3001

Use `curl` to call the API from the terminal.

### Update agent status

```bash
curl -s -X POST http://localhost:3001/api/projects/{projectId}/agents/{agentId} \
  -H "Content-Type: application/json" \
  -d '{"status": "active", "lastMessage": "Short description of current action"}'
```

**Valid statuses:** `idle`, `active`, `done`, `blocked`

**Agent IDs:** `orchestrator`, `pm-discovery`, `architect`, `developer`, `cto-reviewer`, `qa`, `security`, `deploy`, `estimation`

### Create a task

```bash
curl -s -X POST http://localhost:3001/api/projects/{projectId}/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "T01 — Task title", "description": "Context: why this task exists.\nDependencies: none / T01.\nScope: what is and is not included.", "column": "Backlog", "assignedAgent": "developer", "priority": "Must", "acceptanceCriteria": ["Specific testable outcome A", "Specific testable outcome B"], "subTasks": ["Concrete step 1 (file or command)", "Concrete step 2"]}'
```

**Columns:** `Backlog`, `In Progress`, `In Review`, `QA`, `Done`
**Priorities:** `Must`, `Should`, `Could`, `Won't`

**Task quality standard — required fields:**

| Field | Minimum content |
|-------|----------------|
| `title` | `T[N] — Short action verb + subject` |
| `description` | Context (why), dependencies (parent tickets), scope (what is NOT included) |
| `acceptanceCriteria` | At least 3 items. Each = observable, testable outcome. Format: "Given X, when Y, then Z" or "User can…" |
| `subTasks` | Concrete implementation steps with target files or commands where relevant |

**Do not create tasks with empty `acceptanceCriteria` or `subTasks`.** If a task genuinely has none, write at minimum: `["No sub-steps — single atomic action"]`.

### Move / update a task

```bash
curl -s -X PATCH http://localhost:3001/api/projects/{projectId}/tasks/{taskId} \
  -H "Content-Type: application/json" \
  -d '{"column": "In Progress", "assignedAgent": "developer"}'
```

### Check off acceptance criteria

As you validate each acceptance criterion, mark it `done: true` by PATCHing the full `acceptanceCriteria` array.

**Step 1 — GET the current task to read the IDs:**
```bash
curl -s http://localhost:3001/api/projects/{projectId}/tasks/{taskId}
```

**Step 2 — PATCH with updated `done` values** (write to payload file on Windows):
```json
{
  "acceptanceCriteria": [
    { "id": "ac-xxx-0", "text": "Criterion A", "done": true },
    { "id": "ac-xxx-1", "text": "Criterion B", "done": false }
  ]
}
```

**Rule:** Check off each criterion **as you validate it**, not all at once at the end. The dashboard shows the live count (e.g. `2/5`) — the human should see it progress in real-time.

### Log an activity entry

```bash
curl -s -X POST http://localhost:3001/api/projects/{projectId}/activity \
  -H "Content-Type: application/json" \
  -d '{"agent": "developer", "action": "Auth module implementation complete"}'
```

### Create a new project

```bash
curl -s -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Project name", "squadId": "full-build", "description": "Project description"}'
```

---

## Data formats — exact JSON structures

The API accepts two formats for `acceptanceCriteria` and `subTasks`. Both are normalized server-side.

### `acceptanceCriteria`

Simple form (strings — recommended for agents):
```json
"acceptanceCriteria": ["User can add a task", "User can delete a task"]
```

Full form (if you need to pre-set a checked state):
```json
"acceptanceCriteria": [
  { "text": "User can add a task", "done": false },
  { "text": "User can delete a task", "done": true }
]
```

### `subTasks`

Simple form (strings — recommended for agents):
```json
"subTasks": ["Write HTML structure", "Add JS logic", "Style with CSS"]
```

Full form (if you need to track completion state):
```json
"subTasks": [
  { "text": "Write HTML structure", "status": "done" },
  { "text": "Add JS logic", "status": "todo" }
]
```

> **Note:** `status` values are `"todo"` or `"done"`. Legacy `{ "title": "...", "completed": true }` format is also accepted.

### Sending payloads with accented characters (Windows)

On Windows, `curl` inline `-d` strings corrupt accented characters. **Always use a payload file:**

```bash
# 1. Write your JSON to a temp file (outside the repo)
# 2. Send it with @filename
curl -s -X PATCH http://localhost:3001/api/projects/{projectId}/tasks/{taskId} \
  -H "Content-Type: application/json" \
  -d @/tmp/payload.json
```

---

## Work protocol

### Starting a task

1. Read the Orchestrator definition to detect the scenario
2. Set the Orchestrator to `active` with a message describing the task
3. Create tasks in the Kanban board (column `Backlog`)
4. When you begin a task, move it to `In Progress` and activate the relevant agent
5. Log each significant step in the activity feed

### During work

- Each time you switch roles, update the active agent and set the previous one to `done` or `idle`
- Each task transition must be reflected in the kanban (In Progress → In Review → QA → Done)
- Log important decisions in the activity feed

### Completing a task

1. Move the task to `Done`
2. Update the task `description` via `PATCH` with a detailed Markdown log. **Append to any existing content — do not overwrite previous agents' entries.**

   Required log sections per agent:
   ```markdown
   ## [Agent Name] Log

   **Files modified:** list each file (created / modified / deleted)
   **Commands run:** list commands (npm install, php artisan migrate, etc.)
   **Decisions:** any technical choice made and why
   **Issues encountered:** blockers, workarounds applied
   **Outcome:** one-line summary of what was delivered
   ```

3. Set involved agents to `done` or `idle`
4. Log a summary in the activity feed (1 line: what was done + verdict/result)
5. Set the Orchestrator to `idle` when everything is finished

### After the full pipeline completes (full-build or feature-ops)

When all tasks are Done and the pipeline is closed, **print this message in the chat:**

```
✅ Pipeline complete — [Project name]

App running at: [local URL or staging URL]
→ Open in browser: [URL]

Pipeline summary:
- [N] tasks completed
- CTO Review: [APPROVED / REWORK x times]
- QA: [PASSED / FAILED x times]
- Security: [APPROVED / issues found]
```

If the project has a local dev server (e.g. `npm run dev`, `php artisan serve`), start it and include the URL. The human should be able to click directly to see the result.

---

## Available scenarios

- **`full-build`** — Full project creation pipeline from scratch
- **`feature-ops`** — Existing project, new feature, bug fix, refactor
- **`code-review`** — Code audit, review, and security check

## Sprint definitions (LLM-agnostic)

Sprint files live in `sprints/` (a private directory, not versioned in this public repo).
They define repeatable autonomous workflows for a specific project.
Any LLM can use them — no platform-specific features required.

**To discover available sprints:**
1. Check if `sprints/INDEX.md` exists — it lists all available sprint files and their triggers
2. If no INDEX.md, run `ls sprints/` to list available `.md` files

**To start a sprint:** read the relevant file in `sprints/` and follow its instructions.
The file is self-contained — it defines filters, sort order, per-task workflow, and rules.

---

## Rules

- Always update the dashboard when working — this is the visibility contract with the human
- Do not activate all agents on every task — only those relevant to the detected scenario
- Log activity so the human can follow the thread after the fact
- Never include sensitive data (API keys, credentials, private paths) in dashboard updates
- **Always create a QA task (T03)** for every feature-ops pipeline — even if QA is brief or logic-only. No pipeline is complete without a QA task in the kanban.
- **Attach a screenshot when possible** — after completing a visible change (UI, error message, browser output), take a screenshot and embed it in the task description log under a `**Screenshot:**` field. Use the Chrome MCP or preview tools. If a screenshot cannot be taken (no browser, server-side only), note why in the log.
