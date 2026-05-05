import { useEffect, useRef, useState } from "react";

const DEBT_TYPES = [
  "💳 Tarjeta de crédito",
  "🧾 Préstamo personal",
  "🚗 Carro",
  "🏍️ Moto",
  "📱 Celular",
  "🌐 Internet",
  "💡 Servicio",
  "❓ Otro"
];
const FREQUENCIES = ["semanal", "quincenal", "mensual"];
const EXPENSE_CATEGORIES = [
  "🛒 Mercado",
  "🍔 Comida",
  "⛽ Gasolina",
  "🏠 Renta",
  "💡 Servicios",
  "📱 Celular",
  "🌐 Internet",
  "🚗 Carro",
  "🏥 Salud",
  "🎮 Entretenimiento",
  "👕 Ropa",
  "💳 Deuda",
  "🧾 Factura",
  "🎯 Casa Colombia",
  "❓ Otro"
];
const PAYMENT_METHODS = [
  "💵 Efectivo",
  "💳 Tarjeta débito",
  "💳 Tarjeta crédito",
  "🏦 Transferencia bancaria",
  "📲 Zelle",
  "📲 Cash App",
  "📲 Venmo",
  "🧾 Cheque",
  "🏧 ATM",
  "❓ Otro"
];
const INCOME_SOURCES = [
  "💼 Trabajo",
  "📦 Amazon Flex",
  "🧰 Instawork",
  "📲 Zelle",
  "💵 Efectivo",
  "🏦 Transferencia",
  "🎁 Otro"
];

const ONBOARDING_STEPS = [
  {
    key: "income",
    title: "Ingresos",
    match: ["fuentes de ingreso", "primero necesito saber tus ingresos"],
    question: "Cuéntame de dónde entra dinero y cuánto ganas por semana o por mes.",
    example: "Ejemplo: Trabajo $900/semana + Amazon Flex $200/semana.",
    replies: ["Trabajo", "Instawork", "Amazon Flex", "Efectivo", "Zelle", "Otro"]
  },
  {
    key: "credit_cards",
    title: "Tarjetas",
    match: ["tarjetas de crédito", "tarjetas de credito"],
    question: "Dime si tienes tarjetas y, si puedes, nombre, deuda, límite, mínimo, interés y fecha.",
    example: "Ejemplo: Credit One, debo $300, límite $500, mínimo $35, vence el 12.",
    replies: ["Sí", "No", "No sé"]
  },
  {
    key: "debts",
    title: "Otras deudas",
    match: ["otras deudas", "además de tarjetas", "ademas de tarjetas"],
    question: "Agrega préstamos, personas, compras financiadas o cualquier deuda fuera de tarjetas.",
    example: "Ejemplo: Oportun $1,200, pago $100 mensual, vence el 20.",
    replies: ["Agregar deuda", "No tengo", "Después"]
  },
  {
    key: "vehicle",
    title: "Vehículo",
    match: ["carro o moto"],
    question: "Cuéntame si tienes carro o moto, si lo debes y cuánto pagas.",
    example: "Ejemplo: Carro, debo $9,000, pago $430 al mes, vence el 5.",
    replies: ["Carro", "Moto", "No tengo", "Después"]
  },
  {
    key: "housing",
    title: "Vivienda",
    match: ["renta o vivienda"],
    question: "Dime cuánto pagas de vivienda y qué día se paga.",
    example: "Ejemplo: Renta $1,500, se paga el día 1.",
    replies: ["Renta", "Hipoteca", "No pago"]
  },
  {
    key: "utilities",
    title: "Servicios",
    match: ["servicios, celular", "suscripciones o seguros"],
    question: "Lista servicios fijos, celular, internet, seguros o suscripciones.",
    example: "Ejemplo: Celular $80, internet $60, luz $120.",
    replies: ["Celular", "Internet", "Luz", "Agua", "Suscripciones"]
  },
  {
    key: "food",
    title: "Comida",
    match: ["mercado y comida"],
    question: "Dime cuánto gastas normalmente en mercado y comida por semana.",
    example: "Ejemplo: Mercado $120/semana y comida fuera $60/semana.",
    replies: ["Mercado", "Comida fuera", "Ambos"]
  },
  {
    key: "transport",
    title: "Transporte",
    match: ["gasolina o transporte"],
    question: "Dime cuánto gastas semanalmente en moverte.",
    example: "Ejemplo: Gasolina $70/semana o bus/tren $35/semana.",
    replies: ["Gasolina", "Transporte público", "No aplica"]
  },
  {
    key: "goals",
    title: "Meta principal",
    match: ["meta principal", "casa colombia"],
    question: "Elige o describe tu meta principal, monto objetivo y fecha ideal.",
    example: "Ejemplo: Casa Colombia, quiero juntar $30,000 antes de diciembre 2027.",
    replies: ["Casa Colombia", "Carro", "Emergencia", "Viaje", "Otro"]
  }
];

