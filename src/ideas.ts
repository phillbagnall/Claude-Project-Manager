import { addNote } from './status';

/**
 * Ideas for future projects, kept as markdown in the data repo (`ideas.md`, next to
 * projects.json) so they stay private and any Claude session can read them:
 *
 *   # Ideas
 *
 *   ## Title of the idea
 *   Added: 2026-11-10
 *
 *   Free-form notes (markdown).
 */
export interface Idea {
  /** Position in the file (0-based). */
  index: number;
  title: string;
  added?: string;
  body: string;
}

const FILE_HEADER = ['# Ideas', '', 'Ideas for future projects, from the dashboard\'s Ideas tab. Each `## heading` is one idea.', ''];
const FENCE = /^\s*(```|~~~)/;
const IDEA_HEADING = /^##\s+(.+?)\s*#*\s*$/;
const ADDED = /^added\s*:\s*(\d{4}-\d{2}-\d{2})\s*$/i;

function lines(md: string) {
  return md.replace(/\r\n?/g, '\n').split('\n');
}

/** [start, end) line ranges of each idea (heading line included). */
function ranges(ls: string[]): [number, number][] {
  const starts: number[] = [];
  let fenced = false;
  ls.forEach((l, i) => {
    if (FENCE.test(l)) fenced = !fenced;
    else if (!fenced && IDEA_HEADING.test(l)) starts.push(i);
  });
  return starts.map((s, k) => {
    let e = k + 1 < starts.length ? starts[k + 1] : ls.length;
    while (e > s + 1 && !ls[e - 1].trim()) e--;
    return [s, e];
  });
}

export function parseIdeas(md: string): Idea[] {
  const ls = lines(md);
  return ranges(ls).map(([s, e], index) => {
    const body = ls.slice(s + 1, e);
    const first = body.findIndex((l) => l.trim());
    let added: string | undefined;
    if (first !== -1) {
      const m = body[first].trim().match(ADDED);
      if (m) {
        added = m[1];
        body.splice(first, 1);
      }
    }
    return { index, title: ls[s].match(IDEA_HEADING)![1], added, body: body.join('\n').trim() };
  });
}

/** One line, no markdown heading marks. */
export function cleanTitle(title: string): string {
  return title.replace(/\s+/g, ' ').replace(/^#+\s*/, '').trim();
}

/** Keep notes from breaking the file: `#`/`##` headings outside code blocks become `###`. */
function cleanBody(body: string): string[] {
  let fenced = false;
  const out = lines(body.trim()).map((l) => {
    if (FENCE.test(l)) fenced = !fenced;
    else if (!fenced && /^#{1,2}\s/.test(l)) return l.replace(/^#{1,2}/, '###');
    return l;
  });
  return out.length === 1 && !out[0] ? [] : out;
}

function block(title: string, body: string, added?: string): string[] {
  const notes = cleanBody(body);
  return [`## ${cleanTitle(title)}`, ...(added ? [`Added: ${added}`] : []), ...(notes.length ? ['', ...notes] : [])];
}

/** Append an idea (creating the file's header when empty). */
export function addIdea(md: string, title: string, body: string, date: string): string {
  if (!cleanTitle(title)) return md;
  const ls = md.trim() ? lines(md) : [...FILE_HEADER];
  while (ls.length && !ls[ls.length - 1].trim()) ls.pop();
  ls.push('', ...block(title, body, date), '');
  return ls.join('\n');
}

/** Find idea #index, or (if the file changed) the one idea with that title. */
function locate(ls: string[], index: number, expectTitle: string): [number, number] | null {
  const rs = ranges(ls);
  const titleAt = (r: [number, number]) => ls[r[0]].match(IDEA_HEADING)![1];
  if (rs[index] && titleAt(rs[index]) === expectTitle) return rs[index];
  const hits = rs.filter((r) => titleAt(r) === expectTitle);
  return hits.length === 1 ? hits[0] : null;
}

/** Replace an idea's title and notes, keeping its Added date. Null if it can't be found. */
export function replaceIdea(md: string, index: number, expectTitle: string, title: string, body: string): string | null {
  if (!cleanTitle(title)) return null;
  const ls = lines(md);
  const r = locate(ls, index, expectTitle);
  if (!r) return null;
  const old = parseIdeas(ls.slice(r[0], r[1]).join('\n'))[0];
  ls.splice(r[0], r[1] - r[0], ...block(title, body, old?.added));
  return ls.join('\n');
}

/** Remove an idea. Null if it can't be found. */
export function removeIdea(md: string, index: number, expectTitle: string): string | null {
  const ls = lines(md);
  const r = locate(ls, index, expectTitle);
  if (!r) return null;
  let end = r[1];
  while (end < ls.length && !ls[end].trim()) end++;
  ls.splice(r[0], end - r[0]);
  return ls.join('\n');
}

/** "My Big Idea!" → "my-big-idea" (used for the project id and file name). */
export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50)
      .replace(/-+$/, '') || 'idea'
  );
}

