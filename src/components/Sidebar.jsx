import { useState, useEffect } from 'react';

// Split projects into named groups based on "App name - Mission" (hyphen or em dash).
// Each distinct app prefix becomes its own sidebar toggle, even with a single mission.
// Projects without a recognized separator are left ungrouped as a legacy fallback.
function groupProjects(projects) {
  const groupMap = {};
  const ungrouped = [];

  function parseGroupedLabel(label) {
    const normalized = String(label || '').trim();
    const match = normalized.match(/^(.+?)\s(?:\u2014|-)\s(.+)$/);
    if (!match) return null;
    return { groupName: match[1].trim(), shortLabel: match[2].trim() };
  }

  projects.forEach((project) => {
    const parsed = parseGroupedLabel(project.label);
    if (!parsed) {
      ungrouped.push({ project, shortLabel: project.label });
      return;
    }

    const { groupName, shortLabel } = parsed;
    if (!groupMap[groupName]) {
      groupMap[groupName] = [];
    }
    groupMap[groupName].push({ project, shortLabel });
  });

  const groups = Object.entries(groupMap).map(([name, items]) => ({ name, items }));
  return { groups, ungrouped };
}

function loadPrivacyMode() {
  try {
    return localStorage.getItem('da-privacy-mode') === 'true';
  } catch {
    return false;
  }
}

