import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { errorMessage } from "../lib/supabase";

type Mode = "login" | "signup";

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        const { needsEmailConfirmation } = await signUp(fullName, email, password);
        if (needsEmailConfirmation) {
          setNotice(
            "Cadastro enviado! Confirme seu e-mail pelo link que enviamos. Depois, aguarde a aprovação do Administrador para acessar.",
          );
          setMode("login");
          setPassword("");
        }
        // Sem confirmação de e-mail, a sessão abre e o app mostra "aguardando aprovação".
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <div className="auth-card card">
        <img className="auth-logo" src="/favicon.svg" alt="" width={64} height={64} />
        <h1>Estudos</h1>
        <p className="muted center">Matérias, prazos e o que estudar hoje.</p>

        <div className="segmented" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={mode === "login" ? "is-active" : ""}
            onClick={() => {
              switchMode("login");
            }}
          >
            Entrar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={mode === "signup" ? "is-active" : ""}
            onClick={() => {
              switchMode("signup");
            }}
          >
            Solicitar cadastro
          </button>
        </div>

        <form className="form" onSubmit={(event) => void onSubmit(event)}>
          {mode === "signup" ? (
            <label className="field">
              <span>Nome</span>
              <input
                value={fullName}
                onChange={(event) => {
                  setFullName(event.target.value);
                }}
                autoComplete="name"
                maxLength={100}
                required
              />
            </label>
          ) : null}
          <label className="field">
            <span>E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
              autoComplete="email"
              inputMode="email"
              required
            />
          </label>
          <label className="field">
            <span>Senha</span>
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
              }}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={6}
              required
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          {notice ? <p className="notice">{notice}</p> : null}
          <button type="submit" className="btn-primary btn-block" disabled={busy}>
            {busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Solicitar cadastro"}
          </button>
          {mode === "signup" ? (
            <p className="muted small center">
              Seu acesso só será liberado depois que um Administrador aprovar o cadastro.
            </p>
          ) : null}
        </form>
      </div>
    </main>
  );
}
