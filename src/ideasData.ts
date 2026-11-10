import { useCallback, useEffect, useRef, useState } from 'react';
import { DEMO_IDEAS } from './demo';
import { GitHubError, getFile, putFile } from './github';
import { addIdea, parseIdeas, removeIdea, replaceIdea, type Idea } from './ideas';
import type { Settings } from './data';
import { today } from './status';

/** ideas.md lives next to projects.json in the data repo. */
export const ideasPath = (s: Settings) => (s.registryPath.includes('/') ? s.registryPath.slice(0, s.registryPath.lastIndexOf('/') + 1) : '') + 'ideas.md';

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function useIdeas(settings: Settings) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const state = useRef<{ text: string; sha?: string }>({ text: '' });
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const path = ideasPath(settings);

  const set = (t: string, sha?: string) => {
    state.current = { text: t, sha };
    setText(t);
  };

  const fetchFile = useCallback(async (): Promise<{ text: string; sha?: string }> => {
    try {
      return await getFile(settings.token, settings.dataRepo, path);
    } catch (e) {
      if (e instanceof GitHubError && e.status === 404) return { text: '' }; // No ideas yet.
      throw e;
    }
  }, [settings, path]);

  const refresh = useCallback(async () => {
    if (settings.demo) return set(DEMO_IDEAS);
    if (!settings.token || !settings.dataRepo) return;
    setLoading(true);
    setError(undefined);
    try {
      const f = await fetchFile();
      set(f.text, f.sha);
    } catch (e) {
      setError(`Couldn't load ${settings.dataRepo}/${path}: ${errMsg(e)}`);
    } finally {
      setLoading(false);
    }
  }, [settings, path, fetchFile]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Apply a change to ideas.md and commit it; on a conflict, re-fetch and re-apply once. */
  const edit = useCallback(
    (transform: (t: string) => string, message: string): Promise<void> => {
      const run = async () => {
        if (settings.demo) return set(transform(state.current.text));
        try {
          let { text: cur, sha } = state.current;
          let next = transform(cur);
          let newSha: string;
          try {
            newSha = await putFile(settings.token, settings.dataRepo, path, next, sha, message);
          } catch (e) {
            if (!(e instanceof GitHubError && e.isConflict)) throw e;
            ({ text: cur, sha } = await fetchFile());
            next = transform(cur);
            newSha = await putFile(settings.token, settings.dataRepo, path, next, sha, message);
          }
          set(next, newSha);
        } catch (e) {
          throw new Error(`Couldn't save: ${errMsg(e)}`);
        }
      };
      const job = queue.current.then(run, run);
      queue.current = job.catch(() => undefined);
      return job;
    },
    [settings, path, fetchFile],
  );

  const must = (t: string | null) => {
    if (t === null) throw new Error('That idea has changed elsewhere. Refresh and try again.');
    return t;
  };
  const short = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, 50);

  return {
    ideas: parseIdeas(text),
    loading,
    error,
    refresh,
    add: (title: string, body: string) => edit((t) => addIdea(t, title, body, today()), `dashboard: idea "${short(title)}"`),
    update: (idea: Idea, title: string, body: string) =>
      edit((t) => must(replaceIdea(t, idea.index, idea.title, title, body)), `dashboard: edit idea "${short(title)}"`),
    remove: (idea: Idea, why = 'delete') => edit((t) => must(removeIdea(t, idea.index, idea.title)), `dashboard: ${why} idea "${short(idea.title)}"`),
  };
}
