import { describe, expect, it } from 'vitest';
import { addNote, daysSince, deleteNote, noteEditText, noteHeadLine, parseNoteHead, parseStatus, replaceNote, setName, setStep, today } from './status';

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

describe('addNote', () => {
  it('creates a Notes section before Decisions', () => {
    const out = addNote(SAMPLE, 'Remember the API key rotation', '2026-11-08');
    expect(out).toContain('## Notes\n- 2026-11-08: Remember the API key rotation\n\n## Decisions');
    expect(parseStatus(out).notes).toBe('- 2026-11-08: Remember the API key rotation');
  });

  it('appends to an existing Notes section and keeps other sections intact', () => {
    const once = addNote(SAMPLE, 'First', '2026-11-08');
    const twice = addNote(once, 'Second\nstep one\n- step two', '2026-11-09');
    expect(parseStatus(twice).notes).toBe('- 2026-11-08: First\n- 2026-11-09: Second\n  - step one\n  - step two');
    expect(parseStatus(twice).decisions).toEqual(['2026-11-02: Chose Supabase']);
    expect(parseStatus(twice).steps).toHaveLength(3);
  });

  it('adds Notes at the end when there is no Decisions/Log section', () => {
    const out = addNote('---\nname: X\n---\n## Summary\nHi\n\n', 'A note', '2026-11-08');
    expect(out).toBe('---\nname: X\n---\n## Summary\nHi\n\n## Notes\n- 2026-11-08: A note\n');
  });

  it('ignores empty notes and formats dates', () => {
    expect(addNote(SAMPLE, '   \n ', '2026-11-08')).toBe(SAMPLE);
    expect(today(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

import { splitNotes } from './components/NoteList';
describe('splitNotes', () => {
  it('makes one note per top-level bullet with date, title and body', () => {
    const notes = splitNotes('- 2026-11-07: How to add\n  - Step one\n  - Step two\n- Plain note\n- 2026-11-08 - Dashed date');
    expect(notes).toEqual([
      { date: '2026-11-07', author: 'user', index: 0, title: 'How to add', body: '- Step one\n- Step two' },
      { author: 'user', index: 1, title: 'Plain note', body: '' },
      { date: '2026-11-08', author: 'user', index: 2, title: 'Dashed date', body: '' },
    ]);
  });
});

describe('fenced code blocks', () => {
  const md = '---\nname: X\n---\n## Notes\n- 2026-11-07: Prompt\n  ```text\n  ## Summary\n  - [ ] not a step\n  ```\n## Next steps\n- [ ] real step\n';
  it('ignores headings and checkboxes inside fences', () => {
    const s = parseStatus(md);
    expect(s.sections.map((x) => x.title)).toEqual(['Notes', 'Next steps']);
    expect(s.steps.map((x) => x.text)).toEqual(['real step']);
  });
  it('setStep and addNote skip fenced lines', () => {
    expect(setStep(md, 'not a step', true)).toBeNull();
    const out = addNote(md, 'Another', '2026-11-08');
    expect(out).toContain('  ```\n- 2026-11-08: Another\n## Next steps');
  });
  it('splitNotes keeps the fence in the note body', () => {
    const n = splitNotes(parseStatus(md).notes);
    expect(n).toHaveLength(1);
    expect(n[0].body).toBe('```text\n## Summary\n- [ ] not a step\n```');
  });
});

describe('setName', () => {
  it('replaces only the name line', () => {
    const out = setName(SAMPLE, 'Musical Meadow');
    const changed = out.split('\n').filter((l, i) => l !== SAMPLE.split('\n')[i]);
    expect(changed).toEqual(['name: Musical Meadow']);
    expect(parseStatus(out).meta.name).toBe('Musical Meadow');
  });
  it('quotes names YAML would misread, and they parse back exactly', () => {
    for (const n of ['Recipes: v2', 'Tag #1', '"Quoted"', '- dash first', 'true', '2026', 'Trailing ']) {
      expect(parseStatus(setName(SAMPLE, n)).meta.name).toBe(n.trim());
    }
    expect(setName(SAMPLE, 'Musical Meadow (piano trainer)')).toContain('name: Musical Meadow (piano trainer)\n');
  });
  it('adds a name line or frontmatter when missing, keeps CRLF and other keys', () => {
    const noName = '---\nphase: Building\n---\n## Summary\nx\n';
    expect(setName(noName, 'X')).toBe('---\nname: X\nphase: Building\n---\n## Summary\nx\n');
    expect(setName('## Summary\nx', 'Y')).toBe('---\nname: Y\n---\n## Summary\nx');
    const crlf = setName(SAMPLE.replace(/\n/g, '\r\n'), 'Z');
    expect(crlf).toContain('name: Z\r\nphase: Building\r\n');
    expect(parseStatus(crlf).meta.priority).toBe('high');
  });
  it('ignores blank names', () => {
    expect(setName(SAMPLE, '   ')).toBe(SAMPLE);
  });
});

describe('note authors and editing', () => {
  const md = '---\nname: X\n---\n## Notes\n- 2026-11-07 (Claude): How to add\n  - Step one\n- 2026-11-08: My idea\n  - detail a\n  - detail b\n\n## Visuals\n## Log\n- x\n';
  it('reads the author marker', () => {
    expect(parseNoteHead('2026-11-07 (Claude): Hi')).toEqual({ date: '2026-11-07', author: 'claude', title: 'Hi' });
    expect(parseNoteHead('2026-11-07: Hi')).toEqual({ date: '2026-11-07', author: 'user', title: 'Hi' });
    expect(splitNotes(parseStatus(md).notes).map((n) => n.author)).toEqual(['claude', 'user']);
  });
  it('shows a note for editing and replaces only that note, keeping its date', () => {
    expect(noteEditText(md, 1)).toBe('My idea\ndetail a\ndetail b');
    const out = replaceNote(md, 1, 'My better idea\ndetail c')!;
    expect(out).toContain('- 2026-11-07 (Claude): How to add\n  - Step one\n- 2026-11-08: My better idea\n  - detail c\n\n## Visuals');
  });
  it("refuses to edit Claude's notes or missing ones", () => {
    expect(replaceNote(md, 0, 'hacked')).toBeNull();
    expect(replaceNote(md, 5, 'x')).toBeNull();
  });
  it('deletes only your own notes, matched by their first line', () => {
    const out = deleteNote(md, 1, noteHeadLine(md, 1)!)!;
    expect(out).toContain('- 2026-11-07 (Claude): How to add\n  - Step one\n\n## Visuals');
    expect(out).not.toContain('My idea');
    expect(deleteNote(md, 0)).toBeNull();
    // File changed under us: index now points elsewhere, but the head still finds the right note.
    const shifted = addNote(md, 'Newer', '2026-11-09').replace('## Notes\n', '## Notes\n- 2026-11-01: First\n');
    const out2 = deleteNote(shifted, 1, '- 2026-11-08: My idea')!;
    expect(out2).toContain('- 2026-11-01: First\n- 2026-11-07 (Claude): How to add');
    expect(out2).not.toContain('My idea');
    expect(deleteNote(md, 1, '- 2026-11-08: Gone')).toBeNull();
  });
  it('adds Claude notes with the marker, and Notes goes before Visuals', () => {
    expect(addNote(md, 'From Claude', '2026-11-09', 'claude')).toContain('- 2026-11-09 (Claude): From Claude\n\n## Visuals');
    const noNotes = '---\nname: X\n---\n## Summary\nx\n## Visuals\n## Log\n';
    expect(addNote(noNotes, 'Hi', '2026-11-09')).toContain('## Notes\n- 2026-11-09: Hi\n\n## Visuals');
  });
  it('keeps code blocks intact when adding or editing', () => {
    const out = addNote(md, 'Prompt\n```text\nline one\n\n- [ ] not a step\n```', '2026-11-09');
    expect(out).toContain('- 2026-11-09: Prompt\n  ```text\n  line one\n\n  - [ ] not a step\n  ```');
    expect(parseStatus(out).steps).toHaveLength(0);
    expect(noteEditText(out, 2)).toBe('Prompt\n```text\nline one\n\n- [ ] not a step\n```');
  });
});

import { parseVisuals } from './components/Visuals';
describe('parseVisuals', () => {
  it('reads description, build, images and videos', () => {
    const md = '- 2026-11-09: Login screen\n  - Build: v0.4.1 (abc1234)\n  - ![Login](docs/visuals/login.png)\n  - Shows the error state\n- 2026-11-10: Walkthrough clip\n  - Build: after onboarding\n  - [video](docs/visuals/walk.mp4)\n  - File: docs/visuals/extra.webp';
    const v = parseVisuals(md);
    expect(v[0]).toEqual({ date: '2026-11-09', title: 'Login screen', build: 'v0.4.1 (abc1234)', media: [{ label: 'Login', src: 'docs/visuals/login.png', kind: 'image' }], extra: '- Shows the error state' });
    expect(v[1].media.map((m) => m.kind)).toEqual(['video', 'image']);
    expect(v[1].build).toBe('after onboarding');
  });
});
