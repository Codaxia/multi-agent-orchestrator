import { useState } from 'react';

const NAV_LINKS = [
  { id: 'agents', label: 'Agent Pipeline', icon: '🤖' },
  { id: 'kanban', label: 'Task Kanban', icon: '📋' },
  { id: 'activity', label: 'Activity Log', icon: '📊' },
  { id: 'recap', label: 'Recap', icon: '📝' },
];

// Split projects into named groups based on "App name - Mission" (hyphen or em dash).
// Each distinct app prefix becomes its own sidebar toggle, even with a single mission.
// Projects without a recognized separator are left ungrouped as a legacy fallback.
function groupProjects(projects) {
  const groupMap = {}; // groupName -> [{ project, shortLabel }]
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

export default function Sidebar({
  squads,
  selectedSquadId,
  selectedProject,
  currentView,
  onSquadClick,
  onProjectClick,
  onViewChange,
  isOpen,
  onClose,
}) {
  const [collapsedSquads, setCollapsedSquads] = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState({});

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

  function handleViewChange(view) {
    onViewChange(view);
    onClose?.();
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

                    {/* Grouped projects */}
                    {groups.map(({ name, items }) => {
                      const groupKey = `${squad.id}::${name}`;
                      const isGroupCollapsed = !!collapsedGroups[groupKey];
                      const groupHasActive = items.some(
                        ({ project }) => selectedProject?.id === project.id
                      );

                      return (
                        <div key={groupKey} className="project-group">
                          <button
                            className={`project-group-header${groupHasActive ? ' has-active' : ''}`}
                            onClick={(e) => toggleGroup(e, groupKey)}
                          >
                            <span className="project-group-icon">📂</span>
                            <span className="project-group-name">{name}</span>
                            <span className="project-group-count">{items.length}</span>
                            <span className="project-group-chevron">
                              {isGroupCollapsed ? '▶' : '▼'}
                            </span>
                          </button>

                          {!isGroupCollapsed && (
                            <div className="project-group-items">
                              {items.map(({ project, shortLabel }) => {
                                const isProjectActive = selectedProject?.id === project.id;
                                return (
                                  <button
                                    key={project.id}
                                    className={`squad-project-btn squad-project-btn--nested${isProjectActive ? ' active' : ''}`}
                                    onClick={() => handleProjectClick(project.id, squad.id)}
                                  >
                                    {isProjectActive && <span className="squad-project-dot" />}
                                    <span className="squad-project-icon">📁</span>
                                    <span className="squad-project-main">
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

                    {/* Ungrouped projects */}
                    {ungrouped.map(({ project, shortLabel }) => {
                      const isProjectActive = selectedProject?.id === project.id;
                      return (
                        <button
                          key={project.id}
                          className={`squad-project-btn${isProjectActive ? ' active' : ''}`}
                          onClick={() => handleProjectClick(project.id, squad.id)}
                        >
                          {isProjectActive && <span className="squad-project-dot" />}
                          <span className="squad-project-icon">📁</span>
                          <span className="squad-project-main">
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

      {selectedProject && (
        <nav className="sidebar-project-nav">
          <div className="sidebar-section-label">MISSION</div>
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              className={`sidebar-link${currentView === link.id ? ' active' : ''}`}
              onClick={() => handleViewChange(link.id)}
              aria-current={currentView === link.id ? 'page' : undefined}
            >
              <span className="sidebar-link-icon" aria-hidden="true">{link.icon}</span>
              {link.label}
            </button>
          ))}
        </nav>
      )}

      <div className="sidebar-footer">
        Dashboard Agents v1.0
        <br />
        AI pipeline supervision
      </div>
    </aside>
  );
}
