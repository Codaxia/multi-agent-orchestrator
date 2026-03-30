# Multi-Agent Orchestrator

Real-time dashboard for orchestrating, tracking, and reviewing multi-agent AI workflows across projects.

## Overview

Multi-Agent Orchestrator is a lightweight control center for supervising AI agent pipelines with:

- live agent status tracking
- Kanban task management
- activity logs
- project switching
- agent profile drawers with markdown-based definitions

The project ships with Codaxia sample squads and seed data so the dashboard is usable right away.

## Stack

- React + Vite
- Express
- Local JSON seed/runtime storage
- Markdown-backed agent definitions

## Features

- Real-time polling dashboard for agent pipeline visibility
- Task board with drag and drop workflow updates
- Per-agent detail views loaded from markdown definitions
- Multi-project data model with separate runtime files
- Seed data tracked in Git, runtime state kept out of version control

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the app

```bash
npm start
```

This runs:

- the API server on `http://localhost:3001`
- the Vite client on `http://localhost:5173`

## Available Scripts

```bash
npm start
npm run server
npm run client
npm run build
npm run preview
npm run reset-demo-data
npm run sync-agents
npm run sync-agents:codaxia
```

## Agent Definitions

Agent detail panels are loaded from markdown files stored in your local Claude agents directory.

By default, the server reads from:

```text
~/.claude/agents
```

You can override that location with:

```bash
CLAUDE_AGENTS_DIR=/custom/path/to/agents
```

The app maps known agent IDs to markdown files such as:

- `01-orchestrator.md`
- `02-pm-discovery.md`
- `03-architect.md`
- `04-developer.md`
- `05-cto-reviewer.md`
- `06-qa.md`
- `07-security.md`
- `08-deploy.md`
- `09-estimation.md`

## Data Model

The repository separates tracked starter content from local runtime state:

- `data/seeds/` contains public-safe demo data
- `data/runtime/` is generated locally and ignored by Git

On startup, the server bootstraps runtime files from the corresponding seeds when needed. This keeps the repository public-friendly while real project history stays local.

If you want to preview the public demo state locally, run:

```bash
npm run reset-demo-data
```

Then restart the API so runtime files are regenerated from `data/seeds/`.

## Project Structure

```text
src/
  components/
  hooks/
  utils/
data/
  seeds/
  runtime/
agents/
  codaxia/
scripts/
server.js
```

## Build

```bash
npm run build
```

## Notes

- Runtime data is intentionally not committed.
- Versioned JSON files are demo templates, not private delivery history.
- Local Claude configuration files are intentionally ignored.
- This repo is sanitized for public sharing and does not include private local paths or personal Git identity.
