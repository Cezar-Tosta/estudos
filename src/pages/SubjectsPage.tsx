import { useState } from "react";
import { Icon } from "../components/Icon";
import { Modal } from "../components/Modal";
import { SubjectForm } from "../components/SubjectForm";
import { useData } from "../data/DataContext";
import {
  STATUS_LABEL,
  deadlineLabel,
  diffDays,
  formatBR,
  subjectStatus,
  todayISO,
} from "../lib/dates";
import { SubjectDetail } from "./SubjectDetail";

export function SubjectsPage() {
  const { subjects, tasks, loading } = useData();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const today = todayISO();

  const open = subjects.find((s) => s.id === openId);
  if (open) {
    return (
      <SubjectDetail
        subject={open}
        onBack={() => {
          setOpenId(null);
        }}
      />
    );
  }

  if (loading) return <p className="muted center">Carregando…</p>;

  return (
    <div className="stack-lg">
      <header className="section-head">
        <h1>Matérias</h1>
        <button
          type="button"
          className="btn-primary btn-sm"
          onClick={() => {
            setCreating(true);
          }}
        >
          <Icon name="plus" size={16} /> Nova
        </button>
      </header>

      {subjects.length === 0 ? (
        <p className="empty card muted">
          Nenhuma matéria ainda. Toque em “Nova” para cadastrar a primeira, com início e prazo
          final.
        </p>
      ) : (
        <ul className="stack">
          {subjects.map((s) => {
            const status = subjectStatus(s.start_date, s.end_date, today);
            const own = tasks.filter((t) => t.subject_id === s.id);
            const done = own.filter((t) => t.done).length;
            const total = diffDays(s.start_date, s.end_date) + 1;
            const elapsed = Math.min(Math.max(diffDays(s.start_date, today) + 1, 0), total);
            const timePercent = Math.round((elapsed / total) * 100);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className="subject-card card"
                  style={{ borderLeftColor: s.color }}
                  onClick={() => {
                    setOpenId(s.id);
                  }}
                >
                  <span className="subject-top">
                    <strong>{s.name}</strong>
                    <span className={`tag status-${status}`}>{STATUS_LABEL[status]}</span>
                  </span>
                  <span className="muted small">
                    {formatBR(s.start_date)} → {formatBR(s.end_date)}
                    {status === "active" ? ` · ${deadlineLabel(s.end_date, today)}` : ""}
                  </span>
                  <span className="bar thin" aria-hidden="true">
                    <span
                      className="bar-fill"
                      style={{ width: `${timePercent}%`, background: s.color }}
                    />
                  </span>
                  <span className="muted small">
                    {own.length === 0 ? "Sem tarefas" : `${done}/${own.length} tarefas concluídas`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {creating ? (
        <Modal
          title="Nova matéria"
          onClose={() => {
            setCreating(false);
          }}
        >
          <SubjectForm
            onCancel={() => {
              setCreating(false);
            }}
            onSaved={(created) => {
              setCreating(false);
              if (created) setOpenId(created.id);
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}
