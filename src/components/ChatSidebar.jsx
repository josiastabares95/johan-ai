export default function ChatSidebar({
  mode,
  user,
  activeTab,
  onSetTab,
  onArchiveConversation,
  onClearConversation,
  onDeleteVisibleConversation,
  onLogout
}) {
  const tabBtn = (id, emoji, label) => (
    <button type="button" className={`nav-item ${activeTab === id ? "active" : ""}`} onClick={() => onSetTab(id)}>
      <span>{emoji}</span>
      {label}
    </button>
  );

  return (
    <aside className="sidebar left-panel">
      <div className="brand">
        <div className="brand-mark">J</div>
        <div>
          <h1>Johan AI</h1>
          <span>Fintech coach</span>
        </div>
      </div>

      <div className="sidebar-status">
        <span />
        Online
      </div>

      <nav className="sidebar-nav" aria-label="Navegacion principal">
        {tabBtn("chat", "💬", "Chat")}
        {tabBtn("calendar", "📅", "Calendario")}
        {tabBtn("achievements", "??", "Logros")}
        <button type="button" className="nav-item disabled">
          <span>⚙️</span>
          Ajustes
        </button>
      </nav>

      <section className="mode-badge-panel">
        <span>Modo actual</span>
        <strong>{mode || "normal"}</strong>
        <p>Se ajusta solo con balance, deudas, gastos y meta.</p>
      </section>

      <section className="quiet-actions">
        <button type="button" onClick={onClearConversation}>Limpiar pantalla</button>
        <button type="button" onClick={onArchiveConversation}>Archivar chat</button>
        <button type="button" onClick={onDeleteVisibleConversation}>Borrar visible</button>
      </section>

      <section className="user-panel">
        <span>Cuenta</span>
        <strong>{user?.email || "Cuenta activa"}</strong>
        <button type="button" onClick={onLogout}>Salir</button>
      </section>
    </aside>
  );
}
