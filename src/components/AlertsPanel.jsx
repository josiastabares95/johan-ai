const alertLabels = {
  danger: "Crítico",
  warning: "Advertencia",
  info: "Info"
};

export default function AlertsPanel({ alerts = [] }) {
  const recentAlerts = Array.isArray(alerts) ? alerts.slice(0, 5) : [];

  return (
    <section className="alerts-panel" aria-label="Alertas financieras">
      <div className="panel-subheading">
        <span>Alertas automáticas</span>
      </div>

      {recentAlerts.length > 0 ? (
        recentAlerts.map((alert, index) => (
          <article className={`alert-item ${alert.type || "info"}`} key={`${alert.createdAt}-${index}`}>
            <strong>{alertLabels[alert.type] || "Info"}</strong>
            <p>{alert.message}</p>
          </article>
        ))
      ) : (
        <p className="empty-alerts">Sin alertas por ahora.</p>
      )}
    </section>
  );
}
