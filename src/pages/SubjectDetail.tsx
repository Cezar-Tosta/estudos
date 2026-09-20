import { useState } from "react";
import { Icon } from "../components/Icon";
import { Modal } from "../components/Modal";
import { SubjectForm } from "../components/SubjectForm";
import { TaskForm } from "../components/TaskForm";
import { TaskRow } from "../components/TaskRow";
import { useData } from "../data/DataContext";
import {
  STATUS_LABEL,
  deadlineLabel,
  formatBR,
  formatLong,
  subjectStatus,
  todayISO,
} from "../lib/dates";
import { errorMessage } from "../lib/supabase";
import type { StudyTask, Subject } from "../lib/types";

interface SubjectDetailProps {
  subject: Subject;
  onBack: () => void;
}

export function SubjectDetail({ subject, onBack }: SubjectDetailProps) {
  const { tasks, deleteSubject, toggleTask, deleteTask } = useData();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = todayISO();

  const own = tasks.filter((t) => t.subject_id === subject.id);
  const done = own.filter((t) => t.done).length;
  const status = subjectStatus(subject.start_date, subject.end_date, today);

  // Agrupa por dia (as tarefas já vêm ordenadas por data).
  const days: { date: string; items: StudyTask[] }[] = [];
  for (const task of own) {
    const last = days[days.length - 1];
    if (last?.date === task.due_date) {
      last.items.push(task);
    } else {
      days.push({ date: task.due_date, items: [task] });
    }
  }

  async function onDelete() {
    const ok = window.confirm(
      `Excluir “${subject.name}” e todas as suas ${own.length} tarefas? Isso não pode ser desfeito.`,
    );
    if (!ok) return;
    try {
      await deleteSubject(subject.id);
      onBack();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="stack-lg">
      <header className="section-head">
        <button type="button" className="btn-ghost back" onClick={onBack}>
          <Icon name="back" size={20} /> Matérias
        </button>
        <span className="row-actions tight">
          <button
            type="button"
            className="btn-ghost icon-btn"
            aria-label="Editar matéria"
            onClick={() => {
              setEditing(true);
            }}
          >
            <Icon name="edit" size={20} />
          </button>
          <button
            type="button"
            className="btn-ghost icon-btn danger"
            aria-label="Excluir matéria"
            onClick={() => void onDelete()}
          >
            <Icon name="trash" size={20} />
          </button>
        </span>
      </header>

      <section className="card subject-hero" style={{ borderTopColor: subject.color }}>
        <h1>{subject.name}</h1>
        <p className="muted">
          {formatBR(subject.start_date)} → {formatBR(subject.end_date)}
        </p>
        <p>
          <span className={`tag status-${status}`}>{STATUS_LABEL[status]}</span>{" "}
          <span className="muted small">
            {status === "upcoming" ? "" : deadlineLabel(subject.end_date, today)}
          </span>
        </p>
        <p className="muted small">
          {own.length === 0 ? "Sem tarefas" : `${done}/${own.length} tarefas concluídas`}
        </p>
        {subject.notes ? <p className="notes">{subject.notes}</p> : null}
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section>
        <div className="section-head">
          <h2 className="section-title">Plano de estudo</h2>
          {adding ? null : (
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => {
                setAdding(true);
              }}
            >
              + Tarefa
            </button>
          )}
        </div>

        {adding ? (
          <TaskForm
            subjects={[subject]}
            fixedSubjectId={subject.id}
            defaultDate={today < subject.start_date ? subject.start_date : today}
            onDone={() => {
              setAdding(false);
            }}
          />
        ) : null}

        {days.length === 0 && !adding ? (
          <p className="empty card muted">
            Nenhuma tarefa. Adicione o que precisa ser estudado em cada dia.
          </p>
        ) : (
          <div className="stack">
            {days.map(({ date, items }) => (
              <div key={date}>
                <h3 className={`day-title ${date === today ? "is-today" : ""}`}>
                  {date === today ? "Hoje · " : ""}
                  {formatLong(date)}
                </h3>
                <ul className="list card">
                  {items.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      subject={subject}
                      showSubject={false}
                      onToggle={(id) => void toggleTask(id)}
                      onDelete={(id) => void deleteTask(id)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {editing ? (
        <Modal
          title="Editar matéria"
          onClose={() => {
            setEditing(false);
          }}
        >
          <SubjectForm
            subject={subject}
            onCancel={() => {
              setEditing(false);
            }}
            onSaved={() => {
              setEditing(false);
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}
