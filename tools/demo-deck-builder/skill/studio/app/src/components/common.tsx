import type { StudioIssue } from '../types';

export function PanelTitle({ label }: { label: string }) {
  return <h2>{label}</h2>;
}

export function Stat({ label, value, tone = '' }: { label: string; value: number; tone?: string }) {
  return (
    <div className={`stat ${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function LabelValue({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div className={`label-value ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function ThemeToken({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="theme-token">
      <span className="swatch" style={color ? { backgroundColor: color } : undefined} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export function ChecksPanel({ issues }: { issues: StudioIssue[] }) {
  return (
    <div className="checks-panel">
      <div className="issue-list">
        {issues.length ? (
          issues.map((issue, index) => (
            <div className={`issue ${issue.type}`} key={`${issue.type}-${index}`}>
              {issue.text}
            </div>
          ))
        ) : (
          <div className="empty">No lint findings.</div>
        )}
      </div>
    </div>
  );
}

export function FatalError({ message }: { message: string }) {
  return (
    <div className="fatal">
      <strong>Demo Deck Studio could not load.</strong>
      <span>{message}</span>
    </div>
  );
}
