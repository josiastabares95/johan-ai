import { useEffect, useMemo, useState } from "react";

const STEPS = [
  { key: "goal", title: "Objetivo principal" },
  { key: "income", title: "Ingresos" },
  { key: "debts", title: "Deudas" },
  { key: "housing", title: "Vivienda" },
  { key: "utilities", title: "Servicios" },
  { key: "food", title: "Comida" },
  { key: "transport", title: "Transporte" },
  { key: "review", title: "Revision final" }
];

const frequencies = ["diario", "semanal", "quincenal", "mensual", "variable"];
const spendingFrequencies = ["diario", "semanal", "quincenal", "mensual"];
const paymentFrequencies = ["semanal", "quincenal", "mensual"];
const priorities = ["baja", "media", "alta"];
const amountRanges = ["$0-$50", "$50-$100", "$100-$200", "$200+"];

const stepOptions = {
  goal: [
    "🏠 Comprar casa",
    "🚗 Comprar carro",
    "💳 Salir de deudas",
    "💰 Fondo de emergencia",
    "✈️ Viajar",
    "👨‍👩‍👧 Ayudar familia",
    "📈 Invertir",
    "🎯 Otro"
  ],
  income: [
    "💼 Ingreso fijo",
    "🔄 Ingreso variable",
    "💵 Efectivo",
    "🏦 Transferencias",
    "📲 Apps/Zelle",
    "🎁 Ayuda familiar",
    "❓ Otro"
  ],
  debts: [
    "💳 Tarjeta de credito",
    "🧾 Prestamo personal",
    "🚗 Carro / Moto",
    "📱 Celular financiado",
    "🏠 Renta atrasada",
    "💡 Servicios atrasados",
    "🛒 Compra financiada",
    "❓ Otro"
  ],
  housing: ["🏠 Renta", "🏡 Hipoteca", "👨‍👩‍👧 Vivo con familia", "❌ No pago vivienda"],
  utilities: ["📱 Celular", "🌐 Internet", "💡 Luz", "💧 Agua", "🚗 Seguro", "🎬 Suscripciones", "❓ Otro"],
  food: ["🛒 Mercado", "🍔 Comida fuera", "🍱 Ambos"],
  transport: ["⛽ Gasolina", "🚌 Transporte publico", "🚗 Carro propio", "🚕 Uber/Lyft", "❓ Otro"]
};

