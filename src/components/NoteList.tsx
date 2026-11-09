import { useState } from 'react';
import { Blocks, Inline } from '../markdown';

import { noteEditText, parseNoteHead, type NoteAuthor } from '../status';

export interface Note {
  date?: string;
  author: NoteAuthor;
  /** Position among the section's top-level bullets (-1 for loose intro text). */
  index: number;
  title: string;
  /** Markdown body: the note's sub-points / continuation lines, de-indented. */
  body: string;
}

/** Split a `## Notes` body into notes: each top-level bullet starts a new note. */
export function splitNotes(md: string): Note[] {
  const notes: Note[] = [];
  let intro: string[] = [];
  for (const line of md.split('\n')) {
    const top = line.match(/^[-*+]\s+(.*)$/);
    if (top) {
      notes.push({ ...parseNoteHead(top[1]), index: notes.length, body: '' });
    } else if (notes.length) {
      const n = notes[notes.length - 1];
      n.body += (n.body ? '\n' : '') + line.replace(/^ {2}/, '');
    } else if (line.trim()) {
      intro.push(line);
    }
  }
  notes.forEach((n) => (n.body = n.body.trim()));
  if (intro.length) notes.unshift({ author: 'user', index: -1, title: intro.join(' '), body: '' });
  return notes;
}

function AuthorIcon({ author }: { author: NoteAuthor }) {
  return author === 'claude' ? (
    <span className="author claude" title="Added by Claude" aria-label="Added by Claude">
      {/* Generic sparkle mark for "added by Claude" */}
      <svg viewBox="0 0 24 24"><path d="M12 2.5l2.1 6.4 6.4 2.1-6.4 2.1L12 19.5l-2.1-6.4L3.5 11l6.4-2.1z" /></svg>
    </span>
  ) : (
    <span className="author user" title="Your note" aria-label="Your note">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg>
    </span>
  );
}

function NoteEditor({
  initial,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: string;
  onSave: (t: string) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}) {
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string>();
  const doDelete = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await onDelete!();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
      setConfirmDelete(false);
    }
  };
  return (
    <form
      className="note-edit"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim() || busy) return;
        setBusy(true);
        setError(undefined);
        try {
          await onSave(text);
        } catch (err) {
          setError((err as Error).message);
          setBusy(false);
        }
      }}
    >
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={Math.min(12, Math.max(3, text.split('\n').length + 1))} aria-label="Edit note" autoFocus />
      <p className="muted small">First line is the title; each extra line is a sub-point.</p>
      {confirmDelete ? (
        <div className="row confirm-row">
          <span className="small">Delete this note? This can't be undone here.</span>
          <button type="button" className="danger" onClick={doDelete} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</button>
          <button type="button" onClick={() => setConfirmDelete(false)} disabled={busy}>Keep</button>
        </div>
      ) : (
        <div className="row">
          <button className="primary" type="submit" disabled={!text.trim() || busy}>{busy ? 'Saving…' : 'Save'}</button>
          <button type="button" onClick={onCancel} disabled={busy}>Cancel</button>
          {onDelete && <button type="button" className="danger push-right" onClick={() => setConfirmDelete(true)} disabled={busy}>Delete</button>}
        </div>
      )}
      {error && <p className="error small">{error}</p>}
    </form>
  );
}

export function NoteList({
  body,
  raw,
  onEdit,
  onDelete,
}: {
  body: string;
  /** Full file text, used to fill the edit box. */
  raw?: string;
  onEdit?: (index: number, text: string) => Promise<void>;
  onDelete?: (index: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const notes = splitNotes(body);
  if (!notes.length) return null;
  return (
    <div className="note-list">
      {notes.map((n, i) => {
        const canEdit = !!onEdit && !!raw && n.author === 'user' && n.index >= 0;
        if (editing === n.index && canEdit) {
          return (
            <div key={i} className="note-card editing">
              <NoteEditor
                initial={noteEditText(raw!, n.index) ?? n.title}
                onCancel={() => setEditing(null)}
                onDelete={
                  onDelete &&
                  (async () => {
                    await onDelete(n.index);
                    setEditing(null);
                  })
                }
                onSave={async (t) => {
                  await onEdit!(n.index, t);
                  setEditing(null);
                }}
              />
            </div>
          );
        }
        const editBtn = canEdit && (
          <button
            type="button"
            className="icon note-edit-btn"
            aria-label="Edit or delete note"
            title="Edit or delete"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setEditing(n.index);
            }}
          >
            <svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" /></svg>
          </button>
        );
        const head = (
          <>
            <AuthorIcon author={n.author} />
            <span className="note-title"><Inline text={n.title} /></span>
            {n.date && <span className="note-date">{n.date}</span>}
            {editBtn}
          </>
        );
        return n.body ? (
          <details key={i} className={`note-card by-${n.author}`}>
            <summary>
              {head}
              <svg className="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4l4 4-4 4" /></svg>
            </summary>
            <div className="note-body"><Blocks body={n.body} /></div>
          </details>
        ) : (
          <div key={i} className={`note-card by-${n.author}`}>
            <div className="note-head">{head}</div>
          </div>
        );
      })}
    </div>
  );
}
