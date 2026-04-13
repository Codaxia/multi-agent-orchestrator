# Bootstrap Prompt

One line of instruction + your brief. That's it.

```
Read AGENTS.md and follow the protocol.
```

Then describe your project. The Orchestrator detects the scenario automatically and activates the right agents.

For the short version:

```
Use dashboard-agents.
```

---

## Prompt template

```
Read AGENTS.md and follow the protocol.

---

Project: [project name]
Stack: [tech stack]
Repo: [path or URL to the codebase]

Description:
[What needs to be done. Be specific.]
```

---

## Notes

- The dashboard must be running (`npm start` in the `dashboard-agents` repo) before you start
- This prompt works with any AI assistant that can read files and run shell commands
- You do not need to specify the scenario - the Orchestrator detects it from your description
- `Use dashboard-agents.` is the short trigger for the mandatory visible multi-agent flow
