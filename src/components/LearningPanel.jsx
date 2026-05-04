export default function LearningPanel({ learningProfile, onEvolve, onConfirmChange }) {
  const profile = {
    patterns: [],
    badHabitsDetected: [],
    goodHabitsDetected: [],
    strategyAdjustments: [],
    confidence: 0,
    ...learningProfile
  };
  const pendingChanges = profile.strategyAdjustments.filter(
    (change) => change.requiresConfirmation && change.status !== "confirmed"
  );

  return (
    <section className="learning-panel">
      <div className="panel-subheading">
        <span>Evolución automática</span>
      </div>

      <div className="confidence-meter">
        <span>Confianza</span>
        <strong>{Math.round(profile.confidence * 100)}%</strong>
      </div>

      <button className="learning-action" type="button" onClick={onEvolve}>
        Analizar evolución
      </button>

      <div className="learning-list">
        <span>Patrones detectados</span>
        {profile.patterns.slice(0, 4).map((pattern) => (
          <article key={pattern.id}>
            <strong>{pattern.pattern}</strong>
            <p>{pattern.evidence}</p>
          </article>
        ))}
      </div>

      <div className="habit-grid">
        <div>
          <span>Malos hábitos</span>
          <p>{profile.badHabitsDetected.join(", ") || "Sin datos"}</p>
        </div>
        <div>
          <span>Buenos hábitos</span>
          <p>{profile.goodHabitsDetected.join(", ") || "Sin datos"}</p>
        </div>
      </div>

      {pendingChanges.length > 0 && (
        <div className="learning-list">
          <span>Sugerencias con confirmación</span>
          {pendingChanges.map((change) => (
            <article key={change.id}>
              <strong>{change.suggestedChange}</strong>
              <p>{change.reason}</p>
              <button type="button" onClick={() => onConfirmChange(change.id)}>
                Confirmar cambio
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
