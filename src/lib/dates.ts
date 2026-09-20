// Datas são sempre strings "YYYY-MM-DD" no fuso local, para evitar
// deslocamentos de UTC (ex.: "hoje" virando "ontem" à noite no Brasil).

export type SubjectStatus = "upcoming" | "active" | "done";

const MAX_REPEAT_DAYS = 366;
const DAY_MS = 86_400_000;

const pad = (n: number): string => String(n).padStart(2, "0");

export function toISO(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO(now: Date = new Date()): string {
  return toISO(now);
}

export function parseISO(iso: string): Date {
  const [year = 1970, month = 1, day = 1] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(iso: string, days: number): string {
  const date = parseISO(iso);
  date.setDate(date.getDate() + days);
  return toISO(date);
}

/** Dias inteiros de `from` até `to` (negativo se `to` for anterior). */
export function diffDays(from: string, to: string): number {
  const a = parseISO(from);
  const b = parseISO(to);
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / DAY_MS);
}

export function eachDay(start: string, end: string, max: number = MAX_REPEAT_DAYS): string[] {
  const days: string[] = [];
  let current = start;
  while (current <= end && days.length < max) {
    days.push(current);
    current = addDays(current, 1);
  }
  return days;
}

/** Datas para uma tarefa: só `due`, ou todos os dias de `due` até `end` se `repeat`. */
export function expandTaskDates(due: string, end: string, repeat: boolean): string[] {
  if (!repeat || end <= due) return [due];
  return eachDay(due, end);
}

export function subjectStatus(start: string, end: string, today: string): SubjectStatus {
  if (today < start) return "upcoming";
  if (today > end) return "done";
  return "active";
}

/** dd/mm/aaaa */
export function formatBR(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/** dd/mm */
export function formatShort(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
}

/** "sexta-feira, 20 de setembro" */
export function formatLong(iso: string): string {
  return parseISO(iso).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Texto curto sobre o prazo relativo a hoje. */
export function deadlineLabel(end: string, today: string): string {
  const left = diffDays(today, end);
  if (left < 0) return `encerrou há ${-left} ${-left === 1 ? "dia" : "dias"}`;
  if (left === 0) return "termina hoje";
  if (left === 1) return "termina amanhã";
  return `faltam ${left} dias`;
}

export const STATUS_LABEL: Record<SubjectStatus, string> = {
  upcoming: "Vai começar",
  active: "Em andamento",
  done: "Encerrada",
};
