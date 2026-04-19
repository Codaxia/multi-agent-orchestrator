import Icon from './Icon.jsx';

function formatStatus(status) {
  if (!status) return 'Live';
  return String(status).replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function Header({ breadcrumbParts = [], status, onMenuClick, isDarkMode, onThemeToggle }) {
  const parts = breadcrumbParts.length > 0 ? breadcrumbParts : ['Dashboard Agents'];
  return (
    <header className="header">
      <button
        className="header-menu-btn"
        onClick={onMenuClick}
        aria-label="Open navigation"
        type="button"
      >
        <Icon name="menu" size={16} />
      </button>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        {parts.map((part, i) => {
          const isLast = i === parts.length - 1;
          return (
            <span key={i}>
              {i > 0 && <span className="sep">/</span>}{' '}
              <span className={isLast ? 'current' : ''}>{part}</span>
            </span>
          );
        })}
      </nav>

      <div className="header-right">
        <span className={`live-pill${status === 'error' ? ' error' : ''}`} role="status">
          <span className="live-dot" aria-hidden="true" />
          {status === 'error' ? 'Offline' : `${formatStatus(status)} · 2.5s`}
        </span>
        <button
          className="theme-toggle"
          onClick={onThemeToggle}
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          type="button"
        >
          <Icon name={isDarkMode ? 'sun' : 'moon'} size={15} />
        </button>
      </div>
    </header>
  );
}
