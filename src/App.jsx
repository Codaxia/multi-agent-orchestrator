import { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
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
  if (!parsed || typeof parsed !== 'object') {
    return DEFAULT_SELECTION;
  }

  const next = {
    squadId: typeof parsed.squadId === 'string' ? parsed.squadId : DEFAULT_SELECTION.squadId,
    projectId: parsed.projectId ?? DEFAULT_SELECTION.projectId,
    view: VALID_VIEWS.has(parsed.view) ? parsed.view : DEFAULT_SELECTION.view,
  };

  if (next.squadId === 'support-ops') {
    next.squadId = 'feature-ops';
  }

  if (next.projectId === 'sample') {
    next.projectId = null;
  }

  return next;
}

function readStoredSelection() {
  if (typeof window === 'undefined') {
    return DEFAULT_SELECTION;
  }

  try {
    const storageKeys = [DASHBOARD_SELECTION_KEY, ...LEGACY_SELECTION_KEYS];

    for (const key of storageKeys) {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        continue;
      }

      const normalized = normalizeStoredSelection(JSON.parse(raw));
      LEGACY_SELECTION_KEYS.forEach((legacyKey) => window.localStorage.removeItem(legacyKey));
      return normalized;
    }
  } catch {
    // Ignore invalid persisted state and fall back to the default landing page.
  }

  LEGACY_SELECTION_KEYS.forEach((legacyKey) => window.localStorage.removeItem(legacyKey));
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
  const { data: workspace, error, loading } = usePolling('/api/workspace', 4000);

  const selected = useMemo(() => {
    if (!workspace) {
      return { squad: null, project: null };
    }

    let current = findProject(workspace, selectedSquadId, selectedProjectId);
    if (current.squad && (selectedProjectId === null || current.project)) {
      return current;
    }

    const fallbackSquad = workspace.squads?.[0] ?? null;
    const fallbackProject = fallbackSquad?.projects?.[0] ?? null;
    return {
      squad: fallbackSquad,
      project: fallbackProject && selectedProjectId !== null ? fallbackProject : null,
    };
  }, [workspace, selectedProjectId, selectedSquadId]);

  useEffect(() => {
    if (!workspace || !selected.squad) {
      return;
    }

    if (selected.squad.id !== selectedSquadId) {
      setSelectedSquadId(selected.squad.id);
    }

    if ((selected.project?.id ?? null) !== (selectedProjectId ?? null) && selectedProjectId !== null) {
      setSelectedProjectId(selected.project?.id ?? null);
    }
  }, [selected, selectedProjectId, selectedSquadId, workspace]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    LEGACY_SELECTION_KEYS.forEach((legacyKey) => window.localStorage.removeItem(legacyKey));
    window.localStorage.setItem(
      DASHBOARD_SELECTION_KEY,
      JSON.stringify({
        squadId: selectedSquadId,
        projectId: selectedProjectId,
        view: currentView,
      }),
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

  const headerTitle = selected.project
    ? `${selected.squad?.label} / ${selected.project.label}`
    : selected.squad?.label ?? 'Dashboard';

  return (
    <div className="app-layout">
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
        currentView={currentView}
        onSquadClick={handleSquadClick}
        onProjectClick={handleProjectClick}
        onViewChange={setCurrentView}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="app-main">
        <Header title={headerTitle} status="live" onMenuClick={() => setSidebarOpen(true)} />
        <main className="app-content">
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
            <div className="squad-welcome">
              <span className="squad-welcome-icon">🤖</span>
              <p>Select a scenario to get started.</p>
            </div>
          )}

          {workspace && selected.squad && !selected.project && (
            <SquadOverview squad={selected.squad} />
          )}

          {selected.project && currentView === 'agents' && (
            <AgentBoard
              key={selected.project.id}
              project={selected.project}
            />
          )}
          {selected.project && currentView === 'kanban' && (
            <TaskKanban
              key={selected.project.id}
              projectId={selected.project.id}
            />
          )}
          {selected.project && currentView === 'activity' && (
            <ActivityLog
              key={selected.project.id}
              projectId={selected.project.id}
            />
          )}
          {selected.project && currentView === 'recap' && (
            <RecapView
              key={selected.project.id}
              projectId={selected.project.id}
            />
          )}
        </main>
      </div>
    </div>
  );
}
