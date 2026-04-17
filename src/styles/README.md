# CSS organization plan

This folder starts the migration away from the single `src/index.css` file.

## Goal

Move from one monolithic stylesheet to a layered structure:

- `globals.css` → reset and app-wide base rules
- `layout.css` → app shell and workspace layout
- `header.css` → top header and mission tabs
- `sidebar.css` → sidebar, squads, project navigation, settings
- later: component files for Kanban, Agent Board, Activity Log, Recap, panels, modals

## Phase 1

Phase 1 is intentionally safe:

- keep `src/index.css` as the source of truth for the whole UI
- add scoped extracted files in `src/styles/`
- import the extracted files after the legacy file so the cascade remains stable
- avoid any visual redesign or selector renaming

## Why this approach

The current stylesheet contains:

- global rules
- layout rules
- component rules
- responsive rules
- late UI refresh overrides mixed into the same file

A big-bang rewrite would be riskier than a staged extraction.

## Next phase

1. extract Agent Board, Task Kanban, Activity Log, Recap
2. extract shared UI primitives: panels, modals, buttons, badges
3. remove duplicated rules from `src/index.css`
4. optionally convert `src/index.css` into a simple import manifest
