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

export default function TaskKanban({ projectId }) {
  const { data, error, loading } = usePolling(`/api/projects/${projectId}/tasks`, 2500);
  const [tasks, setTasks] = useState([]);
  const [dragError, setDragError] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  function showTaskError(message) {
    setDragError(message);
    window.clearTimeout(showTaskError.timeoutId);
    showTaskError.timeoutId = window.setTimeout(() => setDragError(null), 4000);
  }

  useEffect(() => {
    if (data?.tasks) {
      setTasks(data.tasks);
    }
  }, [data]);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newColumn = destination.droppableId;

    setTasks((prev) =>
      prev.map((task) => (task.id === draggableId ? { ...task, column: newColumn } : task)),
    );

    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${encodeURIComponent(draggableId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column: newColumn }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        showTaskError(body.error ?? `Move failed (HTTP ${response.status})`);
      } else {
        setDragError(null);
      }
    } catch {
      showTaskError('Move failed — server unreachable. Reverting on next poll.');
    }
  };

  const handleTaskUpdate = async (taskId, updates) => {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task)));

    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        showTaskError(body.error ?? `Task update failed (HTTP ${response.status})`);
      } else {
        setDragError(null);
      }
    } catch {
      showTaskError('Task update failed — server unreachable. Reverting on next poll.');
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
              {tasks.length} tasks, {COLUMNS.length} columns, drag and drop enabled.
            </p>
          </div>
          <div className="workspace-stats">
            <span className="workspace-stat-pill">{tasks.length} tasks</span>
            <span className="workspace-stat-pill">Polling 2.5s</span>
            {selectedTask && <span className="workspace-stat-pill is-active">1 open drawer</span>}
          </div>
        </div>

        {dragError && (
          <div className="workspace-alert workspace-alert-error" role="alert">
            {dragError}
          </div>
        )}

        <DragDropContext onDragEnd={handleDragEnd}>
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

                  <Droppable droppableId={column}>
                    {(provided, snapshot) => (
                      <div
                        className={`kanban-cards-container${snapshot.isDraggingOver ? ' is-dragging-over' : ''}`}
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                      >
                        {columnTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(draggableProvided) => (
                              <TaskCard
                                task={task}
                                innerRef={draggableProvided.innerRef}
                                draggableProps={draggableProvided.draggableProps}
                                dragHandleProps={draggableProvided.dragHandleProps}
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
