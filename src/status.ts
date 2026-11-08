import YAML from 'yaml';

export const PHASES = ['Idea', 'Planning', 'Building', 'Testing', 'Shipped', 'Paused'] as const;
export type Phase = (typeof PHASES)[number];
export const PRIORITIES = ['high', 'medium', 'low'] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface StatusMeta {
  name?: string;
  phase?: Phase | string;
  priority?: Priority | string;
  updated?: string;
  blocked?: boolean | string;
  links?: string[];
  [key: string]: unknown;
}

export interface Step {
  text: string;
  done: boolean;
  /** 0-based line index in the full file text. */
  line: number;
  /** Section heading the checkbox sits under, e.g. "Next steps". */
  section: string;
}

export interface Section {
  title: string;
  /** Raw markdown body of the section (without the heading). */
  body: string;
}

export interface ParsedStatus {
  meta: StatusMeta;
  summary: string;
  steps: Step[];
  keyInfo: string[];
  /** Raw markdown of the user's `## Notes` section. */
  notes: string;
  decisions: string[];
  log: string[];
  /** Every section in file order, for the detail view. */
  sections: Section[];
  /** Non-fatal problems found while parsing. */
  warnings: string[];
}

const CHECKBOX = /^(\s*[-*+]\s+\[)([ xX])(\]\s+)(.*)$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const HEADING = /^##\s+(.+?)\s*#*\s*$/;

const FENCE = /^\s*(```|~~~)/;

/** For each line, whether it is part of a fenced code block (fence lines included). */
function fenceMask(lines: string[]): boolean[] {
  let inside = false;
  return lines.map((l) => {
    if (FENCE.test(l)) {
      inside = !inside;
      return true;
    }
    return inside;
  });
}

function splitFrontmatter(md: string): { yaml: string | null; bodyStart: number; lines: string[] } {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  if (lines[0]?.trim() === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---' || lines[i].trim() === '...') {
        return { yaml: lines.slice(1, i).join('\n'), bodyStart: i + 1, lines };
      }
    }
  }
  return { yaml: null, bodyStart: 0, lines };
}

function normalise(title: string): string {
  return title.trim().toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ');
}

function bullets(body: string): string[] {
  return body
    .split('\n')
    .map((l) => l.match(BULLET)?.[1]?.trim())
    .filter((x): x is string => !!x && !CHECKBOX.test(`- ${x}`));
}

export function parseStatus(md: string): ParsedStatus {
  const warnings: string[] = [];
  const { yaml, bodyStart, lines } = splitFrontmatter(md);

  let meta: StatusMeta = {};
  if (yaml === null) {
    warnings.push('No frontmatter block (--- … ---) found.');
  } else {
    try {
      const parsed = YAML.parse(yaml);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) meta = parsed as StatusMeta;
      else warnings.push('Frontmatter is not a key/value map.');
    } catch (e) {
      warnings.push(`Frontmatter YAML error: ${(e as Error).message.split('\n')[0]}`);
    }
  }
  // YAML turns bare dates into Date objects; keep them as ISO strings.
  for (const [k, v] of Object.entries(meta)) {
    if (v instanceof Date) meta[k] = v.toISOString().slice(0, 10);
  }
  if (meta.links && !Array.isArray(meta.links)) meta.links = [String(meta.links)];

  const sections: Section[] = [];
  const steps: Step[] = [];
  let current: { title: string; start: number } | null = null;
  const bodyLines: Record<string, string[]> = {};

  const fenced = fenceMask(lines);
  for (let i = bodyStart; i < lines.length; i++) {
    const line = lines[i];
    // Headings and checkboxes inside code blocks (e.g. a prompt in a note) are just text.
    const h = fenced[i] ? null : line.match(HEADING);
    if (h) {
      current = { title: h[1], start: i };
      sections.push({ title: h[1], body: '' });
      bodyLines[sections.length - 1] = [];
      continue;
    }
    if (!current) continue;
    bodyLines[sections.length - 1].push(line);
    const cb = fenced[i] ? null : line.match(CHECKBOX);
    if (cb) steps.push({ text: cb[4].trim(), done: cb[2] !== ' ', line: i, section: current.title });
  }
  sections.forEach((s, idx) => (s.body = bodyLines[idx].join('\n').trim()));

  const find = (...names: string[]) =>
    sections.find((s) => names.includes(normalise(s.title)))?.body ?? '';

  return {
    meta,
    summary: find('summary', 'overview'),
    steps,
    keyInfo: bullets(find('key info', 'key information')),
    notes: find('notes'),
    decisions: bullets(find('decisions')),
    log: bullets(find('log', 'changelog', 'history')),
    sections,
    warnings,
  };
}

/**
 * Set a checkbox to `done`. Locates the step by its text (preferring `hintLine`
 * when it still matches) so it works on a freshly re-fetched file after a conflict.
 * Returns null when the step can no longer be found.
 */
export function setStep(md: string, text: string, done: boolean, hintLine?: number): string | null {
  const eol = md.includes('\r\n') ? '\r\n' : '\n';
  const lines = md.split(/\r?\n/);
  const fenced = fenceMask(lines);
  const matches = (i: number) => !fenced[i] && lines[i]?.match(CHECKBOX)?.[4].trim() === text;

  let idx = -1;
  if (hintLine !== undefined && matches(hintLine)) idx = hintLine;
  else idx = lines.findIndex((_, i) => matches(i));
  if (idx === -1) return null;

  lines[idx] = lines[idx].replace(CHECKBOX, (_m, a, _b, c, d) => `${a}${done ? 'x' : ' '}${c}${d}`);
  return lines.join(eol);
}

export function daysSince(date: string | undefined, now = new Date()): number | null {
  if (!date) return null;
  const t = Date.parse(date);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / 86_400_000));
}

export function isBlocked(meta: StatusMeta): boolean {
  return meta.blocked === true || meta.blocked === 'true' || meta.blocked === 'yes';
}

const SECTIONS_AFTER_NOTES = ['decisions', 'log', 'changelog', 'history'];

/**
 * Append a dated note to the `## Notes` section, creating the section (before
 * Decisions/Log, or at the end) if needed. Extra lines become indented sub-bullets.
 */