const stripEmoji = (value = "") =>
  String(value)
    .replace(/[^\p{Letter}\p{Number}\s/+-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const createId = () =>
  globalThis.crypto?.randomUUID?.() || `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function getStepIndex(stepKey) {
  const index = STEPS.findIndex((step) => step.key === stepKey);
  return index >= 0 ? index : 0;
}

function normalizeAnswers(answers = {}) {
  return answers && typeof answers === "object" ? answers : {};
}

function makeIncome(type) {
  return {
    id: createId(),
    type,
    sourceName: stripEmoji(type),
    amount: "",
    frequency: "",
    note: ""
  };
}

function makeTransport(type) {
  return {
    id: createId(),
    type,
    name: stripEmoji(type),
    amount: "",
    frequency: "semanal",
    note: ""
  };
}

function makeDebt(type) {
  return {
    id: createId(),
    type,
    name: "",
    amount: "",
    minimumPayment: "",
    frequency: "",
    dueDate: "",
    apr: "",
    note: ""
  };
}

function makeService(type) {
  return {
    id: createId(),
    type,
    name: stripEmoji(type),
    amount: "",
    frequency: "mensual",
    dueDate: "",
    note: ""
  };
}

function defaultDraft(stepKey, saved) {
  if (saved && typeof saved === "object") return saved;
  if (typeof saved === "string" && saved.trim()) return { note: saved };

  const defaults = {
    goal: { option: "", name: "", targetAmount: "", savedAmount: "", targetDate: "", priority: "alta" },
    income: { selectedTypes: [], sources: [] },
    debts: { selectedTypes: [], items: [], noDebts: false },
    housing: { type: "", name: "", amount: "", dueDate: "", note: "" },
    utilities: { selectedTypes: [], services: [] },
    food: { type: "", range: "", customAmount: "", frequency: "semanal", note: "" },
    transport: { selectedTypes: [], items: [] }
  };
  return defaults[stepKey] || {};
}

function Chip({ active, children, onClick }) {
  return (
    <button type="button" className={`wizard-chip ${active ? "active" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="wizard-field">
      <span>{label}</span>
      {children}
      {error && <small className="wizard-error">{error}</small>}
    </label>
  );
}

function MiniCard({ title, subtitle, onRemove, children }) {
  return (
    <article className="wizard-mini-card">
      <header>
        <div>
          <strong>{title}</strong>
          {subtitle && <span>{subtitle}</span>}
        </div>
        {onRemove && (
          <button type="button" className="mini-remove-button" onClick={onRemove}>
            Eliminar
          </button>
        )}
      </header>
      <div className="wizard-mini-grid">{children}</div>
    </article>
  );
}

function SummaryBlock({ title, children }) {
  return (
    <section className="wizard-summary-block">
      <strong>{title}</strong>
      <div>{children}</div>
    </section>
  );
}

function SummaryText({ children }) {
  return <p className="wizard-summary-text">{children || "Pendiente"}</p>;
}

function hasExistingFinancialData(financialData = {}) {
  return (
    (financialData.incomeSources || []).length > 0 ||
    (financialData.debts || []).length > 0 ||
    (financialData.recurringPayments || []).length > 0 ||
    Number(financialData.mainGoal?.targetAmount || 0) > 0
  );
}

export default function OnboardingWizard({
  onboarding,
  financialData,
  isLoading,
  onSubmit,
  onSave,
  onCompleteLater
}) {
  const answers = normalizeAnswers(onboarding?.answers);
  const currentStep = onboarding?.step || "goal";
  const stepIndex = getStepIndex(currentStep);
  const step = STEPS[stepIndex] || STEPS[0];
  const [draft, setDraft] = useState(() => defaultDraft(step.key, answers[step.key]));
  const [errors, setErrors] = useState([]);
  const [saveChoiceOpen, setSaveChoiceOpen] = useState(false);

  useEffect(() => {
    setDraft(defaultDraft(step.key, answers[step.key]));
    setErrors([]);
    setSaveChoiceOpen(false);
  }, [step.key, answers]);

  const progress = useMemo(() => Math.round(((stepIndex + 1) / STEPS.length) * 100), [stepIndex]);
  const isReview = step.key === "review";
  const hasExistingData = hasExistingFinancialData(financialData);

  const setField = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const setItemField = (collection, id, field, value) => {
    setDraft((current) => ({
      ...current,
      [collection]: (current[collection] || []).map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };
  const removeItem = (collection, id, selectedField = "selectedTypes") => {
    setDraft((current) => {
      const removed = (current[collection] || []).find((item) => item.id === id);
      const nextCollection = (current[collection] || []).filter((item) => item.id !== id);
      const stillHasType = nextCollection.some((item) => item.type === removed?.type);
      return {
        ...current,
        [collection]: nextCollection,
        [selectedField]: stillHasType
          ? current[selectedField] || []
          : (current[selectedField] || []).filter((type) => type !== removed?.type)
      };
    });
  };

  const toggleIncome = (type) => {
    setDraft((current) => {
      const exists = (current.sources || []).some((source) => source.type === type);
      if (exists) {
        const nextSources = (current.sources || []).filter((source) => source.type !== type);
        return {
          ...current,
          selectedTypes: (current.selectedTypes || []).filter((item) => item !== type),
          sources: nextSources
        };
      }
      return {
        ...current,
        selectedTypes: [...(current.selectedTypes || []), type],
        sources: [...(current.sources || []), makeIncome(type)]
      };
    });
  };

  const addIncome = (type) => {
    setDraft((current) => ({
      ...current,
      selectedTypes: Array.from(new Set([...(current.selectedTypes || []), type])),
      sources: [...(current.sources || []), makeIncome(type)]
    }));
  };

  const addDebt = (type) => {
    setDraft((current) => ({
      ...current,
      noDebts: false,
      selectedTypes: Array.from(new Set([...(current.selectedTypes || []), type])),
      items: [...(current.items || []), makeDebt(type)]
    }));
  };

  const toggleService = (type) => {
    setDraft((current) => {
      const exists = (current.services || []).some((service) => service.type === type);
      if (exists) {
        const nextServices = (current.services || []).filter((service) => service.type !== type);
        return {
          ...current,
          selectedTypes: (current.selectedTypes || []).filter((item) => item !== type),
          services: nextServices
        };
      }
      return {
        ...current,
        selectedTypes: [...(current.selectedTypes || []), type],
        services: [...(current.services || []), makeService(type)]
      };
    });
  };

  const addTransport = (type) => {
    setDraft((current) => ({
      ...current,
      selectedTypes: Array.from(new Set([...(current.selectedTypes || []), type])),
      items: [...(current.items || []), makeTransport(type)]
    }));
  };

  const validateStep = () => {
    const nextErrors = [];
    if (step.key === "goal") {
      if (!draft.name && !draft.option) nextErrors.push("Falta nombre del objetivo.");
      if (!Number(draft.targetAmount || 0)) nextErrors.push("Falta monto objetivo.");
    }
    if (step.key === "income") {
      (draft.sources || []).forEach((source, index) => {
        const missing = [
          !source.sourceName ? "nombre" : null,
          !Number(source.amount || 0) ? "monto" : null,
          !source.frequency ? "frecuencia" : null
        ].filter(Boolean);
        if (missing.length) nextErrors.push(`Fuente ${index + 1}: falta ${missing.join(" y ")}.`);
      });
      if ((draft.sources || []).length === 0) nextErrors.push("Agrega al menos una fuente de ingreso.");
    }
    if (step.key === "debts" && !draft.noDebts) {
      (draft.items || []).forEach((debt, index) => {
        const missing = [
          !debt.name ? "nombre" : null,
          !Number(debt.amount || 0) ? "monto" : null,
          !Number(debt.minimumPayment || 0) ? "pago minimo" : null,
          !debt.frequency ? "frecuencia" : null
        ].filter(Boolean);
        if (missing.length) nextErrors.push(`Deuda ${index + 1}: falta ${missing.join(" y ")}.`);
      });
      if ((draft.items || []).length === 0) nextErrors.push("Agrega una deuda o marca que no tienes deudas.");
    }
    if (step.key === "transport") {
      (draft.items || []).forEach((transport, index) => {
        const missing = [
          !transport.name ? "nombre" : null,
          !Number(transport.amount || 0) ? "monto" : null,
          !transport.frequency ? "frecuencia" : null
        ].filter(Boolean);
        if (missing.length) nextErrors.push(`Transporte ${index + 1}: falta ${missing.join(" y ")}.`);
      });
    }
    setErrors(nextErrors);
    return nextErrors.length === 0;
  };

  const submitStep = () => {
    if (!validateStep()) return;
    onSubmit({ action: "answer", step: step.key, data: draft });
  };

  const goBack = () => onSubmit({ action: "back", step: step.key });
  const goToStep = (targetStep) => onSubmit({ action: "go_to", step: targetStep });

  const handleSave = (mergeMode) => {
    if (!mergeMode && hasExistingData) {
      setSaveChoiceOpen(true);
      return;
    }
    onSave(mergeMode || "combine");
  };

  const renderErrors = () =>
    errors.length > 0 && (
      <div className="wizard-errors">
        {errors.map((error) => <p key={error}>{error}</p>)}
      </div>
    );

  const renderGoal = () => (
    <>
      <p>Categoria general para orientar decisiones. El nombre real del objetivo lo defines tu.</p>
      <div className="wizard-chip-grid">
        {stepOptions.goal.map((option) => (
          <Chip key={option} active={draft.option === option} onClick={() => setDraft((current) => ({
            ...current,
            option,
            name: !current.name || current.name === stripEmoji(current.option) ? stripEmoji(option) : current.name
          }))}>
            {option}
          </Chip>
        ))}
      </div>
      <div className="wizard-two">
        <Field label="Nombre del objetivo">
          <input value={draft.name || ""} onChange={(event) => setField("name", event.target.value)} placeholder="Casa Colombia, carro, emergencia..." />
        </Field>
        <Field label="Monto objetivo">
          <input type="number" value={draft.targetAmount || ""} onChange={(event) => setField("targetAmount", event.target.value)} placeholder="0" />
        </Field>
        <Field label="Monto ahorrado">
          <input type="number" value={draft.savedAmount || ""} onChange={(event) => setField("savedAmount", event.target.value)} placeholder="0" />
        </Field>
        <Field label="Fecha ideal">
          <input type="date" value={draft.targetDate || ""} onChange={(event) => setField("targetDate", event.target.value)} />
        </Field>
        <Field label="Prioridad">
          <select value={draft.priority || "alta"} onChange={(event) => setField("priority", event.target.value)}>
            {priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </select>
        </Field>
      </div>
    </>
  );

  const renderIncome = () => (
    <>
      <p>Selecciona categorias generales. Cada categoria abre una fuente editable con nombre y monto real.</p>
      <div className="wizard-chip-grid">
        {stepOptions.income.map((option) => (
          <Chip key={option} active={(draft.selectedTypes || []).includes(option)} onClick={() => toggleIncome(option)}>
            {option}
          </Chip>
        ))}
      </div>
      <div className="wizard-mini-stack">
        {(draft.sources || []).map((source) => (
          <MiniCard key={source.id} title={source.sourceName || "Nueva fuente"} subtitle={source.type} onRemove={() => removeItem("sources", source.id)}>
            <Field label="Nombre de fuente">
              <input value={source.sourceName || ""} onChange={(event) => setItemField("sources", source.id, "sourceName", event.target.value)} />
            </Field>
            <Field label="Monto estimado">
              <input type="number" value={source.amount || ""} onChange={(event) => setItemField("sources", source.id, "amount", event.target.value)} />
            </Field>
            <Field label="Frecuencia">
              <select value={source.frequency || ""} onChange={(event) => setItemField("sources", source.id, "frequency", event.target.value)}>
                <option value="">Selecciona</option>
                {frequencies.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
              </select>
            </Field>
            <Field label="Nota opcional">
              <input value={source.note || ""} onChange={(event) => setItemField("sources", source.id, "note", event.target.value)} />
            </Field>
          </MiniCard>
        ))}
      </div>
      {(draft.sources || []).length > 0 && (
        <button type="button" className="wizard-inline-add" onClick={() => addIncome((draft.sources || []).at(-1)?.type || stepOptions.income[1])}>
          + Agregar otro ingreso
        </button>
      )}
    </>
  );

  const renderDebts = () => (
    <>
      <p>Categoria es tipo general. El nombre y valores son tuyos. Puedes agregar varias del mismo tipo.</p>
      <div className="wizard-chip-grid">
        {stepOptions.debts.map((option) => (
          <Chip key={option} active={(draft.selectedTypes || []).includes(option)} onClick={() => addDebt(option)}>
            {option}
          </Chip>
        ))}
        <Chip active={draft.noDebts} onClick={() => setDraft((current) => ({ ...current, noDebts: true, selectedTypes: [], items: [] }))}>
          ❌ No tengo deudas
        </Chip>
      </div>
      <div className="wizard-mini-stack">
        {(draft.items || []).map((debt) => (
          <MiniCard key={debt.id} title={debt.name || "Nueva deuda"} subtitle={debt.type} onRemove={() => removeItem("items", debt.id)}>
            <Field label="Nombre de deuda">
              <input value={debt.name || ""} onChange={(event) => setItemField("items", debt.id, "name", event.target.value)} />
            </Field>
            <Field label="Monto total">
              <input type="number" value={debt.amount || ""} onChange={(event) => setItemField("items", debt.id, "amount", event.target.value)} />
            </Field>
            <Field label="Pago minimo">
              <input type="number" value={debt.minimumPayment || ""} onChange={(event) => setItemField("items", debt.id, "minimumPayment", event.target.value)} />
            </Field>
            <Field label="Frecuencia">
              <select value={debt.frequency || ""} onChange={(event) => setItemField("items", debt.id, "frequency", event.target.value)}>
                <option value="">Selecciona</option>
                {paymentFrequencies.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
              </select>
            </Field>
            <Field label="Fecha de pago">
              <input type="date" value={debt.dueDate || ""} onChange={(event) => setItemField("items", debt.id, "dueDate", event.target.value)} />
            </Field>
            <Field label="APR/interes opcional">
              <input type="number" value={debt.apr || ""} onChange={(event) => setItemField("items", debt.id, "apr", event.target.value)} />
            </Field>
            <Field label="Nota opcional">
              <input value={debt.note || ""} onChange={(event) => setItemField("items", debt.id, "note", event.target.value)} />
            </Field>
          </MiniCard>
        ))}
      </div>
      {(draft.items || []).length > 0 && (
        <button type="button" className="wizard-inline-add" onClick={() => addDebt((draft.items || []).at(-1)?.type || stepOptions.debts[0])}>
          + Agregar otra deuda
        </button>
      )}
    </>
  );

  const renderHousing = () => (
    <>
      <p>Si pagas renta o hipoteca, guarda el pago como gasto fijo.</p>
      <div className="wizard-chip-grid">
        {stepOptions.housing.map((option) => (
          <Chip key={option} active={draft.type === option} onClick={() => setField("type", option)}>
            {option}
          </Chip>
        ))}
      </div>
      {draft.type && !stripEmoji(draft.type).toLowerCase().includes("no pago") && !stripEmoji(draft.type).toLowerCase().includes("familia") && (
        <MiniCard title={draft.name || stripEmoji(draft.type)} subtitle={draft.type}>
          <Field label="Nombre o descripcion">
            <input value={draft.name || ""} onChange={(event) => setField("name", event.target.value)} placeholder="Renta casa, hipoteca..." />
          </Field>
          <Field label="Monto mensual">
            <input type="number" value={draft.amount || ""} onChange={(event) => setField("amount", event.target.value)} />
          </Field>
          <Field label="Fecha de pago">
            <input type="date" value={draft.dueDate || ""} onChange={(event) => setField("dueDate", event.target.value)} />
          </Field>
          <Field label="Nota opcional">
            <input value={draft.note || ""} onChange={(event) => setField("note", event.target.value)} />
          </Field>
        </MiniCard>
      )}
    </>
  );

  const renderUtilities = () => (
    <>
      <p>Cada servicio seleccionado abre su propia mini-card de pago.</p>
      <div className="wizard-chip-grid">
        {stepOptions.utilities.map((option) => (
          <Chip key={option} active={(draft.selectedTypes || []).includes(option)} onClick={() => toggleService(option)}>
            {option}
          </Chip>
        ))}
      </div>
      <div className="wizard-mini-stack">
        {(draft.services || []).map((service) => (
          <MiniCard key={service.id} title={service.name || "Servicio"} subtitle={service.type} onRemove={() => removeItem("services", service.id)}>
            <Field label="Nombre del servicio">
              <input value={service.name || ""} onChange={(event) => setItemField("services", service.id, "name", event.target.value)} />
            </Field>
            <Field label="Monto">
              <input type="number" value={service.amount || ""} onChange={(event) => setItemField("services", service.id, "amount", event.target.value)} />
            </Field>
            <Field label="Frecuencia">
              <select value={service.frequency || ""} onChange={(event) => setItemField("services", service.id, "frequency", event.target.value)}>
                <option value="">Selecciona</option>
                {frequencies.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
              </select>
            </Field>
            <Field label="Fecha de pago">
              <input type="date" value={service.dueDate || ""} onChange={(event) => setItemField("services", service.id, "dueDate", event.target.value)} />
            </Field>
            <Field label="Nota opcional">
              <input value={service.note || ""} onChange={(event) => setItemField("services", service.id, "note", event.target.value)} />
            </Field>
          </MiniCard>
        ))}
      </div>
    </>
  );

  const renderFoodStep = () => (
    <>
      <p>Usa rango rapido o monto real. La frecuencia la eliges tu.</p>
      <div className="wizard-chip-grid">
        {stepOptions.food.map((option) => (
          <Chip key={option} active={draft.type === option} onClick={() => setField("type", option)}>
            {option}
          </Chip>
        ))}
      </div>
      <div className="wizard-chip-grid compact">
        {amountRanges.map((range) => (
          <Chip key={range} active={draft.range === range} onClick={() => setField("range", range)}>
            Rango: {range}
          </Chip>
        ))}
      </div>
      <div className="wizard-two">
        <Field label="Monto personalizado">
          <input type="number" value={draft.customAmount || ""} onChange={(event) => setField("customAmount", event.target.value)} placeholder="0" />
        </Field>
        <Field label="Frecuencia del monto">
          <select value={draft.frequency || ""} onChange={(event) => setField("frequency", event.target.value)}>
            <option value="">Selecciona</option>
            {spendingFrequencies.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
          </select>
        </Field>
        <Field label="Nota opcional">
          <input value={draft.note || ""} onChange={(event) => setField("note", event.target.value)} />
        </Field>
      </div>
    </>
  );

  const renderTransport = () => (
    <>
      <p>Agrega todos los medios que usas. Cada uno puede tener monto y frecuencia propia.</p>
      <div className="wizard-chip-grid">
        {stepOptions.transport.map((option) => (
          <Chip key={option} active={(draft.selectedTypes || []).includes(option)} onClick={() => addTransport(option)}>
            {option}
          </Chip>
        ))}
        <Chip active={(draft.items || []).length === 0 && (draft.selectedTypes || []).includes("No aplica")} onClick={() => setDraft((current) => ({ ...current, selectedTypes: ["No aplica"], items: [] }))}>
          ❌ No aplica
        </Chip>
      </div>
      <div className="wizard-mini-stack">
        {(draft.items || []).map((item) => (
          <MiniCard key={item.id} title={item.name || "Transporte"} subtitle={item.type} onRemove={() => removeItem("items", item.id)}>
            <Field label="Nombre">
              <input value={item.name || ""} onChange={(event) => setItemField("items", item.id, "name", event.target.value)} />
            </Field>
            <Field label="Monto">
              <input type="number" value={item.amount || ""} onChange={(event) => setItemField("items", item.id, "amount", event.target.value)} />
            </Field>
            <Field label="Frecuencia">
              <select value={item.frequency || ""} onChange={(event) => setItemField("items", item.id, "frequency", event.target.value)}>
                <option value="">Selecciona</option>
                {spendingFrequencies.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
              </select>
            </Field>
            <Field label="Nota opcional">
              <input value={item.note || ""} onChange={(event) => setItemField("items", item.id, "note", event.target.value)} />
            </Field>
          </MiniCard>
        ))}
      </div>
      {(draft.items || []).length > 0 && (
        <button type="button" className="wizard-inline-add" onClick={() => addTransport((draft.items || []).at(-1)?.type || stepOptions.transport[0])}>
          + Agregar otro transporte
        </button>
      )}
    </>
  );

  const renderReview = () => (
    <>
      <p>Datos estructurados listos para guardar. Puedes editar cualquier seccion antes de terminar.</p>
      <div className="wizard-summary">
        <SummaryBlock title="Objetivo">
          <SummaryText>{answers.goal?.name || stripEmoji(answers.goal?.option)}</SummaryText>
          <SummaryText>Monto: ${answers.goal?.targetAmount || 0} | Ahorrado: ${answers.goal?.savedAmount || 0} | Prioridad: {answers.goal?.priority || "alta"}</SummaryText>
        </SummaryBlock>
        <SummaryBlock title="Ingresos">
          {(answers.income?.sources || []).map((source) => <SummaryText key={source.id}>{source.sourceName}: ${source.amount} {source.frequency}</SummaryText>)}
        </SummaryBlock>
        <SummaryBlock title="Deudas">
          {answers.debts?.noDebts ? <SummaryText>No tengo deudas</SummaryText> : (answers.debts?.items || []).map((debt) => <SummaryText key={debt.id}>{debt.name}: ${debt.amount} | minimo ${debt.minimumPayment}</SummaryText>)}
        </SummaryBlock>
        <SummaryBlock title="Vivienda">
          <SummaryText>{answers.housing?.name || stripEmoji(answers.housing?.type)} {answers.housing?.amount ? `| $${answers.housing.amount}` : ""}</SummaryText>
        </SummaryBlock>
        <SummaryBlock title="Servicios">
          {(answers.utilities?.services || []).map((service) => <SummaryText key={service.id}>{service.name}: ${service.amount} {service.frequency}</SummaryText>)}
        </SummaryBlock>
        <SummaryBlock title="Comida">
          <SummaryText>{stripEmoji(answers.food?.type)} {answers.food?.customAmount ? `$${answers.food.customAmount}` : answers.food?.range} {answers.food?.frequency || ""}</SummaryText>
        </SummaryBlock>
        <SummaryBlock title="Transporte">
          {(answers.transport?.items || []).length > 0
            ? answers.transport.items.map((item) => <SummaryText key={item.id}>{item.name}: ${item.amount} {item.frequency}</SummaryText>)
            : <SummaryText>No aplica</SummaryText>}
        </SummaryBlock>
      </div>
      <div className="wizard-correction-grid">
        {STEPS.filter((item) => item.key !== "review").map((item) => (
          <button key={item.key} type="button" onClick={() => goToStep(item.key)}>
            Editar {item.title}
          </button>
        ))}
      </div>
      {saveChoiceOpen && (
        <div className="wizard-save-choice">
          <strong>¿Quieres reemplazar tus datos actuales o combinarlos?</strong>
          <div>
            <button type="button" onClick={() => handleSave("replace")}>Reemplazar</button>
            <button type="button" onClick={() => handleSave("combine")}>Combinar</button>
            <button type="button" className="ghost-button" onClick={() => setSaveChoiceOpen(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </>
  );

  const renderStep = () => {
    if (step.key === "goal") return renderGoal();
    if (step.key === "income") return renderIncome();
    if (step.key === "debts") return renderDebts();
    if (step.key === "housing") return renderHousing();
    if (step.key === "utilities") return renderUtilities();
    if (step.key === "food") return renderFoodStep();
    if (step.key === "transport") return renderTransport();
    return renderReview();
  };

  return (
    <article className="onboarding-wizard-shell">
      <section className="onboarding-wizard">
        <div className="wizard-topline">
          <span>Reconstruir mi estado financiero</span>
          <strong>Paso {stepIndex + 1} de {STEPS.length}</strong>
        </div>
        <div className="wizard-progress" aria-label={`Progreso ${progress}%`}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <header>
          <p>Paso {stepIndex + 1} de {STEPS.length}</p>
          <h2>{step.title}</h2>
        </header>
        <div className="wizard-body">
          {renderStep()}
          {renderErrors()}
        </div>
        <footer>
          <button type="button" className="ghost-button" onClick={goBack} disabled={isLoading || stepIndex === 0}>
            Atras
          </button>
          {isReview ? (
            <>
              <button type="button" className="ghost-button" onClick={onCompleteLater} disabled={isLoading}>
                Completar despues
              </button>
              <button type="button" onClick={() => handleSave()} disabled={isLoading}>
                Guardar perfil
              </button>
            </>
          ) : (
            <button type="button" onClick={submitStep} disabled={isLoading}>
              Siguiente
            </button>
          )}
        </footer>
      </section>
    </article>
  );
}
