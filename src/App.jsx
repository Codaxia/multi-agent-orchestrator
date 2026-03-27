import { useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import AgentBoard from './components/AgentBoard.jsx';
import TaskKanban from './components/TaskKanban.jsx';
import ActivityLog from './components/ActivityLog.jsx';

const PROJECTS = [
  { id: 'codaxia', label: 'Codaxia Agent IA', apiBase: '' },
  { id: 'atuvu', label: 'atuvu', apiBase: '/atuvu' },
];

export default function App() {
  const [currentView, setCurrentView] = useState('agents');
  const [currentProjectId, setCurrentProjectId] = useState('codaxia');

  const project = PROJECTS.find((p) => p.id === currentProjectId);

  function handleProjectChange(id) {
    setCurrentProjectId(id);
    setCurrentView('agents');
  }

  return (
    <div className="app-layout">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        projects={PROJECTS}
        currentProjectId={currentProjectId}
        onProjectChange={handleProjectChange}
      />
      <div className="app-main">
        <Header projectName={project.label} />
        <main className="app-content">
          {currentView === 'agents' && (
            <AgentBoard key={currentProjectId} apiBase={project.apiBase} />
          )}
          {currentView === 'kanban' && (
            <TaskKanban key={currentProjectId} apiBase={project.apiBase} />
          )}
          {currentView === 'activity' && (
            <ActivityLog key={currentProjectId} apiBase={project.apiBase} />
          )}
        </main>
      </div>
    </div>
  );
}
