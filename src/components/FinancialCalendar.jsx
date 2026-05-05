import { useMemo, useState, useEffect } from "react";
import { getFinancialCalendar } from "../api/aiClient.js";

const WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const eventMeta = {
  debt: { emoji: "💳", label: "deuda" },
  debt_payment: { emoji: "💳", label: "deuda" },
  income: { emoji: "💰", label: "ingreso" },
  expense: { emoji: "🧾", label: "gasto" },
  goal: { emoji: "🎯", label: "meta" },
  alert: { emoji: "⚠️", label: "alerta" },
  payoff_estimate: { emoji: "⏳", label: "fin estimado deuda" }
};

function toDateKey(date) {
  if (!date) return null;
  return String(date).slice(0, 10);
}

function formatMonthTitle(monthDate) {
  return monthDate.toLocaleDateString("es-US", { month: "long", year: "numeric" });
}

function buildMonthCells(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const leadingEmpty = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((leadingEmpty + lastDay.getDate()) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - leadingEmpty + 1;
    if (dayNumber < 1 || dayNumber > lastDay.getDate()) {
      return { key: `empty-${index}`, empty: true };
    }
    const date = new Date(year, month, dayNumber);
    const key = date.toISOString().slice(0, 10);
    return { key, date, dayNumber, empty: false };
  });
}

function normalizeEvents(data, today) {
  const safeEvents = Array.isArray(data.events) ? data.events : [];
  const upcomingPayments = Array.isArray(data.upcomingPayments) ? data.upcomingPayments : [];
  const payoffDates = Array.isArray(data.debtPayoffDates) ? data.debtPayoffDates : [];
  const alerts = Array.isArray(data.alerts) ? data.alerts : [];
  const events = [...safeEvents];

  upcomingPayments.forEach((payment, index) => {
    events.push({
      id: `payment-${payment.name || index}`,
      title: `${payment.name || "Pago"} $${payment.amount || 0}`,
      type: payment.type === "income" ? "income" : "debt",
      date: payment.dueDate,
      amount: payment.amount,
      description: payment.overdue ? "Pago atrasado" : "Próximo pago"
    });
  });

  payoffDates.forEach((debt, index) => {
    events.push({
      id: `payoff-${debt.debt || debt.name || index}`,
      title: `${debt.debt || debt.name || "Deuda"} libre`,
      type: "payoff_estimate",
      date: debt.payoffDate,
      description: debt.message || "Fecha estimada de final de deuda"
    });
  });

  if (data.goalProgress?.targetDate) {
    events.push({
      id: "goal-target",
      title: data.goalProgress.name || "Meta",
      type: "goal",
      date: data.goalProgress.targetDate,
      description: "Fecha ideal de meta"
    });
  }

  alerts.slice(0, 8).forEach((alert, index) => {
    events.push({
      id: `alert-${index}`,
      title: alert.message || "Alerta financiera",
      type: "alert",
      date: toDateKey(alert.createdAt) || today,
      description: alert.type || "alerta"
    });
  });

  return events
    .map((event, index) => ({
      ...event,
      id: event.id || `event-${index}`,
      date: toDateKey(event.date),
      type: event.type || "expense"
    }))
    .filter((event) => event.date);
}

export default function FinancialCalendar({ onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    getFinancialCalendar()
      .then((calendarData) => setData(calendarData))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const safeData = data || {};
  const today = safeData.today || new Date().toISOString().slice(0, 10);
  const allEvents = useMemo(() => normalizeEvents(safeData, today), [safeData, today]);
  const eventsByDate = useMemo(() => {
    return allEvents.reduce((grouped, event) => {
      grouped[event.date] = [...(grouped[event.date] || []), event];
      return grouped;
    }, {});
  }, [allEvents]);
  const monthCells = useMemo(() => buildMonthCells(viewMonth), [viewMonth]);
  const upcomingPayments = Array.isArray(safeData.upcomingPayments) ? safeData.upcomingPayments : [];
  const selectedEvents = selectedDate ? eventsByDate[selectedDate] || [] : [];

  const moveMonth = (amount) => {
    setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
    setSelectedDate(null);
  };

  const goToday = () => {
    const now = new Date();
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(null);
  };

  const formatDate = (date) => {
    if (!date) return "Sin fecha";
    try {
      return new Date(`${date}T12:00:00`).toLocaleDateString("es-US", { month: "short", day: "numeric" });
    } catch {
      return date;
    }
  };

  const daysUntil = (date) => {
    if (!date) return null;
    return Math.ceil((new Date(`${date}T12:00:00`) - new Date()) / 86400000);
  };

  return (
    <section className="financial-calendar-view">
      <header>
        <div>
          <span>📅 Calendario financiero</span>
          <h2>{loading ? "Cargando calendario..." : formatMonthTitle(viewMonth)}</h2>
        </div>
        <button type="button" onClick={onBack}>Volver al chat</button>
      </header>

      <div className="calendar-month-toolbar">
        <button type="button" onClick={() => moveMonth(-1)}>← Mes anterior</button>
        <button type="button" onClick={goToday}>Hoy</button>
        <button type="button" onClick={() => moveMonth(1)}>Mes siguiente →</button>
      </div>

      <div className="month-calendar-card">
        <div className="month-weekdays">
          {WEEK_DAYS.map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="month-grid">
          {monthCells.map((cell) => {
            const dayEvents = cell.empty ? [] : eventsByDate[cell.key] || [];
            const visibleEvents = dayEvents.slice(0, 2);
            return (
              <button
                className={`month-day ${cell.empty ? "empty" : ""} ${cell.key === today ? "today" : ""}`}
                disabled={cell.empty}
                key={cell.key}
                type="button"
                onClick={() => setSelectedDate(cell.key)}
              >
                {!cell.empty && (
                  <>
                    <span className="day-number">{cell.dayNumber}</span>
                    <div className="day-events">
                      {visibleEvents.map((event) => {
                        const meta = eventMeta[event.type] || eventMeta.expense;
                        return (
                          <span className={`day-event ${event.type}`} key={event.id}>
                            {meta.emoji} {event.title || meta.label}
                          </span>
                        );
                      })}
                      {dayEvents.length > 2 && <span className="day-more">+{dayEvents.length - 2} más</span>}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {allEvents.length === 0 && (
        <div className="calendar-empty-state">
          <strong>📅 Todavía no hay eventos financieros.</strong>
          <p>Agrega deudas, ingresos o pagos para llenar tu calendario.</p>
        </div>
      )}

      {selectedDate && (
        <div className="modal-backdrop">
          <section className="calendar-day-modal">
            <header>
              <div>
                <span>Día seleccionado</span>
                <h2>{formatDate(selectedDate)}</h2>
              </div>
              <button type="button" onClick={() => setSelectedDate(null)}>Cerrar</button>
            </header>
            {selectedEvents.length > 0 ? (
              <div className="calendar-day-events">
                {selectedEvents.map((event) => {
                  const meta = eventMeta[event.type] || eventMeta.expense;
                  return (
                    <article key={event.id}>
                      <strong>{meta.emoji} {event.title || meta.label}</strong>
                      <p>{event.description || meta.label}</p>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="calendar-empty-day">No hay eventos para este día.</p>
            )}
          </section>
        </div>
      )}

      <div className="calendar-section">
        <h3>💳 Próximos pagos</h3>
        {upcomingPayments.length === 0 ? (
          <p>Sin pagos con fecha registrada.</p>
        ) : (
          upcomingPayments.map((payment, index) => {
            const days = daysUntil(payment.dueDate);
            const overdue = payment.dueDate && payment.dueDate < today;
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
    </section>
  );
}
