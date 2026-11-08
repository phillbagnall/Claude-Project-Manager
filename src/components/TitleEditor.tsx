import { useEffect, useRef, useState } from 'react';

/** Project title with a pencil button that turns it into a rename box. */
export function TitleEditor({ name, onRename }: { name: string; onRename?: (name: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) input.current?.select();
  }, [editing]);

  const save = async () => {
    const next = value.replace(/\s+/g, ' ').trim();
    if (!next || busy) return;
    if (next === name) return setEditing(false);
    setBusy(true);
    setMsg(undefined);
    try {
      await onRename!(next);
      setEditing(false);
      setMsg({ ok: true, text: 'Saved ✓' });
      setTimeout(() => setMsg(undefined), 2000);
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (!editing) {
    return (
      <div className="title-row">
        <h1>{name}</h1>
        {onRename && (
          <button
            className="icon rename"
            aria-label="Rename project"
            title="Rename"
            onClick={() => {
              setValue(name);
              setMsg(undefined);
              setEditing(true);
            }}
          >
            <svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" /></svg>
          </button>
        )}
        {msg && <span className={`small ${msg.ok ? 'muted' : 'error'}`}>{msg.text}</span>}
      </div>
    );
  }
  return (
    <form
      className="title-edit"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <input
        ref={input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
        aria-label="Project name"
        maxLength={80}
      />
      <div className="row">
        <button className="primary" type="submit" disabled={!value.trim() || busy}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
      </div>
      {msg && !msg.ok && <p className="error small">{msg.text}</p>}
    </form>
  );
}
