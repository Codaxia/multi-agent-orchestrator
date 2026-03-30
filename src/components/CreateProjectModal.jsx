import { useState } from 'react';

export default function CreateProjectModal({
  squads,
  initialSquadId,
  error,
  isSubmitting,
  onClose,
  onSubmit,
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [squadId, setSquadId] = useState(initialSquadId);

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      name,
      description,
      squadId,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal-backdrop" />
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="create-project-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-eyebrow">Workspace setup</p>
            <h2 id="create-project-title">Nouveau projet</h2>
          </div>
          <button className="modal-close-btn" type="button" onClick={onClose} aria-label="Fermer">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6.4 6.4 17.6 17.6M17.6 6.4 6.4 17.6" />
            </svg>
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="modal-field">
            <span>Nom du projet</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex. Portail client Laravel"
              required
            />
          </label>

          <label className="modal-field">
            <span>Squad</span>
            <select value={squadId} onChange={(event) => setSquadId(event.target.value)}>
              {squads.map((squad) => (
                <option key={squad.id} value={squad.id}>{squad.label}</option>
              ))}
            </select>
          </label>

          <label className="modal-field">
            <span>Note interne</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="Contexte, stack cible, contraintes particulières…"
            />
          </label>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button className="button button-ghost" type="button" onClick={onClose}>
              Annuler
            </button>
            <button className="button button-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Création…' : 'Créer le projet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
