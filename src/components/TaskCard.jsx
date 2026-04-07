const MOSCOW_CLASSES = {
  Must: 'moscow-must',
  Should: 'moscow-should',
  Could: 'moscow-could',
  "Won't": 'moscow-wont',
};

export default function TaskCard({ task, isSelected, onTaskClick }) {
  const { title, description, assignedAgent, priority } = task;
  const moscowClass = MOSCOW_CLASSES[priority] ?? 'moscow-wont';

  return (
    <div
      className={`task-card${isSelected ? ' task-card-selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onTaskClick?.(); }}
      aria-label={`Task: ${title}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onTaskClick?.(); } }}
    >
      <div className="task-card-title">{title}</div>
      {description && (
        <div className="task-card-description">
          {description.replace(/[#*`_~>\[\]]/g, '').slice(0, 100).trim()}
          {description.length > 100 ? '…' : ''}
        </div>
      )}
      <div className="task-card-footer">
        {assignedAgent && (
          <span className="task-card-agent">@{assignedAgent}</span>
        )}
        {priority && (
          <span className={`moscow-badge ${moscowClass}`}>{priority}</span>
        )}
      </div>
    </div>
  );
}
