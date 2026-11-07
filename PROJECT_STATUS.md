---
name: Claude Project Manager
phase: Testing
priority: high
updated: 2026-11-07
blocked: false
links: [https://github.com/phillbagnall/Claude-Project-Manager]
---
## Summary
Dashboard that shows every Claude project's summary, phase and next steps from `PROJECT_STATUS.md` files, with checkboxes that sync back to GitHub. It's live on GitHub Pages and tracking piano-trainer, VideoTagger and Financial-Dasboard. What's left is desktop setup (global CLAUDE.md, Cowork).

## Next steps
- [x] Merge `claude/project-manager-dashboard-k76ee7` into `main`
- [x] Make this repo public, then Settings → Pages → Source: GitHub Actions
- [x] Create private repo `project-tracker-data` with `projects.json` (include this repo)
- [x] Create fine-grained token (Contents: read/write on selected repos) and connect the dashboard
- [ ] Add piano-trainer, VideoTagger and Financial-Dasboard to the token's repository access
- [ ] Add `templates/CLAUDE.md.snippet` to `~/.claude/CLAUDE.md` on desktop
- [x] Add status files and the CLAUDE.md snippet to piano-trainer, VideoTagger and Financial-Dasboard
- [ ] Set up Cowork with a local clone of `project-tracker-data`
- [ ] Optional: point custom domain at GitHub Pages
- [x] Build dashboard (overview, open actions, project detail, tick write-back)
- [x] Pages deploy workflow, templates, README

## Key info
- Dashboard URL (after Pages is on): https://phillbagnall.github.io/Claude-Project-Manager/
- Data repo: `phillbagnall/project-tracker-data` (private), registry file `projects.json`
- The token is stored only in each browser's localStorage, so each device must be connected separately

## Decisions
- 2026-11-07: Public code + private data repos, so GitHub Pages hosting stays free
- 2026-11-07: Status file lives in each project's own repo; updates are automatic via CLAUDE.md instruction
- 2026-11-07: Vite + React + TS static site, no backend

## Log
- 2026-11-07: Live on Pages; connected piano-trainer, VideoTagger and Financial-Dasboard
- 2026-11-07: Planned on mobile, built and tested v1 in a cloud session
