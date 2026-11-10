# Claude Project Manager

A dashboard for all your Claude projects. Each project has a short status file, `PROJECT_STATUS.md`, with a summary, next steps as checkboxes, key info, decisions and a log. Claude sessions keep that file up to date, and the dashboard shows every project in one place on phone or desktop. When you tick a box on the dashboard, it's committed back to the repo, so the next Claude session knows the step is done.

**Public code, private data.** This repo holds only the dashboard code and is served free on GitHub Pages. Your project information stays in private repos and is read in your browser through the GitHub API, using a token that's saved only in that browser. A visitor without the token sees an empty sign-in screen.

```
 project repo A ── PROJECT_STATUS.md ─┐
 project repo B ── PROJECT_STATUS.md ─┤   (private)      GitHub API     ┌──────────────┐
 project-tracker-data (private)       ├────────────────────────────────▶│  dashboard   │
   ├─ projects.json  (list of above)  │   read + tick-back via token    │ (GitHub Pages)│
   └─ projects/<slug>.md  (Cowork)   ─┘                                 └──────────────┘
```

## Setup (one-time)

All of these steps work in the GitHub website on mobile.

1. **Turn on Pages for this repo.** Go to *Settings → Pages → Build and deployment → Source: GitHub Actions*. The repo must be **public** to use Pages for free. Pushes to `main` then deploy to `https://phillbagnall.github.io/Claude-Project-Manager/`. To see the dashboard before connecting anything, open it and tap **Try with demo data**.
2. **Create the private data repo.** Make a new repository called `project-tracker-data` and set it to **Private**. Add a `projects.json` file (example in [`templates/projects.json`](templates/projects.json)):
   ```json
   { "projects": [
       { "id": "recipe-app", "repo": "phillbagnall/recipe-app" },
       { "id": "garden", "repo": "phillbagnall/project-tracker-data", "path": "projects/garden.md" }
   ] }
   ```
   Each entry needs `repo`. The optional fields are `path` (default `PROJECT_STATUS.md`), `branch` (default: the repo's default branch), `id` and `name`, and `color` (one of red, orange, amber, green, teal, blue, purple, pink). You normally set `color` from a project's page on the dashboard rather than by hand. Projects with no repo of their own, such as Cowork work, live as `projects/<slug>.md` in this data repo.
3. **Create a token.** Use a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new):
   - Repository access: **All repositories** (simplest; new projects then appear with no token change) or **Only select repositories** (the data repo plus each project repo; tighter, but you must add each new repo to the token).
   - Permissions: **Contents → Read and write**. Nothing else is needed.
   - Expiry: up to a year. When it expires, the dashboard asks for a new one.
   - If you chose selected repositories, edit the token to include each new project repo.
4. **Open the dashboard** and enter `phillbagnall/project-tracker-data` and the token. Do this on each device you use; the token is stored per browser.

5. **Optional: install it as an app on your phone.** Open the dashboard in Chrome, then tap ⋮ → **Add to home screen** → **Install**. It opens full-screen like an app and keeps your token, because the app and Chrome share the site's storage.

## Getting Claude to keep it updated

Paste [`templates/CLAUDE.md.snippet`](templates/CLAUDE.md.snippet) into each project repo's `CLAUDE.md`, creating the file if needed. Then:

- **Cloud sessions** (claude.ai/code, the mobile app) clone the repo, so its `CLAUDE.md` loads automatically. This is the part that works everywhere.
- **Claude Code on desktop:** paste [`templates/GLOBAL_CLAUDE.md`](templates/GLOBAL_CLAUDE.md) into `~/.claude/CLAUDE.md` (Windows: `C:\Users\<you>\.claude\CLAUDE.md`). Every local chat then keeps tracked projects updated and offers to add untracked ones. Cloud sessions don't see this global file.
- **Cowork / non-repo work:** keep a local clone of `project-tracker-data` and ask Cowork to update `projects/<slug>.md` there and push.
- **Ordinary claude.ai chats** don't read CLAUDE.md. Ask them to "write a PROJECT_STATUS.md update" and paste it in yourself.

