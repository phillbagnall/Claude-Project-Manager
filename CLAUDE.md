# Claude Project Manager

A static React + TypeScript (Vite) dashboard that reads `PROJECT_STATUS.md` files from GitHub repos via the Contents API, using a token stored in localStorage. It's deployed to GitHub Pages by `.github/workflows/deploy.yml` on pushes to `main`. See README.md for the architecture.

- Run `npm test` and `npm run build` before committing.
- Never commit project data or tokens to this repo. It's public, and the data lives in private repos.
- Don't render raw HTML from status files. Use `src/markdown.tsx` (`Inline` / `Blocks`) instead.
- If you change the status-file format, update `src/status.ts`, its tests, `templates/`, the format section in README.md and `templates/CLAUDE.md.snippet` together.
