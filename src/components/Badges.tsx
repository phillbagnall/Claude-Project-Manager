import { daysSince, isBlocked, type StatusMeta } from '../status';

export const STALE_DAYS = 14;

export function PhaseBadge({ phase }: { phase?: string }) {
  if (!phase) return null;
  return <span className={`badge phase phase-${phase.toLowerCase()}`}>{phase}</span>;
}

export function PriorityDot({ priority }: { priority?: string }) {
  if (!priority) return null;
  return (
    <span className={`prio prio-${String(priority).toLowerCase()}`} title={`${priority} priority`}>
      {String(priority).toLowerCase()}
    </span>
  );
}

export function Updated({ meta }: { meta: StatusMeta }) {
  const d = daysSince(meta.updated);
  if (d === null) return <span className="muted">no update date</span>;
  const label = d === 0 ? 'updated today' : d === 1 ? 'updated yesterday' : `updated ${d} days ago`;
  return <span className={d > STALE_DAYS ? 'stale' : 'muted'}>{label}{d > STALE_DAYS ? ' · stale' : ''}</span>;
}

export function Blocked({ meta }: { meta: StatusMeta }) {
  return isBlocked(meta) ? <span className="badge blocked">Blocked</span> : null;
}

export function Progress({ done, total }: { done: number; total: number }) {
  if (!total) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-bar"><div style={{ width: `${pct}%` }} /></div>
      <span className="progress-label">{done}/{total}</span>
    </div>
  );
}
