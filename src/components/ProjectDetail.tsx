import type { Project } from '../data';
import { projectPath } from '../data';
import { Blocks, Inline, shortUrl } from '../markdown';
import type { Step } from '../status';
import { Blocked, PhaseBadge, PriorityDot, Progress, Updated } from './Badges';
import { displayName } from './ProjectCard';
import type { ColorName } from '../colors';
import { ColorPicker } from './ColorPicker';
import { NoteForm } from './NoteForm';
import { TitleEditor } from './TitleEditor';
import { VisualsPanel, type MediaLoader } from './Visuals';
import { NoteList } from './NoteList';
import { StepItem } from './StepItem';
import { Panel, useCollapsedSections } from './Panel';

const SPECIAL = new Set(['summary', 'overview', 'visuals']);

export function ProjectDetail({
  project,
  onBack,
  onToggle,
  onAddNote,
  onSetColor,
  onRename,
  onEditNote,
  onDeleteNote,
  loadMedia,
  demo,
}: {
  project: Project;
  onBack: () => void;
  onToggle: (step: Step, done: boolean) => void;
  onAddNote: (note: string) => Promise<void>;
  onSetColor: (color: ColorName | null) => Promise<void>;
  onRename: (name: string) => Promise<void>;
  onEditNote: (index: number, text: string) => Promise<void>;
  onDeleteNote: (index: number) => Promise<void>;
  loadMedia?: MediaLoader;
  demo: boolean;
}) {
  const { status, entry } = project;
  const sections = useCollapsedSections();
  const fold = (title: string) => ({ collapsed: sections.isCollapsed(title), onToggle: () => sections.toggle(title) });
  const isNotes = (title: string) => title.trim().toLowerCase() === 'notes';
  const notesBody = status?.sections.find((s) => isNotes(s.title))?.body ?? '';
  const others = (status?.sections ?? []).filter((s) => !SPECIAL.has(s.title.trim().toLowerCase()) && !isNotes(s.title));
  const hasSteps = (s: { title: string }) => !!status?.steps.some((x) => x.section === s.title);
  const renderSection = (s: { title: string; body: string }) => {
    const steps = status!.steps.filter((x) => x.section === s.title);
    const rest = s.body
      .split('\n')
      .filter((l) => !/^\s*[-*+]\s+\[[ xX]\]\s+/.test(l))
      .join('\n')
      .trim();
    const done = steps.filter((x) => x.done).length;
    return (
      <Panel key={s.title} title={s.title} {...fold(s.title)} extra={steps.length > 0 && <Progress done={done} total={steps.length} />}>
        {steps.length > 0 && (
          <ul className="steps">
            {[...steps.filter((x) => !x.done), ...steps.filter((x) => x.done)].map((x) => (
              <StepItem key={x.line} step={x} pending={project.pending?.[x.text] !== undefined} onToggle={(d) => onToggle(x, d)} />
            ))}
          </ul>
        )}
        {rest && <Blocks body={rest} />}
      </Panel>
    );
  };

  // Every collapsible heading on this page, in order.
  const titles = [
    ...(status?.summary ? ['Summary'] : []),
    ...others.filter(hasSteps).map((s) => s.title),
    ...(status ? ['Notes', 'Visuals'] : []),
    ...others.filter((s) => !hasSteps(s)).map((s) => s.title),
  ];
  const allCollapsed = titles.length > 0 && titles.every(sections.isCollapsed);

  const fileUrl = `https://github.com/${entry.repo}/blob/${entry.branch ?? 'HEAD'}/${projectPath(entry)}`;
  return (
    <div className="detail">
      <div className="detail-nav">
        <button className="link back" onClick={onBack}>← All projects</button>
        {titles.length > 0 && (
          <button className="link small" onClick={() => sections.setAll(titles, !allCollapsed)}>
            {allCollapsed ? 'Expand all' : 'Collapse all'}
          </button>
        )}
      </div>
      <header className="detail-head" style={entry.color ? { borderLeftColor: `var(--c-${entry.color})` } : undefined} data-colored={entry.color ? '' : undefined}>
        <TitleEditor name={displayName(project)} onRename={status ? onRename : undefined} />
        <div className="meta-row">
          <PhaseBadge phase={status?.meta.phase as string} />
          <PriorityDot priority={status?.meta.priority as string} />
          {status && <Blocked meta={status.meta} />}
          {status && <Updated meta={status.meta} />}
        </div>
        <div className="links">
          {!demo && <a href={fileUrl} target="_blank" rel="noreferrer">{entry.repo}/{projectPath(entry)}</a>}
          {status?.meta.links?.map((l) => (
            <a key={l} href={l} target="_blank" rel="noreferrer">{shortUrl(l)}</a>
          ))}
        </div>
        <ColorPicker value={entry.color} onChange={onSetColor} />
      </header>

      {!status && <p className={project.loading ? 'muted' : 'error'}>{project.loading ? 'Loading…' : project.error}</p>}
      {project.saveError && <p className="error">{project.saveError}</p>}
      {status?.warnings.map((w) => <p key={w} className="warn small">⚠ {w}</p>)}

      {status?.summary && (
        <Panel title="Summary" {...fold('Summary')}>
          <Blocks body={status.summary} />
        </Panel>
      )}

      {/* Checklist sections first, then your notes, then everything else. */}
      {others.filter(hasSteps).map(renderSection)}

      {status && (
        <Panel title="Notes" {...fold('Notes')}>
          {notesBody ? <NoteList body={notesBody} raw={project.raw} onEdit={onEditNote} onDelete={onDeleteNote} /> : <p className="muted small">Your notes. Add one here, or ask a Claude session to add one.</p>}
          <NoteForm onAdd={onAddNote} />
        </Panel>
      )}

      {status && <VisualsPanel body={status.visuals} load={demo ? undefined : loadMedia} {...fold('Visuals')} />}

      {others.filter((s) => !hasSteps(s)).map(renderSection)}
      {status && status.sections.length === 0 && (
        <p className="muted">No sections found. <Inline text="Add `## Summary` and `## Next steps` headings to the file." /></p>
      )}
    </div>
  );
}
