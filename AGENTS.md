# Dashboard Agents — Instructions for AI Assistants

> This file contains the full instructions for any AI assistant working within a project
> supervised by this dashboard. It is LLM-agnostic: compatible with any assistant that
> can read files and execute shell commands.

---

## Language rules — mandatory

Two distinct contexts, two distinct rules:

| Context | Language | Examples |
|---------|----------|---------|
| **Code** | English — always, no exceptions | variable names, function names, comments, commit messages, route names, API keys, database column names, string literals in logic |
| **Dashboard content** | Language used by the user in the current chat | mission names, task titles, task descriptions, acceptance criteria, sub-tasks, activity log messages, agent status messages, bug reports |

**Detecting the user's language:** look at the language the user wrote in when giving you the current brief or request. That language applies to all dashboard content for this session. If the user switches languages mid-session, switch accordingly.

**Why this split:** code is global and collaborative — it must be readable by any developer. Dashboard content is the human's workspace — it should be in their native language so they can read and act on it efficiently.

---

## What this system is

This repo is a **real-time supervision dashboard** for AI agent pipelines.
The dashboard (React + Express) displays live agent statuses, tasks, and activity logs.

**The AI assistant is the engine. The dashboard is the control screen.**

When working on a project supervised by this dashboard, you MUST update the dashboard
via its local API so the human can follow what is happening in real-time.

---

## Global rules vs project rules

Global orchestration rules live in this file and in `agents/default/`.
If a rule must apply to every project, put it here or in the default agents.

Project skills are for project-specific information only:
- stack, framework, dev server commands
- repo paths, local setup, credentials handling
- project-specific QA flows or business constraints

Do NOT put global pipeline discipline in project skills.

---

## Pipeline contract

When the human asks to use `dashboard-agents`, the visible agent pipeline is mandatory by default.

Global rules:
- Before any code change, create the mission tasks and log the first activity entry
- Never collapse a mission into one business card; Kanban cards must represent agent steps
- The Orchestrator decides which agents are needed for the task
- In `feature-ops`, CTO Review and QA are always mandatory
- PM Discovery is activated by the Orchestrator when scope or acceptance criteria are unclear
- Security is activated by the Orchestrator when risk level or user request requires it

---

## Before starting any work

### 1. Read the relevant agent definitions

Agent definitions are in `agents/default/`. Read the Orchestrator first — it contains the
scenario detection matrix that determines which agents to activate.

Then check for project-specific skills using the **two-level lookup** below.
Skills files override and extend the default agent rules.

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

### Skills lookup — two levels, private overrides public

```
1. sprints/skills/{slug}.md   ← private repo (project-specific: local paths, credentials)
2. skills/{slug}.md           ← public repo  (shared defaults: stack, conventions)
```

Check level 1 first. If no match → check level 2. If neither exists → bootstrap a new file.

**Available public skills files:**

| File | Project |
|------|---------|
| `skills/dashboard-agents.md` | This project (Dashboard Agents) |
| `skills/_template.md` | Base template — copy to create a new skills file |
| `skills/_sprint-example.md` | Documented example of a sprint definition |

**Bootstrap (new project, no skills file at either level):**
```bash
cp skills/_template.md sprints/skills/{slug}.md
# Then ask PM Discovery to fill in the detected stack, server, and commands.
```

### 2. Start the dashboard — mandatory startup sequence

**The dashboard has two servers. Both must be running before any work starts.**

| Server | Port | Role | URL for humans |
|--------|------|------|---------------|
| Express API | 3001 | REST API + data | never open directly |
| Vite dev server | **5173** | React frontend (HMR) | **always use this one** |

> ⚠️ **Never send the user to localhost:3001.** That port serves a static production build that may be stale. Port 5173 is the live dev server — always current via HMR.

**Check and start in order:**

```bash
# Step 1 — Check if the Express API is running
node -e "const h=require('http');h.get('http://localhost:3001/api/workspace',r=>console.log('API OK')).on('error',()=>console.log('API OFF'))"
```

