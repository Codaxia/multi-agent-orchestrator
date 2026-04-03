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
| **feature-ops** | Existing project, new feature, bug fix, refactor | orchestrator, developer, cto-reviewer, qa |
| **code-review** | Audit, review, security check | orchestrator, cto-reviewer, security, qa |

A single project can receive tasks of different scenarios over time.

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
  -d '{"title": "Task title", "description": "Description", "column": "Backlog", "assignedAgent": "developer", "priority": "Must"}'
```

**Columns:** `Backlog`, `In Progress`, `In Review`, `QA`, `Done`
**Priorities:** `Must`, `Should`, `Could`, `Won't`

### Move / update a task

```bash
curl -s -X PATCH http://localhost:3001/api/projects/{projectId}/tasks/{taskId} \
  -H "Content-Type: application/json" \
  -d '{"column": "In Progress", "assignedAgent": "developer"}'
```

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
2. Set involved agents to `done` or `idle`
3. Log a summary in the activity feed
4. Set the Orchestrator to `idle` when everything is finished

---

## Available scenarios

- **`full-build`** — Full project creation pipeline from scratch
- **`support-ops`** — Maintenance, support, and experimentation

---

## Rules

- Always update the dashboard when working — this is the visibility contract with the human
- Do not activate all agents on every task — only those relevant to the detected scenario
- Log activity so the human can follow the thread after the fact
- Never include sensitive data (API keys, credentials, private paths) in dashboard updates
