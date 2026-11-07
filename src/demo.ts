import type { RegistryEntry } from './data';

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);

export const DEMO_REGISTRY: RegistryEntry[] = [
  { id: 'recipe-app', repo: 'demo/recipe-app' },
  { id: 'portfolio-site', repo: 'demo/portfolio' },
  { id: 'garden-planner', repo: 'demo/project-tracker-data', path: 'projects/garden-planner.md' },
  { id: 'podcast-edit', repo: 'demo/project-tracker-data', path: 'projects/podcast-edit.md' },
];

export const DEMO_FILES: Record<string, string> = {
  'recipe-app': `---
name: Recipe App
phase: Building
priority: high
updated: ${iso(1)}
blocked: false
links: [https://github.com/demo/recipe-app]
---
## Summary
Mobile-friendly recipe box with shopping-list export. Database schema and recipe CRUD are done; auth is the current focus.

## Next steps
- [ ] Wire up email magic-link login
- [ ] Protect recipe routes behind auth
- [ ] Shopping list: merge duplicate ingredients
- [x] Set up Supabase schema
- [x] Recipe create/edit form

## Key info
- Supabase project: \`recipes-prod\` (keys in \`.env.local\`)
- Deploys from \`main\` to Vercel

## Decisions
- ${iso(6)}: Chose Supabase over Firebase (SQL, cheaper)

## Log
- ${iso(1)}: Recipe form finished, started auth
- ${iso(6)}: Schema + seed data
`,
  'portfolio-site': `---
name: Portfolio Site
phase: Testing
priority: medium
updated: ${iso(4)}
links: [https://github.com/demo/portfolio]
---
## Summary
Personal portfolio with case studies. Content is in; checking performance and accessibility before launch.

## Next steps
- [ ] Compress hero images (target < 200 KB)
- [ ] Fix contrast on footer links
- [x] Write three case studies
- [x] Contact form

## Key info
- Domain DNS managed at the registrar; CNAME ready

## Log
- ${iso(4)}: Lighthouse pass, 2 issues found
`,
  'garden-planner': `---
name: Garden Planner (Cowork)
phase: Planning
priority: low
updated: ${iso(21)}
---
## Summary
Spreadsheet + notes for the spring planting plan. Waiting on seed catalogue.

## Next steps
- [ ] Pick tomato varieties
- [ ] Draw bed layout

## Log
- ${iso(21)}: Initial plan drafted
`,
  'podcast-edit': `---
name: Podcast Episode 12
phase: Building
priority: high
updated: ${iso(2)}
blocked: true
---
## Summary
Editing the interview episode. **Blocked:** waiting for guest to approve the cut.

## Next steps
- [ ] Get guest sign-off on rough cut
- [ ] Final mix and loudness pass
- [x] Rough cut
- [x] Remove filler words

## Log
- ${iso(2)}: Rough cut sent to guest
`,
};
