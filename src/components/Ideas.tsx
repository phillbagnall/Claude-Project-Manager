import { useState } from 'react';
import type { Idea } from '../ideas';
import { Blocks, Inline } from '../markdown';

function IdeaForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: { title: string; body: string };
  submitLabel: string;
  onSubmit: (title: string, body: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const submit = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await onSubmit(title, body);
      if (!initial) {
        setTitle('');
        setBody('');
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      className="idea-form"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Idea title" aria-label="Idea title" autoFocus={!!initial} />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
        }}
        placeholder="Notes (optional): what it is, why, rough ideas… Markdown and - bullets work."
        rows={initial ? Math.min(14, Math.max(4, body.split('\n').length + 1)) : 3}
        aria-label="Idea notes"
      />
      <div className="row">
        <button className="primary" type="submit" disabled={!title.trim() || busy}>{busy ? 'Saving…' : submitLabel}</button>
        {onCancel && <button type="button" onClick={onCancel} disabled={busy}>Cancel</button>}
        {saved && <span className="muted small">Saved ✓</span>}
      </div>
      {error && <p className="error small">{error}</p>}
    </form>
  );
}

type Mode = 'view' | 'edit' | 'delete' | 'promote';

function IdeaCard({
  idea,
  onUpdate,
  onDelete,
  onPromote,
}: {
  idea: Idea;
  onUpdate: (title: string, body: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onPromote: () => Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>('view');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  if (mode === 'edit') {
    return (
      <div className="idea-card editing">
        <IdeaForm
          initial={{ title: idea.title, body: idea.body }}
          submitLabel="Save"
          onCancel={() => setMode('view')}
          onSubmit={async (t, b) => {
            await onUpdate(t, b);
            setMode('view');
          }}
        />
      </div>
    );
  }

  return (
    <details className="idea-card">
      <summary>
        <span className="idea-bulb" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></svg>
        </span>
        <span className="note-title"><Inline text={idea.title} /></span>
        {idea.added && <span className="note-date">{idea.added}</span>}
        <svg className="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4l4 4-4 4" /></svg>
      </summary>
      <div className="note-body">
        {idea.body ? <Blocks body={idea.body} /> : <p className="muted small">No notes yet.</p>}
        {mode === 'promote' ? (
          <div className="idea-confirm">
            <p className="small">
              Make <strong><Inline text={idea.title} /></strong> a project? It appears on the dashboard (phase Planning) with your notes, plus a
              kick-off prompt to paste into Claude Code, which sets up its repo. It leaves Ideas.
            </p>
            <div className="row">
              <button type="button" className="primary" disabled={busy} onClick={() => act(onPromote)}>{busy ? 'Promoting…' : 'Promote'}</button>
              <button type="button" disabled={busy} onClick={() => setMode('view')}>Cancel</button>
            </div>
          </div>
        ) : mode === 'delete' ? (
          <div className="idea-confirm">
            <p className="small">Delete this idea? This can't be undone here.</p>
            <div className="row">
              <button type="button" className="danger" disabled={busy} onClick={() => act(onDelete)}>{busy ? 'Deleting…' : 'Delete'}</button>
              <button type="button" disabled={busy} onClick={() => setMode('view')}>Keep</button>
            </div>
          </div>
        ) : (
          <div className="row idea-actions">
            <button type="button" className="primary" onClick={() => setMode('promote')}>Promote to project</button>
            <button type="button" onClick={() => setMode('edit')}>Edit</button>
            <button type="button" className="danger push-right" onClick={() => setMode('delete')}>Delete</button>
          </div>
        )}
        {error && <p className="error small">{error}</p>}
      </div>
    </details>
  );
}

export function IdeasList({
  ideas,
  loading,
  error,
  onAdd,
  onUpdate,
  onDelete,
  onPromote,
}: {
  ideas: Idea[];
  loading: boolean;
  error?: string;
  onAdd: (title: string, body: string) => Promise<void>;
  onUpdate: (idea: Idea, title: string, body: string) => Promise<void>;
  onDelete: (idea: Idea) => Promise<void>;
  onPromote: (idea: Idea) => Promise<void>;
}) {
  return (
    <div className="ideas">
      <section className="panel">
        <h2>New idea</h2>
        <IdeaForm submitLabel="Add idea" onSubmit={onAdd} />
      </section>
      {error && <p className="error panel">{error}</p>}
      {ideas.length === 0 ? (
        <p className="empty">{loading ? 'Loading…' : 'No ideas yet. Jot one down above; when you’re ready, promote it to a project.'}</p>
      ) : (
        <div className="note-list">
          {[...ideas].reverse().map((idea) => (
            <IdeaCard
              key={`${idea.index}:${idea.title}`}
              idea={idea}
              onUpdate={(t, b) => onUpdate(idea, t, b)}
              onDelete={() => onDelete(idea)}
              onPromote={() => onPromote(idea)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
