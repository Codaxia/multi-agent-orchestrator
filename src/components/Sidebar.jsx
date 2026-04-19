import { useState, useEffect } from 'react';
import Icon from './Icon.jsx';

const SCENARIO_ICONS = {
  'full-build': 'cpu',
  'feature-ops': 'kanban',
  'code-review': 'activity',
  'rework': 'file',
};

function parseGroupedLabel(label) {
  const normalized = String(label || '').trim();
  const match = normalized.match(/^(.+?)\s(?:\u2014|-)\s(.+)$/);
  if (!match) return null;
  return { groupName: match[1].trim(), shortLabel: match[2].trim() };
}

function loadPrivacyMode() {
  try { return localStorage.getItem('da-privacy-mode') === 'true'; } catch { return false; }
}

function loadPrivateGroups() {
  try {
    const raw = localStorage.getItem('da-private-groups');
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

export default function Sidebar({
  squads,
  selectedSquadId,
  selectedProject,
  onSquadClick,
  onProjectClick,
  isOpen,
  onClose,
}) {
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(loadPrivacyMode);
  const [privateGroups, setPrivateGroups] = useState(loadPrivateGroups);
  const [query, setQuery] = useState('');

  useEffect(() => {
    try { localStorage.setItem('da-privacy-mode', String(privacyMode)); } catch {}
  }, [privacyMode]);

  useEffect(() => {
    try { localStorage.setItem('da-private-groups', JSON.stringify([...privateGroups])); } catch {}
  }, [privateGroups]);

  function toggleGroup(key) {
    setCollapsedGroups((p) => ({ ...p, [key]: !p[key] }));
  }
  function togglePrivateGroup(name) {
    setPrivateGroups((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  function handleSquadClick(id) { onSquadClick(id); onClose?.(); }
  function handleProjectClick(pid, sid) { onProjectClick(pid, sid); onClose?.(); }

  const allGroupNames = (() => {
    const seen = new Set();
    const result = [];
    squads.forEach((s) => {
      (s.projects || []).forEach((p) => {
        const parsed = parseGroupedLabel(p.label);
        if (parsed && !seen.has(parsed.groupName)) {
          seen.add(parsed.groupName);
          result.push(parsed.groupName);
        }
      });
    });
    return result;
  })();

  function isBlocked(label) {
    if (!privacyMode) return false;
    const parsed = parseGroupedLabel(label);
    return parsed !== null && privateGroups.has(parsed.groupName);
  }

  function matchesQuery(text) {
    if (!query) return true;
    return String(text).toLowerCase().includes(query.toLowerCase());
  }

  return (
    <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-mark">D</div>
        <div>
          <div className="brand-name">Dashboard Agents</div>
          <div className="brand-sub">AI pipeline supervision</div>
        </div>
      </div>

      <div className="sidebar-search">
        <input
          className="search-input"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="sb-body">
        <div className="sb-section">
          <div className="sb-section-label">Scenarios</div>
          {squads.map((squad) => {
            const isActive = selectedSquadId === squad.id;
            return (
              <button
                key={squad.id}
                className={`nav-item${isActive ? ' is-active' : ''}`}
                onClick={() => handleSquadClick(squad.id)}
              >
                <span className="nav-icon">
                  <Icon name={SCENARIO_ICONS[squad.id] || 'cpu'} size={14} />
                </span>
                <span className="nav-label">{squad.label}</span>
                <span className="nav-count">{squad.projects?.length ?? 0}</span>
              </button>
            );
          })}
        </div>

        <div className="sb-section">
          <div className="sb-section-label">Projects</div>
          {squads.filter((s) => !selectedSquadId || s.id === selectedSquadId).map((squad) => {
            const projects = squad.projects || [];
            const grouped = {};
            const ungrouped = [];
            projects.forEach((p) => {
              const parsed = parseGroupedLabel(p.label);
              if (parsed) {
                (grouped[parsed.groupName] = grouped[parsed.groupName] || []).push({ project: p, shortLabel: parsed.shortLabel });
              } else {
                ungrouped.push({ project: p, shortLabel: p.label });
              }
            });

            return (
              <div key={squad.id}>
                {Object.entries(grouped).map(([name, items]) => {
                  const key = `${squad.id}::${name}`;
                  const isCollapsed = !!collapsedGroups[key];
                  const groupBlocked = privacyMode && privateGroups.has(name);
                  const visibleItems = items.filter(({ shortLabel, project }) =>
                    matchesQuery(shortLabel) || matchesQuery(project.label)
                  );
                  if (query && visibleItems.length === 0) return null;
                  return (
                    <div key={key}>
                      <button
                        className={`group-header${isCollapsed ? ' is-collapsed' : ''}`}
                        onClick={() => toggleGroup(key)}
                        aria-expanded={!isCollapsed}
                      >
                        <span className={groupBlocked ? 'privacy-blur' : ''}>{name}</span>
                        <span className="group-count">{visibleItems.length}</span>
                        <span className={`group-caret${isCollapsed ? ' collapsed' : ''}`} aria-hidden="true">
                          <Icon name="chevronDown" size={12} />
                        </span>
                      </button>
                      {!isCollapsed && visibleItems.map(({ project, shortLabel }) => {
                        const isActive = selectedProject?.id === project.id;
                        const blocked = isBlocked(project.label);
                        return (
                          <button
                            key={project.id}
                            className={`project-item${isActive ? ' is-active' : ''}${blocked ? ' privacy-blocked' : ''}`}
                            onClick={blocked ? undefined : () => handleProjectClick(project.id, squad.id)}
                            tabIndex={blocked ? -1 : undefined}
                          >
                            <span className={`project-dot ${project.status || 'idle'}`} />
                            <span className={`project-label${blocked ? ' privacy-blur' : ''}`}>{shortLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
                {ungrouped
                  .filter(({ shortLabel }) => matchesQuery(shortLabel))
                  .map(({ project, shortLabel }) => {
                    const isActive = selectedProject?.id === project.id;
                    const blocked = isBlocked(project.label);
                    return (
                      <button
                        key={project.id}
                        className={`project-item${isActive ? ' is-active' : ''}${blocked ? ' privacy-blocked' : ''}`}
                        onClick={blocked ? undefined : () => handleProjectClick(project.id, squad.id)}
                        tabIndex={blocked ? -1 : undefined}
                        style={{ paddingLeft: 30 }}
                      >
                        <span className={`project-dot ${project.status || 'idle'}`} />
                        <span className={`project-label${blocked ? ' privacy-blur' : ''}`}>{shortLabel}</span>
                      </button>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="sidebar-footer">
        {showSettings && (
          <div className="settings-panel">
            <div className="settings-panel-header">Settings</div>
            <div className="settings-row">
              <span className="settings-row-label">Privacy mode</span>
              <button
                type="button"
                className={`privacy-toggle${privacyMode ? ' privacy-toggle--on' : ''}`}
                onClick={() => setPrivacyMode((m) => !m)}
                aria-pressed={privacyMode}
              >
                <span className="privacy-toggle-knob" />
              </button>
            </div>
            {allGroupNames.length > 0 && (
              <div className="settings-projects">
                <div className="settings-projects-label">Private groups</div>
                {allGroupNames.map((name) => (
                  <label key={name} className="settings-project-row">
                    <input
                      type="checkbox"
                      className="settings-project-checkbox"
                      checked={privateGroups.has(name)}
                      onChange={() => togglePrivateGroup(name)}
                    />
                    <span>{name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="user-avatar">DA</div>
        <div className="user-meta">
          <div>Dashboard Agents</div>
          <div className="user-sub">v1.0</div>
        </div>
        <button
          className="icon-btn"
          title="Settings"
          onClick={() => setShowSettings((s) => !s)}
          aria-expanded={showSettings}
        >
          <Icon name="settings" size={14} />
        </button>
      </div>
    </aside>
  );
}
