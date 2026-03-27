export default function Header({ projectName }) {
  return (
    <header className="header">
      <h1 className="header-title">
        <span>{projectName}</span> Dashboard
      </h1>
      <div className="status-indicator" role="status" aria-label="System live">
        <span className="status-dot" aria-hidden="true" />
        Live
      </div>
    </header>
  );
}
