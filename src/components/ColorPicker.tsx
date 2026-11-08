import { useState } from 'react';
import { COLORS, type ColorName } from '../colors';

/** Row of colour swatches for a project's tile (plus "none"). */
export function ColorPicker({ value, onChange }: { value?: ColorName; onChange: (c: ColorName | null) => Promise<void> }) {
  const [status, setStatus] = useState<{ ok: boolean; text: string }>();
  const pick = async (c: ColorName | null) => {
    setStatus(undefined);
    try {
      await onChange(c);
      setStatus({ ok: true, text: 'Saved ✓' });
      setTimeout(() => setStatus(undefined), 2000);
    } catch (e) {
      setStatus({ ok: false, text: (e as Error).message });
    }
  };
  return (
    <div className="color-picker">
      <span className="muted small">Tile colour</span>
      <div className="swatches" role="radiogroup" aria-label="Tile colour">
        <button
          type="button"
          role="radio"
          aria-checked={!value}
          aria-label="No colour"
          title="No colour"
          className="swatch none"
          onClick={() => pick(null)}
        />
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={value === c}
            aria-label={c}
            title={c}
            className="swatch"
            style={{ background: `var(--c-${c})` }}
            onClick={() => pick(c)}
          />
        ))}
      </div>
      {status && <span className={`small ${status.ok ? 'muted' : 'error'}`}>{status.text}</span>}
    </div>
  );
}
