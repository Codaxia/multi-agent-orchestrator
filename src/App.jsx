import { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import MissionTabs from './components/MissionTabs.jsx';
import AgentBoard from './components/AgentBoard.jsx';
import TaskKanban from './components/TaskKanban.jsx';
import ActivityLog from './components/ActivityLog.jsx';
import RecapView from './components/RecapView.jsx';
import SquadOverview from './components/SquadOverview.jsx';
import { usePolling } from './hooks/usePolling.js';

const DASHBOARD_SELECTION_KEY = 'dashboard-agents-selection';
const LEGACY_SELECTION_KEYS = [];
const VALID_VIEWS = new Set(['agents', 'kanban', 'activity', 'recap']);
const DEFAULT_SELECTION = {
  squadId: 'full-build',
  projectId: 'demo',
  view: 'agents',
};

function normalizeStoredSelection(parsed) {
  if (!parsed || typeof parsed !== 'object') return DEFAULT_SELECTION;
  const next = {
    squadId: typeof parsed.squadId === 'string' ? parsed.squadId : DEFAULT_SELECTION.squadId,
    projectId: parsed.projectId ?? DEFAULT_SELECTION.projectId,
    view: VALID_VIEWS.has(parsed.view) ? parsed.view : DEFAULT_SELECTION.view,
  };
  if (next.squadId === 'support-ops') next.squadId = 'feature-ops';
  if (next.projectId === 'sample') next.projectId = null;
  return next;
}

function readStoredSelection() {
  if (typeof window === 'undefined') return DEFAULT_SELECTION;
  try {
    const storageKeys = [DASHBOARD_SELECTION_KEY, ...LEGACY_SELECTION_KEYS];
    for (const key of storageKeys) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const normalized = normalizeStoredSelection(JSON.parse(raw));
      LEGACY_SELECTION_KEYS.forEach((k) => window.localStorage.removeItem(k));
      return normalized;
    }
  } catch {}
  LEGACY_SELECTION_KEYS.forEach((k) => window.localStorage.removeItem(k));
  return DEFAULT_SELECTION;
}

function findProject(workspace, squadId, projectId) {
  const squad = workspace?.squads?.find((item) => item.id === squadId) || null;
  const project = squad?.projects?.find((item) => item.id === projectId) || null;
  return { squad, project };
}

export default function App() {
  const initialSelection = readStoredSelection();
  const [selectedSquadId, setSelectedSquadId] = useState(initialSelection.squadId);
  const [selectedProjectId, setSelectedProjectId] = useState(initialSelection.projectId);
  const [currentView, setCurrentView] = useState(initialSelection.view);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try { return localStorage.getItem('da-theme') === 'dark'; } catch { return false; }
  });
  const { data: workspace, error, loading } = usePolling('/api/workspace', 4000);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    try { localStorage.setItem('da-theme', isDarkMode ? 'dark' : 'light'); } catch {}
  }, [isDarkMode]);

  const selected = useMemo(() => {
    if (!workspace) return { squad: null, project: null };
    let current = findProject(workspace, selectedSquadId, selectedProjectId);
    if (current.squad && (selectedProjectId === null || current.project)) return current;
    const fallbackSquad = workspace.squads?.[0] ?? null;
    const fallbackProject = fallbackSquad?.projects?.[0] ?? null;
    return {
      squad: fallbackSquad,
      project: fallbackProject && selectedProjectId !== null ? fallbackProject : null,
    };
  }, [workspace, selectedProjectId, selectedSquadId]);

  useEffect(() => {
    if (!workspace || !selected.squad) return;
    if (selected.squad.id !== selectedSquadId) setSelectedSquadId(selected.squad.id);
    if ((selected.project?.id ?? null) !== (selectedProjectId ?? null) && selectedProjectId !== null) {
      setSelectedProjectId(selected.project?.id ?? null);
    }
  }, [selected, selectedProjectId, selectedSquadId, workspace]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    LEGACY_SELECTION_KEYS.forEach((k) => window.localStorage.removeItem(k));
    window.localStorage.setItem(
      DASHBOARD_SELECTION_KEY,
      JSON.stringify({ squadId: selectedSquadId, projectId: selectedProjectId, view: currentView }),
    );
  }, [selectedProjectId, selectedSquadId, currentView]);

  function handleSquadClick(squadId) {
    const squad = workspace?.squads?.find((s) => s.id === squadId);
    const firstProject = squad?.projects?.[0] ?? null;
    setSelectedSquadId(squadId);
    setSelectedProjectId(firstProject?.id ?? null);
    setCurrentView('agents');
  }

  function handleProjectClick(projectId, squadId) {
    setSelectedSquadId(squadId);
    setSelectedProjectId(projectId);
    setCurrentView('kanban');
  }

  const breadcrumbParts = [];
  if (selected.squad) breadcrumbParts.push(selected.squad.label);
  if (selected.project) breadcrumbParts.push(selected.project.label);

  return (
    <div className="app">
      {sidebarOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar
        squads={workspace?.squads ?? []}
        selectedSquadId={selected.squad?.id ?? null}
        selectedProject={selected.project}
        onSquadClick={handleSquadClick}
        onProjectClick={handleProjectClick}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main">
        <Header
          breadcrumbParts={breadcrumbParts}
          status={error ? 'error' : 'live'}
          onMenuClick={() => setSidebarOpen(true)}
          isDarkMode={isDarkMode}
          onThemeToggle={() => setIsDarkMode((v) => !v)}
        />
        {selected.project && (
          <MissionTabs currentView={currentView} onViewChange={setCurrentView} />
        )}
        <main className="content">
          {loading && !workspace && (
            <div className="state-container">
              <div className="state-spinner" role="status" aria-label="Loading workspace" />
              <span>Loading workspace…</span>
            </div>
          )}

          {error && !workspace && (
            <div className="state-container">
              <span className="state-error" role="alert">
                Failed to load workspace: {error}
              </span>
            </div>
          )}

          {workspace && !selected.squad && (
            <div className="welcome-hero">
              <div className="welcome-hero-title">Welcome to Dashboard Agents</div>
              <p>Select a scenario to get started.</p>
            </div>
          )}

          {workspace && selected.squad && !selected.project && (
            <div className="view-wrap view-enter">
              <SquadOverview squad={selected.squad} />
            </div>
          )}

          {selected.project && currentView === 'agents' && (
            <div className="view-wrap view-enter">
              <AgentBoard key={selected.project.id} project={selected.project} />
            </div>
          )}
          {selected.project && currentView === 'kanban' && (
            <div className="view-wrap view-enter">
              <TaskKanban key={selected.project.id} projectId={selected.project.id} />
            </div>
          )}
          {selected.project && currentView === 'activity' && (
            <div className="view-wrap view-enter">
              <ActivityLog key={selected.project.id} projectId={selected.project.id} />
            </div>
          )}
          {selected.project && currentView === 'recap' && (
            <div className="view-wrap view-enter">
              <RecapView key={selected.project.id} projectId={selected.project.id} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
