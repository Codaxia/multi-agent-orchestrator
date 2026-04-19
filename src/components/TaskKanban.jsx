import { useState, useEffect } from 'react';
import TaskCard from './TaskCard.jsx';
import TaskDetailPanel from './TaskDetailPanel.jsx';
import { usePolling } from '../hooks/usePolling.js';

const COLUMNS = ['Backlog', 'In Progress', 'In Review', 'QA', 'Done'];

export default function TaskKanban({ projectId }) {
  const { data, error, loading } = usePolling(`/api/projects/${projectId}/tasks`, 2500);
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  useEffect(() => {
    if (data?.tasks) setTasks(data.tasks);
  }, [data]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

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
        <span className="state-error" role="alert">Failed to load tasks: {error}</span>
      </div>
    );
  }

  return (
    <>
      <div className="view-head">
        <div>
          <div className="view-title">Tasks</div>
          <div className="view-subtitle">
            {tasks.length} tasks · {COLUMNS.length} columns
          </div>
        </div>
      </div>

      <div className="scroll-x" style={{ paddingBottom: 12 }}>
        <div className="kanban">
          {COLUMNS.map((col) => {
            const items = tasks.filter((t) => t.column === col);
            return (
              <div key={col} className="kb-col">
                <div className="kb-col-head">
                  <span className="kb-col-title">{col}</span>
                  <span className="kb-col-count">{items.length}</span>
                </div>
                <div className="kb-col-body">
                  {items.map((task) => (
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
      </div>

      {selectedTask && (
        <div className="detail-overlay" onClick={() => setSelectedTaskId(null)} role="presentation">
          <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTaskId(null)} />
        </div>
      )}
    </>
  );
}
