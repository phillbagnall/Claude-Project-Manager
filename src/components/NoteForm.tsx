import { useState } from 'react';

/** Text box that appends a dated note to the project's `## Notes` section. */
export function NoteForm({ onAdd }: { onAdd: (note: string) => Promise<void> }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  const submit = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await onAdd(text);
      setText('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="note-form"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
        }}
        placeholder="Add a note… (each extra line becomes a sub-point)"
        rows={3}
        aria-label="New note"
      />
      <div className="row">
        <button className="primary" type="submit" disabled={!text.trim() || busy}>
          {busy ? 'Saving…' : 'Add note'}
        </button>
        {saved && <span className="muted small">Saved ✓</span>}
      </div>
      {error && <p className="error small">{error}</p>}
    </form>
  );
}
