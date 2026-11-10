import { describe, expect, it } from 'vitest';
import { addIdea, kickoffPrompt, parseIdeas, promotedStatus, removeIdea, replaceIdea, slugify } from './ideas';
import { parseStatus } from './status';
import { splitNotes } from './components/NoteList';
import { parseRegistry, withEntry } from './registry';

describe('ideas', () => {
  const md = addIdea(addIdea('', 'First idea', 'Some notes\n- a bullet', '2026-11-01'), 'Second', '', '2026-11-02');

  it('creates the file with a header and parses ideas back', () => {
    expect(md.startsWith('# Ideas\n')).toBe(true);
    expect(parseIdeas(md)).toEqual([
      { index: 0, title: 'First idea', added: '2026-11-01', body: 'Some notes\n- a bullet' },
      { index: 1, title: 'Second', added: '2026-11-02', body: '' },
    ]);
  });

  it('keeps notes from creating fake ideas', () => {
    const out = addIdea(md, '## Third', '## Heading in notes\n```\n## inside code\n```', '2026-11-03');
    const ideas = parseIdeas(out);
    expect(ideas).toHaveLength(3);
    expect(ideas[2].title).toBe('Third');
    expect(ideas[2].body).toBe('### Heading in notes\n```\n## inside code\n```');
  });

  it('edits and removes by index, falling back to the title if the file moved', () => {
    const edited = replaceIdea(md, 0, 'First idea', 'First, renamed', 'New notes')!;
    expect(parseIdeas(edited)[0]).toEqual({ index: 0, title: 'First, renamed', added: '2026-11-01', body: 'New notes' });
    expect(replaceIdea(md, 0, 'Not there', 'x', '')).toBeNull();
    const shifted = md.replace('## First idea', '## Newer\n\n## First idea');
    const removed = removeIdea(shifted, 0, 'First idea')!;
    expect(parseIdeas(removed).map((i) => i.title)).toEqual(['Newer', 'Second']);
  });

  it('slugifies titles', () => {
    expect(slugify('Family recipe book (print)!')).toBe('family-recipe-book-print');
    expect(slugify('Café ☕')).toBe('cafe');
    expect(slugify('!!!')).toBe('idea');
  });

  it('builds a valid status file with the idea notes and a copyable kick-off prompt', () => {
    const idea = parseIdeas(md)[0];
    const text = promotedStatus({ idea, id: 'first-idea', dataRepo: 'me/data', path: 'projects/first-idea.md', date: '2026-11-10' });
    const s = parseStatus(text);
    expect(s.warnings).toEqual([]);
    expect(s.meta).toMatchObject({ name: 'First idea', phase: 'Planning', updated: '2026-11-10' });
    expect(s.steps.map((x) => x.text)).toEqual(['Start it in Claude: copy the kick-off prompt from Notes into a new Claude Code session']);
    const notes = splitNotes(s.notes);
    expect(notes.map((n) => [n.author, n.title])).toEqual([
      ['user', 'The idea'],
      ['claude', 'How to start this project in Claude'],
    ]);
    expect(notes[0].body).toBe('- Some notes\n- a bullet');
    expect(notes[1].body).toContain('```text\n' + kickoffPrompt({ title: 'First idea', id: 'first-idea', dataRepo: 'me/data', path: 'projects/first-idea.md' }) + '\n```');
  });

  it('appends registry entries and refuses duplicates', () => {
    const reg = '{ "projects": [ { "id": "a", "repo": "me/a" } ] }';
    const out = withEntry(reg, { id: 'b', repo: 'me/data', path: 'projects/b.md' });
    expect(parseRegistry(out).map((e) => e.id)).toEqual(['a', 'b']);
    expect(() => withEntry(out, { id: 'a', repo: 'me/x' })).toThrow();
  });
});