function getOnboardingStep(content = "") {
  const text = String(content).toLowerCase();
  if (text.includes("resumen que tengo") || text.includes("guardar este perfil")) {
    return { key: "review", title: "Revisión", stepNumber: 9 };
  }
  const stepIndex = ONBOARDING_STEPS.findIndex((step) =>
    step.match.some((phrase) => text.includes(phrase))
  );
  if (stepIndex === -1) return null;
  return {
    ...ONBOARDING_STEPS[stepIndex],
    stepNumber: stepIndex + 1
  };
}

function Field({ label, children, error }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

function TextInput({ value, onChange, type = "text", placeholder = "" }) {
  return <input type={type} value={value || ""} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />;
}

function SelectInput({ value, onChange, options, placeholder = "Selecciona" }) {
  return (
    <select value={value || ""} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function DebtForm({ id, values, setField, onSave, onSkip, onDelete, preload }) {
  const current = values[id] || {};
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!preload) return;
    ["name", "amount", "minimumPayment", "frequency", "dueDate", "apr", "note", "type", "debtType"].forEach((field) => {
      if (preload[field] !== undefined) {
        setField(id, field, preload[field]);
      }
    });
  }, [id, preload, setField]);

  const validate = () => {
    const nextErrors = {};
    if (!current.name) nextErrors.name = "Requerido";
    if (!current.amount) nextErrors.amount = "Requerido";
    if (!current.minimumPayment) nextErrors.minimumPayment = "Requerido";
    if (!current.frequency) nextErrors.frequency = "Requerido";
    if (!current.dueDate) nextErrors.dueDate = "Requerido";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  return (
    <div className="smart-form compact">
      <strong>{preload ? "Editar deuda" : "Nueva deuda"}</strong>
      <div className="form-grid">
        <Field label="Nombre" error={errors.name}>
          <TextInput value={current.name} onChange={(value) => setField(id, "name", value)} placeholder="Ej: Credit One" />
        </Field>
        <Field label="Tipo">
          <SelectInput value={current.type || current.debtType} onChange={(value) => setField(id, "type", value)} options={DEBT_TYPES} />
        </Field>
        <Field label="Monto total" error={errors.amount}>
          <TextInput type="number" value={current.amount} onChange={(value) => setField(id, "amount", value)} />
        </Field>
        <Field label="Pago mínimo" error={errors.minimumPayment}>
          <TextInput type="number" value={current.minimumPayment} onChange={(value) => setField(id, "minimumPayment", value)} />
        </Field>
        <Field label="Frecuencia" error={errors.frequency}>
          <SelectInput value={current.frequency} onChange={(value) => setField(id, "frequency", value)} options={FREQUENCIES} />
        </Field>
        <Field label="Fecha de pago" error={errors.dueDate}>
          <TextInput type="date" value={current.dueDate} onChange={(value) => setField(id, "dueDate", value)} />
        </Field>
        <Field label="APR/interés opcional">
          <TextInput type="number" value={current.apr} onChange={(value) => setField(id, "apr", value)} />
        </Field>
        <Field label="Nota opcional">
          <TextInput value={current.note} onChange={(value) => setField(id, "note", value)} />
        </Field>
      </div>
      <div className="form-actions">
        <button type="button" onClick={() => validate() && onSave(current)}>
          Guardar deuda
        </button>
        {preload && onDelete && (
          <button className="danger-button" type="button" onClick={() => onDelete(preload)}>
            Eliminar
          </button>
        )}
        {onSkip && (
          <button type="button" onClick={onSkip}>
            Completar después
          </button>
        )}
      </div>
    </div>
  );
}

function IncomeForm({ id, values, setField, onSave, onSkip }) {
  const current = values[id] || {};
  const [errors, setErrors] = useState({});
  const validate = () => {
    const nextErrors = {};
    if (!current.amount) nextErrors.amount = "Requerido";
    if (!current.source) nextErrors.source = "Requerido";
    if (!current.date) nextErrors.date = "Requerido";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  return (
    <div className="smart-form compact">
      <strong>Nuevo ingreso</strong>
      <div className="form-grid">
        <Field label="Monto" error={errors.amount}>
          <TextInput type="number" value={current.amount} onChange={(value) => setField(id, "amount", value)} />
        </Field>
        <Field label="Fuente" error={errors.source}>
          <SelectInput value={current.source} onChange={(value) => setField(id, "source", value)} options={INCOME_SOURCES} />
        </Field>
        <Field label="Fecha" error={errors.date}>
          <TextInput type="date" value={current.date} onChange={(value) => setField(id, "date", value)} />
        </Field>
        <Field label="¿Recurrente?">
          <SelectInput value={current.recurring} onChange={(value) => setField(id, "recurring", value)} options={["si", "no"]} />
        </Field>
      </div>
      <Field label="Nota opcional">
        <TextInput value={current.note} onChange={(value) => setField(id, "note", value)} />
      </Field>
      <div className="form-actions">
        <button type="button" onClick={() => validate() && onSave(current)}>
          Guardar ingreso
        </button>
        {onSkip && (
          <button type="button" onClick={onSkip}>
            Completar después
          </button>
        )}
      </div>
    </div>
  );
}

function ExpenseForm({ id, values, setField, onSave, onSkip }) {
  const current = values[id] || {};
  const [errors, setErrors] = useState({});
  const validate = () => {
    const nextErrors = {};
    if (!current.amount) nextErrors.amount = "Requerido";
    if (!current.category) nextErrors.category = "Requerido";
    if (!current.date) nextErrors.date = "Requerido";
    if (!current.paymentMethod) nextErrors.paymentMethod = "Requerido";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  return (
    <div className="smart-form compact">
      <strong>Nuevo gasto</strong>
      <div className="form-grid">
        <Field label="Monto" error={errors.amount}>
          <TextInput type="number" value={current.amount} onChange={(value) => setField(id, "amount", value)} />
        </Field>
        <Field label="Categoría" error={errors.category}>
          <SelectInput value={current.category} onChange={(value) => setField(id, "category", value)} options={EXPENSE_CATEGORIES} />
        </Field>
        <Field label="Fecha" error={errors.date}>
          <TextInput type="date" value={current.date} onChange={(value) => setField(id, "date", value)} />
        </Field>
        <Field label="Método de pago" error={errors.paymentMethod}>
          <SelectInput value={current.paymentMethod} onChange={(value) => setField(id, "paymentMethod", value)} options={PAYMENT_METHODS} />
        </Field>
      </div>
      <Field label="Recibo/evidencia opcional">
        <TextInput value={current.receipt} onChange={(value) => setField(id, "receipt", value)} />
      </Field>
      <Field label="Nota opcional">
        <TextInput value={current.note} onChange={(value) => setField(id, "note", value)} />
      </Field>
      <div className="form-actions">
        <button type="button" onClick={() => validate() && onSave(current)}>
          Guardar gasto
        </button>
        {onSkip && (
          <button type="button" onClick={onSkip}>
            Completar después
          </button>
        )}
      </div>
    </div>
  );
}

export default function ChatWindow({
  chat,
  connectionStatus,
  isLoading,
  onboarding,
  onSendMessage,
  onApplyStrategy,
  onConfirmPendingAction,
  onSubmitFinancialForm,
  onEditDebt,
  onDeleteDebt,
  onOpenManualForm,
  onOnboardingAction,
  error
}) {
  const [message, setMessage] = useState("");
  const [values, setValues] = useState({});
  const messagesEndRef = useRef(null);

  const setField = (formId, field, value) => {
    setValues((current) => ({
      ...current,
      [formId]: {
        ...(current[formId] || {}),
        [field]: value
      }
    }));
  };

  const hasValidPending = (pendingAction) =>
    Boolean(pendingAction?.id && ["income", "expense"].includes(pendingAction.intent) && Number(pendingAction.amount) > 0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages, isLoading]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const cleanMessage = message.trim();
    if (!cleanMessage || isLoading) return;
    onSendMessage(cleanMessage);
    setMessage("");
  };

  const renderForm = (formType, messageItem) => {
    const preload = messageItem.preloadedDebt || messageItem.formData || null;
    const shared = { id: messageItem.id, values, setField };
    if (formType === "debt") {
      return (
        <DebtForm
          {...shared}
          preload={preload}
          onSave={(payload) => (preload ? onEditDebt(preload.name || payload.name, payload) : onSubmitFinancialForm("debt", payload))}
          onDelete={preload ? onDeleteDebt : null}
          onSkip={() => onSendMessage("Completar después")}
        />
      );
    }
    if (formType === "edit_debt") {
      return (
        <DebtForm
          {...shared}
          preload={preload}
          onSave={(payload) => onEditDebt(preload?.name || payload.name, payload)}
          onDelete={onDeleteDebt}
          onSkip={() => onSendMessage("Editar después")}
        />
      );
    }
    if (formType === "income") {
      return <IncomeForm {...shared} onSave={(payload) => onSubmitFinancialForm("income", payload)} onSkip={() => onSendMessage("Completar después")} />;
    }
    if (formType === "expense") {
      return <ExpenseForm {...shared} onSave={(payload) => onSubmitFinancialForm("expense", payload)} onSkip={() => onSendMessage("Completar después")} />;
    }
    return null;
  };

  const renderDeleteConfirm = (debt) => {
    if (!debt) {
      return <p className="form-helper">¿Qué deuda quieres eliminar? Dime el nombre exacto.</p>;
    }
    return (
      <div className="pending-action danger">
        <span>Confirmar eliminación</span>
        <p>
          ¿Eliminar <strong>{debt.name}</strong> (${debt.amount})?
        </p>
        <div>
          <button type="button" onClick={() => onDeleteDebt(debt)}>
            Sí, eliminar
          </button>
          <button type="button" onClick={() => onSendMessage("Cancelar eliminación")}>
            Cancelar
          </button>
        </div>
      </div>
    );
  };

  const renderOnboardingStep = (item) => {
    const step = getOnboardingStep(item.content);
    if (!step) return null;

    if (step.key === "review") {
      return (
        <div className="ai-onboarding-step review">
          <span className="step-kicker">Paso 9 de 9 — Revisión</span>
          <strong>Tu perfil está listo para guardar</strong>
          <p>Revisa el resumen. Si algo está mal, puedes corregirlo antes de activar la asesoría financiera.</p>
          <pre>{item.content}</pre>
          <div className="onboarding-action-row">
            <button type="button" onClick={() => onOnboardingAction("save_profile")}>Guardar perfil</button>
            <button type="button" onClick={() => onOnboardingAction("ai")}>Corregir algo</button>
            <button type="button" onClick={() => onOnboardingAction("complete_later")}>Completar después</button>
          </div>
        </div>
      );
    }

    return (
      <div className="ai-onboarding-step">
        <span className="step-kicker">Paso {step.stepNumber} de 9 — {step.title}</span>
        <strong>{step.question}</strong>
        <p>{step.example}</p>
        <small>Escribe los detalles abajo o toca una opción rápida para empezar tu respuesta.</small>
        <div className="onboarding-action-row">
          {step.replies.map((reply) => (
            <button key={reply} type="button" onClick={() => onSendMessage(reply)}>
              {reply}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <main className="chat-shell">
      <header className="chat-header">
        <div>
          <p>Conversación activa</p>
          <h2>{chat.title}</h2>
        </div>
        <div className={`status-pill ${connectionStatus || "checking"}`}>
          <span />
          {connectionStatus === "offline" ? "Sin conexión" : connectionStatus === "checking" ? "Conectando" : "Online"}
        </div>
      </header>

      <section className="messages" aria-live="polite">
        {onboarding && onboarding.completed === false && onboarding.mode !== "ai_test" && (
          <article className="message-row assistant">
            <div className="avatar">AI</div>
            <div className="message-bubble onboarding-card">
              <p>Antes de arrancar fuerte, armemos tu base financiera. Elige cómo quieres empezar:</p>
              <div>
                <button type="button" onClick={() => onOnboardingAction("ai")}>
                  Hacer test con IA
                </button>
                <button type="button" onClick={() => onOnboardingAction("manual")}>
                  Agregar datos manualmente
                </button>
                <button type="button" onClick={() => onOnboardingAction("bank_later")}>
                  Conectar banco después
                </button>
                <button type="button" onClick={() => onOnboardingAction("skip")}>
                  Saltar por ahora
                </button>
              </div>
            </div>
          </article>
        )}

        {chat.messages.map((item) => (
          <article className={`message-row ${item.role}`} key={item.id}>
            <div className="avatar">{item.role === "user" ? "Tú" : "AI"}</div>
            <div className="message-bubble">
              {item.decision === "onboarding" || item.onboardingReview
                ? renderOnboardingStep(item) || <p>{item.content}</p>
                : <p>{item.content}</p>}
              {item.autoPlan && (
                <div className="auto-plan-message">
                  <span>Asignación automática</span>
                  <pre>{item.autoPlan.message || item.autoPlan}</pre>
                </div>
              )}
              {item.decision && typeof item.decision === "object" && (
                <div className={`decision-message ${item.decision.decision}`}>
                  <span>{item.decision.decision}</span>
                  <strong>{item.decision.reason}</strong>
                  <p>Si haces esto, te quedas con ${item.decision.impact?.newBalance}.</p>
                  <small>{item.decision.impact?.effectOnGoal}</small>
                </div>
              )}
              {item.missingFields?.length > 0 && (
                <div className="missing-fields-card">
                  <span>Datos necesarios</span>
                  <ul>{item.missingFields.map((field) => <li key={field}>{field}</li>)}</ul>
                </div>
              )}
              {item.debtAction && (
                <div className={`debt-action-card ${item.debtAction.status || item.debtAction.type}`}>
                  <span>Acción de deuda</span>
                  <strong>{item.debtAction.debt}</strong>
                  {item.debtAction.type === "add_debt" ? (
                    <>
                      <p>Deuda: ${item.debtAction.amount}</p>
                      {item.debtAction.minimumPayment && <p>Pago: ${item.debtAction.minimumPayment}</p>}
                      {item.debtAction.dueDate && <p>Fecha: {item.debtAction.dueDate}</p>}
                    </>
                  ) : (
                    <>
                      <p>Pago: ${item.debtAction.payment}</p>
                      <p>Antes: ${item.debtAction.debtBefore}</p>
                      <p>Restante: ${item.debtAction.debtRemaining}</p>
                      <p>Balance: ${item.debtAction.finalBalance}</p>
                    </>
                  )}
                </div>
              )}
              {item.learningEvent?.pattern && (
                <div className="coach-message">
                  <span>Nota</span>
                  <p>Patrón: {item.learningEvent.pattern}.</p>
                </div>
              )}
              {item.coachMessage && (
                <div className="coach-message">
                  <span>Coach</span>
                  <p>{item.coachMessage.message}</p>
                </div>
              )}
              {item.financialBrain && (
                <div className={`brain-card ${item.financialBrain.riskLevel || "low"}`}>
                  <span>Cerebro financiero</span>
                  <strong>Seguro para gastar: ${item.financialBrain.safeToSpend || 0}</strong>
                  {item.financialBrain.actions?.length > 0 && (
                    <ul>{item.financialBrain.actions.slice(0, 3).map((action) => <li key={action}>{action}</li>)}</ul>
                  )}
                </div>
              )}
              {item.decision !== "advice" && hasValidPending(item.pendingAction) && (
                <div className="pending-action">
                  <span>Confirmación necesaria</span>
                  <p>
                    Intento: {item.pendingAction.intent}
                    {item.pendingAction.amount ? ` $${item.pendingAction.amount}` : ""}
                  </p>
                  <div>
                    <button type="button" onClick={() => onConfirmPendingAction(item.pendingAction.id, true)}>
                      Confirmar
                    </button>
                    <button type="button" onClick={() => onConfirmPendingAction(item.pendingAction.id, false)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              {item.pendingForm === "delete_debt" && renderDeleteConfirm(item.preloadedDebt || item.formData)}
              {item.pendingForm && item.pendingForm !== "delete_debt" && renderForm(item.pendingForm, item)}
              {item.onboardingReview && !getOnboardingStep(item.content) && (
                <div className="form-actions">
                  <button type="button" onClick={() => onOnboardingAction("save_profile")}>
                    Guardar perfil
                  </button>
                  <button type="button" onClick={() => onOnboardingAction("ai")}>
                    Corregir algo
                  </button>
                  <button type="button" onClick={() => onOnboardingAction("complete_later")}>
                    Completar después
                  </button>
                </div>
              )}
              {item.quickReplies?.length > 0 && !item.onboardingReview && item.decision !== "onboarding" && (
                <div className="quick-replies">
                  {item.quickReplies.slice(0, 4).map((reply) => (
                    <button key={reply} type="button" onClick={() => onSendMessage(reply)}>
                      {reply}
                    </button>
                  ))}
                </div>
              )}
              {item.strategyOptions && (
                <div className="strategy-options">
                  {item.strategyOptions.map((option) => (
                    <article className="strategy-card" key={option.id}>
                      <span>{option.title}</span>
                      <p>{option.description}</p>
                      <dl>
                        <div>
                          <dt>Balance</dt>
                          <dd>${option.impact.newBalance}</dd>
                        </div>
                        <div>
                          <dt>Meta</dt>
                          <dd>${option.impact.goalProgress}</dd>
                        </div>
                        <div>
                          <dt>Deuda</dt>
                          <dd>-${option.impact.debtReduction}</dd>
                        </div>
                      </dl>
                      <button type="button" onClick={() => onApplyStrategy(option.id)}>
                        Aplicar
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}

        {isLoading && (
          <article className="message-row assistant">
            <div className="avatar">AI</div>
            <div className="message-bubble typing">
              <span />
              <span />
              <span />
            </div>
          </article>
        )}
        <div ref={messagesEndRef} />
      </section>

      {error && <div className="error-banner">{error}</div>}

      <div className="manual-add-bar">
        <span>+ Agregar dato financiero</span>
        <button type="button" onClick={() => onOpenManualForm("debt")}>
          💳 Nueva deuda
        </button>
        <button type="button" onClick={() => onOpenManualForm("income")}>
          💰 Nuevo ingreso
        </button>
        <button type="button" onClick={() => onOpenManualForm("expense")}>
          💸 Nuevo gasto
        </button>
      </div>

      <form className="composer" onSubmit={handleSubmit}>
        <textarea
          aria-label="Mensaje para Johan AI"
          placeholder="Escribe tu mensaje..."
          rows="1"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) handleSubmit(event);
          }}
        />
        <button disabled={!message.trim() || isLoading} type="submit">
          {isLoading ? "Pensando..." : "Enviar"}
        </button>
      </form>
    </main>
  );
}
