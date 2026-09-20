import { useState } from "react";
import { TaskForm } from "../components/TaskForm";
import { TaskRow } from "../components/TaskRow";
import { useData } from "../data/DataContext";
import { deadlineLabel, formatLong, subjectStatus, todayISO } from "../lib/dates";

export function TodayPage({ onOpenSubjects }: { onOpenSubjects: () => void }) {
  const { subjects, tasks, loading, toggleTask, deleteTask } = useData();
  const [adding, setAdding] = useState(false);
  const today = todayISO();

  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const todayTasks = tasks
    .filter((t) => t.due_date === today)
    .sort((a, b) => Number(a.done) - Number(b.done));
  const overdue = tasks.filter((t) => t.due_date < today && !t.done);
  const active = subjects.filter(
    (s) => subjectStatus(s.start_date, s.end_date, today) === "active",
  );

  const doneCount = todayTasks.filter((t) => t.done).length;
  const percent = todayTasks.length === 0 ? 0 : Math.round((doneCount / todayTasks.length) * 100);

  if (loading) return <p className="muted center">Carregando…</p>;

  return (
    <div className="stack-lg">
      <header>
        <p className="eyebrow">{formatLong(today)}</p>
        <h1>Hoje</h1>
      </header>

      <section className="card">
        <div className="progress-head">
          <strong>
            {todayTasks.length === 0
              ? "Nada agendado para hoje"
              : `${doneCount} de ${todayTasks.length} concluídas`}
          </strong>
          <span className="muted">{percent}%</span>
        </div>
        <div
          className="bar"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="bar-fill" style={{ width: `${percent}%` }} />
        </div>
        {todayTasks.length > 0 && doneCount === todayTasks.length ? (
          <p className="notice">🎉 Tudo estudado por hoje. Bom trabalho!</p>
        ) : null}
      </section>

      {overdue.length > 0 ? (
        <section>
          <h2 className="section-title danger">Atrasadas ({overdue.length})</h2>
          <ul className="list card">
            {overdue.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                subject={subjectById.get(task.subject_id)}
                showDate
                overdue
                onToggle={(id) => void toggleTask(id)}
                onDelete={(id) => void deleteTask(id)}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="section-head">
          <h2 className="section-title">Para estudar hoje</h2>
          {subjects.length > 0 && !adding ? (
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => {
                setAdding(true);
              }}
            >
              + Tarefa
            </button>
          ) : null}
        </div>

        {adding ? (
          <TaskForm
            subjects={subjects}
            defaultDate={today}
            onDone={() => {
              setAdding(false);
            }}
          />
        ) : null}

        {subjects.length === 0 ? (
          <div className="empty card">
            <p>Você ainda não tem matérias cadastradas.</p>
            <button type="button" className="btn-primary" onClick={onOpenSubjects}>
              Cadastrar primeira matéria
            </button>
          </div>
        ) : todayTasks.length === 0 && !adding ? (
          <p className="empty card muted">
            Nenhuma tarefa para hoje. Toque em “+ Tarefa” para adicionar.
          </p>
        ) : (
          <ul className="list card">
            {todayTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                subject={subjectById.get(task.subject_id)}
                onToggle={(id) => void toggleTask(id)}
                onDelete={(id) => void deleteTask(id)}
              />
            ))}
          </ul>
        )}
      </section>

      {active.length > 0 ? (
        <section>
          <h2 className="section-title">Matérias em andamento</h2>
          <ul className="chips">
            {active.map((s) => (
              <li key={s.id} className="chip" style={{ borderColor: s.color }}>
                <i className="dot" style={{ background: s.color }} />
                <span>
                  <strong>{s.name}</strong>
                  <small>{deadlineLabel(s.end_date, today)}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
