import { formatShort } from "../lib/dates";
import type { StudyTask, Subject } from "../lib/types";
import { Icon } from "./Icon";

interface TaskRowProps {
  task: StudyTask;
  subject: Subject | undefined;
  /** Mostra a data (útil em listas que misturam dias). */
  showDate?: boolean;
  /** Mostra o nome da matéria (desnecessário dentro da própria matéria). */
  showSubject?: boolean;
  overdue?: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TaskRow({
  task,
  subject,
  showDate = false,
  showSubject = true,
  overdue = false,
  onToggle,
  onDelete,
}: TaskRowProps) {
  return (
    <li className={`task ${task.done ? "is-done" : ""}`}>
      <label className="task-check">
        <input
          type="checkbox"
          checked={task.done}
          onChange={() => {
            onToggle(task.id);
          }}
        />
        <span className="box" style={{ "--c": subject?.color ?? "var(--primary)" } as never} />
        <span className="task-body">
          <span className="task-title">{task.title}</span>
          <span className="task-meta">
            {showSubject && subject ? (
              <>
                <i className="dot" style={{ background: subject.color }} />
                {subject.name}
              </>
            ) : null}
            {showDate ? (
              <span className={overdue ? "tag tag-danger" : "tag"}>
                {formatShort(task.due_date)}
              </span>
            ) : null}
          </span>
        </span>
      </label>
      <button
        type="button"
        className="btn-ghost icon-btn"
        aria-label={`Excluir tarefa ${task.title}`}
        onClick={() => {
          onDelete(task.id);
        }}
      >
        <Icon name="trash" size={18} />
      </button>
    </li>
  );
}
