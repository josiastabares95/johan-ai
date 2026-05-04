import { useEffect, useRef, useState } from "react";

const DEBT_TYPES = [
  "💳 Tarjeta","🧾 Préstamo personal","🚗 Carro","🏍️ Moto",
  "📱 Celular","🌐 Internet","💡 Servicio","❓ Otro"
];
const FREQUENCIES = ["semanal","quincenal","mensual"];
const EXPENSE_CATEGORIES = [
  "🛒 Mercado","🍔 Comida","⛽ Gasolina","🏠 Renta","💡 Servicios",
  "📱 Celular","🌐 Internet","🚗 Carro","🏥 Salud","🎮 Entretenimiento",
  "👕 Ropa","💳 Deuda","🧾 Factura","🎯 Casa Colombia","❓ Otro"
];
const PAYMENT_METHODS = [
  "💵 Efectivo","💳 Débito","💳 Crédito","🏦 Transferencia",
  "📲 Zelle","📲 Cash App","📲 Venmo","🧾 Cheque","🏧 ATM","❓ Otro"
];
const INCOME_SOURCES = [
  "💼 Trabajo","📦 Amazon Flex","🧰 Instawork",
  "📲 Zelle","💵 Efectivo","🏦 Transferencia","🎁 Otro"
];

const inputStyle = {
  background:"var(--panel)",border:"1px solid var(--line-strong)",borderRadius:10,
  color:"var(--text)",padding:"8px 12px",fontSize:13,outline:"none",width:"100%"
};

function Fld({label,children,err}){
  return(
    <label style={{display:"grid",gap:4}}>
      <span style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.05em"}}>{label}</span>
      {children}
      {err&&<span style={{fontSize:11,color:"var(--danger)"}}>{err}</span>}
    </label>
  );
}
function Inp({value,onChange,type="text",placeholder}){
  return <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={inputStyle}/>;
}
function Sel({value,onChange,options,placeholder="Selecciona"}){
  return(
    <select value={value||""} onChange={e=>onChange(e.target.value)}
      style={{...inputStyle,cursor:"pointer",color:value?"var(--text)":"var(--muted)"}}>
      <option value="">{placeholder}</option>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  );
}
function Grid({children,cols=2}){
  return <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:10}}>{children}</div>;
}
function SaveBtn({onClick,children}){
  return(
    <button onClick={onClick} style={{background:"var(--green)",color:"#000",border:"none",
      borderRadius:10,padding:"8px 20px",fontWeight:700,fontSize:13,cursor:"pointer"}}>
      {children}
    </button>
  );
}
function GhostBtn({onClick,children}){
  return(
    <button onClick={onClick} style={{background:"none",border:"1px solid var(--line-strong)",
      color:"var(--muted)",borderRadius:10,padding:"8px 14px",fontSize:13,cursor:"pointer"}}>
      {children}
    </button>
  );
}

function DebtForm({id,vals,set,onSave,onSkip,preload}){
  const v = vals[id]||{};
  const [errs,setErrs] = useState({});
  useEffect(()=>{
    if(preload){
      ["name","amount","minimumPayment","frequency","dueDate","apr","note","type"]
        .forEach(f=>{if(preload[f]!==undefined)set(id,f,preload[f]);});
    }
  },[]);
  const validate=()=>{
    const e={};
    if(!v.name)e.name="Requerido";
    if(!v.amount)e.amount="Requerido";
    if(!v.minimumPayment)e.minimumPayment="Requerido";
    if(!v.frequency)e.frequency="Requerido";
    if(!v.dueDate)e.dueDate="Requerido";
    setErrs(e);return Object.keys(e).length===0;
  };
  return(
    <div style={{display:"grid",gap:10}}>
      <Grid cols={2}>
        <Fld label="Nombre" err={errs.name}><Inp value={v.name} onChange={x=>set(id,"name",x)} placeholder="Ej: Credit One"/></Fld>
        <Fld label="Tipo"><Sel value={v.type} onChange={x=>set(id,"type",x)} options={DEBT_TYPES}/></Fld>
        <Fld label="Monto total ($)" err={errs.amount}><Inp type="number" value={v.amount} onChange={x=>set(id,"amount",x)} placeholder="0.00"/></Fld>
        <Fld label="Pago mínimo ($)" err={errs.minimumPayment}><Inp type="number" value={v.minimumPayment} onChange={x=>set(id,"minimumPayment",x)} placeholder="0.00"/></Fld>
        <Fld label="Frecuencia" err={errs.frequency}><Sel value={v.frequency} onChange={x=>set(id,"frequency",x)} options={FREQUENCIES}/></Fld>
        <Fld label="Próximo pago" err={errs.dueDate}><Inp type="date" value={v.dueDate} onChange={x=>set(id,"dueDate",x)}/></Fld>
        <Fld label="APR % (opcional)"><Inp type="number" value={v.apr} onChange={x=>set(id,"apr",x)} placeholder="0"/></Fld>
        <Fld label="Nota (opcional)"><Inp value={v.note} onChange={x=>set(id,"note",x)} placeholder="ej: tarjeta emergencia"/></Fld>
      </Grid>
      <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}>
        <SaveBtn onClick={()=>validate()&&onSave(v)}>💾 Guardar</SaveBtn>
        {onSkip&&<GhostBtn onClick={onSkip}>Completar después</GhostBtn>}
      </div>
    </div>
  );
}

