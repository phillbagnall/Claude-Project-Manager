import { isColor, type ColorName } from './colors';

export interface RegistryEntry {
  /** Unique slug. */
  id: string;
  /** owner/name */
  repo: string;
  /** Path to the status file inside the repo. Default PROJECT_STATUS.md */
  path?: string;
  /** Branch to read/write. Default: the repo's default branch. */
  branch?: string;
  /** Optional display name (overridden by the file's frontmatter name). */
  name?: string;
  /** Tile colour, set from the project page. */
  color?: ColorName;
}

export const projectPath = (e: { path?: string }) => e.path ?? 'PROJECT_STATUS.md';

function rawList(text: string): { json: unknown; list: unknown[] } {
  const json = JSON.parse(text);
  const list: unknown = Array.isArray(json) ? json : (json as { projects?: unknown })?.projects;
  if (!Array.isArray(list)) throw new Error('projects.json must be an array or { "projects": [...] }');
  return { json, list };
}

/** Ids for each raw entry (null for invalid ones), assigned the same way everywhere. */
function idsFor(list: unknown[]): (string | null)[] {
  const seen = new Set<string>();
  return list.map((e) => {
    const r = e as Partial<RegistryEntry> | null;
    if (!r || typeof r.repo !== 'string') return null;
    let id = r.id || `${r.repo}/${projectPath(r)}`;
    while (seen.has(id)) id += '_';
    seen.add(id);
    return id;
  });
}

export function parseRegistry(text: string): RegistryEntry[] {
  const { list } = rawList(text);
  const ids = idsFor(list);
  const out: RegistryEntry[] = [];
  list.forEach((e, i) => {
    const id = ids[i];
    if (!id) return;
    const r = e as RegistryEntry;
    out.push({ ...r, id, color: isColor(r.color) ? r.color : undefined });
  });
  return out;
}

/** Return projects.json text with a new entry appended. Throws if its id is already used. */
export function withEntry(text: string, entry: Omit<RegistryEntry, 'color'>): string {
  const { json, list } = rawList(text);
  if (idsFor(list).includes(entry.id)) throw new Error(`"${entry.id}" is already in projects.json.`);
  const newList = [...list, entry];
  const out = Array.isArray(json) ? newList : { ...(json as object), projects: newList };
  return JSON.stringify(out, null, 2) + '\n';
}

/**
 * Return projects.json text with one entry's colour set (or removed when null),
 * keeping every other entry and the file's shape. Throws if the entry is missing.
 */
export function withColor(text: string, id: string, color: ColorName | null): string {
  const { json, list } = rawList(text);
  const idx = idsFor(list).indexOf(id);
  if (idx === -1) throw new Error(`"${id}" isn't in projects.json any more.`);
  const entry = { ...(list[idx] as Record<string, unknown>) };
  if (color) entry.color = color;
  else delete entry.color;
  const newList = list.map((e, i) => (i === idx ? entry : e));
  const out = Array.isArray(json) ? newList : { ...(json as object), projects: newList };
  return JSON.stringify(out, null, 2) + '\n';
}
