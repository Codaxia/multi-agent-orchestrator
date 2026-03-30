# Data Layout

This folder separates public demo data from local runtime state.

## Public and versioned

- `data/seeds/` contains safe example payloads
- these files document the JSON shape expected by the dashboard
- they are meant for demos, onboarding, and fresh clones

## Local and ignored

- `data/runtime/` contains the live state written by the app
- `data/runtime-backups/` can store local snapshots before a reset
- every real project tracked in the dashboard should live there
- this folder is intentionally ignored by Git

## Bootstrap behavior

When the API starts, it creates missing runtime files from the matching seed files:

- `workspace.json`
- `pipeline-status*.json`
- `tasks*.json`
- `activity-log*.json`

That gives the repo a working public demo while keeping actual project data and chat-driven delivery history private.
