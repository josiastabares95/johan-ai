import { useState } from "react";

export default function Register({ error, isLoading, onRegister, onShowLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    onRegister(email, password);
  };

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="brand auth-brand">
          <div className="brand-mark">J</div>
          <div>
            <h1>Crear cuenta</h1>
            <span>Datos separados por usuario</span>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              autoComplete="new-password"
              minLength="6"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && <div className="error-banner auth-error">{error}</div>}
          <button disabled={isLoading} type="submit">
            {isLoading ? "Creando..." : "Crear cuenta"}
          </button>
        </form>

        <button className="auth-switch" type="button" onClick={onShowLogin}>
          Ya tengo cuenta
        </button>
      </section>
    </main>
  );
}
