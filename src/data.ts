import { useCallback, useEffect, useRef, useState } from 'react';
import { DEMO_FILES, DEMO_REGISTRY } from './demo';
import { GitHubError, getFile, putFile } from './github';
import { parseStatus, setStep, type ParsedStatus, type Step } from './status';

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
}

export interface Settings {
  token: string;
  dataRepo: string;
  registryPath: string;
  demo: boolean;
}

export interface Project {
  entry: RegistryEntry;
  loading: boolean;
  raw?: string;
  sha?: string;
  status?: ParsedStatus;
  error?: string;
  /** Ticks shown locally but not yet committed: step text -> done. */
  pending?: Record<string, boolean>;
  /** Most recent write-back error, shown until the next successful write. */
  saveError?: string;
  saving?: boolean;
}

const SETTINGS_KEY = 'cpm.settings.v1';
const DEFAULT_SETTINGS: Settings = { token: '', dataRepo: '', registryPath: 'projects.json', demo: false };

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

export const projectPath = (e: RegistryEntry) => e.path ?? 'PROJECT_STATUS.md';

function parseRegistry(text: string): RegistryEntry[] {
  const json = JSON.parse(text);
  const list: unknown = Array.isArray(json) ? json : json?.projects;
  if (!Array.isArray(list)) throw new Error('projects.json must be an array or { "projects": [...] }');
  const seen = new Set<string>();
  return list
    .filter((e): e is RegistryEntry => !!e && typeof e.repo === 'string')
    .map((e) => {
      let id = e.id || `${e.repo}/${projectPath(e)}`;
      while (seen.has(id)) id += '_';
      seen.add(id);
      return { ...e, id };
    });
}

/** Parse server text with any pending (uncommitted) ticks applied on top. */
function derive(raw: string, pending: Record<string, boolean> | undefined): ParsedStatus {
  let text = raw;
  for (const [t, d] of Object.entries(pending ?? {})) text = setStep(text, t, d) ?? text;
  return parseStatus(text);
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function useProjects(settings: Settings) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [registryError, setRegistryError] = useState<string>();
  const [authError, setAuthError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const queues = useRef(new Map<string, Promise<unknown>>());
  const latest = useRef<Project[]>([]);
  latest.current = projects;

  const patch = useCallback((id: string, p: Partial<Project>) => {
    setProjects((ps) => ps.map((x) => (x.entry.id === id ? { ...x, ...p } : x)));
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setRegistryError(undefined);
    setAuthError(false);
    try {
      if (settings.demo) {
        setProjects(
          DEMO_REGISTRY.map((entry) => {
            const raw = DEMO_FILES[entry.id];
            return { entry, loading: false, raw, sha: 'demo', status: parseStatus(raw) };
          }),
        );
        return;
      }
      if (!settings.token || !settings.dataRepo) return;
      let registry: RegistryEntry[];
      try {
        const reg = await getFile(settings.token, settings.dataRepo, settings.registryPath);
        registry = parseRegistry(reg.text);
      } catch (e) {
        if (e instanceof GitHubError && e.isAuth) setAuthError(true);
        setRegistryError(`Couldn't load ${settings.dataRepo}/${settings.registryPath}: ${errMsg(e)}`);
        setProjects([]);
        return;
      }
      setProjects((prev) =>
        registry.map((entry) => {
          const old = prev.find((p) => p.entry.id === entry.id);
          return { ...(old ?? {}), entry, loading: true };
        }),
      );
      await Promise.all(
        registry.map(async (entry) => {
          try {
            const f = await getFile(settings.token, entry.repo, projectPath(entry), entry.branch);
            patch(entry.id, { loading: false, raw: f.text, sha: f.sha, pending: {}, status: parseStatus(f.text), error: undefined });
          } catch (e) {
            if (e instanceof GitHubError && e.isAuth) setAuthError(true);
            patch(entry.id, { loading: false, error: errMsg(e) });
          }
        }),
      );
    } finally {
      setRefreshing(false);
    }
  }, [settings, patch]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Tick/untick a step. The tick shows immediately (as a pending override on top of
   * the last-known server text), then is committed. Writes are serialised per file;
   * on a sha conflict the file is re-fetched and the tick re-applied once.
   */
  const toggleStep = useCallback(
    (id: string, step: Step, done: boolean) => {
      const cur = latest.current.find((p) => p.entry.id === id);
      if (!cur?.raw) return;
      if (settings.demo) {
        const next = setStep(cur.raw, step.text, done, step.line);
        if (next !== null) patch(id, { raw: next, status: parseStatus(next) });
        return;
      }
      const pending = { ...(cur.pending ?? {}), [step.text]: done };
      patch(id, { pending, status: derive(cur.raw, pending), saveError: undefined });

      const settle = (text: string, value: boolean, p: Partial<Project>) => {
        setProjects((ps) =>
          ps.map((x) => {
            if (x.entry.id !== id) return x;
            const merged = { ...x, ...p };
            const pend = { ...(merged.pending ?? {}) };
            if (pend[text] === value) delete pend[text];
            return { ...merged, pending: pend, saving: false, status: derive(merged.raw!, pend) };
          }),
        );
      };

      const run = async () => {
        const p = latest.current.find((x) => x.entry.id === id);
        if (!p?.raw || !p.sha) return;
        const { entry } = p;
        const file = projectPath(entry);
        const message = `dashboard: ${done ? 'complete' : 'reopen'} "${step.text.slice(0, 60)}"`;
        patch(id, { saving: true });
        try {
          let next = setStep(p.raw, step.text, done);
          let sha: string;
          if (next === p.raw) return settle(step.text, done, {});
          if (next === null) throw new Error(`"${step.text}" is no longer in the file.`);
          try {
            sha = await putFile(settings.token, entry.repo, file, next, p.sha, message, entry.branch);
          } catch (e) {
            if (!(e instanceof GitHubError && e.isConflict)) throw e;
            const fresh = await getFile(settings.token, entry.repo, file, entry.branch);
            next = setStep(fresh.text, step.text, done);
            if (next === null) {
              settle(step.text, done, { raw: fresh.text, sha: fresh.sha, saveError: `"${step.text}" was changed or removed elsewhere — reloaded latest.` });
              return;
            }
            sha = next === fresh.text ? fresh.sha : await putFile(settings.token, entry.repo, file, next, fresh.sha, message, entry.branch);
          }
          settle(step.text, done, { raw: next, sha });
        } catch (e) {
          if (e instanceof GitHubError && e.isAuth) setAuthError(true);
          settle(step.text, done, { saveError: `Couldn't save: ${errMsg(e)}` });
        }
      };
      const prev = queues.current.get(id) ?? Promise.resolve();
      queues.current.set(id, prev.then(run, run));
    },
    [settings, patch],
  );

  return { projects, registryError, authError, refreshing, refresh, toggleStep };
}
