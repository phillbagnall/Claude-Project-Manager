---
name: Claude Project Manager
phase: Testing
priority: high
updated: 2026-11-07
blocked: false
links: [https://github.com/phillbagnall/Claude-Project-Manager]
---
## Summary
Dashboard that shows every Claude project's summary, phase and next steps from `PROJECT_STATUS.md` files, with checkboxes that sync back to GitHub. It's live on GitHub Pages and tracking piano-trainer, VideoTagger and Financial-Dashboard. What's left is desktop setup (global CLAUDE.md, Cowork).

## Next steps
- [x] Merge `claude/project-manager-dashboard-k76ee7` into `main`
- [x] Make this repo public, then Settings → Pages → Source: GitHub Actions
- [x] Create private repo `project-tracker-data` with `projects.json` (include this repo)
- [x] Create fine-grained token (Contents: read/write on selected repos) and connect the dashboard
- [x] Add piano-trainer, VideoTagger and Financial-Dashboard to the token's repository access
- [ ] Add `templates/CLAUDE.md.snippet` to `~/.claude/CLAUDE.md` on desktop
- [x] Add status files and the CLAUDE.md snippet to piano-trainer, VideoTagger and Financial-Dashboard
- [ ] Set up Cowork with a local clone of `project-tracker-data`
- [ ] Optional: point custom domain at GitHub Pages
- [x] Build dashboard (overview, open actions, project detail, tick write-back)
- [x] Pages deploy workflow, templates, README

## Key info
- Dashboard URL (after Pages is on): https://phillbagnall.github.io/Claude-Project-Manager/
- Data repo: `phillbagnall/project-tracker-data` (private), registry file `projects.json`
- The token is stored only in each browser's localStorage, so each device must be connected separately

## Notes
- 2026-11-07: How to add another project to the dashboard
  - Easiest: in a Claude session on that repo, say "Set this repo up for my project tracker". Claude writes PROJECT_STATUS.md and the CLAUDE.md section, and adds the repo to projects.json (attach project-tracker-data to the session too)
  - By hand: copy `templates/PROJECT_STATUS.md` into the repo root and paste `templates/CLAUDE.md.snippet` into its CLAUDE.md
  - Add a line to `projects.json` in project-tracker-data: `{ "id": "my-project", "repo": "phillbagnall/my-project" }`
  - Give the token access: github.com/settings/personal-access-tokens → your token → Edit → Repository access → add the repo → Update
  - Tap ↻ on the dashboard
  - No repo (e.g. Cowork work)? Add `projects/<name>.md` to project-tracker-data, with `"path": "projects/<name>.md"` in its projects.json entry

## Decisions
- 2026-11-07: Public code + private data repos, so GitHub Pages hosting stays free
- 2026-11-07: Status file lives in each project's own repo; updates are automatic via CLAUDE.md instruction
- 2026-11-07: Vite + React + TS static site, no backend

## Log
- 2026-11-07: Added notes (Add note box on each project page)
- 2026-11-07: Live on Pages; connected piano-trainer, VideoTagger and Financial-Dashboard
- 2026-11-07: Planned on mobile, built and tested v1 in a cloud session
