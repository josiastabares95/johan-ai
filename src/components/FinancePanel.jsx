import AlertsPanel from "./AlertsPanel.jsx";

const currencyFormatter = new Intl.NumberFormat("es-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const defaultFinancialData = {
  balance: 0,
  incomeToday: 0,
  expensesToday: 0,
  debts: [],
  goal: {
    name: "Casa Colombia",
    saved: 0
  },
  transactions: [],
  alerts: [],
  allocations: [],
  universalMemory: [],
  learningProfile: {
    patterns: [],
    preferencesLearned: [],
    badHabitsDetected: [],
    goodHabitsDetected: [],
    strategyAdjustments: [],
    confidence: 0
  },
  mode: "normal"
};

const defaultSummary = {
  totalIncome: 0,
  totalExpenses: 0,
  dailyAverageExpense: 0,
  mostCommonExpense: null
};

function FinanceMetric({ label, value, tone = "neutral" }) {
  return (
    <div className={`finance-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function FinancePanel({
  financialData,
  alerts,
  autoPlan,
  dailySummary,
  summary,
  mistakes,
  dailyMission,
  simulation,
  isSimulating,
  onEditDebt,
  onOpenCalendar,
  onSimulate
}) {
  const data = {
    ...defaultFinancialData,
    ...financialData,
    goal: {
      ...defaultFinancialData.goal,
      ...financialData?.goal
    },
    debts: Array.isArray(financialData?.debts) ? financialData.debts : [],
    transactions: Array.isArray(financialData?.transactions) ? financialData.transactions : [],
    alerts: Array.isArray(financialData?.alerts) ? financialData.alerts : [],
    allocations: Array.isArray(financialData?.allocations) ? financialData.allocations : [],
    universalMemory: Array.isArray(financialData?.universalMemory)
      ? financialData.universalMemory
      : []
  };
  const safeSummary = { ...defaultSummary, ...summary };
  const totalDebt = data.debts.reduce((sum, debt) => sum + Number(debt.amount || 0), 0);
  const recentTransactions = data.transactions.slice(0, 5);
  const latestAutoPlan = autoPlan || data.allocations[0] || null;
  const missionStats = financialData?.missionStats || {};
  const daily = dailySummary || {
    greeting: `Hey Johan, hoy estas en modo ${data.mode}.`,
    balance: data.balance,
    mode: data.mode,
    safeToSpend: 0,
    urgentDebt: data.debts.find((debt) => Number(debt.amount || 0) > 0) || null,
    goal: data.goal,
    primaryAlert: alerts?.[0] || data.alerts[0] || null,
    suggestions: []
  };

  return (
    <aside className="sidebar right-panel">
      <div className="panel-heading">
        <p>Resumen diario</p>
        <h2>Tu dia</h2>
      </div>

      <section className="daily-summary-card">
        <p>{daily.greeting}</p>
        {daily.mainGoal && (
          <div className="main-goal-mini">
            <span>🎯 Objetivo principal</span>
            <strong>{daily.mainGoal.name}</strong>
            <p>
              Faltan {currencyFormatter.format(daily.goalRemaining || 0)} · Hoy{" "}
              {currencyFormatter.format(daily.mainGoal.dailyNeeded || 0)} · Semana{" "}
              {currencyFormatter.format(daily.mainGoal.weeklyNeeded || 0)}
            </p>
          </div>
        )}
        <div className="daily-summary-grid">
          <div>
            <span>Seguro para gastar</span>
            <strong>{currencyFormatter.format(daily.safeToSpend || 0)}</strong>
          </div>
          <div>
            <span>Modo automatico</span>
            <strong>{daily.mode || data.mode}</strong>
          </div>
        </div>
        {daily.urgentDebt && (
          <p>Prioridad: {daily.urgentDebt.name} ({currencyFormatter.format(Number(daily.urgentDebt.amount || 0))})</p>
        )}
        {daily.primaryAlert && <p className="daily-alert">{daily.primaryAlert.message}</p>}
        <div className="quick-suggestions">
          {(daily.suggestions || []).slice(0, 3).map((suggestion) => (
            <span key={suggestion}>{suggestion}</span>
          ))}
        </div>
      </section>

      <div className="finance-stack">
        <FinanceMetric
          label="Balance"
          tone={data.balance >= 0 ? "positive" : "danger"}
          value={currencyFormatter.format(data.balance)}
        />
        <FinanceMetric
          label="Ingresos del día"
          tone="positive"
          value={`+${currencyFormatter.format(data.incomeToday)}`}
        />
        <FinanceMetric
          label="Gastos del día"
          tone="warning"
          value={`-${currencyFormatter.format(data.expensesToday)}`}
        />
        <FinanceMetric
          label="Deudas"
          tone="danger"
          value={currencyFormatter.format(totalDebt)}
        />
      </div>

      <section className="goal-card">
        <div>
          <span>Meta {data.goal.name}</span>
          <strong>{currencyFormatter.format(data.goal.saved)}</strong>
        </div>
        <div
          className="goal-bar"
          aria-label={`Ahorro actual ${currencyFormatter.format(data.goal.saved)}`}
        >
          <span style={{ width: data.goal.saved > 0 ? "12%" : "0%" }} />
        </div>
        <p>Modo {data.mode}</p>
      </section>

      <section className="mission-card">
        <div className="panel-subheading">
          <span>Misión de hoy</span>
        </div>
        {dailyMission ? (
          <div>
            <strong>{dailyMission.title}</strong>
            <p>{dailyMission.description}</p>
            <span>{dailyMission.status} - XP +{dailyMission.rewardXp || 20}</span>
            <div className="mission-progress">
              <span
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((Number(dailyMission.progress || 0) / Math.max(Number(dailyMission.target || 1), 1)) * 100)
                  )}%`
                }}
              />
            </div>
            <p>
              XP {missionStats.xp || 0} - Racha {missionStats.streak || 0} - Mejor {missionStats.bestStreak || 0}
            </p>
            {(missionStats.badges || []).length > 0 && (
              <div className="badge-row">
                {missionStats.badges.slice(0, 4).map((badge) => (
                  <span key={badge}>{badge}</span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p>No hay misión activa.</p>
        )}
      </section>

      <section className="mistakes-card">
        <div className="panel-subheading">
          <span>Errores detectados</span>
        </div>
        {(mistakes || []).slice(0, 3).length > 0 ? (
          (mistakes || []).slice(0, 3).map((mistake) => (
            <article className={mistake.severity} key={mistake.id}>
              <strong>{mistake.message}</strong>
              <p>{mistake.evidence}</p>
            </article>
          ))
        ) : (
          <p>Sin errores activos.</p>
        )}
      </section>

      <AlertsPanel alerts={alerts?.length ? alerts : data.alerts} />

      <section className="auto-allocation-card">
        <div className="panel-subheading">
          <span>Asignación automática</span>
        </div>
        {latestAutoPlan ? (
          <div>
            <strong>Ingreso: {currencyFormatter.format(latestAutoPlan.income)}</strong>
            <p>Gastos: {currencyFormatter.format(latestAutoPlan.distribution.expenses)}</p>
            <p>Casa Colombia: {currencyFormatter.format(latestAutoPlan.distribution.savings)}</p>
            <p>Deuda: {currencyFormatter.format(latestAutoPlan.distribution.debt)}</p>
          </div>
        ) : (
          <p>No hay asignaciones todavía.</p>
        )}
      </section>

      <section className="smart-summary">
        <div className="panel-subheading">
          <span>Resumen Inteligente</span>
        </div>
        <FinanceMetric
          label="Total ganado"
          tone="positive"
          value={currencyFormatter.format(safeSummary.totalIncome)}
        />
        <FinanceMetric
          label="Total gastado"
          tone="warning"
          value={currencyFormatter.format(safeSummary.totalExpenses)}
        />
        <FinanceMetric
          label="Promedio diario"
          value={currencyFormatter.format(safeSummary.dailyAverageExpense)}
        />
        <p className="insight-line">
          Gasto frecuente: {safeSummary.mostCommonExpense || "sin datos todavía"}
        </p>
      </section>

      <section className="transaction-list" aria-label="Últimas transacciones">
        <div className="panel-subheading">
          <span>Últimas 5 transacciones</span>
        </div>
        {recentTransactions.length > 0 ? (
          recentTransactions.map((transaction) => (
            <div className={transaction.type} key={transaction.id}>
              <span>{transaction.description}</span>
              <strong>
                {transaction.type === "income" ? "+" : "-"}
                {currencyFormatter.format(transaction.amount)}
              </strong>
            </div>
          ))
        ) : (
          <p>No hay transacciones todavía.</p>
        )}
      </section>

      <section className="debt-list" aria-label="Detalle de deudas">
        <div className="panel-subheading">
          <span>Deudas</span>
        </div>
        {data.debts.length > 0 ? (
          data.debts.map((debt) => (
            <button className="debt-row-button" key={`${debt.name}-${debt.amount}`} type="button" onClick={() => onEditDebt(debt)}>
              <span>{debt.name || "Deuda"}</span>
              <strong>{currencyFormatter.format(Number(debt.amount || 0))}</strong>
            </button>
          ))
        ) : (
          <p>No hay deudas registradas.</p>
        )}
      </section>

      <section className="simulation-card">
        <button type="button" onClick={onOpenCalendar}>
          📅 Calendario
        </button>
        <button disabled={isSimulating} type="button" onClick={onSimulate}>
          {isSimulating ? "Simulando..." : "Simular futuro"}
        </button>
        {simulation && (
          <div>
            <span>{simulation.days} días</span>
            <strong>{currencyFormatter.format(simulation.projectedBalance)}</strong>
            <p>{simulation.warning}</p>
          </div>
        )}
      </section>
    </aside>
  );
}
