import { useEffect, useRef } from "react";
import { useData } from "../data/DataContext";
import {
  STATUS_LABEL,
  addDays,
  diffDays,
  formatBR,
  parseISO,
  subjectStatus,
  todayISO,
} from "../lib/dates";

const PX_PER_DAY = 10;
const PAD_DAYS = 4;

function startsIn(start: string, today: string): string {
  const days = diffDays(today, start);
  if (days === 1) return "começa amanhã";
  return `começa em ${days} dias`;
}

export function SchedulePage() {
  const { subjects, loading } = useData();
  const scroller = useRef<HTMLDivElement>(null);
  const today = todayISO();

  const ordered = [...subjects].sort(
    (a, b) => a.start_date.localeCompare(b.start_date) || a.end_date.localeCompare(b.end_date),
  );

  const first = ordered[0];
  const rangeStart = addDays(
    ordered.reduce((min, s) => (s.start_date < min ? s.start_date : min), today),
    -PAD_DAYS,
  );
  const rangeEnd = addDays(
    ordered.reduce((max, s) => (s.end_date > max ? s.end_date : max), today),
    PAD_DAYS,
  );
  const totalDays = diffDays(rangeStart, rangeEnd) + 1;
  const todayX = diffDays(rangeStart, today) * PX_PER_DAY + PX_PER_DAY / 2;

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = Math.max(0, todayX - el.clientWidth / 3);
  }, [todayX, first?.id]);

  if (loading) return <p className="muted center">Carregando…</p>;

  // Marcadores de início de mês dentro do intervalo.
  const months: { x: number; label: string }[] = [];
  const cursor = parseISO(rangeStart);
  cursor.setDate(1);
  cursor.setMonth(cursor.getMonth() + 1);
  while (true) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-01`;
    if (iso > rangeEnd) break;
    months.push({
      x: diffDays(rangeStart, iso) * PX_PER_DAY,
      label: cursor.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return (
    <div className="stack-lg">
      <header>
        <h1>Cronograma</h1>
        <p className="muted">Quando cada matéria começa e termina.</p>
      </header>

      {ordered.length === 0 ? (
        <p className="empty card muted">Cadastre matérias para ver o cronograma.</p>
      ) : (
        <>
          <div className="gantt card" ref={scroller}>
            <div className="gantt-inner" style={{ width: totalDays * PX_PER_DAY }}>
              <div className="gantt-months">
                {months.map((m) => (
                  <span key={m.x} style={{ left: m.x }}>
                    {m.label}
                  </span>
                ))}
              </div>
              <div className="gantt-today" style={{ left: todayX }} title="Hoje" />
              {ordered.map((s) => {
                const left = diffDays(rangeStart, s.start_date) * PX_PER_DAY;
                const width = (diffDays(s.start_date, s.end_date) + 1) * PX_PER_DAY;
                return (
                  <div className="gantt-row" key={s.id}>
                    <span className="gantt-label" style={{ left: Math.max(left, 4) }}>
                      {s.name}
                    </span>
                    <span
                      className="gantt-bar"
                      style={{ left, width, background: s.color }}
                      title={`${formatBR(s.start_date)} → ${formatBR(s.end_date)}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <section>
            <h2 className="section-title">Sequência</h2>
            <ol className="timeline">
              {ordered.map((s) => {
                const status = subjectStatus(s.start_date, s.end_date, today);
                return (
                  <li key={s.id} style={{ "--c": s.color } as never}>
                    <strong>{s.name}</strong>
                    <span className="muted small">
                      {formatBR(s.start_date)} → {formatBR(s.end_date)}
                    </span>
                    <span className={`tag status-${status}`}>
                      {STATUS_LABEL[status]}
                      {status === "upcoming" ? ` · ${startsIn(s.start_date, today)}` : ""}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}
