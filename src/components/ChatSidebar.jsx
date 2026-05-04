export default function ChatSidebar({
  mode,user,activeTab,onSetTab,
  onArchiveConversation,onClearConversation,onDeleteVisibleConversation,onLogout
}){
  const tabBtn=(id,emoji,label)=>(
    <button type="button" onClick={()=>onSetTab(id)}
      style={{
        display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",
        background:activeTab===id?"var(--green-soft)":"none",
        border:activeTab===id?"1px solid rgba(0,255,153,0.25)":"1px solid transparent",
        color:activeTab===id?"var(--green)":"var(--muted)",
        borderRadius:10,padding:"8px 12px",fontSize:13,fontWeight:activeTab===id?700:400,
        cursor:"pointer",transition:"all 0.15s"
      }}>
      {emoji} {label}
    </button>
  );

  return(
    <aside className="sidebar left-panel">
      <div className="brand">
        <div className="brand-mark">J</div>
        <div><h1>Johan AI</h1><span>Coach financiero vivo</span></div>
      </div>

      <section style={{marginBottom:8}}>
        <span style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.07em",display:"block",marginBottom:8,padding:"0 4px"}}>Vistas</span>
        {tabBtn("chat","💬","Chat")}
        {tabBtn("calendar","📅","Calendario")}
      </section>

      <section className="mode-badge-panel">
        <span>Modo actual</span>
        <strong>{mode||"normal"}</strong>
        <p>Se ajusta solo según balance, deudas, gastos y meta.</p>
      </section>

      <section className="quiet-actions">
        <button type="button" onClick={onClearConversation}>Limpiar pantalla</button>
        <button type="button" onClick={onArchiveConversation}>Archivar conversación</button>
        <button type="button" onClick={onDeleteVisibleConversation}>Borrar conversación visible</button>
      </section>

      <section className="user-panel">
        <span>Cuenta</span>
        <strong>{user?.email||"Cuenta activa"}</strong>
        <button type="button" onClick={onLogout}>Salir</button>
      </section>
    </aside>
  );
}
