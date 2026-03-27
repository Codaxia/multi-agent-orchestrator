export default function Sidebar({ currentView, onViewChange, projects, currentProjectId, onProjectChange }) {
  const links = [
    { id: 'agents', label: 'Agent Pipeline', icon: '🤖' },
    { id: 'kanban', label: 'Task Kanban', icon: '📋' },
    { id: 'activity', label: 'Activity Log', icon: '📊' },
  ];

  const projectIcons = { codaxia: '🏗️', atuvu: '🚀' };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">C</div>
        <span className="sidebar-logo-text">Codaxia</span>
      </div>

      <div className="sidebar-projects">
        <div className="sidebar-label">Projets</div>
        {projects.map((project) => (
          <button
            key={project.id}
            className={`sidebar-link${currentProjectId === project.id ? ' active project-active' : ''}`}
            onClick={() => onProjectChange(project.id)}
            aria-pressed={currentProjectId === project.id}
          >
            <span className="sidebar-link-icon" aria-hidden="true">
              {projectIcons[project.id] ?? '📁'}
            </span>
            {project.label}
          </button>
        ))}
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-label">Dashboard</div>
        {links.map((link) => (
          <button
            key={link.id}
            className={`sidebar-link ${currentView === link.id ? 'active' : ''}`}
            onClick={() => onViewChange(link.id)}
            aria-current={currentView === link.id ? 'page' : undefined}
          >
            <span className="sidebar-link-icon" aria-hidden="true">{link.icon}</span>
            {link.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        Codaxia Pipeline v2.0
        <br />
        Multi-agent system
      </div>
    </aside>
  );
}
