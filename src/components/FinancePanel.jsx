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
  goal: { name: "Casa Colombia", saved: 0 },
  transactions: [],
  alerts: [],
  allocations: [],
  universalMemory: [],
  mode: "normal"
};

const defaultSummary = {
  totalIncome: 0,
  totalExpenses: 0,
  dailyAverageExpense: 0,
  mostCommonExpense: null
};

const transactionMeta = {
  income: { emoji: "💰", label: "ingreso", sign: "+" },
  expense: { emoji: "🧾", label: "gasto", sign: "-" },
  debt_payment: { emoji: "💳", label: "deuda", sign: "-" }
};

function FinanceMetric({ label, value, tone = "neutral" }) {
  return (
    <div className={`finance-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function isRealTransaction(transaction) {
  return (
    transaction &&
    ["income", "expense", "debt_payment"].includes(transaction.type) &&
    Number(transaction.amount || 0) > 0 &&
    (transaction.description || transaction.category || transaction.name)
  );
}

function transactionDate(transaction) {
  return transaction.date || transaction.createdAt?.slice(0, 10) || "";
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
    goal: { ...defaultFinancialData.goal, ...financialData?.goal },
    debts: Array.isArray(financialData?.debts) ? financialData.debts : [],
    transactions: Array.isArray(financialData?.transactions) ? financialData.transactions : [],
    alerts: Array.isArray(financialData?.alerts) ? financialData.alerts : [],
    allocations: Array.isArray(financialData?.allocations) ? financialData.allocations : []
  };
  const safeSummary = { ...defaultSummary, ...summary };
  const totalDebt = data.debts.reduce((sum, debt) => sum + Number(debt.amount || 0), 0);
  const recentTransactions = data.transactions.filter(isRealTransaction).slice(0, 5);
  const latestAutoPlan = autoPlan || data.allocations[0] || null;
  const missionStats = financialData?.missionStats || {};
  const daily = dailySummary || {
    greeting: `Hey Johan, hoy estas en modo ${data.mode}.`,
    balance: data.balance,
    mode: data.mode,
    safeToSpend: 0,
    urgentDebt: data.debts.find((debt) => Number(debt.amount || 0) > 0) || null,
    mainGoal: financialData?.mainGoal || null,
    goalRemaining: 0,
    primaryAlert: alerts?.[0] || data.alerts[0] || null,
    suggestions: []
  };

  const mainGoal = daily.mainGoal || financialData?.mainGoal || {
    name: data.goal.name || "Casa Colombia",
    targetAmount: 0,
    savedAmount: data.goal.saved || 0,
    dailyNeeded: 0,
    weeklyNeeded: 0
  };
  const goalTarget = Number(mainGoal.targetAmount || 0);
  const goalSaved = Number(mainGoal.savedAmount || data.goal.saved || 0);
  const goalRemaining = Math.max(0, goalTarget - goalSaved);
  const goalProgress = goalTarget > 0 ? Math.min(100, Math.round((goalSaved / goalTarget) * 100)) : 0;

  return (
    <aside className="sidebar right-panel">
      <div className="panel-heading">
        <p>Dashboard</p>
        <h2>Tu dia</h2>
      </div>

      <section className="goal-dashboard-card">
        <span>🎯 Objetivo principal</span>
        <h3>{mainGoal.name || "Casa Colombia"}</h3>
        <div className="goal-money-row">
          <strong>{currencyFormatter.format(goalSaved)}</strong>
          <em>/ {currencyFormatter.format(goalTarget)}</em>
        </div>
        <div className="goal-bar" aria-label={`Progreso ${goalProgress}%`}>
          <span style={{ width: `${goalProgress}%` }} />
        </div>
        <dl>
          <div><dt>Falta</dt><dd>{currencyFormatter.format(goalRemaining)}</dd></div>
          <div><dt>Hoy</dt><dd>{currencyFormatter.format(mainGoal.dailyNeeded || 0)}</dd></div>
          <div><dt>Semana</dt><dd>{currencyFormatter.format(mainGoal.weeklyNeeded || 0)}</dd></div>
        </dl>
      </section>

      <div className="finance-stack">
        <FinanceMetric label="💰 Balance" tone={data.balance >= 0 ? "positive" : "danger"} value={currencyFormatter.format(data.balance)} />
        <FinanceMetric label="📈 Ingresos" tone="positive" value={`+${currencyFormatter.format(data.incomeToday)}`} />
        <FinanceMetric label="💸 Gastos" tone="warning" value={`-${currencyFormatter.format(data.expensesToday)}`} />
        <FinanceMetric label="🧾 Deudas" tone="danger" value={currencyFormatter.format(totalDebt)} />
        <FinanceMetric label="🛡️ Seguro" tone="positive" value={currencyFormatter.format(daily.safeToSpend || 0)} />
      </div>

      <section className="mission-card">
        <div className="panel-subheading">
          <span>🔥 Mision de hoy</span>
        </div>
        {dailyMission ? (
          <div>
            <strong>{dailyMission.title}</strong>
            <p>{dailyMission.description}</p>
            <span>XP +{dailyMission.rewardXp || 20} - Racha {missionStats.streak || 0}</span>
            <div className="mission-progress">
              <span style={{ width: `${Math.min(100, Math.round((Number(dailyMission.progress || 0) / Math.max(Number(dailyMission.target || 1), 1)) * 100))}%` }} />
            </div>
            <button type="button">Ver progreso</button>
          </div>
        ) : (
          <p>No hay mision activa.</p>
        )}
      </section>

      <section className="priority-card">
        <div className="panel-subheading">
          <span>⚠️ Prioridad</span>
        </div>
        {daily.urgentDebt ? (
          <p>Paga primero {daily.urgentDebt.name} - {currencyFormatter.format(Number(daily.urgentDebt.amount || 0))}</p>
        ) : daily.primaryAlert ? (
          <p>{daily.primaryAlert.message}</p>
        ) : (
          <p>Sin alertas criticas ahora.</p>
        )}
      </section>

      <AlertsPanel alerts={alerts?.length ? alerts : data.alerts} />

      <section className="transaction-list" aria-label="Ultimas transacciones">
        <div className="panel-subheading">
          <span>Ultimas 5 transacciones</span>
        </div>
        {recentTransactions.length > 0 ? (
          recentTransactions.map((transaction) => {
            const meta = transactionMeta[transaction.type] || transactionMeta.expense;
            return (
              <div className={transaction.type} key={transaction.id || `${transaction.type}-${transaction.description}-${transaction.createdAt}`}>
                <span>
                  {meta.emoji} {transaction.description || transaction.category || transaction.name}
                  <small>{transactionDate(transaction)} - {meta.label}</small>
                </span>
                <strong>{meta.sign}{currencyFormatter.format(transaction.amount)}</strong>
              </div>
            );
          })
        ) : (
          <p>No hay transacciones todavia.</p>
        )}
      </section>

      <section className="smart-summary">
        <div className="panel-subheading">
          <span>Resumen inteligente</span>
        </div>
        <FinanceMetric label="Total ganado" tone="positive" value={currencyFormatter.format(safeSummary.totalIncome)} />
        <FinanceMetric label="Total gastado" tone="warning" value={currencyFormatter.format(safeSummary.totalExpenses)} />
        <FinanceMetric label="Promedio diario" value={currencyFormatter.format(safeSummary.dailyAverageExpense)} />
        <p className="insight-line">Gasto frecuente: {safeSummary.mostCommonExpense || "sin datos todavia"}</p>
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

      <section className="auto-allocation-card">
        <div className="panel-subheading">
          <span>Avanza Casa Colombia</span>
        </div>
        {latestAutoPlan ? (
          <div>
            <strong>Ingreso: {currencyFormatter.format(latestAutoPlan.income)}</strong>
            <p>Gastos: {currencyFormatter.format(latestAutoPlan.distribution.expenses)}</p>
            <p>Meta: {currencyFormatter.format(latestAutoPlan.distribution.savings)}</p>
            <p>Deuda: {currencyFormatter.format(latestAutoPlan.distribution.debt)}</p>
          </div>
        ) : (
          <p>No hay asignaciones todavia.</p>
        )}
      </section>

      <section className="simulation-card">
        <button type="button" onClick={onOpenCalendar}>📅 Calendario</button>
        <button disabled={isSimulating} type="button" onClick={onSimulate}>
          {isSimulating ? "Simulando..." : "Simular futuro"}
        </button>
        {simulation && (
          <div>
            <span>{simulation.days} dias</span>
            <strong>{currencyFormatter.format(simulation.projectedBalance)}</strong>
            <p>{simulation.warning}</p>
          </div>
        )}
      </section>
    </aside>
  );
}
