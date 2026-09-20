import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useData } from "../data/DataContext";
import { supabase } from "../lib/supabase";
import { SchedulePage } from "../pages/SchedulePage";
import { SubjectsPage } from "../pages/SubjectsPage";
import { TodayPage } from "../pages/TodayPage";
import { UsersPage } from "../pages/UsersPage";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

type Tab = "today" | "subjects" | "schedule" | "users";

const TABS: { id: Tab; label: string; icon: IconName; adminOnly?: true }[] = [
  { id: "today", label: "Hoje", icon: "today" },
  { id: "subjects", label: "Matérias", icon: "book" },
  { id: "schedule", label: "Cronograma", icon: "calendar" },
  { id: "users", label: "Usuários", icon: "users", adminOnly: true },
];

export function Shell() {
  const { profile, signOut } = useAuth();
  const { error, clearError } = useData();
  const [tab, setTab] = useState<Tab>("today");
  const [pendingCount, setPendingCount] = useState(0);
  const isAdmin = profile?.role === "admin";

  const refreshPending = useCallback(async () => {
    if (!isAdmin) return;
    const { count } = await supabase
      .from("estudos_profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    setPendingCount(count ?? 0);
  }, [isAdmin]);

  useEffect(() => {
    void refreshPending();
  }, [refreshPending, tab]);

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={26} height={26} />
          Estudos
        </span>
        <span className="topbar-user">
          <span className="muted small who">
            {profile?.full_name || profile?.email}
            {isAdmin ? " · Admin" : ""}
          </span>
          <button
            type="button"
            className="btn-ghost icon-btn"
            aria-label="Sair"
            onClick={() => void signOut()}
          >
            <Icon name="logout" size={20} />
          </button>
        </span>
      </header>

      <main className="content">
        {error ? (
          <div className="error banner" role="alert">
            <span>{error}</span>
            <button type="button" className="btn-ghost" onClick={clearError} aria-label="Dispensar">
              ✕
            </button>
          </div>
        ) : null}
        {tab === "today" ? (
          <TodayPage
            onOpenSubjects={() => {
              setTab("subjects");
            }}
          />
        ) : null}
        {tab === "subjects" ? <SubjectsPage /> : null}
        {tab === "schedule" ? <SchedulePage /> : null}
        {tab === "users" && isAdmin ? <UsersPage onChanged={() => void refreshPending()} /> : null}
      </main>

      <nav className="tabbar" aria-label="Navegação principal">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? "is-active" : ""}
            aria-current={tab === t.id ? "page" : undefined}
            onClick={() => {
              setTab(t.id);
            }}
          >
            <span className="tab-icon">
              <Icon name={t.icon} />
              {t.id === "users" && pendingCount > 0 ? (
                <span className="badge" aria-label={`${pendingCount} pendentes`}>
                  {pendingCount}
                </span>
              ) : null}
            </span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