**If API is OFF:**
```bash
# Start Express as a persistent background process (NOT via preview_start)
node server.js > /tmp/dashboard-api.log 2>&1 &
echo "Express API started (PID $!)"
```

> ⚠️ **Never start Express via `preview_start`.** That tool ties the process to its MCP session — the server dies when the session resets. Run it via Bash so it persists independently.

**Then start the Vite dev server:**
```
preview_start("Dashboard — Vite Dev")   → port 5173, proxies /api to Express
```

**Always rebuild dist/ before starting** — keeps port 3001 in sync in case the user opens it directly:
```bash
npm run build
```

### 3. Tell the user where to open the dashboard

**Always print this at the start of every session, before any work:**

```
📊 Dashboard: http://localhost:5173
→ Navigate to: [scenario name] > [project name]
```

If the servers were already running (reused), still print the URL — the user may not have the tab open.

The user must have the correct project open in their browser before work starts.
If creating a new project, include the project name so the user can find it in the sidebar.

---

## Scenarios

The Orchestrator detects the scenario from the user's brief and activates only the relevant agents:

| Scenario | When | Agents activated |
|----------|------|------------------|
| **full-build** | New project from scratch | All agents, full pipeline |
| **feature-ops** | Existing project, new feature, bug fix, refactor | orchestrator, developer, cto-reviewer, qa, with pm-discovery/security added by scope and risk |
| **code-review** | Audit, review, security check | orchestrator, cto-reviewer, security, qa, developer |
| **rework** | Bug reported on a completed mission, correction after delivery | orchestrator, developer, cto-reviewer, security, qa — full pipeline, no shortcuts |

A single project can receive tasks of different scenarios over time.

---

## Reading external tasks (feature-ops)

**One external ticket = one mission.** Each ticket from an external task manager (ClickUp, Jira, Linear, etc.) becomes its own dashboard project — never group multiple tickets into a single mission.

If the user provides a task ID or URL from an external tool:
1. Check the project skills file (`sprints/skills/{slug}.md`) for the specific MCP tool and read instructions for this project
2. Read the task — it should contain: title, description, acceptance criteria, status, comments
3. Treat the content as the task brief — apply the same PM skip/activate logic as for text briefs

**Then immediately create a mission:**
```bash
curl -s -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "[Ticket title]", "squadId": "feature-ops", "description": "[Ticket description]"}'
```

Inside that mission, create Kanban tasks representing the **agent pipeline steps** (see § Pipeline contract for the required composition) — not the ticket content itself.

After the pipeline completes, update the external task status using the tool defined in the project skills file. **Do not update mid-pipeline** — only at the very end, when QA has passed.

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
- **Kanban tasks are for agents only.** They represent pipeline steps (for example T00 Orchestrator, T01 Developer, T02 CTO Review, T03 QA), not business requirements or user stories. The human does not create or move tasks — agents do.
- **Tasks are not tickets.** The Kanban is a visibility tool for the human to follow agent progress, not a backlog of business features.

**Example:**
- User gives 3 ClickUp tickets -> create 3 missions, each with its own pipeline tasks
- Pipeline tasks follow the composition defined in § Pipeline contract

## Mission Naming And Sidebar Toggles

The sidebar groups missions by app name. This grouping is derived from the mission label itself.

**Naming contract:**
- Format every mission label as: `App Name - Mission Name`
- The text before the first separator (` - ` or ` — `) is the **app name**
- The text after the separator is the **mission name**
- Each distinct app name creates its own sidebar toggle, even if there is only one mission for that app
- Never use a catch-all label such as "Other projects" to regroup unrelated apps

**Examples:**
- `Atuvu - Menu lateral`
- `Atuvu - Message Offre Privee`
- `Motivation App - Today calendar date/toggle`

