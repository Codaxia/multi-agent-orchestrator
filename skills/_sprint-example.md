# Sprint Example — LLM-agnostic workflow definition

> This file is a documented example of a sprint definition.
> Copy it, rename it to your project slug (e.g. `sprints/my-project.md`),
> and fill in the project-specific details.
>
> Sprint files belong in `sprints/` (your private workspace repo).
> This example lives in the public repo as a reference only.

---

## What a sprint does

Given a task list (ClickUp URL, Jira board, or a plain text list), a sprint fetches all tasks,
filters and sorts them, then processes them one by one following a strict workflow.

---

## How to start

Provide the sprint file to your AI assistant along with a task source:

```
Read sprints/my-project.md and follow the sprint rules.
ClickUp list: https://app.clickup.com/...
```

The assistant handles the rest autonomously.

---

## Step 1 — Fetch and filter tasks

Retrieve all tasks from the provided source.

**Filter criteria (customize for your project):**
1. Assigned to: `[your name or team member]`
2. Have a priority set (exclude tasks with no priority)

Discard all other tasks silently.

---

## Step 2 — Sort by priority

Sort filtered tasks (most urgent first):
1. Urgent
2. High
3. Normal
4. Low

Within the same priority, preserve original order.

---

## Step 3 — Process tasks one by one

For each task, in order:

### 3a. Read the task
- Read title, description, subtasks, acceptance criteria.
- If the task is large (> 1 day, multiple subsystems, architectural decisions):
  **stop, show a plan, wait for user confirmation.**
- For all other tasks: proceed directly.

### 3b. Implement
- Work on the project at `[/path/to/project]`
- Branch: `[staging / main / feature-branch]`
- Follow existing code conventions.
- Never push to remote (local commits only).

### 3c. Test
- Verify the implementation works (browser, CLI, or logic check as appropriate).
- For visible UI changes: take a screenshot as proof.

### 3d. Commit
- Stage only files modified for this task.
- Use conventional commit format: `fix(scope): description` / `feat(scope): description`
- Include a reference to the task ID in the commit body: `Ref: #[task-id]`
- Never push — local commit only.

### 3e. Update task status
- Set the task to the appropriate "done" status in your task manager.

### 3f. Move to next task
- Proceed to the next task. Repeat from 3a.

---

## Rules

- **Never push to remote**, even if asked mid-sprint.
- **Never work on tasks outside the filter criteria.**
- **One task at a time** — complete the full 3a→3f cycle before starting the next.
- **Stop for large tasks** — plan first, confirm with user, then execute.
- **Update the dashboard** as you work (create a kanban task per sprint task, move through Backlog → In Progress → Done).
- **Attach a screenshot** when the result is visible in a browser.

---

## Project context (fill in for your project)

- **Project:** [Your project name and description]
- **Stack:** [e.g. Laravel, React, PostgreSQL]
- **Local path:** `[/path/to/project]`
- **Branch:** `[staging]`
- **Task source:** [ClickUp list URL / Jira board / plain list]
- **Assignee filter:** [Name (email)]

---

## Compatibility

This file has no dependencies on any specific LLM or tool.
Any AI assistant that can read files and run shell commands can follow it.

| Tool | How to use |
|------|-----------|
| Claude Code | Reference via AGENTS.md or pass file path in chat |
| ChatGPT / GPT-4 | Paste file contents as first message |
| Any other LLM | Copy-paste and say "follow these instructions" |
