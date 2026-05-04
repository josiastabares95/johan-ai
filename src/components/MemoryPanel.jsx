import { useMemo, useState } from "react";

export default function MemoryPanel({ memories = [], onSearch, onDelete }) {
  const [query, setQuery] = useState("");
  const visibleMemories = useMemo(() => memories.slice(0, 10), [memories]);

  const handleSearch = (event) => {
    event.preventDefault();
    onSearch(query);
  };

  return (
    <section className="memory-panel">
      <div className="panel-subheading">
        <span>Memoria Universal</span>
      </div>

      <form className="memory-search" onSubmit={handleSearch}>
        <input
          aria-label="Buscar memoria"
          placeholder="Buscar memoria..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit">Buscar</button>
      </form>

      <div className="memory-list">
        {visibleMemories.length > 0 ? (
          visibleMemories.map((memory) => (
            <article className="memory-item" key={memory.id}>
              <div>
                <span>{memory.category}</span>
                <strong>Importancia {memory.importance}</strong>
              </div>
              <p>{memory.content}</p>
              <button type="button" onClick={() => onDelete(memory.id)}>
                Borrar
              </button>
            </article>
          ))
        ) : (
          <p className="empty-memory">Sin memorias guardadas todavía.</p>
        )}
      </div>
    </section>
  );
}