**Important:**
- External ticket IDs such as `ClickUp #123` should stay in the description, recap, or external task fields by default
- Do not put external ticket IDs in the mission label unless the human explicitly asks for them

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
| `externalTaskId` | string | External task ID (e.g. ClickUp, Jira, Linear) |
| `externalTaskTitle` | string | External task title |
| `externalTaskUrl` | string | External task URL |
| `commitHash` | string | Git commit hash |
| `commitMessage` | string | Git commit message |
| `commitUrl` | string | Link to commit on GitHub/GitLab |
| `prUrl` | string | Pull Request URL |
| `links` | array | Extra links: `[{"label": "Docs", "url": "https://..."}]` |
| `stagingTestGuide` | string | Step-by-step functional test guide for staging — UI actions only, no code, no tinker (see format below) |

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
  "commitMessage": "feat(ui): mobile responsive layout with hamburger overlay",
  "stagingTestGuide": "## 🧪 Test guide — Mobile responsive layout\n\n**Goal:** Verify the app is usable on a phone.\n\n### Steps\n1. Open https://staging.example.com on your phone (or resize your browser to 375px width)\n2. You should see a hamburger menu (☰) in the top-left corner\n3. Tap it — a sidebar should slide in from the left\n4. Tap any item in the sidebar — it should navigate and close automatically\n5. Navigate to the Projects page — all project cards should be visible without horizontal scrolling\n\n### ✅ Expected result\nThe app is fully navigable at 375px — no text overlap, no horizontal scroll, hamburger visible.\n\n### ❌ What it looked like before\nText was overlapping, the sidebar was covering the whole screen, projects were invisible."
}
```

**When to publish:** once, at the end of the mission. One recap per mission — publishing replaces the previous one.

---

### Staging test guide — format rules

The `stagingTestGuide` field must be a Markdown string. It is shown to the user (and their team) in the Recap panel as a tutorial to manually validate the feature on staging.

**Mandatory rules:**

1. **UI actions only** — no code, no terminal commands, no `tinker`, no `curl`. The reader has no developer access.
2. **Links everywhere possible** — include full URLs to the exact pages to visit (e.g. `https://staging.example.com/admin/plays/42`).
3. **Before / after** — describe what the behavior was before and what it should be now. Helps the reader know what to compare against.
4. **Numbered steps** — each action is a numbered step: *go to X*, *click Y*, *fill Z*, *verify that W appears*.
5. **One scenario per section** — if the feature has multiple flows (happy path + error case), split them into separate sections with `###` headers.
6. **Accessible to a non-developer** — assume the reader can use a browser but cannot read code.

**Template:**

```markdown
## 🧪 Test guide — [Feature name]

**Goal:** [One sentence — what this feature does for the user.]
**Staging URL:** [Direct link to the page where the feature is visible]

### Scenario 1 — [Happy path title]
1. Go to [URL or page name]
2. [Action — click, fill, select…]
3. [Action]
4. Verify: [what you should see]

### Scenario 2 — [Edge case or error case]
1. …

### ✅ Expected result
[What the user should experience after these steps — in plain language.]

### ❌ What it looked like before (if bug fix)
[What the user saw before — optional for features, required for bug fixes.]
```

**When to include it:** always for `feature` and `bug_fix` types. Optional for `refactor` (only if user-visible behavior changed).

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

### Rework on an existing mission

When the human reports a bug, a correction, or a QA finding on a mission that is already complete — **do not create a new mission**. Reuse the existing project and add a rework task to its Kanban.

**Triggers:** human reports a bug in chat, shares a ClickUp comment, points to an issue in a previously delivered mission.

**Protocol:**

1. **Identify the existing project** — match to the mission the human is referencing
2. **Set the Orchestrator to `active`** with message `"Rework — [short issue description]"`
3. **Create one task per issue** in the existing project Kanban:
   ```bash
   curl -s -X POST http://localhost:3001/api/projects/{projectId}/tasks \
     -H "Content-Type: application/json" \
     -d '{"title": "[RW] — Short bug description", "description": "Bug report: ...\nExpected: ...\nActual: ...", "column": "Backlog", "assignedAgent": "developer", "priority": "Must"}'
   ```
   Task title must be prefixed with `[RW]` to distinguish rework from original pipeline tasks.

