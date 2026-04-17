function formatStatus(status) {
  if (!status) {
    return 'Live';
  }

  return String(status)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function Header({ title, status, onMenuClick, isDarkMode, onThemeToggle }) {
  return (
    <header className="header">
      <button
        className="header-menu-btn"
        onClick={onMenuClick}
        aria-label="Ouvrir la navigation"
        type="button"
      >
        ☰
      </button>
      <div className="header-branding">DASHBOARD AGENTS</div>
      <h1 className="header-title">
        <span>{title}</span>
      </h1>
      <button
        className="header-theme-btn"
        onClick={onThemeToggle}
        aria-label={isDarkMode ? 'Passer en mode jour' : 'Passer en mode nuit'}
        type="button"
      >
        {isDarkMode ? '☀' : '🌙'}
      </button>
      <div className="status-indicator" role="status" aria-label={`System ${formatStatus(status)}`}>
        <span className="status-dot" aria-hidden="true" />
        {formatStatus(status)}
      </div>
    </header>
  );
}
