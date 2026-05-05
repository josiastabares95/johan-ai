import { useMemo, useState } from "react";

const tabs = [
  { id: "missions", label: "🔥 Misiones" },
  { id: "medals", label: "🏅 Medallas" },
  { id: "trophies", label: "🏆 Copas" },
  { id: "streaks", label: "⚡ Rachas" },
  { id: "milestones", label: "🎯 Hitos" },
  { id: "progress", label: "📊 Progreso" }
];

const levelTitles = {
  1: "Aprendiz financiero",
  2: "Controlador de gastos",
  3: "Guerrero de deudas",
  4: "Constructor de metas",
  5: "Estratega financiero"
};

function ProgressBar({ percent = 0 }) {
  return (
    <div className="achievement-progress">
      <span style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}

function MissionCard({ mission }) {
  return (
    <article className={`achievement-card mission ${mission.status || "pendiente"}`}>
      <div>
        <span>{mission.reward || "XP"}</span>
        <strong>{mission.title}</strong>
      </div>
      <p>{mission.description}</p>
      <ProgressBar percent={mission.percent} />
      <footer>
        <span>{mission.progress || 0}/{mission.target || 1}</span>
        <em>{mission.status || "pendiente"}</em>
        <b>XP +{mission.xp || 20}</b>
      </footer>
    </article>
  );
}

function BadgeCard({ item }) {
  return (
    <article className={`achievement-card badge ${item.status || "bloqueada"}`}>
      <div className="badge-emoji">{item.emoji || "🏅"}</div>
      <strong>{item.title}</strong>
      <p>{item.description}</p>
      <ProgressBar percent={item.percent} />
      <footer>
        <span>{item.status || "bloqueada"}</span>
        <b>{item.percent || 0}%</b>
      </footer>
    </article>
  );
}

function EmptyState({ text }) {
  return <p className="achievements-empty">{text}</p>;
}

export default function AchievementsHub({ financialData = {}, onBack }) {
  const [activeTab, setActiveTab] = useState("missions");
  const data = useMemo(() => {
    const achievements = Array.isArray(financialData.achievements) ? financialData.achievements : [];
    const milestones = Array.isArray(financialData.milestones) ? financialData.milestones : [];
    const missions = financialData.missions || {};
    const xp = Number(financialData.xp ?? financialData.missionStats?.xp ?? 0);
    const level = Number(financialData.level || Math.max(1, Math.floor(xp / 220) + 1));
    const nextLevelXp = level >= 5 ? xp : [0, 120, 320, 650, 1100][level] || 120;
    const previousLevelXp = [0, 0, 120, 320, 650][level] || 0;
    const levelPercent = level >= 5 ? 100 : Math.round(((xp - previousLevelXp) / Math.max(nextLevelXp - previousLevelXp, 1)) * 100);

    return {
      achievements,
      medals: achievements.filter((item) => item.kind !== "trophy"),
      trophies: achievements.filter((item) => item.kind === "trophy"),
      milestones,
      missions: {
        daily: Array.isArray(missions.daily) ? missions.daily : [],
        weekly: Array.isArray(missions.weekly) ? missions.weekly : [],
        monthly: Array.isArray(missions.monthly) ? missions.monthly : []
      },
      streaks: financialData.streaks || {},
      xp,
      level,
      levelTitle: financialData.levelTitle || levelTitles[level] || "Aprendiz financiero",
      levelPercent,
      lastAchievement: financialData.lastAchievement || null
    };
  }, [financialData]);

  return (
    <main className="achievements-page">
      <header className="achievements-hero">
        <div>
          <p>Centro de progreso</p>
          <h2>🏆 Logros Johan AI</h2>
          <span>{data.levelTitle} · Nivel {data.level}</span>
        </div>
        <button type="button" onClick={onBack}>Volver al chat</button>
      </header>

      <section className="xp-panel">
        <div>
          <span>XP total</span>
          <strong>{data.xp}</strong>
        </div>
        <div>
          <span>Proximo nivel</span>
          <ProgressBar percent={data.levelPercent} />
        </div>
        <div>
          <span>Ultimo logro</span>
          <strong>{data.lastAchievement?.title || "Aun por desbloquear"}</strong>
        </div>
      </section>

      <nav className="achievement-tabs" aria-label="Secciones de logros">
        {tabs.map((tab) => (
          <button
            className={activeTab === tab.id ? "active" : ""}
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "missions" && (
        <section className="achievements-section">
          <h3>🔥 Misiones</h3>
          {["daily", "weekly", "monthly"].map((group) => (
            <div className="mission-group" key={group}>
              <span>{group === "daily" ? "Diarias" : group === "weekly" ? "Semanales" : "Mensuales"}</span>
              <div className="achievement-grid">
                {data.missions[group].length ? data.missions[group].map((mission) => <MissionCard key={mission.id} mission={mission} />) : <EmptyState text="Todavia no hay misiones en esta categoria." />}
              </div>
            </div>
          ))}
        </section>
      )}

      {activeTab === "medals" && (
        <section className="achievements-section">
          <h3>🏅 Medallas</h3>
          <div className="achievement-grid medals">
            {data.medals.length ? data.medals.map((item) => <BadgeCard key={item.id} item={item} />) : <EmptyState text="Registra movimientos para desbloquear medallas." />}
          </div>
        </section>
      )}

      {activeTab === "trophies" && (
        <section className="achievements-section">
          <h3>🏆 Copas</h3>
          <div className="achievement-grid trophies">
            {data.trophies.length ? data.trophies.map((item) => <BadgeCard key={item.id} item={item} />) : <EmptyState text="Las copas aparecen cuando tu progreso crece." />}
          </div>
        </section>
      )}

      {activeTab === "streaks" && (
        <section className="achievements-section">
          <h3>⚡ Rachas</h3>
          <div className="streak-grid">
            {[
              ["Racha diaria", data.streaks.daily],
              ["Racha semanal", data.streaks.weekly],
              ["Mejor racha", data.streaks.best],
              ["Dias registrando gastos", data.streaks.expenseTrackingDays],
              ["Dias sin impulsos", data.streaks.noImpulseDays],
              ["Dias cumpliendo mision", data.streaks.missionDays],
              ["Dias avanzando Casa Colombia", data.streaks.goalDays]
            ].map(([label, value]) => (
              <article className="streak-card" key={label}>
                <span>{label}</span>
                <strong>{Number(value || 0)}</strong>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === "milestones" && (
        <section className="achievements-section">
          <h3>🎯 Hitos</h3>
          <div className="achievement-grid">
            {data.milestones.length ? data.milestones.map((item) => <BadgeCard key={item.id} item={item} />) : <EmptyState text="Aun no hay hitos financieros." />}
          </div>
        </section>
      )}

      {activeTab === "progress" && (
        <section className="achievements-section progress-view">
          <h3>📊 Progreso</h3>
          <article className="level-card">
            <span>Nivel financiero</span>
            <strong>{data.levelTitle}</strong>
            <ProgressBar percent={data.levelPercent} />
            <p>{data.xp} XP acumulados. Sigue registrando ingresos, gastos, pagos y avances de Casa Colombia.</p>
          </article>
          <div className="achievement-grid">
            <BadgeCard item={{ emoji: "🏅", title: "Medallas ganadas", description: "Estado actual de medallas.", percent: data.medals.filter((item) => item.status === "ganada").length * 14, status: "en progreso" }} />
            <BadgeCard item={{ emoji: "🏆", title: "Copas ganadas", description: "Retos grandes de control.", percent: data.trophies.filter((item) => item.status === "ganada").length * 20, status: "en progreso" }} />
            <BadgeCard item={{ emoji: "🎯", title: "Hitos completados", description: "Momentos financieros importantes.", percent: data.milestones.filter((item) => item.status === "ganada").length * 14, status: "en progreso" }} />
          </div>
        </section>
      )}
    </main>
  );
}
