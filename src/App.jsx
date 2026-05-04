import { useEffect, useMemo, useState } from "react";
import {
  applyStrategy,
  askJohanAI,
  confirmLearningChange,
  confirmPendingAction,
  deleteMemory,
  editDebt,
  deleteDebt,
  evolveLearning,
  getFinancialState,
  getHealth,
  getAuthToken,
  loginUser,
  registerUser,
  searchMemory,
  setAuthToken,
  submitFinancialEntry,
  simulateFuture,
  updateOnboarding
} from "./api/aiClient.js";
import ChatSidebar from "./components/ChatSidebar.jsx";
import ChatWindow from "./components/ChatWindow.jsx";
import FinancePanel from "./components/FinancePanel.jsx";
import FinancialCalendar from "./components/FinancialCalendar.jsx";
import Login from "./components/Login.jsx";
import Register from "./components/Register.jsx";
import { mockFinancialData } from "./data/mockFinancialData.js";

const createWelcomeChat = () => ({
  id: crypto.randomUUID(),
  title: "Johan AI",
  messages: [
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "Hey Johan. Estoy listo para cuidar el dinero contigo: decisiones, deudas, misiones y Casa Colombia en una sola conversacion."
    }
  ]
});

const initialChat = createWelcomeChat();

const buildSummaryFromState = (state = {}) => {
  const transactions = Array.isArray(state.transactions) ? state.transactions : [];
  const incomeTransactions = transactions.filter((transaction) => transaction.type === "income");
  const expenseTransactions = transactions.filter((transaction) =>
    ["expense", "debt_payment"].includes(transaction.type)
  );
  const totalIncome = incomeTransactions.reduce(
    (sum, transaction) => sum + Number(transaction.amount || 0),
    0
  );
  const totalExpenses = expenseTransactions.reduce(
    (sum, transaction) => sum + Number(transaction.amount || 0),
    0
  );
  const expenseDays = new Set(
    expenseTransactions
      .map((transaction) => transaction.createdAt?.slice(0, 10))
      .filter(Boolean)
  );
  const expenseCounts = expenseTransactions.reduce((counts, transaction) => {
    const key = transaction.description || "Gasto sin descripcion";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const mostCommonExpense =
    Object.entries(expenseCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    totalIncome,
    totalExpenses,
    balance: Number(state.balance || 0),
    dailyAverageExpense: expenseTransactions.length
      ? totalExpenses / Math.max(expenseDays.size, 1)
      : 0,
    mostCommonExpense
  };
};

const buildDailySummaryFromState = (state = {}) => {
  const debts = Array.isArray(state.debts) ? state.debts : [];
  const totalDebt = debts.reduce((sum, debt) => sum + Number(debt.amount || 0), 0);
  const mode =
    state.mode ||
    (Number(state.balance || 0) < 50 || Number(state.expensesToday || 0) > Number(state.incomeToday || 0)
      ? "extremo"
      : totalDebt > 0
        ? "disciplina"
        : "normal");
  const safeToSpend =
    Number(state.balance || 0) < 50 || Number(state.expensesToday || 0) > Number(state.incomeToday || 0)
      ? 0
      : Math.max(
          0,
          Math.min(
            Number(state.balance || 0) - 50,
            Number(state.incomeToday || 0) - Number(state.expensesToday || 0) || Number(state.balance || 0) - 50
          )
        );

  return {
    greeting: `Hey Johan, hoy estas en modo ${mode}.`,
    balance: Number(state.balance || 0),
    mode,
    safeToSpend,
    urgentDebt: debts.find((debt) => Number(debt.amount || 0) > 0) || null,
    dailyMission: state.dailyMission || null,
    goal: state.goal || mockFinancialData.goal,
    primaryAlert: state.alerts?.[0] || null,
    suggestions:
      safeToSpend <= 0
        ? ["No gastes opcional", "Cuida deuda", "Busca ingreso extra"]
        : ["No pases tu limite", "Registra todo", "Avanza Casa Colombia"]
  };
};

export default function App() {
  const [chats, setChats] = useState([initialChat]);
  const [activeChatId, setActiveChatId] = useState(initialChat.id);
  const [financialData, setFinancialData] = useState(mockFinancialData);
  const [alerts, setAlerts] = useState(mockFinancialData.alerts);
  const [memories, setMemories] = useState(mockFinancialData.universalMemory);
  const [learningProfile, setLearningProfile] = useState(mockFinancialData.learningProfile);
  const [dailyMission, setDailyMission] = useState(mockFinancialData.dailyMission);
  const [mistakes, setMistakes] = useState(mockFinancialData.mistakes);
  const [autoPlan, setAutoPlan] = useState(null);
  const [summary, setSummary] = useState(null);
  const [dailySummary, setDailySummary] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("checking");
  const [authView, setAuthView] = useState("login");
  const [authTokenState, setAuthTokenState] = useState(getAuthToken());
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("johanUser");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("chat"); // "chat" | "calendar"

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? chats[0],
    [activeChatId, chats]
  );

  useEffect(() => {
    if (authTokenState) {
      refreshFinancialContext();
    }
  }, [authTokenState]);

  const applyAuthResult = (result) => {
    setAuthToken(result.token);
    setAuthTokenState(result.token);
    setUser(result.user);
    localStorage.setItem("johanUser", JSON.stringify(result.user));
    setFinancialData(result.financialData || mockFinancialData);
    setAlerts(result.financialData?.alerts || []);
    setMemories(result.financialData?.universalMemory || []);
    setLearningProfile(result.financialData?.learningProfile || mockFinancialData.learningProfile);
    setDailyMission(result.financialData?.dailyMission || null);
    setMistakes(result.financialData?.mistakes || []);
    setDailySummary(result.financialData ? buildDailySummaryFromState(result.financialData) : null);
    setSummary(buildSummaryFromState(result.financialData || mockFinancialData));
    setError("");
  };

  const handleLogin = async (email, password) => {
    setIsAuthLoading(true);
    setError("");
    try {
      const result = await loginUser(email, password);
      applyAuthResult(result);
    } catch (authError) {
      setError(authError.message || "No se pudo iniciar sesion.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleRegister = async (email, password) => {
    setIsAuthLoading(true);
    setError("");
    try {
      const result = await registerUser(email, password);
      applyAuthResult(result);
    } catch (authError) {
      setError(authError.message || "No se pudo crear la cuenta.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    const cleanChat = createWelcomeChat();
    setAuthToken("");
    setAuthTokenState("");
    setUser(null);
    localStorage.removeItem("johanUser");
    setFinancialData(mockFinancialData);
    setChats([cleanChat]);
    setActiveChatId(cleanChat.id);
    setAuthView("login");
    setError("");
  };

  const refreshFinancialContext = async () => {
    try {
      setConnectionStatus("checking");
      await getHealth();
      setConnectionStatus("online");
      const state = await getFinancialState();
      setFinancialData(state);
      setAlerts(state.alerts || []);
      setMemories(state.universalMemory || []);
      setLearningProfile(state.learningProfile || mockFinancialData.learningProfile);
      setDailyMission(state.dailyMission || null);
      setMistakes(state.mistakes || []);
      setAutoPlan(state.allocations?.[0] || null);
      setSummary(buildSummaryFromState(state));
      setDailySummary(buildDailySummaryFromState(state));
    } catch (loadError) {
      setConnectionStatus("offline");
      setError(loadError.message || "No se pudo cargar la memoria financiera.");
    }
  };

  const updateChat = (chatId, updater) => {
    setChats((currentChats) =>
      currentChats.map((chat) => (chat.id === chatId ? updater(chat) : chat))
    );
  };

  const resetVisibleChat = () => {
    const newChat = createWelcomeChat();
    setChats([newChat]);
    setActiveChatId(newChat.id);
    setError("");
  };

  const handleArchiveConversation = () => resetVisibleChat();
  const handleClearConversation = () => resetVisibleChat();

  const appendAssistantMessage = (
    chatId,
    content,
    autoPlanMessage = null,
    decision = null,
    missingFields = null,
    debtAction = null,
    strategyOptions = null,
    learningEvent = null,
    coachMessage = null,
    pendingAction = null,
    relevantMemory = [],
    financialBrain = null,
    pendingForm = null,
    preloadedDebt = null
  ) => {
    const assistantMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content,
      autoPlan: autoPlanMessage,
      decision,
      missingFields,
      debtAction,
      strategyOptions,
      learningEvent,
      coachMessage,
      pendingAction,
      relevantMemory,
      financialBrain,
      pendingForm,
      preloadedDebt
    };

    updateChat(chatId, (chat) => ({
      ...chat,
      messages: [...chat.messages, assistantMessage]
    }));
  };

  const handleSendMessage = async (question) => {
    if (isLoading) {
      return;
    }

    const chatId = activeChatId;
    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question
    };

    updateChat(chatId, (chat) => ({
      ...chat,
      title: chat.messages.length <= 1 ? question.slice(0, 34) : chat.title,
      messages: [...chat.messages, userMessage]
    }));

    setIsLoading(true);
    setError("");

    try {
      setConnectionStatus("online");
      const response = await askJohanAI(question, financialData);
      const isAdvisoryResponse = response.decision === "advice";
      const safePendingAction = isAdvisoryResponse ? null : response.pendingAction;

      appendAssistantMessage(
        chatId,
        response.answer,
        response.autoPlan,
        response.decision,
        response.missingFields,
        response.debtAction,
        response.strategyOptions,
        response.learningEvent,
        response.coachMessage,
        safePendingAction,
        response.relevantMemory,
        response.financialBrain,
        response.pendingForm,
        response.preloadedDebt
      );

      if (response.financialData) {
        setFinancialData(response.financialData);
        setMemories(response.financialData.universalMemory || []);
        setLearningProfile(response.learningProfile || response.financialData.learningProfile);
        setDailyMission(response.dailyMission || response.financialData.dailyMission || null);
        setMistakes(response.mistakes || response.financialData.mistakes || []);
        setDailySummary(response.dailySummary || buildDailySummaryFromState(response.financialData));
      }

      setAlerts(response.alerts || response.financialData?.alerts || []);
      setAutoPlan(response.autoPlan || response.financialData?.allocations?.[0] || null);

      setSummary(buildSummaryFromState(response.financialData || financialData));
    } catch (apiError) {
      setConnectionStatus("offline");
      appendAssistantMessage(
        chatId,
        "No pude conectar con el backend ahora mismo. Revisa que https://johan-ai-backend.onrender.com/ask-ai este activo."
      );
      setError(apiError.message || "Ocurrio un error al consultar la IA.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyStrategy = async (optionId) => {
    setError("");

    try {
      const result = await applyStrategy(optionId);
      setConnectionStatus("online");
      setFinancialData(result.financialData);
      setAlerts(result.alerts || result.financialData?.alerts || []);
      setMemories(result.financialData?.universalMemory || []);
      setLearningProfile(result.financialData?.learningProfile || mockFinancialData.learningProfile);
      setDailyMission(result.financialData?.dailyMission || null);
      setMistakes(result.financialData?.mistakes || []);
      setAutoPlan(result.financialData?.allocations?.[0] || null);
      setDailySummary(buildDailySummaryFromState(result.financialData));

      setSummary(buildSummaryFromState(result.financialData));
      appendAssistantMessage(
        activeChatId,
        `Aplique la estrategia: ${result.appliedOption.title}. Ya actualice tu meta, deuda y memoria financiera.`
      );
    } catch (strategyError) {
      setConnectionStatus("offline");
      setError(strategyError.message || "No se pudo aplicar la estrategia.");
    }
  };

  const handleConfirmPendingAction = async (actionId, confirm) => {
    try {
      const result = await confirmPendingAction(actionId, confirm);
      setConnectionStatus("online");
      if (result.financialData) {
        setFinancialData(result.financialData);
        setAlerts(result.alerts || result.financialData.alerts || []);
        setDailyMission(result.dailyMission || result.financialData.dailyMission || null);
        setMistakes(result.mistakes || result.financialData.mistakes || []);
      }
      appendAssistantMessage(
        activeChatId,
        confirm ? "Listo, confirme y aplique la accion." : "Perfecto, cancele esa accion. No movi nada."
      );
    } catch (confirmError) {
      if (confirmError.isNetworkError || confirmError.status >= 500) {
        setConnectionStatus("offline");
      } else {
        setConnectionStatus("online");
      }
      setError(confirmError.message || "No se pudo confirmar la accion.");
    }
  };

  const applyFinancialStateResult = (result) => {
    if (!result.financialData) return;
    setFinancialData(result.financialData);
    setAlerts(result.alerts || result.financialData.alerts || []);
    setDailyMission(result.dailyMission || result.financialData.dailyMission || null);
    setMistakes(result.mistakes || result.financialData.mistakes || []);
    setDailySummary(result.dailySummary || buildDailySummaryFromState(result.financialData));
    setSummary(buildSummaryFromState(result.financialData));
  };

  const handleSubmitFinancialForm = async (type, data) => {
    try {
      const result = await submitFinancialEntry(type, data);
      setConnectionStatus("online");
      applyFinancialStateResult(result);
      appendAssistantMessage(activeChatId, result.answer || "Listo, guarde el dato financiero.");
    } catch (formError) {
      if (formError.isNetworkError || formError.status >= 500) {
        setConnectionStatus("offline");
      } else {
        setConnectionStatus("online");
      }
      setError(formError.message || "No se pudo guardar el formulario.");
    }
  };

  const handleOpenManualForm = (type) => {
    const labels = { debt: "nueva deuda", income: "nuevo ingreso", expense: "nuevo gasto" };
    appendAssistantMessage(
      activeChatId,
      `Abrí el formulario de ${labels[type] || "dato financiero"}. Completa lo importante y lo guardo sin adivinar.`,
      null, null, null, null, null, null, null, null, [], null, type, null
    );
  };

  const handleOnboardingAction = async (action) => {
    if (action === "ai") {
      await handleSendMessage("Quiero hacer el test financiero con IA paso a paso");
      return;
    }

    try {
      const result = await updateOnboarding(action, { completed: ["skip", "bank_later"].includes(action) });
      setConnectionStatus("online");
      if (result.financialData) {
        setFinancialData(result.financialData);
      }
      if (action === "manual") {
        handleOpenManualForm("income");
      }
      if (action === "bank_later") {
        appendAssistantMessage(activeChatId, "Perfecto. Dejamos banco para despues. Por ahora seguimos manual y seguro.");
      }
    } catch (onboardingError) {
      setError(onboardingError.message || "No se pudo actualizar onboarding.");
    }
  };

  const handleEditDebt = async (debtName, data) => {
    try {
      const result = await editDebt(debtName, data);
      setConnectionStatus("online");
      if (result.financialData) {
        setFinancialData(result.financialData);
        setAlerts(result.financialData.alerts || []);
      }
      appendAssistantMessage(activeChatId, `✅ Deuda "${debtName}" actualizada correctamente.`);
    } catch (err) {
      setError(err.message || "No se pudo editar la deuda.");
    }
  };

  const handleDeleteDebt = async (debtName) => {
    try {
      const result = await deleteDebt(debtName);
      setConnectionStatus("online");
      if (result.financialData) {
        setFinancialData(result.financialData);
        setAlerts(result.financialData.alerts || []);
      }
      appendAssistantMessage(activeChatId, `🗑️ Deuda "${debtName}" eliminada.`);
    } catch (err) {
      setError(err.message || "No se pudo eliminar la deuda.");
    }
  };


    try {
      const result = await evolveLearning();
      setConnectionStatus("online");
      setLearningProfile(result.learningProfile);
      setFinancialData((currentData) => ({
        ...currentData,
        learningProfile: result.learningProfile
      }));
    } catch (learningError) {
      setConnectionStatus("offline");
      setError(learningError.message || "No se pudo analizar la evolucion.");
    }
  };

  const handleConfirmLearningChange = async (changeId) => {
    try {
      const result = await confirmLearningChange(changeId);
      setConnectionStatus("online");
      setLearningProfile(result.learningProfile);
      setFinancialData(result.financialData);
    } catch (learningError) {
      setConnectionStatus("offline");
      setError(learningError.message || "No se pudo confirmar el cambio.");
    }
  };

  const handleSearchMemory = async (query) => {
    try {
      const results = await searchMemory(query);
      setConnectionStatus("online");
      setMemories(results);
    } catch (memoryError) {
      setConnectionStatus("offline");
      setError(memoryError.message || "No se pudo buscar en la memoria.");
    }
  };

  const handleDeleteMemory = async (id) => {
    try {
      const result = await deleteMemory(id);
      setConnectionStatus("online");
      setMemories(result.universalMemory || []);
      setFinancialData((currentData) => ({
        ...currentData,
        universalMemory: result.universalMemory || []
      }));
    } catch (memoryError) {
      setConnectionStatus("offline");
      setError(memoryError.message || "No se pudo borrar la memoria.");
    }
  };

  const handleSimulate = async () => {
    setIsSimulating(true);
    setError("");

    try {
      const result = await simulateFuture(30);
      setConnectionStatus("online");
      setSimulation(result);
    } catch (simulateError) {
      setConnectionStatus("offline");
      setError(simulateError.message || "No se pudo simular el futuro.");
    } finally {
      setIsSimulating(false);
    }
  };

  if (!authTokenState) {
    return authView === "register" ? (
      <Register
        error={error}
        isLoading={isAuthLoading}
        onRegister={handleRegister}
        onShowLogin={() => {
          setAuthView("login");
          setError("");
        }}
      />
    ) : (
      <Login
        error={error}
        isLoading={isAuthLoading}
        onLogin={handleLogin}
        onShowRegister={() => {
          setAuthView("register");
          setError("");
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <ChatSidebar
        mode={financialData.mode}
        user={user}
        activeTab={activeTab}
        onSetTab={setActiveTab}
        onArchiveConversation={handleArchiveConversation}
        onClearConversation={handleClearConversation}
        onDeleteVisibleConversation={handleClearConversation}
        onLogout={handleLogout}
      />
      {activeTab === "calendar" ? (
        <div style={{ overflow: "auto", padding: "24px 28px" }}>
          <h2 style={{ margin: "0 0 20px", fontSize: 18 }}>📅 Calendario Financiero</h2>
          <FinancialCalendar token={authTokenState} />
        </div>
      ) : (
        <ChatWindow
          chat={activeChat}
          connectionStatus={connectionStatus}
          error={error}
          isLoading={isLoading}
          onboarding={financialData.onboarding}
          onApplyStrategy={handleApplyStrategy}
          onConfirmPendingAction={handleConfirmPendingAction}
          onEditDebt={handleEditDebt}
          onDeleteDebt={handleDeleteDebt}
          onOpenManualForm={handleOpenManualForm}
          onOnboardingAction={handleOnboardingAction}
          onSendMessage={handleSendMessage}
          onSubmitFinancialForm={handleSubmitFinancialForm}
        />
      )}
      <FinancePanel
        summary={summary}
        alerts={alerts}
        autoPlan={autoPlan}
        dailySummary={dailySummary}
        financialData={financialData}
        isSimulating={isSimulating}
        mistakes={mistakes}
        dailyMission={dailyMission}
        simulation={simulation}
        onSimulate={handleSimulate}
      />
    </div>
  );
}
