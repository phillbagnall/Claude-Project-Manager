import type { Project } from '../data';
import { Inline } from '../markdown';
import type { Step } from '../status';
import { Blocked, PhaseBadge, PriorityDot, Progress, Updated } from './Badges';
import { StepItem } from './StepItem';

export function displayName(p: Project) {
  return p.status?.meta.name || p.entry.name || p.entry.id;
}

export function ProjectCard({
  project,
  onOpen,
  onToggle,
}: {
  project: Project;
  onOpen: () => void;
  onToggle: (step: Step, done: boolean) => void;
}) {
  const { status } = project;
  if (!status) {
    return (
      <article className="card">
        <header className="card-head">
          <h2>{displayName(project)}</h2>
        </header>
        {project.loading ? <p className="muted">Loading…</p> : <p className="error">{project.error}</p>}
        <p className="muted small">{project.entry.repo}</p>
      </article>
    );
  }
  const open = status.steps.filter((s) => !s.done || project.pending?.[s.text] !== undefined);
  const done = status.steps.filter((s) => s.done).length;
  const firstSentence = status.summary.split(/(?<=[.!?])\s/)[0] ?? '';
  return (
    <article className="card">
      <header className="card-head">
        <button className="card-title" onClick={onOpen}>
          <h2>{displayName(project)}</h2>
        </button>
        <PriorityDot priority={status.meta.priority as string} />
      </header>
      <div className="meta-row">
        <PhaseBadge phase={status.meta.phase as string} />
        <Blocked meta={status.meta} />
        <Updated meta={status.meta} />
      </div>
      {firstSentence && <p className="summary"><Inline text={firstSentence} /></p>}
      <Progress done={done} total={status.steps.length} />
      {open.length > 0 && (
        <ul className="steps">
          {open.slice(0, 3).map((s) => (
            <StepItem key={s.line} step={s} pending={project.pending?.[s.text] !== undefined} onToggle={(d) => onToggle(s, d)} />
          ))}
        </ul>
      )}
      {project.saveError && <p className="error small">{project.saveError}</p>}
      {status.warnings.length > 0 && <p className="warn small">⚠ {status.warnings[0]}</p>}
      <footer className="card-foot">
        <button className="link" onClick={onOpen}>
          {open.length > 3 ? `+${open.length - 3} more · ` : ''}Details →
        </button>
      </footer>
    </article>
  );
}
