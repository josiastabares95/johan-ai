import { useState } from "react";

export default function Login({ error, isLoading, onLogin, onShowRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    onLogin(email, password);
  };

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="brand auth-brand">
          <div className="brand-mark">J</div>
          <div>
            <h1>Johan AI</h1>
            <span>Tu sistema financiero privado</span>
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
              autoComplete="current-password"
              minLength="6"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && <div className="error-banner auth-error">{error}</div>}
          <button disabled={isLoading} type="submit">
            {isLoading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <button className="auth-switch" type="button" onClick={onShowRegister}>
          Crear cuenta
        </button>
      </section>
    </main>
  );
}
