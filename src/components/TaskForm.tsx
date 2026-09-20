import { useState } from "react";
import type { FormEvent } from "react";
import { useData } from "../data/DataContext";
import { expandTaskDates, formatBR } from "../lib/dates";
import { errorMessage } from "../lib/supabase";
import type { Subject } from "../lib/types";

interface TaskFormProps {
  subjects: Subject[];
  /** Quando informado, a matéria fica fixa (tela da matéria). */
  fixedSubjectId?: string;
  defaultDate: string;
  onDone: () => void;
}

export function TaskForm({ subjects, fixedSubjectId, defaultDate, onDone }: TaskFormProps) {
  const { addTasks } = useData();
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState(fixedSubjectId ?? subjects[0]?.id ?? "");
  const [date, setDate] = useState(defaultDate);
  const [repeat, setRepeat] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subject = subjects.find((s) => s.id === subjectId);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!subject) {
      setError("Escolha uma matéria.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const dates = expandTaskDates(date, subject.end_date, repeat);
      await addTasks(
        dates.map((due_date) => ({ subject_id: subject.id, title: title.trim(), due_date })),
      );
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form className="form card" onSubmit={(event) => void onSubmit(event)}>
      <label className="field">
        <span>O que estudar</span>
        <input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
          }}
          placeholder="Ex.: Capítulo 3 — exercícios"
          maxLength={200}
          required
          autoFocus
        />
      </label>
      {fixedSubjectId ? null : (
        <label className="field">
          <span>Matéria</span>
          <select
            value={subjectId}
            onChange={(event) => {
              setSubjectId(event.target.value);
            }}
            required
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="field">
        <span>Dia</span>
        <input
          type="date"
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
          }}
          required
        />
      </label>
      {subject && subject.end_date > date ? (
        <label className="check-inline">
          <input
            type="checkbox"
            checked={repeat}
            onChange={(event) => {
              setRepeat(event.target.checked);
            }}
          />
          <span>Repetir todos os dias até {formatBR(subject.end_date)}</span>
        </label>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
      <div className="row-actions">
        <button type="button" className="btn-secondary" onClick={onDone}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Salvando…" : "Adicionar"}
        </button>
      </div>
    </form>
  );
}