function IncomeForm({id,vals,set,onSave,onSkip}){
  const v=vals[id]||{};
  const [errs,setErrs]=useState({});
  const validate=()=>{
    const e={};
    if(!v.amount)e.amount="Requerido";
    if(!v.source)e.source="Requerido";
    if(!v.date)e.date="Requerido";
    setErrs(e);return Object.keys(e).length===0;
  };
  return(
    <div style={{display:"grid",gap:10}}>
      <Grid cols={2}>
        <Fld label="Monto ($)" err={errs.amount}><Inp type="number" value={v.amount} onChange={x=>set(id,"amount",x)} placeholder="0.00"/></Fld>
        <Fld label="Fuente" err={errs.source}><Sel value={v.source} onChange={x=>set(id,"source",x)} options={INCOME_SOURCES}/></Fld>
        <Fld label="Fecha" err={errs.date}><Inp type="date" value={v.date} onChange={x=>set(id,"date",x)}/></Fld>
        <Fld label="¿Recurrente?"><Sel value={v.recurring} onChange={x=>set(id,"recurring",x)} options={["si","no"]}/></Fld>
      </Grid>
      <Fld label="Nota (opcional)"><Inp value={v.note} onChange={x=>set(id,"note",x)} placeholder="ej: pago Amazon Flex"/></Fld>
      <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}>
        <SaveBtn onClick={()=>validate()&&onSave(v)}>💰 Guardar</SaveBtn>
        {onSkip&&<GhostBtn onClick={onSkip}>Completar después</GhostBtn>}
      </div>
    </div>
  );
}

function ExpenseForm({id,vals,set,onSave,onSkip}){
  const v=vals[id]||{};
  const [errs,setErrs]=useState({});
  const validate=()=>{
    const e={};
    if(!v.amount)e.amount="Requerido";
    if(!v.category)e.category="Requerido";
    if(!v.date)e.date="Requerido";
    if(!v.paymentMethod)e.paymentMethod="Requerido";
    setErrs(e);return Object.keys(e).length===0;
  };
  return(
    <div style={{display:"grid",gap:10}}>
      <Grid cols={2}>
        <Fld label="Monto ($)" err={errs.amount}><Inp type="number" value={v.amount} onChange={x=>set(id,"amount",x)} placeholder="0.00"/></Fld>
        <Fld label="Categoría" err={errs.category}><Sel value={v.category} onChange={x=>set(id,"category",x)} options={EXPENSE_CATEGORIES}/></Fld>
        <Fld label="Método de pago" err={errs.paymentMethod}><Sel value={v.paymentMethod} onChange={x=>set(id,"paymentMethod",x)} options={PAYMENT_METHODS}/></Fld>
        <Fld label="Fecha" err={errs.date}><Inp type="date" value={v.date} onChange={x=>set(id,"date",x)}/></Fld>
      </Grid>
      <Fld label="Nota (opcional)"><Inp value={v.note} onChange={x=>set(id,"note",x)} placeholder="ej: mercado semanal"/></Fld>
      <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}>
        <SaveBtn onClick={()=>validate()&&onSave(v)}>💸 Guardar</SaveBtn>
        {onSkip&&<GhostBtn onClick={onSkip}>Completar después</GhostBtn>}
      </div>
    </div>
  );
}

