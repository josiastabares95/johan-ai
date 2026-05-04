import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "https://johan-ai-backend.onrender.com";

export default function FinancialCalendar({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/financial-calendar`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  if (loading) return <div style={{ color: "var(--muted)", padding: 24, textAlign: "center" }}>Cargando calendario...</div>;
  if (!data) return <div style={{ color: "var(--danger)", padding: 24 }}>No se pudo cargar el calendario.</div>;

  const today = data.today;

  const formatDate = (d) => {
    if (!d) return "Sin fecha";
    try {
      return new Date(d + "T12:00:00").toLocaleDateString("es-CO", { month: "short", day: "numeric" });
    } catch { return d; }
  };

  const isOverdue = (d) => d && d < today;
  const daysUntil = (d) => {
    if (!d) return null;
    const diff = Math.ceil((new Date(d + "T12:00:00") - new Date()) / 86400000);
    return diff;
  };

  return (
    <div style={{ display: "grid", gap: 20, padding: "4px 0" }}>
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 12px" }}>
          📅 Próximos pagos
        </h3>
        {data.upcomingPayments.length === 0
          ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Sin pagos con fecha registrada.</p>
          : data.upcomingPayments.map((p, i) => {
            const days = daysUntil(p.dueDate);
            const overdue = isOverdue(p.dueDate);
            return (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: overdue ? "rgba(255,107,107,0.08)" : "var(--panel-soft)",
                border: `1px solid ${overdue ? "var(--danger)" : "var(--line)"}`,
                borderRadius: 12, padding: "10px 14px", marginBottom: 8
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                    {overdue ? "⚠️ Atrasado" : days === 0 ? "🔴 Hoy" : days === 1 ? "🟡 Mañana" : `🟢 En ${days} días`}
                    {" · "}{formatDate(p.dueDate)}
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: overdue ? "var(--danger)" : "var(--green)", fontSize: 14 }}>
                  ${p.amount}
                </div>
              </div>
            );
          })
        }
      </div>

      {data.debtPayoffDates.length > 0 && (
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 12px" }}>
            🏁 Estimación de liquidación
          </h3>
          {data.debtPayoffDates.map((d, i) => (
            <div key={i} style={{
              background: "var(--panel-soft)", border: "1px solid var(--line)",
              borderRadius: 12, padding: "10px 14px", marginBottom: 8
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>💳 {d.debt}</div>
                <div style={{ color: "var(--green)", fontSize: 12, fontWeight: 700 }}>
                  {d.payoffDate ? formatDate(d.payoffDate) : "Sin fecha"}
                </div>
              </div>
              <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
                {d.periodsRemaining ? `${d.periodsRemaining} ${d.periodLabel} · Total: $${d.totalEstimatedPaid}` : "Faltan datos para calcular"}
              </div>
            </div>
          ))}
        </div>
      )}

      {data.goalProgress && (
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 12px" }}>
            🏠 Meta: {data.goalProgress.name}
          </h3>
          <div style={{ background: "var(--panel-soft)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "var(--muted)", fontSize: 13 }}>Guardado</span>
              <span style={{ fontWeight: 700, color: "var(--green)", fontSize: 14 }}>${data.goalProgress.saved}</span>
            </div>
            {data.goalProgress.target > 0 && (
              <>
                <div style={{ background: "var(--line)", borderRadius: 6, height: 6, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{
                    height: "100%", background: "var(--green)",
                    width: `${Math.min(100, (data.goalProgress.saved / data.goalProgress.target) * 100)}%`,
                    borderRadius: 6, transition: "width 0.4s"
                  }} />
                </div>
                <div style={{ color: "var(--muted)", fontSize: 12 }}>
                  Meta: ${data.goalProgress.target}
                  {data.goalProgress.dailyNeeded && ` · Necesitas $${data.goalProgress.dailyNeeded}/día`}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {data.alerts.length > 0 && (
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 10px" }}>
            🔔 Alertas
          </h3>
          {data.alerts.slice(0, 4).map((a, i) => (
            <div key={i} style={{
              background: a.type === "danger" ? "rgba(255,107,107,0.08)" : "rgba(255,204,102,0.08)",
              border: `1px solid ${a.type === "danger" ? "var(--danger)" : "var(--warning)"}`,
              borderRadius: 10, padding: "8px 12px", marginBottom: 6, fontSize: 13
            }}>
              {a.type === "danger" ? "🔴" : "🟡"} {a.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
