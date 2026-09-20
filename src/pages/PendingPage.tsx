import { useState } from "react";
import { useAuth } from "../auth/AuthContext";

export function PendingPage() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [checking, setChecking] = useState(false);
  const rejected = profile?.status === "rejected";

  async function check() {
    setChecking(true);
    await refreshProfile();
    setChecking(false);
  }

  return (
    <main className="auth">
      <div className="auth-card card center">
        <div className="big-emoji" aria-hidden="true">
          {rejected ? "🚫" : "⏳"}
        </div>
        <h1>{rejected ? "Acesso não autorizado" : "Aguardando aprovação"}</h1>
        <p className="muted">
          {rejected
            ? "Seu cadastro foi recusado pelo Administrador. Entre em contato com ele se acredita que foi um engano."
            : `Olá${profile?.full_name ? `, ${profile.full_name}` : ""}! Seu cadastro foi recebido e está aguardando a confirmação do Administrador.`}
        </p>
        <p className="muted small">{profile?.email}</p>
        <div className="stack">
          {rejected ? null : (
            <button
              type="button"
              className="btn-primary btn-block"
              disabled={checking}
              onClick={() => void check()}
            >
              {checking ? "Verificando…" : "Já fui aprovado? Verificar"}
            </button>
          )}
          <button type="button" className="btn-secondary btn-block" onClick={() => void signOut()}>
            Sair
          </button>
        </div>
      </div>
    </main>
  );
}
