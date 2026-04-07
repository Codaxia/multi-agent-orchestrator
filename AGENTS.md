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

Then check for project-specific skills in `sprints/skills/INDEX.md`. If a skills file exists
for the current project, load it — it overrides and extends the default agent rules.

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

**One external ticket = one mission.** Each ClickUp or Jira ticket becomes its own dashboard project — never group multiple tickets into a single mission.

If the user provides a ClickUp task ID or URL, use the ClickUp MCP to read it:

```
Tool: clickup_get_task
Input: task_id (the ID from the URL, e.g. "abc123xyz")
```

The task response contains: title, description, acceptance criteria, status, assignees, comments.
Treat the ClickUp content as the task brief — apply the same PM skip/activate logic as for text tasks.

**Then immediately create a mission for it:**
```bash
curl -s -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "[Ticket title]", "squadId": "feature-ops", "description": "[Ticket description]"}'
```

Inside that mission, create Kanban tasks representing the **agent pipeline steps** (T01 Developer, T02 CTO Review, T03 QA) — not the ticket content itself.

After the pipeline completes, update the ClickUp task:
```
Tool: clickup_update_task
Input: task_id, status: "complete" (or the appropriate status in the user's workspace)
```

**Do not update ClickUp status mid-pipeline** — only at the very end, when QA has passed.

---

## Data model — Scenario › Mission › Task

The dashboard is organized in three levels:

| Level | Dashboard name | Maps to |
|-------|---------------|---------|
| **Scenario** | Squad (e.g. `feature-ops`) | Type of pipeline (full-build, feature-ops, code-review) |
| **Mission** | Project | **One external ticket** (ClickUp, Jira, text brief) = one mission |
| **Task** | Kanban card | One agent pipeline step (Developer, CTO Review, QA…) |

**Rules:**
- **One ticket = one mission.** Each ClickUp or Jira ticket you receive becomes its own dashboard project. Never group multiple external tickets inside a single mission.
- **Kanban tasks are for agents only.** They represent pipeline steps (T01 Developer, T02 CTO Review, T03 QA…), not business requirements or user stories. The human does not create or move tasks — agents do.
- **Tasks are not tickets.** The Kanban is a visibility tool for the human to follow agent progress, not a backlog of business features.

**Example:**
- User gives 3 ClickUp tickets → create 3 missions, each with its own pipeline tasks
- Inside each mission: T01 (Developer), T02 (CTO Review), T03 (QA) — these are agent steps, not ticket content

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
  -d '{"agent": "developer", "action": "npm run build", "type": "command", "detail": "output here..."}'
```

**Required fields:** `agent`, `action`

**Optional fields:**

| Field | Values | When to use |
|-------|--------|-------------|
| `type` | `command` | Shell command executed (renders in monospace green-on-dark) |
| | `test` | Test run result (green badge) |
| | `file` | File created or modified (blue badge) |
| | `error` | Error or failure (red badge) |
| | `decision` | Technical decision made (amber badge) |
| | `info` | General info — default if omitted |
| `detail` | string | Full output, stack trace, diff, or test results — shown in expandable toggle |

**Examples:**

```bash
# Command with output
-d '{"agent": "developer", "action": "npm run build", "type": "command", "detail": "✓ Built in 1.23s\n  dist/index.js  42kb"}'

# Test result
-d '{"agent": "qa", "action": "Cypress: 12 tests passed", "type": "test", "detail": "✓ login form\n✓ dashboard loads\n✓ task creation"}'

# File change
-d '{"agent": "developer", "action": "src/components/TaskCard.jsx modifié", "type": "file"}'

# Decision
-d '{"agent": "architect", "action": "Choix: JWT stateless plutôt que sessions", "type": "decision", "detail": "Raison: scalabilité horizontale requise. Impact: logout global non supporté."}'
```

### Publish a mission recap

At the end of the mission, publish a single recap object summarizing what was done, why, and how. This is one document per mission — it replaces any previous recap for this project.

```bash
curl -s -X POST http://localhost:3001/api/projects/{projectId}/recap \
  -H "Content-Type: application/json" \
  -d @/tmp/recap.json
