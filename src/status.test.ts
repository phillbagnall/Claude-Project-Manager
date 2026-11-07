import { describe, expect, it } from 'vitest';
import { daysSince, parseStatus, setStep } from './status';

const SAMPLE = `---
name: Recipe App
phase: Building
priority: high
updated: 2026-11-07
blocked: false
links: [https://github.com/x/y]
---
## Summary
A recipe app. Auth next.

## Next steps
- [ ] Wire up login screen
- [x] Set up database schema
  - [ ] Nested sub-step

## Key info
- API base URL lives in .env

## Decisions
- 2026-11-02: Chose Supabase

## Log
- 2026-11-07: Added schema
`;

describe('parseStatus', () => {
  it('parses frontmatter and sections', () => {
    const s = parseStatus(SAMPLE);
    expect(s.meta.name).toBe('Recipe App');
    expect(s.meta.phase).toBe('Building');
    expect(s.meta.updated).toBe('2026-11-07');
    expect(s.meta.links).toEqual(['https://github.com/x/y']);
    expect(s.summary).toBe('A recipe app. Auth next.');
    expect(s.keyInfo).toEqual(['API base URL lives in .env']);
    expect(s.decisions).toEqual(['2026-11-02: Chose Supabase']);
    expect(s.log).toEqual(['2026-11-07: Added schema']);
    expect(s.warnings).toEqual([]);
  });

  it('collects checkboxes with line numbers and sections', () => {
    const s = parseStatus(SAMPLE);
    expect(s.steps.map((x) => [x.text, x.done, x.section])).toEqual([
      ['Wire up login screen', false, 'Next steps'],
      ['Set up database schema', true, 'Next steps'],
      ['Nested sub-step', false, 'Next steps'],
    ]);
    expect(SAMPLE.split('\n')[s.steps[0].line]).toBe('- [ ] Wire up login screen');
  });

  it('degrades gracefully on malformed input', () => {
    const s = parseStatus('just some text\n- [ ] orphan');
    expect(s.warnings.length).toBeGreaterThan(0);
    expect(s.steps).toEqual([]);
    const bad = parseStatus('---\nname: [unclosed\n---\n## Summary\nhi');
    expect(bad.warnings[0]).toMatch(/YAML/);
    expect(bad.summary).toBe('hi');
  });

  it('handles CRLF line endings', () => {
    const s = parseStatus(SAMPLE.replace(/\n/g, '\r\n'));
    expect(s.meta.name).toBe('Recipe App');
    expect(s.steps).toHaveLength(3);
  });
});

describe('setStep', () => {
  it('changes only the target line', () => {
    const out = setStep(SAMPLE, 'Wire up login screen', true)!;
    const before = SAMPLE.split('\n');
    const after = out.split('\n');
    const changed = after.filter((l, i) => l !== before[i]);
    expect(changed).toEqual(['- [x] Wire up login screen']);
  });

  it('can untick and preserves indentation', () => {
    const out = setStep(SAMPLE, 'Nested sub-step', true)!;
    expect(out).toContain('  - [x] Nested sub-step');
    expect(setStep(out, 'Set up database schema', false)).toContain('- [ ] Set up database schema');
  });

  it('finds the step by text when the hint line moved', () => {
    const shifted = SAMPLE.replace('## Next steps\n', '## Next steps\n- [ ] New step added by Claude\n');
    const out = setStep(shifted, 'Wire up login screen', true, 12)!;
    expect(out).toContain('- [x] Wire up login screen');
    expect(out).toContain('- [ ] New step added by Claude');
  });

  it('returns null when the step is gone', () => {
    expect(setStep(SAMPLE, 'Does not exist', true)).toBeNull();
  });

  it('preserves CRLF', () => {
    const out = setStep(SAMPLE.replace(/\n/g, '\r\n'), 'Wire up login screen', true)!;
    expect(out).toContain('- [x] Wire up login screen\r\n');
  });
});

describe('daysSince', () => {
  it('computes whole days', () => {
    expect(daysSince('2026-11-01', new Date('2026-11-07T12:00:00Z'))).toBe(6);
    expect(daysSince(undefined)).toBeNull();
    expect(daysSince('nonsense')).toBeNull();
  });
});
