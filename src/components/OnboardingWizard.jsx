import { useEffect, useMemo, useState } from "react";

const STEPS = [
  { key: "goal", title: "Objetivo principal" },
  { key: "income", title: "Ingresos" },
  { key: "debts", title: "Deudas" },
  { key: "housing", title: "Vivienda" },
  { key: "utilities", title: "Servicios" },
  { key: "food", title: "Comida" },
  { key: "transport", title: "Transporte" },
  { key: "current_state", title: "Estado actual" },
  { key: "review", title: "Revision final" }
];

const frequencies = ["semanal", "quincenal", "mensual", "variable"];
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
    "➕ Agregar fuente"
  ],
  debts: [
    "💳 Tarjeta de credito",
    "🧾 Prestamo personal",
    "🚗 Carro / Moto",
    "📱 Celular financiado",
    "🏠 Renta atrasada",
    "💡 Servicios atrasados",
    "🛒 Compra financiada",
    "❌ No tengo deudas",
    "➕ Agregar deuda"
  ],
  housing: ["🏠 Renta", "🏡 Hipoteca", "👨‍👩‍👧 Vivo con familia", "❌ No pago vivienda"],
  utilities: ["📱 Celular", "🌐 Internet", "💡 Luz", "💧 Agua", "🚗 Seguro", "🎬 Suscripciones", "➕ Otro"],
  food: ["🛒 Mercado", "🍔 Comida fuera", "🍱 Ambos"],
  transport: ["⛽ Gasolina", "🚌 Transporte publico", "🚗 Carro propio", "🚕 Uber/Lyft", "❌ No aplica"],
  current_state: ["🟢 Controlado", "🟡 Mas o menos", "🔴 Descontrolado", "😰 Urgente", "🧠 Quiero plan inteligente"]
};

function getStepIndex(stepKey) {
  const index = STEPS.findIndex((step) => step.key === stepKey);
  return index >= 0 ? index : 0;
}

function normalizeAnswers(answers = {}) {
  return answers && typeof answers === "object" ? answers : {};
}

