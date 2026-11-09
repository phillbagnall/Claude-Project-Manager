import { useEffect, useRef, useState } from 'react';
import { Blocks, Inline } from '../markdown';
import { splitNotes } from './NoteList';
import { Panel } from './Panel';

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

type Slide = { v: Visual; m: Visual['media'][number] };

function LightboxMedia({ slide, load }: { slide: Slide; load?: MediaLoader }) {
  const { url, error } = useMedia(slide.m.src, load);
  if (error) return <p className="muted small lightbox-msg">{error}</p>;
  if (!url) return <p className="muted small lightbox-msg">Loading…</p>;
  return slide.m.kind === 'video' ? (
    <video src={url} controls autoPlay playsInline />
  ) : (
    <img src={url} alt={slide.m.label || slide.v.title} draggable={false} />
  );
}

/** Full-screen gallery: arrow keys, swipe, or the on-screen arrows move between visuals. */
function Lightbox({ slides, index, setIndex, load, onClose }: { slides: Slide[]; index: number; setIndex: (i: number) => void; load?: MediaLoader; onClose: () => void }) {
  const n = slides.length;
  const prev = () => setIndex((index - 1 + n) % n);
  const next = () => setIndex((index + 1) % n);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const { v } = slides[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && n > 1) prev();
      else if (e.key === 'ArrowRight' && n > 1) next();
    };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  });

  // Warm up the neighbours so swiping feels instant.
  useEffect(() => {
    if (!load || n < 2) return;
    for (const i of [index - 1, index + 1]) {
      const src = slides[(i + n) % n].m.src;
      if (!/^https?:\/\//i.test(src)) load(src.replace(/^\.?\//, '')).catch(() => undefined);
    }
  }, [index, load, n, slides]);

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Visuals gallery" onClick={onClose}>
      <div
        className="lightbox-inner"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const t = touch.current;
          touch.current = null;
          if (!t || n < 2) return;
          const dx = e.changedTouches[0].clientX - t.x;
          const dy = e.changedTouches[0].clientY - t.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? next : prev)();
        }}
      >
        <div className="lightbox-stage">
          <LightboxMedia key={slides[index].m.src} slide={slides[index]} load={load} />
          {n > 1 && (
            <>
              <button type="button" className="gallery-nav prev" onClick={prev} aria-label="Previous visual" title="Previous (←)">
                <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg>
              </button>
              <button type="button" className="gallery-nav next" onClick={next} aria-label="Next visual" title="Next (→)">
                <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
              </button>
            </>
          )}
        </div>
        <div className="lightbox-foot">
          <p>
            <strong><Inline text={v.title} /></strong>
            <br />
            <span className="muted small">{v.date}{v.build && <> · <Inline text={v.build} /></>}</span>
          </p>
          {n > 1 && <span className="muted small gallery-count">{index + 1} / {n}</span>}
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export function VisualsPanel({ body, load, collapsed, onToggle }: { body: string; load?: MediaLoader; collapsed: boolean; onToggle: () => void }) {
  const visuals = [...parseVisuals(body)].reverse();
  const slides: Slide[] = visuals.flatMap((v) => v.media.map((m) => ({ v, m })));
  const [open, setOpen] = useState<number | null>(null);

  return (
    <Panel title="Visuals" collapsed={collapsed} onToggle={onToggle}>
      {visuals.length === 0 ? (
        <p className="muted small">Screenshots and videos that Claude takes while building this project appear here.</p>
      ) : (
        <div className="visual-grid">
          {visuals.map((v, i) => (
            <figure key={i} className="visual">
              {v.media.map((m, j) => (
                <Thumb key={j} v={v} m={m} load={load} onOpen={() => setOpen(slides.findIndex((s) => s.m === m))} />
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
      {open !== null && slides[open] && (
        <Lightbox slides={slides} index={open} setIndex={setOpen} load={load} onClose={() => setOpen(null)} />
      )}
    </Panel>
  );
}
