import type { Project } from '../data';
import type { Step } from '../status';
import { PriorityDot } from './Badges';
import { displayName } from './ProjectCard';
import { StepItem } from './StepItem';

export function ActionList({
  projects,
  onOpen,
  onToggle,
}: {
  projects: Project[];
  onOpen: (id: string) => void;
  onToggle: (id: string, step: Step, done: boolean) => void;
}) {
  const groups = projects
    .map((p) => ({ p, open: p.status?.steps.filter((s) => !s.done || p.pending?.[s.text] !== undefined) ?? [] }))
    .filter((g) => g.open.length > 0);
  const total = groups.reduce((n, g) => n + g.open.length, 0);
  if (!total) return <p className="empty">Nothing open. Nice.</p>;
  return (
    <div className="actions">
      <p className="muted">{total} open action{total === 1 ? '' : 's'} across {groups.length} project{groups.length === 1 ? '' : 's'}</p>
      {groups.map(({ p, open }) => (
        <section key={p.entry.id} className="panel">
          <h2>
            <button className="link heading-link" onClick={() => onOpen(p.entry.id)}>{displayName(p)}</button>
            <PriorityDot priority={p.status?.meta.priority as string} />
          </h2>
          <ul className="steps">
            {open.map((s) => (
              <StepItem key={s.line} step={s} pending={p.pending?.[s.text] !== undefined} onToggle={(d) => onToggle(p.entry.id, s, d)} />
            ))}
          </ul>
          {p.saveError && <p className="error small">{p.saveError}</p>}
        </section>
      ))}
    </div>
  );
}