export function addNote(md: string, note: string, date: string): string {
  const eol = md.includes('\r\n') ? '\r\n' : '\n';
  const lines = md.split(/\r?\n/);
  const [first, ...rest] = note.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!first) return md;
  const entry = [`- ${date}: ${first}`, ...rest.map((l) => `  - ${l.replace(/^[-*+]\s+/, '')}`)];

  const fenced = fenceMask(lines);
  const headingAt = (i: number) => (fenced[i] ? undefined : lines[i]?.match(HEADING)?.[1]);
  const notesIdx = lines.findIndex((_, i) => normalise(headingAt(i) ?? '') === 'notes');
  if (notesIdx === -1) {
    const insertAt = lines.findIndex((_, i) => SECTIONS_AFTER_NOTES.includes(normalise(headingAt(i) ?? '-')));
    if (insertAt === -1) {
      while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
      lines.push('', '## Notes', ...entry, '');
    } else {
      lines.splice(insertAt, 0, '## Notes', ...entry, '');
    }
    return lines.join(eol);
  }
  // Append at the end of the Notes section (before the next heading), skipping trailing blank lines.
  let end = notesIdx + 1;
  while (end < lines.length && !headingAt(end)) end++;
  let insert = end;
  while (insert > notesIdx + 1 && lines[insert - 1].trim() === '') insert--;
  lines.splice(insert, 0, ...entry);
  return lines.join(eol);
}

/** Local date as YYYY-MM-DD. */
export function today(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** YAML-safe scalar for a single-line name: plain when unambiguous, otherwise JSON-quoted. */
function yamlScalar(v: string): string {
  const plain = /^[A-Za-z0-9(][^:#\n]*$/.test(v) && !/\s$/.test(v) && !/^(true|false|null|yes|no|on|off|~|[-+]?\d[\d.,eE+-]*)$/i.test(v);
  return plain ? v : JSON.stringify(v);
}

/** Set the frontmatter `name:` (adding frontmatter if the file has none). Other lines are untouched. */
export function setName(md: string, name: string): string {
  const clean = name.replace(/\s+/g, ' ').trim();
  if (!clean) return md;
  const eol = md.includes('\r\n') ? '\r\n' : '\n';
  const lines = md.split(/\r?\n/);
  const line = `name: ${yamlScalar(clean)}`;
  const { yaml, bodyStart } = splitFrontmatter(md);
  if (yaml === null) return ['---', line, '---', ...lines].join(eol);
  const end = bodyStart - 1; // index of the closing ---
  const idx = lines.findIndex((l, i) => i > 0 && i < end && /^name\s*:/.test(l));
  if (idx !== -1) lines[idx] = line;
  else lines.splice(1, 0, line);
  return lines.join(eol);
}
