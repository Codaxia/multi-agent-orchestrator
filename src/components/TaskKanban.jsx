import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
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

export default function TaskKanban({ apiBase = '' }) {
  const { data, error, loading } = usePolling(`/api${apiBase}/tasks`, 2500);
  const [tasks, setTasks] = useState([]);
  const [dragError, setDragError] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Sync polled data into local state
  useEffect(() => {
    if (data?.tasks) {
      setTasks(data.tasks);
    }
  }, [data]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newColumn = destination.droppableId;

    setTasks((prev) =>
      prev.map((t) => (t.id === draggableId ? { ...t, column: newColumn } : t))
    );

    try {
      const resp = await fetch(`/api${apiBase}/tasks/${encodeURIComponent(draggableId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column: newColumn }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        setDragError(body.error ?? `Move failed (HTTP ${resp.status})`);
        setTimeout(() => setDragError(null), 4000);
      } else {
        setDragError(null);
      }
    } catch {
      setDragError('Move failed — server unreachable. Reverting on next poll.');
      setTimeout(() => setDragError(null), 4000);
    }
  };

  // PATCH a task (used by TaskDetailPanel for criteria toggles + column moves)
  const handleTaskUpdate = async (taskId, updates) => {
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)));

    try {
      await fetch(`/api${apiBase}/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch {
      // silently fail — state already updated optimistically, next poll will reconcile
    }
  };

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
              {tasks.length} tasks, {COLUMNS.length} colonnes, drag and drop fluide.
            </p>
          </div>
          <div className="workspace-stats">
            <span className="workspace-stat-pill">{tasks.length} tasks</span>
            <span className="workspace-stat-pill">Polling 2.5s</span>
            {selectedTask && <span className="workspace-stat-pill is-active">1 open drawer</span>}
          </div>
        </div>

        {dragError && (
          <div className="workspace-alert" role="alert">
            {dragError}
          </div>
        )}

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="kanban-board">
            {COLUMNS.map((column) => {
              const columnTasks = tasks.filter((t) => t.column === column);
              const headerClass = COLUMN_HEADER_CLASSES[column];

              return (
                <div key={column} className="kanban-column">
                  <div className={`kanban-column-header ${headerClass}`}>
                    <span className="kanban-column-title">{column}</span>
                    <span className="kanban-column-count">{columnTasks.length}</span>
                  </div>

                  <Droppable droppableId={column}>
                    {(provided, snapshot) => (
                      <div
                        className={`kanban-cards-container${snapshot.isDraggingOver ? ' is-dragging-over' : ''}`}
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                      >
                        {columnTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided) => (
                              <TaskCard
                                task={task}
                                innerRef={provided.innerRef}
                                draggableProps={provided.draggableProps}
                                dragHandleProps={provided.dragHandleProps}
                                isSelected={task.id === selectedTaskId}
                                onTaskClick={() => setSelectedTaskId(task.id)}
                              />
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </section>

      {selectedTask && (
        <div className="detail-overlay" onClick={() => setSelectedTaskId(null)} role="presentation">
          <div className="detail-overlay-backdrop" />
          <TaskDetailPanel
            task={selectedTask}
            onClose={() => setSelectedTaskId(null)}
            onUpdate={handleTaskUpdate}
          />
        </div>
      )}
    </div>
  );
}
