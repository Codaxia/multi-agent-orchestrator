export default function Header({ squadIcon, squadName, projectName }) {
  return (
    <header className="header">
      <h1 className="header-title">
        {projectName ? (
          <>
            <span className="header-squad">{squadIcon} {squadName}</span>
            <span className="header-sep"> / </span>
            <span className="header-project">{projectName}</span>
          </>
        ) : squadName ? (
          <span className="header-squad">{squadIcon} {squadName}</span>
        ) : (
          <span>Codaxia Agence IA</span>
        )}
      </h1>
      <div className="status-indicator" role="status" aria-label="System live">
        <span className="status-dot" aria-hidden="true" />
        Live
      </div>
    </header>
  );
}
