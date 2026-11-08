import { describe, expect, it } from 'vitest';
import { parseRegistry, withColor } from './registry';

const REG = '{ "projects": [\n  { "id": "a", "repo": "me/a" },\n  { "repo": "me/data", "path": "projects/b.md", "name": "B" }\n] }\n';

describe('registry colours', () => {
  it('reads valid colours and ignores unknown ones', () => {
    const r = parseRegistry('[{"id":"a","repo":"me/a","color":"teal"},{"id":"b","repo":"me/b","color":"chartreuse"}]');
    expect(r.map((e) => e.color)).toEqual(['teal', undefined]);
  });

  it('sets a colour on one entry and keeps the rest and the file shape', () => {
    const out = withColor(REG, 'a', 'teal');
    const json = JSON.parse(out);
    expect(json.projects).toEqual([
      { id: 'a', repo: 'me/a', color: 'teal' },
      { repo: 'me/data', path: 'projects/b.md', name: 'B' },
    ]);
  });

  it('matches entries without an id by their derived id', () => {
    const out = withColor(REG, 'me/data/projects/b.md', 'purple');
    expect(JSON.parse(out).projects[1].color).toBe('purple');
    expect(parseRegistry(out)[1].color).toBe('purple');
  });

  it('removes the colour when set to none, and works for array files', () => {
    const arr = '[{"id":"a","repo":"me/a","color":"red"}]';
    expect(JSON.parse(withColor(arr, 'a', null))).toEqual([{ id: 'a', repo: 'me/a' }]);
  });

  it('throws when the entry is gone', () => {
    expect(() => withColor(REG, 'zzz', 'red')).toThrow(/isn't in projects.json/);
  });
});
