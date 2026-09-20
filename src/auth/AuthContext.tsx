import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { errorMessage, supabase } from "../lib/supabase";
import type { Profile } from "../lib/types";

interface SignUpResult {
  /** true quando o Supabase exige confirmação de e-mail antes de logar */
  needsEmailConfirmation: boolean;
}

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  /** true enquanto a sessão inicial ou o perfil estão sendo carregados */
  loading: boolean;
  profileError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (fullName: string, email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const AUTH_ERRORS: Record<string, string> = {
  "Invalid login credentials": "E-mail ou senha incorretos.",
  "User already registered": "Este e-mail já está cadastrado.",
  "Email not confirmed": "Confirme seu e-mail antes de entrar (veja sua caixa de entrada).",
};

function translateAuthError(error: unknown): Error {
  const message = errorMessage(error);
  if (message.toLowerCase().includes("password should be at least")) {
    return new Error("A senha deve ter pelo menos 6 caracteres.");
  }
  return new Error(AUTH_ERRORS[message] ?? message);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  // O resultado fica atrelado ao id do usuário: ao trocar de conta nunca sobra perfil alheio.
  const [loaded, setLoaded] = useState<{
    id: string;
    profile: Profile | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionReady(true);
    });
    // Callback síncrono de propósito: chamar o Supabase aqui dentro pode travar o cliente.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setSessionReady(true);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id ?? null;

  const fullName = String(session?.user.user_metadata["full_name"] ?? "");

  // A função do banco cria o perfil no primeiro login e sempre devolve a linha atual.
  const loadProfile = useCallback(async (id: string, name: string) => {
    const { data, error } = await supabase.rpc("estudos_ensure_profile", { p_full_name: name });
    if (error) {
      setLoaded({ id, profile: null, error: errorMessage(error) });
    } else if (!data) {
      setLoaded({
        id,
        profile: null,
        error: "Perfil não encontrado. Confirme que o supabase/schema.sql foi executado.",
      });
    } else {
      setLoaded({ id, profile: data as Profile, error: null });
    }
  }, []);

  useEffect(() => {
    if (userId) void loadProfile(userId, fullName);
  }, [userId, fullName, loadProfile]);

  const current = loaded !== null && loaded.id === userId ? loaded : null;
  const profile = current?.profile ?? null;
  const profileError = current?.error ?? null;

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw translateAuthError(error);
  }, []);

  const signUp = useCallback(async (fullName: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    if (error) throw translateAuthError(error);
    // Com e-mail já cadastrado o Supabase devolve um usuário sem identidades.
    if (data.user && data.user.identities?.length === 0) {
      throw new Error("Este e-mail já está cadastrado.");
    }
    return { needsEmailConfirmation: data.session === null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (userId) await loadProfile(userId, fullName);
  }, [userId, fullName, loadProfile]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      // Sessão presente mas perfil ainda não chegou também conta como "carregando".
      loading: !sessionReady || (userId !== null && current === null),
      profileError,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [
      session,
      profile,
      sessionReady,
      userId,
      current,
      profileError,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
