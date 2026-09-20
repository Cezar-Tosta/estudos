import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { errorMessage, supabase } from "../lib/supabase";
import type { Profile, Role, Status } from "../lib/types";

interface UsersPageProps {
  /** Avisa o Shell para atualizar o contador de pendentes. */
  onChanged: () => void;
}

export function UsersPage({ onChanged }: UsersPageProps) {
  const { profile: me } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("estudos_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) setError(errorMessage(err));
    else {
      setError(null);
      setUsers((data ?? []) as Profile[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function update(user: Profile, patch: { status: Status } | { role: Role }) {
    setBusyId(user.id);
    setError(null);
    const { error: err } = await supabase.from("estudos_profiles").update(patch).eq("id", user.id);
    if (err) setError(errorMessage(err));
    await load();
    onChanged();
    setBusyId(null);
  }

  const pending = users.filter((u) => u.status === "pending");
  const approved = users.filter((u) => u.status === "approved");
  const rejected = users.filter((u) => u.status === "rejected");

  if (me?.role !== "admin") return null;

  function card(user: Profile, actions: React.ReactNode) {
    const isMe = user.id === me?.id;
    return (
      <li key={user.id} className="user">
        <div className="avatar" aria-hidden="true">
          {(user.full_name || user.email).charAt(0).toUpperCase()}
        </div>
        <div className="user-info">
          <strong>
            {user.full_name || "(sem nome)"}
            {isMe ? <span className="tag"> você</span> : null}
            {user.role === "admin" ? <span className="tag tag-admin">Administrador</span> : null}
          </strong>
          <span className="muted small">{user.email}</span>
        </div>
        <div className="user-actions">{isMe ? null : actions}</div>
      </li>
    );
  }

  return (
    <div className="stack-lg">
      <header className="section-head">
        <h1>Usuários</h1>
        <button type="button" className="btn-secondary btn-sm" onClick={() => void load()}>
          Atualizar
        </button>
      </header>

      {error ? <p className="error">{error}</p> : null}
      {loading ? <p className="muted center">Carregando…</p> : null}

      <section>
        <h2 className="section-title">Aguardando aprovação ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="empty card muted">Nenhuma solicitação pendente.</p>
        ) : (
          <ul className="list card">
            {pending.map((u) =>
              card(
                u,
                <>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    disabled={busyId === u.id}
                    onClick={() => void update(u, { status: "approved" })}
                  >
                    Aprovar
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    disabled={busyId === u.id}
                    onClick={() => void update(u, { status: "rejected" })}
                  >
                    Recusar
                  </button>
                </>,
              ),
            )}
          </ul>
        )}
      </section>

      <section>
        <h2 className="section-title">Ativos ({approved.length})</h2>
        <ul className="list card">
          {approved.map((u) =>
            card(
              u,
              <>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  disabled={busyId === u.id}
                  onClick={() => void update(u, { role: u.role === "admin" ? "user" : "admin" })}
                >
                  {u.role === "admin" ? "Tornar Usuário" : "Tornar Admin"}
                </button>
                <button
                  type="button"
                  className="btn-danger btn-sm"
                  disabled={busyId === u.id}
                  onClick={() => {
                    if (window.confirm(`Bloquear o acesso de ${u.full_name || u.email}?`)) {
                      void update(u, { status: "rejected" });
                    }
                  }}
                >
                  Bloquear
                </button>
              </>,
            ),
          )}
        </ul>
      </section>

      {rejected.length > 0 ? (
        <section>
          <h2 className="section-title">Recusados / bloqueados ({rejected.length})</h2>
          <ul className="list card">
            {rejected.map((u) =>
              card(
                u,
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  disabled={busyId === u.id}
                  onClick={() => void update(u, { status: "approved" })}
                >
                  Aprovar
                </button>,
              ),
            )}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
