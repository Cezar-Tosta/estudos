export type Role = "admin" | "user";
export type Status = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  status: Status;
  created_at: string;
}

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  color: string;
  /** YYYY-MM-DD */
  start_date: string;
  /** YYYY-MM-DD — prazo final da matéria */
  end_date: string;
  notes: string;
  created_at: string;
}

export interface StudyTask {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  /** YYYY-MM-DD — dia em que deve ser estudado */
  due_date: string;
  done: boolean;
  done_at: string | null;
  created_at: string;
}

export type NewSubject = Pick<Subject, "name" | "color" | "start_date" | "end_date" | "notes">;
export type NewTask = Pick<StudyTask, "subject_id" | "title" | "due_date">;
