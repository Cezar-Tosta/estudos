import { useAuth } from "./auth/AuthContext";
import { Shell } from "./components/Shell";
import { DataProvider } from "./data/DataContext";
import { isConfigured } from "./lib/supabase";
import { AuthPage } from "./pages/AuthPage";
import { PendingPage } from "./pages/PendingPage";

function Splash({ children }: { children?: React.ReactNode }) {
  return (
    <main className="auth">
      <div className="auth-card center">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={56} height={56} />
        {children ?? <p className="muted">Carregando…</p>}
      </div>
    </main>
  );
}

export function App() {
  const { session, profile, loading, profileError, signOut } = useAuth();

  if (!isConfigured) {
    return (
      <Splash>
        <h1>Configuração necessária</h1>
        <p className="muted">
          Crie o arquivo <code>.env</code> com <code>VITE_SUPABASE_URL</code> e{" "}
          <code>VITE_SUPABASE_ANON_KEY</code> (veja o README) e reinicie o servidor.
        </p>
      </Splash>
    );
  }

  if (loading) return <Splash />;
  if (!session) return <AuthPage />;

  if (!profile) {
    return (
      <Splash>
        <h1>Não foi possível carregar seu perfil</h1>
        <p className="error">{profileError}</p>
        <button type="button" className="btn-secondary" onClick={() => void signOut()}>
          Sair
        </button>
      </Splash>
    );
  }

  if (profile.status !== "approved") return <PendingPage />;

  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  );
}