```

**Required fields:** `summary`

**Optional fields:**

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `bug_fix`, `feature`, `refactor`, `code_review`, `security`, `deploy` |
| `agentAuthor` | string | Agent who writes the recap (e.g. `"developer"`) |
| `summary` | string | **Required.** Plain-language summary of what was done |
| `why` | string | Why it was needed / why the problem existed |
| `how` | string | How it was implemented or fixed |
| `outcome` | string | End result — what the user sees now |
| `bugOrigin` | string | Root cause of the bug (`bug_fix` only) |
| `bugSymptom` | string | What the user experienced (`bug_fix` only) |
| `qaSteps` | string | Description of tests performed |
| `clickupTaskId` | string | ClickUp task ID |
| `clickupTaskTitle` | string | ClickUp task title |
| `clickupUrl` | string | ClickUp task URL |
| `commitHash` | string | Git commit hash |
| `commitMessage` | string | Git commit message |
| `commitUrl` | string | Link to commit on GitHub/GitLab |
| `prUrl` | string | Pull Request URL |
| `links` | array | Extra links: `[{"label": "Docs", "url": "https://..."}]` |

**Example payload** (`/tmp/recap.json`):

```json
{
  "type": "bug_fix",
  "agentAuthor": "developer",
  "summary": "The app was unreadable on mobile — overlapping text, sidebar taking the full screen.",
  "why": "No CSS breakpoint existed for screens under 640px.",
  "how": "Added mobile overlay sidebar with hamburger button. 4 files modified: index.css, App.jsx, Sidebar.jsx, Header.jsx.",
  "outcome": "App fully navigable on mobile. Sidebar renders as overlay with backdrop, auto-closes on navigation.",
  "bugSymptom": "Overlapping text, projects invisible, navigation impossible on phone.",
  "bugOrigin": "Missing responsive CSS for small screens.",
  "qaSteps": "Tested on viewport 375x812 (iPhone), 768x1024 (tablet), 1280x800 (desktop).",
  "commitHash": "dff9de4",
  "commitMessage": "feat(ui): mobile responsive layout with hamburger overlay"
}
```

**When to publish:** once, at the end of the mission. One recap per mission — publishing replaces the previous one.

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

### Starting a mission

Each external ticket (ClickUp, Jira, text brief) = one mission. Start by creating the project, then populate the Kanban with **agent pipeline steps** (not business requirements).

1. Create the mission: `POST /api/projects` with the ticket title and description
2. Set the Orchestrator to `active` with a message describing the mission
3. Create **agent pipeline tasks** in the Kanban (column `Backlog`):
   - T01 — Developer: implementation
   - T02 — CTO Review: code review
   - T03 — QA: functional validation
   - *(add Security, Deploy if the scenario requires)*
4. When you begin a pipeline step, move its task to `In Progress` and activate the relevant agent
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

### Snapshot task data to private workspace (optional)

After every completed pipeline, check whether a private workspace repo is configured:

```bash
git -C sprints/ rev-parse --is-inside-work-tree 2>/dev/null && echo "HAS_PRIVATE_REPO" || echo "NO_PRIVATE_REPO"
```

**If `HAS_PRIVATE_REPO` and `sprints/sync.sh` exists:**

```bash
bash sprints/sync.sh
```

This copies all task, pipeline-status, and activity-log files from `data/runtime/` into
`sprints/data/` and pushes a timestamped commit to the private repo.

**If `NO_PRIVATE_REPO`:** ask the user **once**:

> "Your task data is stored locally in `data/runtime/` (excluded from the public repo).
> Would you like to version it in a private git repo so it is backed up and tracked over time?
> (yes / no — you can set this up later at any time)"

- If **yes**: guide the user to create a private GitHub repo, run `git init` in `sprints/`,
  add the remote, and push. Then run `bash sprints/sync.sh`.
- If **no**: skip silently. Task data remains local only — this is the default behavior
  and nothing is lost.

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
