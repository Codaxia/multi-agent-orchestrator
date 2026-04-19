import { marked } from 'marked';
import { usePolling } from '../hooks/usePolling.js';
import { AGENT_COLORS, AGENT_DISPLAY_NAMES } from '../utils/agentColors.js';
import { formatRelativeTime } from '../utils/time.js';
import { sanitizeMarkedHtml } from '../utils/sanitize.js';

const TYPE_LABELS = {
  bug_fix: 'Bug Fix',
  feature: 'Feature',
  refactor: 'Refactor',
  code_review: 'Code Review',
  security: 'Security',
  deploy: 'Deploy',
};

function getLabels(type) {
  switch (type) {
    case 'bug_fix':     return { why: 'Why this bug existed', how: 'How it was fixed' };
    case 'feature':     return { why: 'Why it was built', how: 'How it works' };
    case 'refactor':    return { why: 'Why this refactor', how: 'What changed' };
    case 'code_review': return { why: 'What was audited', how: 'Issues found / decisions' };
    case 'security':    return { why: 'Vulnerability identified', how: 'Fix applied' };
    case 'deploy':      return { why: 'Why this deployment', how: 'What was deployed' };
    default:            return { why: 'Context', how: 'Implementation' };
  }
}

function monogramOf(name) {
  const s = String(name || '').trim();
  if (!s) return '';
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

function RecapBody({ recap }) {
  const labels = getLabels(recap.type);
  const typeLabel = TYPE_LABELS[recap.type] || recap.type;
  const authorColor = AGENT_COLORS[recap.agentAuthor] ?? 'var(--fg-3)';
  const authorName = AGENT_DISPLAY_NAMES[recap.agentAuthor] || recap.agentAuthor;
  const metrics = [];
  if (recap.commitHash) metrics.push({ label: 'Commit', value: recap.commitHash.slice(0, 7) });
  if (recap.filesChanged != null) metrics.push({ label: 'Files', value: recap.filesChanged });
  if (recap.linesAdded != null) metrics.push({ label: '+ Lines', value: recap.linesAdded });
  if (recap.linesRemoved != null) metrics.push({ label: '− Lines', value: recap.linesRemoved });
  const hasLinks = recap.clickupUrl || recap.commitUrl || recap.prUrl || recap.links?.length > 0;

  return (
    <>
      <div className="recap-hero">
        <span className="recap-type-pill">{typeLabel}</span>
        <div className="recap-summary">{recap.summary}</div>
        <div className="recap-meta">
          <span className="recap-author">
            <span
              className="recap-author-av"
              style={{
                background: `color-mix(in oklch, ${authorColor} 16%, var(--bg-inset))`,
                color: authorColor,
              }}
            >
              {monogramOf(authorName)}
            </span>
            Authored by {authorName}
          </span>
          <span style={{ margin: '0 10px', color: 'var(--fg-4)' }}>·</span>
          <span>{formatRelativeTime(recap.createdAt)}</span>
        </div>
      </div>

      {metrics.length > 0 && (
        <div className="recap-metrics">
          {metrics.map((m) => (
            <div key={m.label} className="recap-metric">
              <div className="recap-metric-value">{m.value}</div>
              <div className="recap-metric-label">{m.label}</div>
            </div>
          ))}
        </div>
      )}

      {recap.type === 'bug_fix' && recap.bugSymptom && (
        <div className="recap-section recap-section--symptom">
          <div className="recap-section-title">Visible symptom</div>
          <p>{recap.bugSymptom}</p>
        </div>
      )}
      {recap.type === 'bug_fix' && recap.bugOrigin && (
        <div className="recap-section recap-section--cause">
          <div className="recap-section-title">Root cause</div>
          <p>{recap.bugOrigin}</p>
        </div>
      )}

      {recap.why && (
        <div className="recap-section recap-section--why">
          <div className="recap-section-title">{labels.why}</div>
          <p>{recap.why}</p>
        </div>
      )}

      {recap.how && (
        <div className="recap-section recap-section--how">
          <div className="recap-section-title">{labels.how}</div>
          <p>{recap.how}</p>
        </div>
      )}

      {recap.outcome && (
        <div className="recap-section recap-section--outcome">
          <div className="recap-section-title">Outcome</div>
          <p>{recap.outcome}</p>
        </div>
      )}

      {recap.qaSteps && (
        <div className="recap-section recap-section--qa">
          <div className="recap-section-title">QA steps</div>
          <div className="recap-qa">{recap.qaSteps}</div>
        </div>
      )}

      {recap.stagingTestGuide && (
        <div className="recap-section recap-section--staging">
          <div className="recap-section-title">How to test on staging</div>
          <div
            className="agent-detail-markdown"
            dangerouslySetInnerHTML={{ __html: sanitizeMarkedHtml(marked.parse(recap.stagingTestGuide)) }}
          />
        </div>
      )}

      {recap.reworkLog?.length > 0 && (
        <div className="recap-section recap-section--rework">
          <div className="recap-section-title">Rework history</div>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {recap.reworkLog.map((entry, i) => (
              <li key={i} style={{ marginBottom: 6, color: 'var(--fg-2)' }}>
                {entry.issue}{entry.fix ? ` → ${entry.fix}` : ''}
                {entry.date && (
                  <span style={{ color: 'var(--fg-4)', marginLeft: 8 }}>
                    {formatRelativeTime(entry.date)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasLinks && (
        <div className="recap-section recap-section--links">
          <div className="recap-section-title">Links</div>
          <div className="recap-links">
            {recap.clickupUrl && (
              <a href={recap.clickupUrl} target="_blank" rel="noopener noreferrer" className="recap-link-chip">
                {recap.clickupTaskTitle || recap.clickupTaskId || 'ClickUp'}
              </a>
            )}
            {recap.commitHash && (
              recap.commitUrl ? (
                <a href={recap.commitUrl} target="_blank" rel="noopener noreferrer" className="recap-link-chip">
                  {recap.commitHash.slice(0, 7)}{recap.commitMessage ? ` — ${recap.commitMessage}` : ''}
                </a>
              ) : (
                <span className="recap-link-chip">
                  {recap.commitHash.slice(0, 7)}{recap.commitMessage ? ` — ${recap.commitMessage}` : ''}
                </span>
              )
            )}
            {recap.prUrl && (
              <a href={recap.prUrl} target="_blank" rel="noopener noreferrer" className="recap-link-chip">
                Pull Request
              </a>
            )}
            {recap.links?.map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="recap-link-chip">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default function RecapView({ projectId }) {
  const { data, error, loading } = usePolling(`/api/projects/${projectId}/recap`, 5000);
  const recap = data && typeof data === 'object' && !Array.isArray(data) ? data : null;

  return (
    <div className="recap-wrap">
      {loading && !data && (
        <div className="state-container">
          <div className="state-spinner" role="status" aria-label="Loading" />
          <span>Loading…</span>
        </div>
      )}

      {error && (
        <div className="state-container">
          <span className="state-error" role="alert">{error}</span>
        </div>
      )}

      {!loading && !error && !recap && (
        <div className="welcome-hero">
          <div className="welcome-hero-title">No recap yet</div>
          <p>The agent will publish one via the API at the end of the mission.</p>
        </div>
      )}

      {recap && <RecapBody recap={recap} />}
    </div>
  );
}
