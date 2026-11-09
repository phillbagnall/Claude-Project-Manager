import { useEffect, useMemo, useState } from 'react';
import { ActionList } from './components/ActionList';
import { ProjectCard, displayName } from './components/ProjectCard';
import { ProjectDetail } from './components/ProjectDetail';
import { Setup } from './components/Setup';
import { loadSettings, saveSettings, useProjects, type Project, type Settings } from './data';
import { PHASES, isBlocked } from './status';
import { getRawBlob } from './github';
import { projectPath } from './data';

type Route = { view: 'overview' } | { view: 'actions' } | { view: 'project'; id: string };
type Sort = 'priority' | 'updated' | 'name';

function parseHash(): Route {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  if (h === 'actions') return { view: 'actions' };
  if (h.startsWith('p/')) return { view: 'project', id: h.slice(2) };
  return { view: 'overview' };
}
const go = (hash: string) => (location.hash = hash);

const PRIO_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
const INACTIVE = new Set(['shipped', 'paused']);

interface ViewPrefs {
  sort: Sort;
  phase: string;
  hideInactive: boolean;
  /** Ids of project cards collapsed on the overview (per device). */
  collapsed: string[];
}
const PREFS_KEY = 'cpm.prefs.v1';
function loadPrefs(): ViewPrefs {
  const d: ViewPrefs = { sort: 'priority', phase: 'All', hideInactive: true, collapsed: [] };
  try {
    return { ...d, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') };
  } catch {
    return d;
  }
}

function sortProjects(list: Project[], sort: Sort): Project[] {
  const updated = (p: Project) => Date.parse(String(p.status?.meta.updated ?? '')) || 0;
  return [...list].sort((a, b) => {
    if (sort === 'name') return displayName(a).localeCompare(displayName(b));
    if (sort === 'updated') return updated(b) - updated(a);
    const blocked = Number(isBlocked(b.status?.meta ?? {})) - Number(isBlocked(a.status?.meta ?? {}));
    const pa = PRIO_RANK[String(a.status?.meta.priority ?? '').toLowerCase()] ?? 3;
    const pb = PRIO_RANK[String(b.status?.meta.priority ?? '').toLowerCase()] ?? 3;
    return pa - pb || blocked || updated(b) - updated(a);
  });
}

export function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [route, setRoute] = useState<Route>(parseHash);
  const [showSettings, setShowSettings] = useState(false);
  const [prefs, setPrefs] = useState<ViewPrefs>(loadPrefs);
  const { projects, registryError, authError, refreshing, refresh, toggleStep, addNote, setColor, rename, editNote, deleteNote } = useProjects(settings);

  useEffect(() => {
    const on = () => {
      setRoute(parseHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  const update = (s: Settings) => {
    saveSettings(s);
    setSettings(s);
    setShowSettings(false);
    go('/');
  };

  const visible = useMemo(() => {
    let list = projects;
    if (prefs.phase !== 'All') list = list.filter((p) => String(p.status?.meta.phase ?? '').toLowerCase() === prefs.phase.toLowerCase());
    else if (prefs.hideInactive) list = list.filter((p) => !INACTIVE.has(String(p.status?.meta.phase ?? '').toLowerCase()));
    return sortProjects(list, prefs.sort);
  }, [projects, prefs]);

  const connected = settings.demo || (settings.token && settings.dataRepo);
  if (!connected || (authError && !settings.demo)) {
    return (
      <div className="shell">
        <Brand />
        <main className="narrow">
          <Setup settings={settings} onSave={update} authError={authError} />
        </main>
      </div>
    );
  }

  const openCount = projects.reduce((n, p) => n + (p.status?.steps.filter((s) => !s.done).length ?? 0), 0);
  const current = route.view === 'project' ? projects.find((p) => p.entry.id === route.id) : undefined;

  return (
    <div className="shell">
      <header className="topbar">
        <Brand />
        <div className="topbar-actions">
          <button className="icon" onClick={refresh} aria-label="Refresh" title="Refresh" disabled={refreshing}>
            <svg viewBox="0 0 24 24" className={refreshing ? 'spin' : ''}><path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4" /></svg>
          </button>
          <button className="icon" onClick={() => setShowSettings((v) => !v)} aria-label="Settings" title="Settings">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
          </button>
        </div>
      </header>

      {settings.demo && (
        <div className="banner">
          Demo data — ticks aren't saved. <button className="link" onClick={() => setShowSettings(true)}>Connect GitHub</button>
        </div>
      )}

      <main>
        {showSettings && (
          <Setup settings={settings} onSave={update} onCancel={() => setShowSettings(false)} />
        )}
        {registryError && <p className="error panel">{registryError}</p>}

        {route.view !== 'project' && (
          <nav className="tabs" role="tablist">
            <button role="tab" aria-selected={route.view === 'overview'} onClick={() => go('/')}>
              Projects <span className="count">{projects.length}</span>
            </button>
            <button role="tab" aria-selected={route.view === 'actions'} onClick={() => go('/actions')}>
              Open actions <span className="count">{openCount}</span>
            </button>
            {route.view === 'overview' && (
              <button
                className="link small tabs-action"
                onClick={() => {
                  const ids = visible.map((p) => p.entry.id);
                  const allCollapsed = ids.every((id) => prefs.collapsed.includes(id));
                  setPrefs({ ...prefs, collapsed: allCollapsed ? prefs.collapsed.filter((id) => !ids.includes(id)) : [...new Set([...prefs.collapsed, ...ids])] });
                }}
              >
                {visible.length > 0 && visible.every((p) => prefs.collapsed.includes(p.entry.id)) ? 'Expand all' : 'Collapse all'}
              </button>
            )}
          </nav>
        )}

        {route.view === 'overview' && (
          <>
            <div className="filters">
              <div className="chips" role="group" aria-label="Filter by phase">
                {['All', ...PHASES].map((ph) => (
                  <button key={ph} className="chip" aria-pressed={prefs.phase === ph} onClick={() => setPrefs({ ...prefs, phase: ph })}>
                    {ph}
                  </button>
                ))}
              </div>
              <div className="filter-row">
                <label className="check">
                  <input type="checkbox" checked={prefs.hideInactive} disabled={prefs.phase !== 'All'} onChange={(e) => setPrefs({ ...prefs, hideInactive: e.target.checked })} />
                  Hide shipped &amp; paused
                </label>
                <label className="select">
                  Sort
                  <select value={prefs.sort} onChange={(e) => setPrefs({ ...prefs, sort: e.target.value as Sort })}>
                    <option value="priority">Priority</option>
                    <option value="updated">Last updated</option>
                    <option value="name">Name</option>
                  </select>
                </label>
              </div>
            </div>
            {visible.length === 0 && !refreshing && (
              <p className="empty">
                {projects.length === 0 ? <>No projects yet. Add entries to <code>projects.json</code> in your data repo.</> : 'No projects match this filter.'}
              </p>
            )}
            <div className="grid">
              {visible.map((p) => (
                <ProjectCard
                  key={p.entry.id}
                  project={p}
                  onOpen={() => go(`/p/${encodeURIComponent(p.entry.id)}`)}
                  onToggle={(s, d) => toggleStep(p.entry.id, s, d)}
                  collapsed={prefs.collapsed.includes(p.entry.id)}
                  onToggleCollapsed={() =>
                    setPrefs((pr) => ({
                      ...pr,
                      collapsed: pr.collapsed.includes(p.entry.id) ? pr.collapsed.filter((id) => id !== p.entry.id) : [...pr.collapsed, p.entry.id],
                    }))
                  }
                />
              ))}
            </div>
          </>
        )}

        {route.view === 'actions' && (
          <ActionList projects={sortProjects(projects, 'priority')} onOpen={(id) => go(`/p/${encodeURIComponent(id)}`)} onToggle={toggleStep} />
        )}

        {route.view === 'project' &&
          (current ? (
            <ProjectDetail project={current} demo={settings.demo} onBack={() => go('/')} onToggle={(s, d) => toggleStep(current.entry.id, s, d)} onAddNote={(n) => addNote(current.entry.id, n)} onSetColor={(c) => setColor(current.entry.id, c)} onRename={(n) => rename(current.entry.id, n)} onEditNote={(i, t) => editNote(current.entry.id, i, t)} onDeleteNote={(i) => deleteNote(current.entry.id, i)}
              loadMedia={(path) => loadMedia(settings.token, current.entry.repo, path, current.entry.branch, projectPath(current.entry))}
            />
          ) : (
            <p className="empty">{refreshing ? 'Loading…' : <>Project not found. <button className="link" onClick={() => go('/')}>Back</button></>}</p>
          ))}
      </main>
    </div>
  );
}

const mediaCache = new Map<string, Promise<string>>();
/** Fetch a repo file once and keep an object URL for it. Paths are relative to the status file's folder. */
function loadMedia(token: string, repo: string, path: string, branch: string | undefined, statusPath: string): Promise<string> {
  const dir = statusPath.includes('/') ? statusPath.slice(0, statusPath.lastIndexOf('/') + 1) : '';
  const full = path.startsWith('/') ? path.slice(1) : dir + path;
  const key = `${repo}@${branch ?? ''}:${full}`;
  if (!mediaCache.has(key)) {
    const p = getRawBlob(token, repo, full, branch).then((b) => URL.createObjectURL(b));
    p.catch(() => mediaCache.delete(key));
    mediaCache.set(key, p);
  }
  return mediaCache.get(key)!;
}

function Brand() {
  return (
    <a className="brand" href="#/">
      <span className="logo" aria-hidden="true">
        <svg viewBox="0 0 32 32"><rect width="32" height="32" rx="8" /><path d="M9 16.5l4.5 4.5L23 11.5" /></svg>
      </span>
      Project Manager
    </a>
  );
}
