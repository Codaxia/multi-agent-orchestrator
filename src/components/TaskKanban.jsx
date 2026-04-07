import { useState, useEffect } from 'react';
import TaskCard from './TaskCard.jsx';
import TaskDetailPanel from './TaskDetailPanel.jsx';
import { usePolling } from '../hooks/usePolling.js';

const COLUMNS = ['Backlog', 'In Progress', 'In Review', 'QA', 'Done'];

const COLUMN_HEADER_CLASSES = {
  Backlog: 'col-backlog',
  'In Progress': 'col-inprogress',
  'In Review': 'col-inreview',
  QA: 'col-qa',
  Done: 'col-done',
};

export default function TaskKanban({ projectId }) {
  const { data, error, loading } = usePolling(`/api/projects/${projectId}/tasks`, 2500);
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  useEffect(() => {
    if (data?.tasks) {
      setTasks(data.tasks);
    }
  }, [data]);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  if (loading) {
    return (
      <div className="state-container">
        <div className="state-spinner" role="status" aria-label="Loading tasks" />
        <span>Loading tasks…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="state-container">
        <span className="state-error" role="alert">
          Failed to load tasks: {error}
        </span>
      </div>
    );
  }

  return (
    <div className="kanban-wrapper">
      <section className="workspace-panel" aria-label="Task Kanban Board">
        <div className="workspace-panel-head">
          <div>
            <p className="workspace-panel-eyebrow">Flow management</p>
            <h2 className="kanban-title">Task Kanban</h2>
            <p className="kanban-subtitle">
              {tasks.length} tasks across {COLUMNS.length} columns.
            </p>
          </div>
          <div className="workspace-stats">
            <span className="workspace-stat-pill">{tasks.length} tasks</span>
            <span className="workspace-stat-pill">Polling 2.5s</span>
            {selectedTask && <span className="workspace-stat-pill is-active">1 open drawer</span>}
          </div>
        </div>

        <div className="kanban-board">
          {COLUMNS.map((column) => {
            const columnTasks = tasks.filter((task) => task.column === column);
            const headerClass = COLUMN_HEADER_CLASSES[column];

            return (
              <div key={column} className="kanban-column">
                <div className={`kanban-column-header ${headerClass}`}>
                  <span className="kanban-column-title">{column}</span>
                  <span className="kanban-column-count">{columnTasks.length}</span>
                </div>
                <div className="kanban-cards-container">
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isSelected={task.id === selectedTaskId}
                      onTaskClick={() => setSelectedTaskId(task.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {selectedTask && (
        <div className="detail-overlay" onClick={() => setSelectedTaskId(null)} role="presentation">
          <div className="detail-overlay-backdrop" />
          <TaskDetailPanel
            task={selectedTask}
            onClose={() => setSelectedTaskId(null)}
          />
        </div>
      )}
    </div>
  );
}
