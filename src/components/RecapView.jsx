import { marked } from 'marked';
import { usePolling } from '../hooks/usePolling.js';
import { AGENT_COLORS } from '../utils/agentColors.js';
import { formatRelativeTime } from '../utils/time.js';
import { sanitizeMarkedHtml } from '../utils/sanitize.js';

const TYPE_CONFIG = {
  bug_fix:     { label: 'Bug Fix',     icon: '🐛', cls: 'recap-type-bug'     },
  feature:     { label: 'Feature',     icon: '✨', cls: 'recap-type-feature'  },
  refactor:    { label: 'Refactor',    icon: '🔧', cls: 'recap-type-refactor' },
  code_review: { label: 'Code Review', icon: '👁',  cls: 'recap-type-review'  },
  security:    { label: 'Security',    icon: '🔒', cls: 'recap-type-security' },
  deploy:      { label: 'Deploy',      icon: '🚀', cls: 'recap-type-deploy'   },
};

function getLabels(type) {
  switch (type) {
    case 'bug_fix':
      return { why: 'Why this bug existed', how: 'How it was fixed' };
    case 'feature':
      return { why: 'Why it was built', how: 'How it works' };
    case 'refactor':
      return { why: 'Why this refactor', how: 'What changed' };
    case 'code_review':
      return { why: 'What was audited', how: 'Issues found / decisions' };
    case 'security':
      return { why: 'Vulnerability identified', how: 'Fix applied' };
    case 'deploy':
      return { why: 'Why this deployment', how: 'What was deployed' };
    default:
      return { why: 'Context', how: 'Implementation' };
  }
}

function RecapCard({ recap }) {
  const typeConfig = TYPE_CONFIG[recap.type] ?? { label: recap.type, icon: '📝', cls: 'recap-type-feature' };
  const labels = getLabels(recap.type);
  const agentColor = AGENT_COLORS[recap.agentAuthor] ?? '#6c63ff';
  const hasLinks = recap.clickupUrl || recap.commitHash || recap.prUrl || recap.links?.length > 0;

  return (
    <article className="recap-card">
      <div className="recap-card-header">
        <div className="recap-card-header-left">
          <span className={`recap-type-badge ${typeConfig.cls}`}>
            <span aria-hidden="true">{typeConfig.icon}</span>
            {typeConfig.label}
          </span>
        </div>
        <div className="recap-card-header-right">
          <span
            className="recap-agent-chip"
            style={{ background: `${agentColor}22`, color: agentColor, borderColor: `${agentColor}44` }}
          >
            {recap.agentAuthor}
          </span>
          <span className="recap-date" title={new Date(recap.createdAt).toLocaleString()}>
            {formatRelativeTime(recap.createdAt)}
          </span>
        </div>
      </div>

      <div className="recap-card-body">
        <div className="recap-summary-box">
          <div className="recap-section-eyebrow">Summary</div>
          <p className="recap-summary-text">{recap.summary}</p>
        </div>

        {recap.type === 'bug_fix' && (recap.bugSymptom || recap.bugOrigin) && (
          <div className="recap-bug-block">
            {recap.bugSymptom && (
              <div className="recap-section">
                <div className="recap-section-label recap-label-red">🔴 Visible symptom</div>
                <p className="recap-section-text">{recap.bugSymptom}</p>
              </div>
            )}
            {recap.bugOrigin && (
              <div className="recap-section">
                <div className="recap-section-label recap-label-red">Root cause</div>
                <p className="recap-section-text">{recap.bugOrigin}</p>
              </div>
            )}
          </div>
        )}

        {recap.why && (
          <div className="recap-section">
            <div className="recap-section-label">{labels.why}</div>
            <p className="recap-section-text">{recap.why}</p>
          </div>
        )}

        {recap.how && (
          <div className="recap-section">
            <div className="recap-section-label">{labels.how}</div>
            <p className="recap-section-text">{recap.how}</p>
          </div>
        )}

        {recap.outcome && (
          <div className="recap-section recap-outcome-section">
            <div className="recap-section-label recap-label-green">✅ Outcome</div>
            <p className="recap-section-text">{recap.outcome}</p>
          </div>
        )}

        {recap.qaSteps && (
          <div className="recap-section">
            <div className="recap-section-label">🧪 QA Tests</div>
            <p className="recap-section-text recap-qa-text">{recap.qaSteps}</p>
          </div>
        )}

        {recap.stagingTestGuide && (
          <div className="recap-section recap-staging-guide-section">
            <div className="recap-section-label recap-label-teal">🧪 How to test on staging</div>
            <div
              className="recap-staging-guide-body"
              dangerouslySetInnerHTML={{ __html: sanitizeMarkedHtml(marked.parse(recap.stagingTestGuide)) }}
            />
          </div>
        )}

        {recap.reworkLog?.length > 0 && (
          <div className="recap-section">
            <div className="recap-section-label recap-label-orange">🔁 Rework history</div>
            <ul className="recap-rework-list">
              {recap.reworkLog.map((entry, i) => (
                <li key={i} className="recap-rework-entry">
                  <span className="recap-rework-issue">{entry.issue}</span>
                  {entry.fix && <span className="recap-rework-fix">→ {entry.fix}</span>}
                  {entry.date && (
                    <span className="recap-rework-date">
                      {formatRelativeTime(entry.date)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasLinks && (
          <div className="recap-links-row">
            {recap.clickupUrl ? (
              <a
                href={recap.clickupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="recap-link-chip recap-link-clickup"
              >
                📋 {recap.clickupTaskTitle ?? recap.clickupTaskId ?? 'ClickUp'}
              </a>
            ) : recap.clickupTaskTitle ? (
              <span className="recap-link-chip recap-link-clickup">
                📋 {recap.clickupTaskTitle}
              </span>
            ) : null}

            {recap.commitHash && (
              recap.commitUrl ? (
                <a
                  href={recap.commitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="recap-link-chip recap-link-commit"
                >
                  ⬡ {recap.commitHash.slice(0, 7)}
                  {recap.commitMessage && ` — ${recap.commitMessage}`}
                </a>
              ) : (
                <span className="recap-link-chip recap-link-commit">
                  ⬡ {recap.commitHash.slice(0, 7)}
                  {recap.commitMessage && ` — ${recap.commitMessage}`}
                </span>
              )
            )}

            {recap.prUrl && (
              <a
                href={recap.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="recap-link-chip recap-link-pr"
              >
                ⤴ Pull Request
              </a>
            )}

            {recap.links?.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="recap-link-chip"
              >
                🔗 {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export default function RecapView({ projectId }) {
  const { data, error, loading } = usePolling(`/api/projects/${projectId}/recap`, 5000);
  const recap = data && typeof data === 'object' && !Array.isArray(data) ? data : null;

  return (
    <div className="recap-view">
      <div className="recap-view-header">
        <h2 className="recap-view-title">Mission Recap</h2>
        <p className="recap-view-subtitle">
          {recap ? `Published ${formatRelativeTime(recap.createdAt)} · by ${recap.agentAuthor}` : 'No recap published yet'}
        </p>
      </div>

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
        <div className="recap-empty">
          <span className="recap-empty-icon">📋</span>
          <p>No recap published yet — the agent will submit one via the API at the end of the mission.</p>
        </div>
      )}

      {recap && <RecapCard recap={recap} />}
    </div>
  );
}
