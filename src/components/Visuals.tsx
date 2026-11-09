import { useEffect, useRef, useState } from 'react';
import { Blocks, Inline } from '../markdown';
import { splitNotes } from './NoteList';

export interface Visual {
  date?: string;
  title: string;
  build?: string;
  media: { label: string; src: string; kind: 'image' | 'video' }[];
  /** Any other sub-points, as markdown. */
  extra: string;
}

const VIDEO = /\.(mp4|webm|mov|m4v)$/i;
const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg)$/i;

/**
 * Parse `## Visuals`: one top-level bullet per visual ("YYYY-MM-DD: description"),
 * with sub-points like "Build: …" and ![alt](docs/visuals/file.png) or [video](….mp4).
 */
export function parseVisuals(md: string): Visual[] {
  return splitNotes(md)
    .filter((n) => n.index >= 0)
    .map((n) => {
      const v: Visual = { date: n.date, title: n.title, media: [], extra: '' };
      const extra: string[] = [];
      for (const line of n.body.split('\n')) {
        const text = line.replace(/^\s*[-*+]\s+/, '').trim();
        if (!text) continue;
        const build = text.match(/^build\s*:\s*(.+)$/i);
        if (build) {
          v.build = build[1].trim();
          continue;
        }
        const file = text.match(/^file\s*:\s*`?([^`\s]+)`?$/i);
        const links = [...text.matchAll(/!?\[([^\]]*)\]\(([^)\s]+)\)/g)].map((m) => ({ label: m[1], src: m[2] }));
        if (file) links.push({ label: '', src: file[1] });
        const media = links.filter((l) => VIDEO.test(l.src) || IMAGE.test(l.src));
        if (media.length) media.forEach((m) => v.media.push({ ...m, kind: VIDEO.test(m.src) ? 'video' : 'image' }));
        else extra.push(`- ${text}`);
      }
      v.extra = extra.join('\n');
      return v;
    });
}

/** Loads a repo-relative path to a displayable URL (object URL for private repos). */
export type MediaLoader = (path: string) => Promise<string>;

function useMedia(src: string, load?: MediaLoader) {
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState<string>();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (/^https?:\/\//i.test(src)) return setUrl(src);
    if (!load) return setError('Not available in demo mode');
    const el = ref.current;
    let cancelled = false;
    const go = () =>
      load(src.replace(/^\.?\//, '')).then(
        (u) => !cancelled && setUrl(u),
        (e) => !cancelled && setError((e as Error).message),
      );
    if (!el || !('IntersectionObserver' in window)) {
      go();
      return () => void (cancelled = true);
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        go();
      }
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [src, load]);
  return { url, error, ref };
}

function Thumb({ v, m, load, onOpen }: { v: Visual; m: Visual['media'][number]; load?: MediaLoader; onOpen: (url: string) => void }) {
  const { url, error, ref } = useMedia(m.src, load);
  return (
    <div ref={ref} className="visual-thumb">
      {error ? (
        <span className="muted small">{error}</span>
      ) : !url ? (
        <span className="muted small">Loading…</span>
      ) : (
        <button type="button" className="thumb-btn" onClick={() => onOpen(url)} aria-label={`Open ${m.label || v.title}`}>
          {m.kind === 'video' ? <video src={url} muted playsInline preload="metadata" /> : <img src={url} alt={m.label || v.title} />}
          {m.kind === 'video' && <span className="play" aria-hidden="true">▶</span>}
        </button>
      )}
    </div>
  );
}

export function VisualsPanel({ body, load }: { body: string; load?: MediaLoader }) {
  const visuals = parseVisuals(body);
  const [open, setOpen] = useState<{ url: string; v: Visual; kind: 'image' | 'video' } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <section className="panel">
      <h2>Visuals</h2>
      {visuals.length === 0 ? (
        <p className="muted small">Screenshots and videos that Claude takes while building this project appear here.</p>
      ) : (
        <div className="visual-grid">
          {[...visuals].reverse().map((v, i) => (
            <figure key={i} className="visual">
              {v.media.map((m, j) => (
                <Thumb key={j} v={v} m={m} load={load} onOpen={(url) => setOpen({ url, v, kind: m.kind })} />
              ))}
              <figcaption>
                <span className="visual-title"><Inline text={v.title} /></span>
                <span className="muted small">
                  {v.date}
                  {v.build && <> · <Inline text={v.build} /></>}
                </span>
                {v.extra && <div className="small"><Blocks body={v.extra} /></div>}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      {open && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            {open.kind === 'video' ? <video src={open.url} controls autoPlay playsInline /> : <img src={open.url} alt={open.v.title} />}
            <p>
              <strong><Inline text={open.v.title} /></strong>
              <br />
              <span className="muted small">{open.v.date}{open.v.build && <> · <Inline text={open.v.build} /></>}</span>
            </p>
            <button type="button" onClick={() => setOpen(null)}>Close</button>
          </div>
        </div>
      )}
    </section>
  );
}
