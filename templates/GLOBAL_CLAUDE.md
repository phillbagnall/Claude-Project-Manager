# Global instruction for Claude Code on your PC

Paste the text below into your global Claude Code instructions file, so every Claude Code chat
on that computer knows about the dashboard:

- Windows: `C:\Users\<you>\.claude\CLAUDE.md`
- Mac / Linux: `~/.claude/CLAUDE.md`

Create the file if it doesn't exist; if it does, add this at the end. Only Claude Code on that
computer reads it — cloud and mobile sessions don't, which is fine because they work in repos
that are already set up.

```text
## Project dashboard

I track my projects on a dashboard (https://github.com/phillbagnall/Claude-Project-Manager) that reads PROJECT_STATUS.md from the root of each project's GitHub repo.

- If this project has a PROJECT_STATUS.md: keep it up to date as its CLAUDE.md describes. If its CLAUDE.md has no "Project status file (dashboard)" section, follow https://raw.githubusercontent.com/phillbagnall/Claude-Project-Manager/main/templates/CLAUDE.md.snippet instead.
- If it doesn't, and this folder is a real project (not my home folder, Downloads, Desktop or a temporary folder), ask me once near the start of the session: "This project isn't on your dashboard yet. Want me to add it?"
  - Yes: follow the steps in https://raw.githubusercontent.com/phillbagnall/Claude-Project-Manager/main/templates/ADD_PROJECT_PROMPT.md (the text block in that file).
  - Not now: don't ask again this session.
  - Never: create an empty file named .no-dashboard in the project root and commit it. Never ask in a folder that has that file.
- When I ask you to "add a note", append it to the ## Notes section of PROJECT_STATUS.md as "- YYYY-MM-DD: text" (extra lines as indented sub-points), then commit and push.
```
