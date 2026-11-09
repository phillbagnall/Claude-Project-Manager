import { useEffect, useState, type ReactNode } from 'react';

const KEY = 'cpm.sections.v1';
const keyOf = (title: string) => title.trim().toLowerCase();

function load(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/**
 * Which project-page sections are collapsed, by heading (so collapsing "Log"
 * collapses it on every project). Remembered per device.
 */
export function useCollapsedSections() {
  const [collapsed, setCollapsed] = useState<string[]>(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(collapsed));
    } catch {
      /* ignore */
    }
  }, [collapsed]);
  return {
    isCollapsed: (title: string) => collapsed.includes(keyOf(title)),
    toggle: (title: string) =>
      setCollapsed((c) => (c.includes(keyOf(title)) ? c.filter((k) => k !== keyOf(title)) : [...c, keyOf(title)])),
    setAll: (titles: string[], value: boolean) =>
      setCollapsed((c) => {
        const keys = titles.map(keyOf);
        return value ? [...new Set([...c, ...keys])] : c.filter((k) => !keys.includes(k));
      }),
  };
}

export function Panel({
  title,
  collapsed,
  onToggle,
  extra,
  children,
}: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  /** Shown in the heading after the title (e.g. a progress bar). */
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`panel${collapsed ? ' panel-collapsed' : ''}`}>
      <h2>
        <button type="button" className="panel-toggle" aria-expanded={!collapsed} onClick={onToggle}>
          <svg className="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4l4 4-4 4" /></svg>
          {title}
        </button>
        {extra}
      </h2>
      {!collapsed && children}
    </section>
  );
}
