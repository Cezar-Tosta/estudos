import { useState } from "react";
import type { FormEvent } from "react";
import { useData } from "../data/DataContext";
import { addDays, todayISO } from "../lib/dates";
import { errorMessage } from "../lib/supabase";
import type { Subject } from "../lib/types";

const COLORS = [
  "#4f46e5",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#64748b",
];

interface SubjectFormProps {
  /** Se informado, edita; senão cria. */
  subject?: Subject;
  onSaved: (subject: Subject | null) => void;
  onCancel: () => void;
}

export function SubjectForm({ subject, onSaved, onCancel }: SubjectFormProps) {
  const { addSubject, updateSubject } = useData();
  const today = todayISO();
  const [name, setName] = useState(subject?.name ?? "");
  const [color, setColor] = useState(subject?.color ?? COLORS[0] ?? "#4f46e5");
  const [start, setStart] = useState(subject?.start_date ?? today);
  const [end, setEnd] = useState(subject?.end_date ?? addDays(today, 30));
  const [notes, setNotes] = useState(subject?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (end < start) {
      setError("O prazo final não pode ser anterior ao início.");
      return;
    }
    setBusy(true);
    setError(null);
    const input = {
      name: name.trim(),
      color,
      start_date: start,
      end_date: end,
      notes: notes.trim(),
    };
    try {
      if (subject) {
        await updateSubject(subject.id, input);
        onSaved(null);
      } else {
        onSaved(await addSubject(input));
      }
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={(event) => void onSubmit(event)}>
      <label className="field">
        <span>Nome da matéria</span>
        <input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          placeholder="Ex.: Matemática"
          maxLength={120}
          required
          autoFocus
        />
      </label>
      <div className="grid-2">
        <label className="field">
          <span>Início</span>
          <input
            type="date"
            value={start}
            onChange={(event) => {
              setStart(event.target.value);
            }}
            required
          />
        </label>
        <label className="field">
          <span>Prazo final</span>
          <input
            type="date"
            value={end}
            min={start}
            onChange={(event) => {
              setEnd(event.target.value);
            }}
            required
          />
        </label>
      </div>
      <div className="field">
        <span>Cor</span>
        <div className="swatches" role="radiogroup" aria-label="Cor da matéria">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={c}
              className={`swatch ${color === c ? "is-active" : ""}`}
              style={{ background: c }}
              onClick={() => {
                setColor(c);
              }}
            />
          ))}
        </div>
      </div>
      <label className="field">
        <span>Anotações (opcional)</span>
        <textarea
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
          }}
          rows={3}
          placeholder="Livro, professor, link do material…"
        />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <div className="row-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