export default function ChatWindow({
  chat,connectionStatus,isLoading,onboarding,
  onSendMessage,onApplyStrategy,onConfirmPendingAction,
  onSubmitFinancialForm,onEditDebt,onDeleteDebt,
  onOpenManualForm,onOnboardingAction,error
}){
  const [message,setMessage]=useState("");
  const [vals,setVals]=useState({});
  const ref=useRef(null);

  const hasValidPending=pa=>Boolean(pa?.id&&["income","expense"].includes(pa.intent)&&Number(pa.amount)>0);

  useEffect(()=>{ref.current?.scrollIntoView({behavior:"smooth"});},[chat.messages,isLoading]);

  const set=(fid,field,value)=>setVals(c=>({...c,[fid]:{...(c[fid]||{}),[field]:value}}));

  const submit=e=>{
    e.preventDefault();
    const msg=message.trim();
    if(!msg||isLoading)return;
    onSendMessage(msg);setMessage("");
  };

  const formWrapper=(type,emoji,title,children)=>(
    <div style={{background:"var(--panel-soft)",border:"1px solid var(--line-strong)",borderRadius:16,padding:"14px 16px",marginTop:10,maxWidth:660}}>
      <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>{emoji} {title}</div>
      {children}
    </div>
  );

  const renderForm=(formType,fid,preload)=>{
    const shared={id:fid,vals,set};
    if(formType==="debt") return formWrapper("debt","💳","Nueva deuda",
      <DebtForm {...shared} onSave={v=>onSubmitFinancialForm("debt",v)} onSkip={()=>onSendMessage("Completar después")}/>);
    if(formType==="edit_debt") return formWrapper("edit_debt","✏️","Editar deuda",
      <DebtForm {...shared} preload={preload} onSave={v=>onEditDebt(preload?.name||v.name,v)} onSkip={()=>onSendMessage("Editar después")}/>);
    if(formType==="income") return formWrapper("income","💰","Nuevo ingreso",
      <IncomeForm {...shared} onSave={v=>onSubmitFinancialForm("income",v)} onSkip={()=>onSendMessage("Completar después")}/>);
    if(formType==="expense") return formWrapper("expense","💸","Nuevo gasto",
      <ExpenseForm {...shared} onSave={v=>onSubmitFinancialForm("expense",v)} onSkip={()=>onSendMessage("Completar después")}/>);
    return null;
  };

  const renderDeleteConfirm=(debt)=>{
    if(!debt) return <p style={{color:"var(--muted)",fontSize:13,marginTop:8}}>¿Qué deuda quieres eliminar? Dime el nombre exacto.</p>;
    return(
      <div style={{background:"#1a0808",border:"1px solid var(--danger)",borderRadius:14,padding:14,marginTop:10,maxWidth:380}}>
        <p style={{margin:"0 0 12px",fontSize:13}}>¿Eliminar <strong>{debt.name}</strong> (${debt.amount})?<br/>
          <span style={{color:"var(--muted)",fontSize:12}}>Esta acción no se puede deshacer.</span>
        </p>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>onDeleteDebt(debt.name)}
            style={{background:"var(--danger)",color:"#fff",border:"none",borderRadius:9,padding:"7px 16px",fontWeight:700,fontSize:13,cursor:"pointer"}}>
            Sí, eliminar
          </button>
          <GhostBtn onClick={()=>onSendMessage("Cancelar eliminación")}>Cancelar</GhostBtn>
        </div>
      </div>
    );
  };

  return(
    <main className="chat-shell">
      <header className="chat-header">
        <div><p>Conversación activa</p><h2>{chat.title}</h2></div>
        <div className={`status-pill ${connectionStatus||"checking"}`}>
          <span/>
          {connectionStatus==="offline"?"Sin conexion":connectionStatus==="checking"?"Conectando":"Online"}
        </div>
      </header>

      <section className="messages" aria-live="polite">
        {onboarding&&onboarding.completed===false&&(
          <article className="message-row assistant">
            <div className="avatar">AI</div>
            <div className="message-bubble onboarding-card">
              <p>Antes de arrancar fuerte, armemos tu base financiera. Elige cómo quieres empezar:</p>
              <div>
                <button type="button" onClick={()=>onOnboardingAction("ai")}>Hacer test con IA</button>
                <button type="button" onClick={()=>onOnboardingAction("manual")}>Agregar datos manualmente</button>
                <button type="button" onClick={()=>onOnboardingAction("bank_later")}>Conectar banco después</button>
                <button type="button" onClick={()=>onOnboardingAction("skip")}>Saltar por ahora</button>
              </div>
            </div>
          </article>
        )}

        {chat.messages.map(item=>(
          <article className={`message-row ${item.role}`} key={item.id}>
            <div className="avatar">{item.role==="user"?"Tú":"AI"}</div>
            <div className="message-bubble">
              <p>{item.content}</p>
              {item.autoPlan&&<div className="auto-plan-message"><span>Asignación automática</span><pre>{item.autoPlan.message||item.autoPlan}</pre></div>}
              {item.decision&&typeof item.decision==="object"&&(
                <div className={`decision-message ${item.decision.decision}`}>
                  <span>{item.decision.decision}</span>
                  <strong>{item.decision.reason}</strong>
                  <p>Si haces esto, te quedas con ${item.decision.impact?.newBalance}.</p>
                  <small>{item.decision.impact?.effectOnGoal}</small>
                </div>
              )}
              {item.missingFields?.length>0&&(
                <div className="missing-fields-card">
                  <span>Datos necesarios</span>
                  <ul>{item.missingFields.map(f=><li key={f}>{f}</li>)}</ul>
                </div>
              )}
              {item.debtAction&&(
                <div className={`debt-action-card ${item.debtAction.status||item.debtAction.type}`}>
                  <span>Acción de deuda</span>
                  <strong>{item.debtAction.debt}</strong>
                  {item.debtAction.type==="add_debt"?(
                    <><p>Deuda: ${item.debtAction.amount}</p>{item.debtAction.minimumPayment&&<p>Pago: ${item.debtAction.minimumPayment}</p>}{item.debtAction.dueDate&&<p>Fecha: {item.debtAction.dueDate}</p>}</>
                  ):(
                    <><p>Pago: ${item.debtAction.payment}</p><p>Antes: ${item.debtAction.debtBefore}</p><p>Restante: ${item.debtAction.debtRemaining}</p><p>Balance: ${item.debtAction.finalBalance}</p></>
                  )}
                </div>
              )}
              {item.learningEvent?.pattern&&<div className="coach-message"><span>Nota</span><p>Patrón: {item.learningEvent.pattern}.</p></div>}
              {item.coachMessage&&<div className="coach-message"><span>Coach</span><p>{item.coachMessage.message}</p></div>}
              {item.financialBrain&&(
                <div className={`brain-card ${item.financialBrain.riskLevel||"low"}`}>
                  <span>Cerebro financiero</span>
                  <strong>Seguro para gastar: ${item.financialBrain.safeToSpend||0}</strong>
                  {item.financialBrain.actions?.length>0&&<ul>{item.financialBrain.actions.slice(0,3).map(a=><li key={a}>{a}</li>)}</ul>}
                </div>
              )}
              {item.decision!=="advice"&&hasValidPending(item.pendingAction)&&(
                <div className="pending-action">
                  <span>Confirmación necesaria</span>
                  <p>Intento: {item.pendingAction.intent}{item.pendingAction.amount?` $${item.pendingAction.amount}`:""}</p>
                  <div>
                    <button disabled={!hasValidPending(item.pendingAction)} type="button" onClick={()=>onConfirmPendingAction(item.pendingAction.id,true)}>Confirmar</button>
                    <button type="button" onClick={()=>onConfirmPendingAction(item.pendingAction.id,false)}>Cancelar</button>
                  </div>
                </div>
              )}
              {item.pendingForm==="delete_debt"&&renderDeleteConfirm(item.preloadedDebt)}
              {item.pendingForm&&item.pendingForm!=="delete_debt"&&renderForm(item.pendingForm,item.id,item.preloadedDebt)}
              {item.strategyOptions&&(
                <div className="strategy-options">
                  {item.strategyOptions.map(o=>(
                    <article className="strategy-card" key={o.id}>
                      <span>{o.title}</span><p>{o.description}</p>
                      <dl>
                        <div><dt>Balance</dt><dd>${o.impact.newBalance}</dd></div>
                        <div><dt>Meta</dt><dd>${o.impact.goalProgress}</dd></div>
                        <div><dt>Deuda</dt><dd>-${o.impact.debtReduction}</dd></div>
                      </dl>
                      <button type="button" onClick={()=>onApplyStrategy(o.id)}>Aplicar</button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}

        {isLoading&&(
          <article className="message-row assistant">
            <div className="avatar">AI</div>
            <div className="message-bubble typing"><span/><span/><span/></div>
          </article>
        )}
        <div ref={ref}/>
      </section>

      {error&&<div className="error-banner">{error}</div>}

      <div className="manual-add-bar">
        <span>+ Agregar dato financiero</span>
        <button type="button" onClick={()=>onOpenManualForm("debt")}>💳 Nueva deuda</button>
        <button type="button" onClick={()=>onOpenManualForm("income")}>💰 Nuevo ingreso</button>
        <button type="button" onClick={()=>onOpenManualForm("expense")}>💸 Nuevo gasto</button>
      </div>

      <form className="composer" onSubmit={submit}>
        <textarea aria-label="Mensaje para Johan AI" placeholder="Escribe tu mensaje..." rows="1"
          value={message} onChange={e=>setMessage(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey)submit(e);}}/>
        <button disabled={!message.trim()||isLoading} type="submit">
          {isLoading?"Pensando...":"Enviar"}
        </button>
      </form>
    </main>
  );
}