4. **Run the full pipeline** — no shortcuts, even for minor fixes:

   | Step | Agent | What to do |
   |------|-------|-----------|
   | 1 | Developer | Diagnose root cause, implement fix |
   | 2 | CTO Reviewer | Code review the fix (diff only — not the whole project) |
   | 3 | Security | Verify the fix doesn't introduce a vulnerability |
   | 4 | QA | Validate the fix matches the bug report |

5. **Update the recap** — PATCH the existing recap to reflect the rework. Add a `reworkLog` array entry:
   ```bash
   curl -s -X PATCH http://localhost:3001/api/projects/{projectId}/recap \
     -H "Content-Type: application/json" \
     -d '{"reworkLog": [{"issue": "Bug description", "fix": "What was changed", "date": "ISO date"}]}'
   ```
   > If `reworkLog` already exists, merge — do not overwrite previous entries.

6. **Print the rework summary in chat:**
   ```
   ✅ Rework complete — [Project name]
   Issue: [bug description]
   Fix: [what was changed]
   CTO Review: APPROVED
   QA: PASSED
   ```

---

### Checking for human QA feedback

Before starting any work on an existing mission, check whether the human left feedback in the Recap page:

```bash
curl -s http://localhost:3001/api/projects/{projectId}/recap
```

If the response contains a non-empty `humanNotes` field:
1. Read each item — treat them as bug reports or rework requests
2. Create one pipeline task per issue (column: `Backlog`, assignedAgent: `developer`)
3. Fix each issue following the normal pipeline loop (Developer → CTO Review → QA)
4. Once all issues are resolved, **clear the notes** by sending:
   ```bash
   curl -s -X PATCH http://localhost:3001/api/projects/{projectId}/recap \
     -H "Content-Type: application/json" \
     -d '{"humanNotes": ""}'
   ```

---

### Starting a mission

Each external ticket (ClickUp, Jira, text brief) = one mission. Start by creating the project, then populate the Kanban with **agent pipeline steps** (not business requirements).

1. Create the mission: `POST /api/projects` with a label formatted as `App Name - Mission Name`, plus the ticket description
2. Set the Orchestrator to `active` with a message describing the mission
3. Create **agent pipeline tasks** in the Kanban (column `Backlog`):
   - T00 — Orchestrator: scenario + task creation + activity bootstrap
   - T01 — Developer: implementation
   - T02 — CTO Review: code review
   - T03 — QA: functional validation
   - Add PM Discovery before Developer when the task is vague or acceptance criteria are missing
   - Add Security only when risk level or user request requires it
4. When you begin a pipeline step, move its task to `In Progress` and activate the relevant agent
5. Log each significant step in the activity feed

### During work

- Each time you switch roles, update the active agent and set the previous one to `done` or `idle`
- Each task transition must be reflected in the kanban (In Progress → In Review → QA → Done)
- Log important decisions in the activity feed

Mandatory closure rules:
- Do not let Developer start until the Orchestrator task exists
- Do not close the mission until CTO Review and QA tasks are done

### Completing a task

1. Move the task to `Done`
2. Update the task `description` via `PATCH` with a detailed Markdown log. **Append to any existing content — do not overwrite previous agents' entries.**

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

**Also print the staging test guide** — immediately after the pipeline summary, print the functional test steps so the human can validate in staging without needing developer access:

```
---
🧪 How to test on staging — [Feature name]

[Paste the stagingTestGuide content here — plain text, no code blocks, just numbered steps and links]
```

> This guide is also saved in the recap (`stagingTestGuide` field) and visible in the Recap panel of the dashboard.
> Rule: **no terminal commands, no tinker, no code** — only UI steps and staging URLs a non-developer can follow.

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
- In `feature-ops`, always create an Orchestrator step, a CTO Review step, and a QA step
- PM Discovery is optional but decided by the Orchestrator, not by omission or convenience
- **Always create a QA task** for every feature-ops pipeline — even if QA is brief or logic-only. No pipeline is complete without a QA task in the kanban.
- **Attach a screenshot when possible** — after completing a visible change (UI, error message, browser output), take a screenshot and embed it in the task description log under a `**Screenshot:**` field. Use the Chrome MCP or preview tools. If a screenshot cannot be taken (no browser, server-side only), note why in the log.