function loadPrivateGroups() {
  try {
    const raw = localStorage.getItem('da-private-groups');
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
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
  const [collapsedSquads, setCollapsedSquads] = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(loadPrivacyMode);
  const [privateGroups, setPrivateGroups] = useState(loadPrivateGroups);

  useEffect(() => {
    try {
      localStorage.setItem('da-privacy-mode', String(privacyMode));
    } catch {}
  }, [privacyMode]);

  useEffect(() => {
    try {
      localStorage.setItem('da-private-groups', JSON.stringify([...privateGroups]));
    } catch {}
  }, [privateGroups]);

  function toggleSquad(event, squadId) {
    event.stopPropagation();
    setCollapsedSquads((prev) => ({ ...prev, [squadId]: !prev[squadId] }));
  }

  function toggleGroup(event, key) {
    event.stopPropagation();
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleSquadClick(squadId) {
    onSquadClick(squadId);
    onClose?.();
  }

  function handleProjectClick(projectId, squadId) {
    onProjectClick(projectId, squadId);
    onClose?.();
  }

  function togglePrivateGroup(groupName) {
    setPrivateGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  }

  // Collect distinct group names across all squads (preserving order of first appearance)
  const allGroupNames = (() => {
    const seen = new Set();
    const result = [];
    squads.forEach((s) => {
      (s.projects || []).forEach((p) => {
        const label = String(p.label || '').trim();
        const match = label.match(/^(.+?)\s(?:\u2014|-)\s(.+)$/);
        if (match) {
          const gName = match[1].trim();
          if (!seen.has(gName)) { seen.add(gName); result.push(gName); }
        }
      });
    });
    return result;
  })();

  function getGroupName(label) {
    const normalized = String(label || '').trim();
    const match = normalized.match(/^(.+?)\s(?:\u2014|-)\s(.+)$/);
    return match ? match[1].trim() : null;
  }

  function isBlocked(projectLabel) {
    if (!privacyMode) return false;
    const groupName = getGroupName(projectLabel);
    return groupName !== null && privateGroups.has(groupName);
  }

  return (
    <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">DA</div>
        <div className="sidebar-logo-info">
          <span className="sidebar-logo-text">Dashboard Agents</span>
          <span className="sidebar-logo-sub">AI pipeline supervision</span>
        </div>
      </div>

      <div className="sidebar-squads-wrapper">
        <div className="sidebar-section-label">SCENARIOS</div>

        <nav className="sidebar-squads">
          {squads.map((squad) => {
            const isCollapsed = !!collapsedSquads[squad.id];
            const isSquadActive = selectedSquadId === squad.id;
            const { groups, ungrouped } = groupProjects(squad.projects || []);

            return (
              <div key={squad.id} className="squad-group">
                <button
                  className={`squad-header${isSquadActive ? ' active' : ''}`}
                  onClick={() => handleSquadClick(squad.id)}
                >
                  <span className="squad-icon">{squad.icon}</span>
                  <span className="squad-label">{squad.label}</span>
                  <span className="squad-badge">{squad.agents?.length ?? 0}</span>
                  <span
                    className="squad-chevron"
                    onClick={(event) => toggleSquad(event, squad.id)}
                    role="button"
                    aria-label={isCollapsed ? 'Developper' : 'Reduire'}
                  >
                    {isCollapsed ? '▶' : '▼'}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="squad-projects">
                    {groups.map(({ name, items }) => {
                      const groupKey = `${squad.id}::${name}`;
                      const isGroupCollapsed = !!collapsedGroups[groupKey];
                      const groupHasActive = items.some(
                        ({ project }) => selectedProject?.id === project.id,
                      );

                      const groupBlocked = privacyMode && privateGroups.has(name);
                      return (
                        <div key={groupKey} className="project-group">
                          <button
                            className={`project-group-header${groupHasActive ? ' has-active' : ''}`}
                            onClick={(event) => toggleGroup(event, groupKey)}
                          >
                            <span className="project-group-icon">📂</span>
                            <span className={`project-group-name${groupBlocked ? ' privacy-blur' : ''}`}>{name}</span>
                            <span className="project-group-count">{items.length}</span>
                            <span className="project-group-chevron">
                              {isGroupCollapsed ? '▶' : '▼'}
                            </span>
                          </button>

                          {!isGroupCollapsed && (
                            <div className="project-group-items">
                              {items.map(({ project, shortLabel }) => {
                                const isProjectActive = selectedProject?.id === project.id;
                                const blocked = isBlocked(project.label);
                                return (
                                  <button
                                    key={project.id}
                                    className={`squad-project-btn squad-project-btn--nested${isProjectActive ? ' active' : ''}${blocked ? ' privacy-blocked' : ''}`}
                                    onClick={blocked ? undefined : () => handleProjectClick(project.id, squad.id)}
                                    tabIndex={blocked ? -1 : undefined}
                                  >
                                    {isProjectActive && <span className="squad-project-dot" />}
                                    <span className="squad-project-icon">📁</span>
                                    <span className={`squad-project-main${blocked ? ' privacy-blur' : ''}`}>
                                      <span>{shortLabel}</span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {ungrouped.map(({ project, shortLabel }) => {
                      const isProjectActive = selectedProject?.id === project.id;
                      const blocked = isBlocked(project.label);
                      return (
                        <button
                          key={project.id}
                          className={`squad-project-btn${isProjectActive ? ' active' : ''}${blocked ? ' privacy-blocked' : ''}`}
                          onClick={blocked ? undefined : () => handleProjectClick(project.id, squad.id)}
                          tabIndex={blocked ? -1 : undefined}
                        >
                          {isProjectActive && <span className="squad-project-dot" />}
                          <span className="squad-project-icon">📁</span>
                          <span className={`squad-project-main${blocked ? ' privacy-blur' : ''}`}>
                            <span>{shortLabel}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-panel">
          <div className="settings-panel-header">Settings</div>

          <div className="settings-row">
            <span className="settings-row-label">Privacy Mode</span>
            <button
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
              {allGroupNames.map((groupName) => (
                <label key={groupName} className="settings-project-row">
                  <input
                    type="checkbox"
                    checked={privateGroups.has(groupName)}
                    onChange={() => togglePrivateGroup(groupName)}
                    className="settings-project-checkbox"
                  />
                  <span className="settings-project-name">{groupName}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings toggle button */}
      <button
        className={`sidebar-settings-btn${showSettings ? ' active' : ''}`}
        onClick={() => setShowSettings((s) => !s)}
        aria-expanded={showSettings}
      >
        <span className="sidebar-settings-icon">⚙</span>
        <span>Settings</span>
        {privacyMode && <span className="sidebar-settings-badge">●</span>}
      </button>

      <div className="sidebar-footer">
        Dashboard Agents v1.0
        <br />
        AI pipeline supervision
      </div>
    </aside>
  );
}
