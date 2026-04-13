# Dashboard Agents — Real-time AI Pipeline Supervision

## The concept in 30 seconds

This dashboard is a **control panel** for supervising AI agents working through any compatible AI coding assistant.

**How it works:**

1. You open your AI assistant in a project
2. You ask it to work using the agent system
3. The AI assumes different roles (PM, Architect, Developer, Reviewer, QA...) as needed
4. The dashboard updates in real-time: you see which agent is active, where tasks stand, and what happened

**This is NOT a SaaS platform.** It is a local, lightweight tool for visually tracking the work of an AI assistant you already use.

---

## How it works

```
┌─────────────────────────────────────────────────────┐
│  YOU (human)                                        │
│  "New project: auth module refactor,                │
│   Laravel 11, with security audit"                  │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  AI ASSISTANT (terminal)                            │
│  - Reads AGENTS.md for the work protocol            │
│  - Assumes the Orchestrator role                    │
│  - Detects scenario (full-build / feature / review) │
│  - Creates tasks in the kanban                      │
│  - Switches roles as needed (PM → Arch → Dev → ...) │
│  - Updates the dashboard via the local API          │
└──────────────────┬──────────────────────────────────┘
                   │ curl http://localhost:3001/api/...
                   ▼
┌─────────────────────────────────────────────────────┐
│  DASHBOARD (browser)                                │
│  - Agents: who is doing what, in real-time          │
│  - Kanban: Backlog → In Progress → Review → Done    │
│  - Activity: full history of everything that happened│
└─────────────────────────────────────────────────────┘
```

**The dashboard does nothing by itself.** It displays state. The AI does the work and updates the board as it goes.

---

## Scenarios

The Orchestrator detects the type of work from your brief and activates only the relevant agents:

| Scenario | When | Pipeline |
|----------|------|----------|
| **full-build** | New project from scratch | Orchestrator -> PM -> Architect -> Developer -> Review -> QA -> Security -> Deploy |
| **feature-ops** | Existing project, new feature, bug fix | Orchestrator -> Developer -> CTO Review -> QA |
| **code-review** | Audit, review, security check | Orchestrator -> CTO Review -> Security -> QA |
| **rework** | Bug reported on a completed mission | Developer → CTO Review → Security → QA (full pipeline, no shortcuts) |

A single project can receive tasks of different scenarios over time. The same project that started as a full-build can later receive feature-ops or code-review tasks.

---

## The agents

9 specialized roles, defined in `agents/default/`:

| Agent | Role | When it intervenes |
|-------|------|---------------------|
| **Orchestrator** | Pipeline coordination | Always — detects scenario and manages flow |
| **PM Discovery** | Scoping, user stories | At the start of a full-build project |
| **Architect** | Architecture & technical breakdown | After discovery |
| **Developer** | Full-stack implementation | Code phase |
| **CTO Reviewer** | Code review & mentoring | After each implementation |
| **QA** | Testing & validation | Before release |
| **Security** | OWASP audit | On sensitive projects |
| **Deploy** | Deployment & release | End of pipeline |
| **Estimation** | Effort & complexity | On demand |

---

## Quick start

### 1. Install

```bash
npm install
```

### 2. Start the dashboard

```bash
npm start
```

This starts:
- The Express API on `http://localhost:3001`
- The Vite frontend on `http://localhost:5173`

### 3. Start working

Open your AI assistant and paste:

```
Read AGENTS.md and follow the protocol.
```

Then add your project brief. The Orchestrator detects the scenario and activates the right agents automatically.

For the short version, use:

```
Use dashboard-agents.
```

Then add your brief. This triggers the visible multi-agent flow before coding starts.

---

## Usage examples

### New project from scratch (full-build)

```
Read AGENTS.md and follow the protocol.

---

Project: My SaaS App
Stack: Laravel 11, React, PostgreSQL
Repo: (none yet — creating from scratch)

Description:
Build a project management tool with user authentication,
team workspaces, task boards, and role-based permissions.
Start with the MVP: auth + one workspace + basic task CRUD.
```

