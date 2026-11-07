import { Inline } from '../markdown';
import type { Step } from '../status';

export function StepItem({
  step,
  onToggle,
  pending,
  context,
}: {
  step: Step;
  onToggle: (done: boolean) => void;
  pending?: boolean;
  context?: React.ReactNode;
}) {
  return (
    <li className={`step${step.done ? ' done' : ''}${pending ? ' pending' : ''}`}>
      <label>
        <input type="checkbox" checked={step.done} onChange={(e) => onToggle(e.target.checked)} />
        <span className="box" aria-hidden="true">
          <svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" /></svg>
        </span>
        <span className="step-text">
          <Inline text={step.text} />
          {context && <span className="step-context">{context}</span>}
        </span>
      </label>
    </li>
  );
}
