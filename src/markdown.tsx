import { Fragment, type ReactNode } from 'react';

const SAFE_URL = /^(https?:|mailto:)/i;
// Order matters: code first so its contents aren't formatted.
const TOKEN = /(`[^`]+`)|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s)<>]+)|\*([^*]+)\*/g;

/** Minimal, XSS-safe inline markdown: `code`, **bold**, *italic*, [links](url), bare URLs. */
export function Inline({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = m.index;
    if (m[1]) out.push(<code key={k}>{m[1].slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={k}>{m[2]}</strong>);
    else if (m[3] && m[4])
      out.push(SAFE_URL.test(m[4]) ? <a key={k} href={m[4]} target="_blank" rel="noreferrer">{m[3]}</a> : m[3]);
    else if (m[5]) out.push(<a key={k} href={m[5]} target="_blank" rel="noreferrer">{shortUrl(m[5])}</a>);
    else if (m[6]) out.push(<em key={k}>{m[6]}</em>);
    last = TOKEN.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out.map((n, i) => <Fragment key={i}>{n}</Fragment>)}</>;
}

export function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, '');
    const s = u.host.replace(/^www\./, '') + path;
    return s.length > 48 ? s.slice(0, 45) + '…' : s;
  } catch {
    return url;
  }
}

/** Block-level rendering for a section body: paragraphs and (non-checkbox) bullet lists, one level of nesting. */
export function Blocks({ body }: { body: string }) {
  type Item = { text: string; children: string[] };
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: Item[] = [];
  const flush = () => {
    if (para.length) blocks.push(<p key={blocks.length}><Inline text={para.join(' ')} /></p>);
    if (list.length)
      blocks.push(
        <ul key={blocks.length}>
          {list.map((item, i) => (
            <li key={i}>
              <Inline text={item.text} />
              {item.children.length > 0 && (
                <ul>{item.children.map((c, j) => <li key={j}><Inline text={c} /></li>)}</ul>
              )}
            </li>
          ))}
        </ul>,
      );
    para = [];
    list = [];
  };
  for (const line of body.split('\n')) {
    const b = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (!line.trim()) flush();
    else if (b) {
      if (para.length) flush();
      const nested = b[1].length >= 2 && list.length > 0;
      if (nested) list[list.length - 1].children.push(b[2]);
      else list.push({ text: b[2], children: [] });
    } else {
      if (list.length) flush();
      para.push(line.trim());
    }
  }
  flush();
  return <>{blocks}</>;
}