function defaultDraft(stepKey, saved) {
  if (saved && typeof saved === "object") return saved;
  if (typeof saved === "string" && saved.trim()) return { note: saved };

  const defaults = {
    goal: { option: "", customName: "", targetAmount: "", targetDate: "" },
    income: { selectedTypes: [], sourceName: "", amount: "", frequency: "" },
    debts: { selectedTypes: [], name: "", amount: "", minimumPayment: "", frequency: "", dueDate: "" },
    housing: { type: "", amount: "", dueDate: "" },
    utilities: { selectedTypes: [], amount: "", note: "" },
    food: { type: "", range: "" },
    transport: { type: "", range: "" },
    current_state: { state: "" }
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

function Field({ label, children }) {
  return (
    <label className="wizard-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function SummaryLine({ label, value }) {
  return (
    <div className="wizard-summary-line">
      <span>{label}</span>
      <strong>{value || "Pendiente"}</strong>
    </div>
  );
}

function listValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  return value || "";
}

export default function OnboardingWizard({ onboarding, isLoading, onSubmit, onSave, onCompleteLater }) {
  const answers = normalizeAnswers(onboarding?.answers);
  const currentStep = onboarding?.step || "goal";
  const stepIndex = getStepIndex(currentStep);
  const step = STEPS[stepIndex] || STEPS[0];
  const [draft, setDraft] = useState(() => defaultDraft(step.key, answers[step.key]));

  useEffect(() => {
    setDraft(defaultDraft(step.key, answers[step.key]));
  }, [step.key, answers]);

  const progress = useMemo(() => Math.round(((stepIndex + 1) / STEPS.length) * 100), [stepIndex]);
  const isReview = step.key === "review";

  const setField = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const toggleMulti = (field, value) => {
    setDraft((current) => {
      const existing = Array.isArray(current[field]) ? current[field] : [];
      const next = existing.includes(value)
        ? existing.filter((item) => item !== value)
        : [...existing, value];
      return { ...current, [field]: next };
    });
  };

  const submitStep = () => {
    onSubmit({ action: "answer", step: step.key, data: draft });
  };

  const goBack = () => {
    onSubmit({ action: "back", step: step.key });
  };

  const goToStep = (targetStep) => {
    onSubmit({ action: "go_to", step: targetStep });
  };

  const renderGoal = () => (
    <>
      <p>Elige el norte financiero que Johan AI debe proteger en cada decision.</p>
      <div className="wizard-chip-grid">
        {stepOptions.goal.map((option) => (
          <Chip key={option} active={draft.option === option} onClick={() => setField("option", option)}>
            {option}
          </Chip>
        ))}
      </div>
      {draft.option?.includes("Otro") && (
        <Field label="Nombre corto del objetivo">
          <input value={draft.customName || ""} onChange={(event) => setField("customName", event.target.value)} placeholder="Ej: abrir negocio" />
        </Field>
      )}
      <div className="wizard-two">
        <Field label="Monto objetivo">
          <input type="number" value={draft.targetAmount || ""} onChange={(event) => setField("targetAmount", event.target.value)} placeholder="0" />
        </Field>
        <Field label="Fecha ideal">
          <input type="date" value={draft.targetDate || ""} onChange={(event) => setField("targetDate", event.target.value)} />
        </Field>
      </div>
    </>
  );

  const renderIncome = () => (
    <>
      <p>Marca como entra dinero y agrega nombres propios solo cuando haga falta.</p>
      <div className="wizard-chip-grid">
        {stepOptions.income.map((option) => (
          <Chip key={option} active={(draft.selectedTypes || []).includes(option)} onClick={() => toggleMulti("selectedTypes", option)}>
            {option}
          </Chip>
        ))}
      </div>
      {(draft.selectedTypes || []).some((item) => item.includes("Agregar fuente")) && (
        <div className="wizard-two">
          <Field label="Nombre de la fuente">
            <input value={draft.sourceName || ""} onChange={(event) => setField("sourceName", event.target.value)} placeholder="Tu nombre real aqui" />
          </Field>
          <Field label="Monto estimado">
            <input type="number" value={draft.amount || ""} onChange={(event) => setField("amount", event.target.value)} placeholder="0" />
          </Field>
          <Field label="Frecuencia">
            <select value={draft.frequency || ""} onChange={(event) => setField("frequency", event.target.value)}>
              <option value="">Selecciona</option>
              {frequencies.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
            </select>
          </Field>
        </div>
      )}
    </>
  );

  const renderDebts = () => (
    <>
      <p>Selecciona tipos generales. El nombre exacto de cada deuda lo escribes tu.</p>
      <div className="wizard-chip-grid">
        {stepOptions.debts.map((option) => (
          <Chip key={option} active={(draft.selectedTypes || []).includes(option)} onClick={() => toggleMulti("selectedTypes", option)}>
            {option}
          </Chip>
        ))}
      </div>
      {(draft.selectedTypes || []).some((item) => !item.includes("No tengo deudas")) && (
        <div className="wizard-two">
          <Field label="Nombre de la deuda">
            <input value={draft.name || ""} onChange={(event) => setField("name", event.target.value)} placeholder="Nombre creado por ti" />
          </Field>
          <Field label="Monto aproximado">
            <input type="number" value={draft.amount || ""} onChange={(event) => setField("amount", event.target.value)} placeholder="0" />
          </Field>
          <Field label="Pago minimo">
            <input type="number" value={draft.minimumPayment || ""} onChange={(event) => setField("minimumPayment", event.target.value)} placeholder="0" />
          </Field>
          <Field label="Frecuencia">
            <select value={draft.frequency || ""} onChange={(event) => setField("frequency", event.target.value)}>
              <option value="">Selecciona</option>
              {frequencies.slice(0, 3).map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
            </select>
          </Field>
          <Field label="Fecha de pago">
            <input type="date" value={draft.dueDate || ""} onChange={(event) => setField("dueDate", event.target.value)} />
          </Field>
        </div>
      )}
    </>
  );

  const renderHousing = () => (
    <>
      <p>Define tu costo de vivienda para ordenar prioridades fijas.</p>
      <div className="wizard-chip-grid">
        {stepOptions.housing.map((option) => (
          <Chip key={option} active={draft.type === option} onClick={() => setField("type", option)}>
            {option}
          </Chip>
        ))}
      </div>
      {draft.type && !draft.type.includes("No pago") && !draft.type.includes("familia") && (
        <div className="wizard-two">
          <Field label="Monto">
            <input type="number" value={draft.amount || ""} onChange={(event) => setField("amount", event.target.value)} placeholder="0" />
          </Field>
          <Field label="Fecha de pago">
            <input type="date" value={draft.dueDate || ""} onChange={(event) => setField("dueDate", event.target.value)} />
          </Field>
        </div>
      )}
    </>
  );

  const renderUtilities = () => (
    <>
      <p>Marca servicios y suscripciones. Puedes guardar un total aproximado.</p>
      <div className="wizard-chip-grid">
        {stepOptions.utilities.map((option) => (
          <Chip key={option} active={(draft.selectedTypes || []).includes(option)} onClick={() => toggleMulti("selectedTypes", option)}>
            {option}
          </Chip>
        ))}
      </div>
      <div className="wizard-two">
        <Field label="Monto total aproximado">
          <input type="number" value={draft.amount || ""} onChange={(event) => setField("amount", event.target.value)} placeholder="0" />
        </Field>
        <Field label="Otro nombre o nota">
          <input value={draft.note || ""} onChange={(event) => setField("note", event.target.value)} placeholder="Opcional" />
        </Field>
      </div>
    </>
  );

  const renderChoiceWithRange = (options, field, rangeLabel = "Rango semanal") => (
    <>
      <div className="wizard-chip-grid">
        {options.map((option) => (
          <Chip key={option} active={draft.type === option || draft.state === option} onClick={() => setField(field, option)}>
            {option}
          </Chip>
        ))}
      </div>
      {field !== "state" && (
        <div className="wizard-chip-grid compact">
          {amountRanges.map((range) => (
            <Chip key={range} active={draft.range === range} onClick={() => setField("range", range)}>
              {rangeLabel}: {range}
            </Chip>
          ))}
        </div>
      )}
    </>
  );

  const renderReview = () => (
    <>
      <p>Revisa la base que se va a guardar. Puedes corregir una seccion antes de activar el cerebro financiero.</p>
      <div className="wizard-summary">
        <SummaryLine label="Objetivo" value={answers.goal?.customName || answers.goal?.option} />
        <SummaryLine label="Ingresos" value={listValue(answers.income?.selectedTypes)} />
        <SummaryLine label="Deudas" value={answers.debts?.name || listValue(answers.debts?.selectedTypes)} />
        <SummaryLine label="Vivienda" value={answers.housing?.type} />
        <SummaryLine label="Servicios" value={listValue(answers.utilities?.selectedTypes)} />
        <SummaryLine label="Comida" value={`${answers.food?.type || ""} ${answers.food?.range || ""}`.trim()} />
        <SummaryLine label="Transporte" value={`${answers.transport?.type || ""} ${answers.transport?.range || ""}`.trim()} />
        <SummaryLine label="Estado" value={answers.current_state?.state} />
      </div>
      <div className="wizard-correction-grid">
        {STEPS.filter((item) => item.key !== "review").map((item) => (
          <button key={item.key} type="button" onClick={() => goToStep(item.key)}>
            Editar {item.title}
          </button>
        ))}
      </div>
    </>
  );

  const renderStep = () => {
    if (step.key === "goal") return renderGoal();
    if (step.key === "income") return renderIncome();
    if (step.key === "debts") return renderDebts();
    if (step.key === "housing") return renderHousing();
    if (step.key === "utilities") return renderUtilities();
    if (step.key === "food") return <><p>Define si el gasto viene de mercado, comida fuera o ambos.</p>{renderChoiceWithRange(stepOptions.food, "type")}</>;
    if (step.key === "transport") return <><p>Marca como te mueves y el rango semanal aproximado.</p>{renderChoiceWithRange(stepOptions.transport, "type")}</>;
    if (step.key === "current_state") return <><p>Esto ajusta el tono del plan despues de guardar.</p>{renderChoiceWithRange(stepOptions.current_state, "state")}</>;
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
        <div className="wizard-body">{renderStep()}</div>
        <footer>
          <button type="button" className="ghost-button" onClick={goBack} disabled={isLoading || stepIndex === 0}>
            Atras
          </button>
          {isReview ? (
            <>
              <button type="button" className="ghost-button" onClick={onCompleteLater} disabled={isLoading}>
                Completar despues
              </button>
              <button type="button" onClick={onSave} disabled={isLoading}>
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