/** The prompt that turns a promoted idea into a real repo-backed project. */
export function kickoffPrompt(o: { title: string; id: string; dataRepo: string; path: string }): string {
  const owner = o.dataRepo.split('/')[0];
  return `I want to start a new project: "${o.title}". It's on my project dashboard (https://github.com/phillbagnall/Claude-Project-Manager) as an idea I've promoted. Its status file is ${o.path} in my private repo ${o.dataRepo}, and my notes on the idea are in its Notes section. Work through these steps in order, and stop to ask me where it says so.

1. Read that status file. Ask me anything you need to know, then suggest a short plan and a GitHub repo name (spaces to "-", no symbols). Wait for my OK.

2. Set up this folder as the project: git init and a sensible .gitignore (never commit secrets). Create a PRIVATE repo ${owner}/<name> and push. If the gh CLI is installed and logged in, use: gh repo create <name> --private --source . --push. If not, ask me to create an empty private repo with that exact name at https://github.com/new (no README), then add it as the remote and push.

3. Move the status file into the new repo as PROJECT_STATUS.md. Keep its notes and log, fill in the summary and next steps from our plan, set links to the repo URL and set updated to today.

4. Download https://raw.githubusercontent.com/phillbagnall/Claude-Project-Manager/main/templates/CLAUDE.md.snippet and append it to CLAUDE.md in the repo root (create the file if needed). Commit both files and push.

5. In ${o.dataRepo}: change the entry with "id": "${o.id}" in projects.json to point at the new repo ("repo": "${owner}/<name>", and remove its "path"; keep its id and any colour), then delete ${o.path}. Keep the JSON valid. Use a temporary shallow clone (edit, commit, push, then delete the clone) or the gh API. If you can't get access, show me the exact change to make on GitHub myself.

6. Finish by giving me the repo URL and telling me to tap refresh on the dashboard.`;
}

/** Status file for a freshly promoted idea. */
export function promotedStatus(o: { idea: Idea; id: string; dataRepo: string; path: string; date: string }): string {
  const { idea, date } = o;
  const title = cleanTitle(idea.title);
  const name = /^[A-Za-z0-9(][^:#\n]*$/.test(title) ? title : JSON.stringify(title);
  let md = [
    '---',
    `name: ${name}`,
    'phase: Planning',
    'priority: medium',
    `updated: ${date}`,
    'blocked: false',
    'links: []',
    '---',
    '## Summary',
    `Promoted from the Ideas tab on ${date}. The original idea is in Notes; the first Claude session will fill this in.`,
    '',
    '## Next steps',
    '- [ ] Start it in Claude: copy the kick-off prompt from Notes into a new Claude Code session',
    '',
    '## Key info',
    `- Idea added: ${idea.added ?? 'unknown'}`,
    '',
    '## Notes',
    '',
    '## Visuals',
    '',
    '## Decisions',
    '',
    '## Log',
    `- ${date}: Promoted from the Ideas tab`,
    '',
  ].join('\n');
  md = addNote(md, `The idea${idea.body ? `\n${idea.body}` : ''}`, idea.added ?? date);
  md = addNote(
    md,
    [
      'How to start this project in Claude',
      'Make a folder for it on your PC, open a Claude Code session there, tap Copy and paste this in:',
      '```text',
      kickoffPrompt({ title, id: o.id, dataRepo: o.dataRepo, path: o.path }),
      '```',
    ].join('\n'),
    date,
    'claude',
  );
  return md;
}
