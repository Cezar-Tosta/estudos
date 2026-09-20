import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { errorMessage, supabase } from "../lib/supabase";
import type { NewSubject, NewTask, StudyTask, Subject } from "../lib/types";

interface DataState {
  subjects: Subject[];
  tasks: StudyTask[];
  loading: boolean;
  /** Erro de operações em segundo plano (marcar/excluir tarefa, carregar). */
  error: string | null;
  clearError: () => void;
  reload: () => Promise<void>;
  // Os métodos abaixo lançam Error para o formulário exibir a mensagem.
  addSubject: (input: NewSubject) => Promise<Subject>;
  updateSubject: (id: string, input: NewSubject) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  addTasks: (inputs: NewTask[]) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

const DataContext = createContext<DataState | null>(null);

const bySubjectDates = (a: Subject, b: Subject): number =>
  a.start_date.localeCompare(b.start_date) || a.end_date.localeCompare(b.end_date);

const byDueDate = (a: StudyTask, b: StudyTask): number =>
  a.due_date.localeCompare(b.due_date) || a.created_at.localeCompare(b.created_at);

export function DataProvider({ children }: { children: ReactNode }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [subjectsRes, tasksRes] = await Promise.all([
      supabase.from("estudos_subjects").select("*").order("start_date"),
      supabase.from("estudos_tasks").select("*").order("due_date"),
    ]);
    const failure = subjectsRes.error ?? tasksRes.error;
    if (failure) {
      setError(errorMessage(failure));
    } else {
      setError(null);
      setSubjects((subjectsRes.data ?? []) as Subject[]);
      setTasks((tasksRes.data ?? []) as StudyTask[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const addSubject = useCallback(async (input: NewSubject) => {
    const { data, error: err } = await supabase
      .from("estudos_subjects")
      .insert(input)
      .select()
      .single();
    if (err) throw new Error(errorMessage(err));
    const created = data as Subject;
    setSubjects((prev) => [...prev, created].sort(bySubjectDates));
    return created;
  }, []);

  const updateSubject = useCallback(async (id: string, input: NewSubject) => {
    const { data, error: err } = await supabase
      .from("estudos_subjects")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (err) throw new Error(errorMessage(err));
    const updated = data as Subject;
    setSubjects((prev) => prev.map((s) => (s.id === id ? updated : s)).sort(bySubjectDates));
  }, []);

  const deleteSubject = useCallback(async (id: string) => {
    const { error: err } = await supabase.from("estudos_subjects").delete().eq("id", id);
    if (err) throw new Error(errorMessage(err));
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setTasks((prev) => prev.filter((t) => t.subject_id !== id));
  }, []);

  const addTasks = useCallback(async (inputs: NewTask[]) => {
    if (inputs.length === 0) return;
    const { data, error: err } = await supabase.from("estudos_tasks").insert(inputs).select();
    if (err) throw new Error(errorMessage(err));
    setTasks((prev) => [...prev, ...(data as StudyTask[])].sort(byDueDate));
  }, []);

  const patchTask = useCallback((id: string, patch: Partial<StudyTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const toggleTask = useCallback(
    async (id: string) => {
      const current = tasks.find((t) => t.id === id);
      if (!current) return;
      const done = !current.done;
      const done_at = done ? new Date().toISOString() : null;
      patchTask(id, { done, done_at }); // otimista
      const { error: err } = await supabase
        .from("estudos_tasks")
        .update({ done, done_at })
        .eq("id", id);
      if (err) {
        patchTask(id, { done: current.done, done_at: current.done_at });
        setError(errorMessage(err));
      }
    },
    [tasks, patchTask],
  );

  const deleteTask = useCallback(async (id: string) => {
    const { error: err } = await supabase.from("estudos_tasks").delete().eq("id", id);
    if (err) {
      setError(errorMessage(err));
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo<DataState>(
    () => ({
      subjects,
      tasks,
      loading,
      error,
      clearError,
      reload,
      addSubject,
      updateSubject,
      deleteSubject,
      addTasks,
      toggleTask,
      deleteTask,
    }),
    [
      subjects,
      tasks,
      loading,
      error,
      clearError,
      reload,
      addSubject,
      updateSubject,
      deleteSubject,
      addTasks,
      toggleTask,
      deleteTask,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataState {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData deve ser usado dentro de <DataProvider>");
  return ctx;
}
