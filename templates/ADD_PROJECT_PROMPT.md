# Prompt: add a PC project to the dashboard

Paste the text below into a **Claude Code chat opened in the project's folder** on your PC.
It puts the project on GitHub as a private repo, writes its status file and registers it on
the dashboard. It works in any folder; nothing needs changing first.

---

```text
Please add this project to my project dashboard (https://github.com/phillbagnall/Claude-Project-Manager). Work through these steps in order, and stop to ask me where it says so.

1. Name: suggest a GitHub repo name from this folder's name (spaces to "-", no symbols; e.g. "AE - Walkthrough" -> "AE-Walkthrough"). Read the project and tell me in one line what you think it is. Ask me to confirm both.

2. Safety check before committing anything: list (a) files over 100 MB (GitHub rejects them; renders, footage and other media are common culprits), (b) anything that looks like a secret (.env files, keys, tokens, passwords), and (c) generated output (builds, caches, renders, node_modules and similar). Propose a .gitignore that leaves these out and ask me to OK it. Never commit secrets.

3. Git: if this folder isn't a git repo yet, run git init. Commit the project. If it already is a repo with a remote, tell me and use that instead of creating a new one.

4. GitHub: create a PRIVATE repo phillbagnall/<name> and push. If the gh CLI is installed and logged in, use: gh repo create <name> --private --source . --push. If not, ask me to create an empty private repo with that exact name at https://github.com/new (no README), then add it as the remote and push.

5. Status file: create PROJECT_STATUS.md in the repo root using this format (frontmatter + sections). Fill it in from what's actually in the project: a 2-4 sentence summary, concrete next steps as checkboxes, and key info (how to run it, where things live; never secrets). Set updated to today, phase to your best guess (Idea | Planning | Building | Testing | Shipped | Paused), priority medium unless I say otherwise, and links to the repo URL.

---
name: <Project name>
phase: Building
priority: medium
updated: YYYY-MM-DD
blocked: false
links: [https://github.com/phillbagnall/<name>]
---
## Summary
## Next steps
- [ ] ...
## Key info
## Notes
## Decisions
## Log
- YYYY-MM-DD: Added to the project dashboard

6. CLAUDE.md: download https://raw.githubusercontent.com/phillbagnall/Claude-Project-Manager/main/templates/CLAUDE.md.snippet and append it to CLAUDE.md in the repo root (create the file if it doesn't exist; keep anything already there). Commit both files and push.

7. Register it: add {"id": "<name in lowercase>", "repo": "phillbagnall/<name>"} to the "projects" list in projects.json in my private repo phillbagnall/project-tracker-data. Keep the existing entries and keep the JSON valid. Use a temporary shallow clone (edit, commit, push, then delete the clone) or the gh API. If you can't get access, show me the exact line to add on GitHub myself.

8. Finish by giving me the repo URL and telling me to tap refresh on the dashboard. (My dashboard token has access to all my repos, so nothing else is needed.)
```
