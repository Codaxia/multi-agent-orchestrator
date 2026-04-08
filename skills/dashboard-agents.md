# Dashboard Agents — Project Skills

> Extends `agents/default/`. Load this file before activating any agent on a Dashboard Agents task.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js / Express |
| Data | JSON files (runtime + seeds) |
| Styling | Vanilla CSS (no framework) |
| Tests | None currently |

---

## Dev Server

**Express API:** start via Bash (not `preview_start` — process must persist across MCP sessions):
```bash
node server.js > /tmp/dashboard-api.log 2>&1 &
```

**Vite dev frontend:**
```
preview_start("Dashboard — Vite Dev")
```

**Local URL (always use this):** `http://localhost:5173`

> ⚠️ Never send the user to `localhost:3001` — that serves a static dist/ build that may be stale.
> Port 5173 (Vite dev) is always current via HMR.

**Before starting servers, rebuild dist/ to keep port 3001 in sync:**
```bash
npm run build
```

---

## Access credentials

> No authentication in this project — the dashboard is local-only with no login.

---

## Key Commands

| Purpose | Command |
|---------|---------|
| Start API | `node server.js > /tmp/dashboard-api.log 2>&1 &` |
| Start frontend | `preview_start("Dashboard — Vite Dev")` |
| Build dist/ | `npm run build` |
| Reset demo data | `npm run reset-demo-data` |

---

## Developer — additional rules

### Code style
- **ESLint** rules respected — no lint errors in delivered code
- No `console.log` left in delivered code
- Prefer named exports over default exports for utilities
- CSS: follow existing class naming conventions (BEM-like, component-scoped)

### React conventions
- Functional components only — no class components
- State lifted to the lowest common ancestor
- `usePolling` hook for live data (already exists — use it, don't reinvent)
- No direct DOM manipulation — use React state

### Express / API conventions
- All routes follow the existing pattern: `requireProject` → validate → respond
- Use `withProjectLock` for any write operation to a project file
- `denyDemoWrites` must be called on all write routes
- Seed files (`data/seeds/`) are source of truth for demo data — never modify runtime files directly for demo content

### Tests
- This project has no existing tests — **do not create any**

---

## CTO Reviewer — additional checklist

- [ ] `denyDemoWrites` present on all POST/PATCH routes?
- [ ] `withProjectLock` used for file writes?
- [ ] No `console.log` left?
- [ ] New CSS classes follow existing naming conventions?
- [ ] React state managed correctly (no prop drilling more than 2 levels)?

---

## Gotchas / Known Issues

- `preview_start` ties its processes to the MCP session — Express dies when the session resets. Always start Express via Bash.
- Vite proxy to port 3001 returns 503 JSON (not a hard crash) if Express is down — this is intentional.
- `dist/` is served by Express on port 3001 as a static production build — it becomes stale without `npm run build`. Always rebuild before demoing via port 3001.
