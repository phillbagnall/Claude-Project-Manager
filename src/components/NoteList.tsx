import { Blocks, Inline } from '../markdown';

export interface Note {
  date?: string;
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
      const m = top[1].match(/^(\d{4}-\d{2}-\d{2})\s*[:\-–]\s*(.*)$/);
      notes.push({ date: m?.[1], title: (m ? m[2] : top[1]).trim(), body: '' });
    } else if (notes.length) {
      const n = notes[notes.length - 1];
      n.body += (n.body ? '\n' : '') + line.replace(/^ {2}/, '');
    } else if (line.trim()) {
      intro.push(line);
    }
  }
  notes.forEach((n) => (n.body = n.body.trim()));
  if (intro.length) notes.unshift({ title: intro.join(' '), body: '' });
  return notes;
}

export function NoteList({ body }: { body: string }) {
  const notes = splitNotes(body);
  if (!notes.length) return null;
  return (
    <div className="note-list">
      {notes.map((n, i) =>
        n.body ? (
          <details key={i} className="note-card">
            <summary>
              <span className="note-title"><Inline text={n.title} /></span>
              {n.date && <span className="note-date">{n.date}</span>}
              <svg className="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4l4 4-4 4" /></svg>
            </summary>
            <div className="note-body"><Blocks body={n.body} /></div>
          </details>
        ) : (
          <div key={i} className="note-card">
            <div className="note-head">
              <span className="note-title"><Inline text={n.title} /></span>
              {n.date && <span className="note-date">{n.date}</span>}
            </div>
          </div>
        ),
      )}
    </div>
  );
}