**What happens:** Orchestrator detects `full-build` → activates all agents → PM scopes the features → Architect designs the structure → Developer implements → CTO reviews → QA validates → Security audits → Deploy releases.

---

### Adding a feature to an existing project (feature-ops)

```
Read AGENTS.md and follow the protocol.

---

Project: My SaaS App
Stack: Laravel 11, PHP 8.3
Repo: /path/to/my-saas-app

Description:
Add two-factor authentication (2FA) to the existing login system.
Login and register already work. Add TOTP verification
(Google Authenticator) with backup codes and a user settings page
to enable/disable 2FA.
```

**What happens:** Orchestrator detects `feature-ops` -> creates the visible pipeline cards -> Developer implements -> CTO reviews -> QA validates. PM Discovery is inserted only when the scope is unclear, and Security is added only when the risk requires it.

---

Pipeline note:
- `feature-ops` always includes Orchestrator, Developer, CTO Review, and QA
- PM Discovery is added when the scope is unclear
- Security is added when the risk level requires it

### Code review or security audit (code-review)

```
Read AGENTS.md and follow the protocol.

---

Project: My SaaS App
Stack: Laravel 11, PHP 8.3
Repo: /path/to/my-saas-app

Description:
Full code review and security audit before production release.
Focus on authentication flows, API endpoints, input validation,
and session management. Flag any OWASP Top 10 vulnerabilities.
```

**What happens:** Orchestrator detects `code-review` -> creates the visible review pipeline -> CTO reviews code quality -> Security audits for vulnerabilities -> QA validates the reviewed scope or any fixes.

---

## Stack

- **Frontend:** React 18 + Vite
- **Backend:** Express.js (local REST API)
- **Storage:** Local JSON files (`data/runtime/`, not versioned)
- **Agents:** Markdown files (`agents/default/`)

---

## Project structure

```
agents/default/          ← 9 agent definitions (markdown)
data/
  seeds/                 ← Demo data (versioned)
  runtime/               ← Live local state (git-ignored)
src/
  components/            ← React components (Board, Kanban, Activity...)
  hooks/                 ← Real-time polling
  utils/                 ← Agent colors, time formatting
lib/
  dashboard-data.js      ← Backend data logic
server.js                ← Express API
AGENTS.md                ← Work protocol for AI assistants
PROMPT-BOOTSTRAP.md      ← Startup prompt to paste into any AI assistant
sprints/                 ← Private workspace (separate git repo, not versioned here)
  skills/                ← Per-project agent overrides (stack, dev server, QA setup)
  data/                  ← Versioned task snapshots per mission
```

> **`sprints/` is a private git repository** — not a subdirectory of this repo. It stores project-specific agent rules and task history. See `sprints/README.md` for setup.

---

## Available scripts

```bash
npm start              # Start API + frontend
npm run server         # API only (port 3001)
npm run client         # Frontend only (port 5173)
npm run build          # Production build
npm run reset-demo-data  # Restore demo seed data
```

---

## Data

- **`data/seeds/`**: public demo data, versioned in git
- **`data/runtime/`**: real project state, local only, git-ignored

On startup, if runtime files do not exist, the server creates them from seeds.

---

## FAQ

**Q: Are the agents standalone programs?**
No. Agents are roles that the AI assistant assumes one at a time. Each agent has a `.md` file describing its behavior, rules, and expected outputs. The AI reads these files and adapts its work accordingly.

**Q: Does the dashboard run agents?**
No. The dashboard displays state. The AI assistant (in the terminal) does the work and updates the dashboard via the API.

**Q: Does this only work with one specific AI?**
No. The `AGENTS.md` file and the bootstrap prompt are LLM-agnostic. Any AI assistant that can read files and run shell commands can use this system.

**Q: How much does it cost?**
Nothing beyond your existing AI subscription. No additional API, no cloud server. Everything runs locally.

**Q: Can I use this for my own project?**
Yes. Create a new project in the dashboard or customize the agents in `agents/default/`. The dashboard supports multiple projects simultaneously.
