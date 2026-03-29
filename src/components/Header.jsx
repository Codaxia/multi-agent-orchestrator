export default function Header({ title }) {
  return (
    <header className="header">
      <div className="header-branding">CODAXIA AGENCE IA</div>
      <h1 className="header-title">
        <span>{title}</span>
      </h1>
      <div className="status-indicator" role="status" aria-label="System live">
        <span className="status-dot" aria-hidden="true" />
        Live
      </div>
    </header>
  );
}
