import { useEffect, useState } from "react";
import { getFinancialCalendar } from "../api/aiClient.js";

export default function FinancialCalendar({ onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFinancialCalendar()
      .then((calendarData) => setData(calendarData))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const safeData = data || {};
  const upcomingPayments = Array.isArray(safeData.upcomingPayments) ? safeData.upcomingPayments : [];
  const debtPayoffDates = Array.isArray(safeData.debtPayoffDates) ? safeData.debtPayoffDates : [];
  const alerts = Array.isArray(safeData.alerts) ? safeData.alerts : [];
  const events = Array.isArray(safeData.events) ? safeData.events : [];
  const today = safeData.today || new Date().toISOString().slice(0, 10);

  const formatDate = (date) => {
    if (!date) return "Sin fecha";
    try {
      return new Date(`${date}T12:00:00`).toLocaleDateString("es-CO", {
        month: "short",
        day: "numeric"
      });
    } catch {
      return date;
    }
  };

  const isOverdue = (date) => date && date < today;
  const daysUntil = (date) => {
    if (!date) return null;
    return Math.ceil((new Date(`${date}T12:00:00`) - new Date()) / 86400000);
  };

  if (loading) {
    return (
      <section className="financial-calendar-view">
        <header>
          <div>
            <span>📅 Calendario financiero</span>
            <h2>Cargando calendario...</h2>
          </div>
          <button type="button" onClick={onBack}>Volver al chat</button>
        </header>
      </section>
    );
  }

  return (
    <section className="financial-calendar-view">
      <header>
        <div>
          <span>📅 Calendario financiero</span>
          <h2>Mes actual</h2>
        </div>
        <button type="button" onClick={onBack}>Volver al chat</button>
      </header>

      {events.length === 0 && upcomingPayments.length === 0 && debtPayoffDates.length === 0 && alerts.length === 0 && (
        <div className="calendar-empty-state">
          <strong>📅 Todavía no hay eventos financieros.</strong>
          <p>Agrega deudas, ingresos o pagos para llenar tu calendario.</p>
        </div>
      )}

      <div className="calendar-section">
        <h3>💳 Próximos pagos</h3>
        {upcomingPayments.length === 0 ? (
          <p>Sin pagos con fecha registrada.</p>
        ) : (
          upcomingPayments.map((payment, index) => {
            const days = daysUntil(payment.dueDate);
            const overdue = isOverdue(payment.dueDate);
            return (
              <div className={overdue ? "calendar-event overdue" : "calendar-event"} key={`${payment.name}-${payment.dueDate || index}`}>
                <div>
                  <strong>{payment.name}</strong>
                  <p>
                    {overdue ? "⚠️ Atrasado" : days === 0 ? "🔴 Hoy" : days === 1 ? "🟡 Mañana" : `🟢 En ${days} días`}
                    {" · "}
                    {formatDate(payment.dueDate)}
                  </p>
                </div>
                <strong>${payment.amount || 0}</strong>
              </div>
            );
          })
        )}
      </div>

      {debtPayoffDates.length > 0 && (
        <div className="calendar-section">
          <h3>⏳ Final estimado de deuda</h3>
          {debtPayoffDates.map((debt, index) => (
            <div className="calendar-event" key={`${debt.debt}-${index}`}>
              <div>
                <strong>💳 {debt.debt}</strong>
                <p>
                  {debt.periodsRemaining
                    ? `${debt.periodsRemaining} ${debt.periodLabel} · Total: $${debt.totalEstimatedPaid}`
                    : "Faltan datos para calcular"}
                </p>
              </div>
              <strong>{debt.payoffDate ? formatDate(debt.payoffDate) : "Sin fecha"}</strong>
            </div>
          ))}
        </div>
      )}

      {safeData.goalProgress && (
        <div className="calendar-section">
          <h3>🎯 Meta: {safeData.goalProgress.name}</h3>
          <div className="calendar-goal-card">
            <div>
              <span>Guardado</span>
              <strong>${safeData.goalProgress.saved || 0}</strong>
            </div>
            {Number(safeData.goalProgress.target || 0) > 0 && (
              <>
                <div className="calendar-goal-bar">
                  <span
                    style={{
                      width: `${Math.min(
                        100,
                        (Number(safeData.goalProgress.saved || 0) / Number(safeData.goalProgress.target || 1)) * 100
                      )}%`
                    }}
                  />
                </div>
                <p>
                  Meta: ${safeData.goalProgress.target}
                  {safeData.goalProgress.dailyNeeded ? ` · Necesitas $${safeData.goalProgress.dailyNeeded}/día` : ""}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="calendar-section">
          <h3>⚠️ Alertas</h3>
          {alerts.slice(0, 4).map((alert, index) => (
            <div className={`calendar-alert ${alert.type || "warning"}`} key={`${alert.message}-${index}`}>
              {alert.type === "danger" ? "🔴" : "🟡"} {alert.message}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