**Projects that are only on your PC (no GitHub repo yet):** open a Claude Code chat in the project's folder and paste the prompt from [`templates/ADD_PROJECT_PROMPT.md`](templates/ADD_PROJECT_PROMPT.md). It creates a private repo, writes the status file and CLAUDE.md section, and registers the project in `projects.json`. Afterwards just tap ↻ (if your token is limited to selected repositories, add the new repo to it first).

To add a new project, say to a session: *"Set this repo up for my project tracker"*. It creates `PROJECT_STATUS.md` from [`templates/PROJECT_STATUS.md`](templates/PROJECT_STATUS.md). Then add the repo to `projects.json` (and to your token, if it's limited to selected repositories).

## Status file format

```markdown
---
name: Recipe App
phase: Building        # Idea | Planning | Building | Testing | Shipped | Paused
priority: high         # high | medium | low
updated: 2026-11-07
blocked: false
links: [https://github.com/phillbagnall/recipe-app]
---
## Summary
## Next steps
- [ ] Wire up login
- [x] Database schema
## Key info
## Notes
## Visuals
## Decisions
## Log
```

The tile's name is the `name:` line. Rename a project with the ✏️ next to its title on its page; this changes only that line. Checkboxes under any `##` heading are shown and can be ticked. Unknown sections still appear on the project page.

`## Notes` is yours. Add one with the **Add note** box on a project's page, which appends a dated bullet there (extra lines become sub-points) and commits it, or ask a Claude session to "add a note". Claude sessions read the notes and append new ones when asked, marked `(Claude)` (`- 2026-11-09 (Claude): …`). On the dashboard each note shows who wrote it, and you can edit or delete your own notes (✏️) but not Claude's.

`## Visuals` holds a few screenshots or videos per visible change (1-3 per session, from images Claude already took), each with a description and the build it's from. Sessions don't open images just to describe them or back-fill old ones unless asked, which keeps usage low. The files live in the project repo's `docs/visuals/`, and the dashboard shows them as a gallery (tap one for full size). Entries look like:

```markdown
- 2026-11-09: Login screen, first working version
  - Build: v0.4.1 (a1b2c3d), after the auth work
  - ![Login screen](docs/visuals/2026-11-09-login.png)
```

## Ideas

The **Ideas** tab holds ideas for future projects: a title and optional notes. They're saved in `ideas.md` in the data repo, next to `projects.json`, so they stay private and any Claude session with access can read them. Each `## heading` is one idea:

```markdown
## Bird feeder camera
Added: 2026-11-10

Raspberry Pi camera on the feeder.
- auto-tag species
```

When you're ready, open an idea and tap **Promote to project**. The dashboard creates `projects/<id>.md` in the data repo (phase Planning, your notes kept), adds it to `projects.json`, removes it from Ideas and opens the new project. Its Notes include a kick-off prompt with a Copy button. Paste that into a new Claude Code session in an empty folder, and Claude plans the project with you, creates its private repo, moves the status file into it and updates `projects.json`.

## Custom domain (optional)

To use your own domain, add it under *Settings → Pages → Custom domain*, then create a `CNAME` DNS record pointing at `phillbagnall.github.io`. The build uses relative paths, so nothing else needs to change.

## Development

```bash
npm install
npm run dev      # local dev server
npm test         # parser/toggle unit tests (Vitest)
npm run build    # typecheck + production build into dist/
```

Code map:
- `src/status.ts`: parses `PROJECT_STATUS.md` and toggles a checkbox line. Tests are in `src/status.test.ts`.
- `src/github.ts`: a minimal GitHub Contents API client that reads and writes files.
- `src/data.ts`: settings, registry loading, and tick write-back. Ticks are queued per file, and on a conflict the file is re-fetched and the tick re-applied.
- `src/markdown.tsx`: a small inline-markdown renderer that never injects raw HTML, since the page holds a token.
- `src/components/*`: the overview cards, project detail page, all-open-actions list, and setup/settings screen.
