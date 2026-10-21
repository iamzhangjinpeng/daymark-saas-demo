"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  Circle,
  CircleCheck,
  Clock3,
  Command,
  Flag,
  Inbox,
  LayoutGrid,
  ListTodo,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { withBasePath } from "@/lib/routes";

type TaskStatus = "open" | "completed";
type TaskPriority = "low" | "normal" | "high";
type ViewKey = "all" | "today" | "upcoming" | "completed";

export type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

type TaskDraft = Pick<Task, "title" | "description" | "priority" | "due_date">;

const views: { key: ViewKey; label: string; icon: typeof Inbox }[] = [
  { key: "all", label: "All tasks", icon: Inbox },
  { key: "today", label: "Today", icon: CalendarDays },
  { key: "upcoming", label: "Upcoming", icon: Clock3 },
  { key: "completed", label: "Completed", icon: CheckCheck },
];

function localDateString() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function prettyToday() {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function dueCopy(dueDate: string | null) {
  if (!dueDate) return null;
  const today = localDateString();
  const tomorrow = new Date(`${today}T12:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);
  const date = new Date(`${dueDate}T12:00:00`);
  if (dueDate < today) return { label: `Overdue · ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date)}`, kind: "overdue" };
  if (dueDate === today) return { label: "Today", kind: "today" };
  if (dueDate === tomorrowIso) return { label: "Tomorrow", kind: "normal" };
  return { label: new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date), kind: "normal" };
}

function initials(email: string) {
  const local = email.split("@")[0] ?? "D";
  return local.slice(0, 2).toUpperCase();
}

export function DashboardShell({
  initialTasks,
  userEmail,
  userId,
  loadError,
}: {
  initialTasks: Task[];
  userEmail: string;
  userId: string;
  loadError: string;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [activeView, setActiveView] = useState<ViewKey>("all");
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [pendingId, setPendingId] = useState("");
  const [toast, setToast] = useState("");

  const today = localDateString();
  const openTasks = tasks.filter((task) => task.status === "open");
  const todayCount = openTasks.filter((task) => task.due_date === today).length;
  const completedCount = tasks.filter((task) => task.status === "completed").length;

  const visibleTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks
      .filter((task) => {
        if (activeView === "completed") return task.status === "completed";
        if (task.status === "completed") return false;
        if (activeView === "today") return task.due_date === today;
        if (activeView === "upcoming") return Boolean(task.due_date && task.due_date > today);
        return true;
      })
      .filter((task) => !query || `${task.title} ${task.description}`.toLowerCase().includes(query))
      .sort((a, b) => {
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return b.created_at.localeCompare(a.created_at);
      });
  }, [activeView, search, tasks, today]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }

  function openNewTask() {
    setEditingTask(null);
    setEditorOpen(true);
  }

  function openTaskEditor(task: Task) {
    setEditingTask(task);
    setEditorOpen(true);
  }

  async function saveTask(draft: TaskDraft) {
    setPendingId("saving");
    const supabase = createClient();
    if (editingTask) {
      const { data, error } = await supabase
        .from("tasks")
        .update(draft)
        .eq("id", editingTask.id)
        .eq("user_id", userId)
        .select("id, user_id, title, description, status, priority, due_date, created_at, updated_at")
        .single();
      setPendingId("");
      if (error || !data) {
        notify(error?.message ?? "This task could not be updated.");
        return false;
      }
      setTasks((current) => current.map((task) => task.id === data.id ? data as Task : task));
      notify("Task updated.");
    } else {
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...draft, user_id: userId })
        .select("id, user_id, title, description, status, priority, due_date, created_at, updated_at")
        .single();
      setPendingId("");
      if (error || !data) {
        notify(error?.message ?? "This task could not be created.");
        return false;
      }
      setTasks((current) => [data as Task, ...current]);
      setActiveView("all");
      setSearch("");
      notify("Task added to your list.");
    }
    setEditorOpen(false);
    return true;
  }

  async function toggleTask(task: Task) {
    const nextStatus: TaskStatus = task.status === "completed" ? "open" : "completed";
    setPendingId(task.id);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tasks")
      .update({ status: nextStatus })
      .eq("id", task.id)
      .eq("user_id", userId)
      .select("id");
    setPendingId("");
    if (error || !data?.length) {
      notify(error?.message ?? "This task could not be updated.");
      return;
    }
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: nextStatus } : item));
    notify(nextStatus === "completed" ? "Nicely done. Task completed." : "Task moved back to your list.");
  }

  async function deleteTask(task: Task) {
    const confirmed = window.confirm(`Delete “${task.title}”? This can’t be undone.`);
    if (!confirmed) return;
    setPendingId(task.id);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", task.id)
      .eq("user_id", userId)
      .select("id");
    setPendingId("");
    if (error || !data?.length) {
      notify(error?.message ?? "This task could not be deleted.");
      return;
    }
    setTasks((current) => current.filter((item) => item.id !== task.id));
    notify("Task deleted.");
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const activeLabel = views.find((view) => view.key === activeView)?.label ?? "All tasks";

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand-row">
          <a className="brand-lockup brand-lockup-dark" href={withBasePath("/dashboard/")}>
            <span className="brand-mark"><Sparkles size={16} strokeWidth={2.4} /></span>
            <span>daymark</span>
          </a>
          <button className="workspace-switch" type="button" aria-label="Personal workspace">
            <span className="workspace-avatar">{initials(userEmail)}</span>
            <span className="workspace-switch-copy"><strong>Personal</strong><small>Free workspace</small></span>
            <ChevronDown size={15} />
          </button>
        </div>

        <div className="sidebar-scroll">
          <div className="nav-group-label">WORKSPACE</div>
          <nav className="primary-nav" aria-label="Task views">
            {views.map(({ key, label, icon: Icon }) => {
              const count = key === "all" ? openTasks.length : key === "today" ? todayCount : key === "completed" ? completedCount : openTasks.filter((task) => task.due_date && task.due_date > today).length;
              return (
                <button className={`nav-item ${activeView === key ? "active" : ""}`} key={key} onClick={() => setActiveView(key)} type="button" aria-current={activeView === key ? "page" : undefined}>
                  <Icon size={17} strokeWidth={1.8} />
                  <span>{label}</span>
                  <span className="nav-count">{count}</span>
                </button>
              );
            })}
          </nav>

          <div className="nav-group-label nav-group-label-spaced">YOUR SPACE</div>
          <div className="project-nav-item"><span className="project-color-dot" /><span>Personal tasks</span><MoreHorizontal size={16} /></div>

          <div className="sidebar-note">
            <div className="sidebar-note-icon"><Sparkles size={16} /></div>
            <strong>Small steps add up.</strong>
            <p>Keep your next move close and the rest can wait.</p>
          </div>
        </div>

        <div className="sidebar-account">
          <div className="user-avatar">{initials(userEmail)}</div>
          <div className="user-details"><strong>{userEmail.split("@")[0]}</strong><span>{userEmail}</span></div>
          <button className="icon-button signout-button" type="button" aria-label="Sign out" title="Sign out" onClick={signOut}><LogOut size={17} /></button>
        </div>
      </aside>

      <section className="main-workspace">
        <header className="topbar">
          <div className="breadcrumbs"><span className="breadcrumb-muted">Personal</span><span className="breadcrumb-slash">/</span><span>{activeLabel}</span></div>
          <div className="topbar-right">
            <span className="today-stamp"><CalendarDays size={15} />{prettyToday()}</span>
            <span className="topbar-avatar">{initials(userEmail)}</span>
          </div>
        </header>

        <div className="page-content">
          <div className="welcome-row">
            <div>
              <p className="eyebrow page-eyebrow">A GOOD DAY TO BEGIN</p>
              <h1>Make space for<br className="mobile-break" /> good work.</h1>
              <p className="welcome-subtitle">A thoughtful list for everything on your mind.</p>
            </div>
            <button className="button button-primary create-task-button" type="button" onClick={openNewTask}><Plus size={17} /> New task</button>
          </div>

          <div className="summary-grid" aria-label="Task summary">
            <SummaryCard icon={<ListTodo size={18} />} label="Open tasks" value={openTasks.length} detail="Ready when you are" color="blue" />
            <SummaryCard icon={<CalendarDays size={18} />} label="Due today" value={todayCount} detail={todayCount === 1 ? "One thing at a time" : "Keep today in focus"} color="sand" />
            <SummaryCard icon={<CircleCheck size={18} />} label="Completed" value={completedCount} detail="Progress worth noticing" color="green" />
          </div>

          <section className="task-panel">
            <div className="task-panel-heading">
              <div>
                <div className="panel-title-row"><h2>{activeLabel}</h2><span className="task-total">{visibleTasks.length}</span></div>
                <p>{activeView === "completed" ? "Look back at what you’ve moved forward." : activeView === "today" ? "A clear view of what needs you today." : activeView === "upcoming" ? "What’s coming up, at your own pace." : "Keep the next step in sight."}</p>
              </div>
              <button className="button button-quiet panel-add-button" type="button" onClick={openNewTask}><Plus size={16} /> Add task</button>
            </div>
            <div className="task-toolbar">
              <div className="task-tabs" role="tablist" aria-label="Task filters">
                {views.map(({ key, label }) => <button key={key} type="button" role="tab" aria-selected={activeView === key} className={activeView === key ? "selected" : ""} onClick={() => setActiveView(key)}>{label}</button>)}
              </div>
              <label className="task-search"><Search size={16} /><input type="search" aria-label="Search tasks" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" /><kbd><Command size={11} />K</kbd></label>
            </div>

            {loadError ? (
              <div className="data-state data-error-state">
                <div className="empty-illustration error-illustration"><DatabaseIcon /></div>
                <h3>We couldn’t reach your task list.</h3>
                <p>Confirm that the Supabase schema has been applied, then refresh this page.</p>
                <button className="button button-quiet" type="button" onClick={() => window.location.reload()}>Refresh workspace <ArrowRight size={15} /></button>
              </div>
            ) : visibleTasks.length ? (
              <div className="task-list" role="list">
                {visibleTasks.map((task) => <TaskRow key={task.id} task={task} pending={pendingId === task.id} onToggle={() => toggleTask(task)} onEdit={() => openTaskEditor(task)} onDelete={() => deleteTask(task)} />)}
              </div>
            ) : (
              <div className="data-state">
                <div className="empty-illustration"><span><Inbox size={25} strokeWidth={1.6} /></span><i className="empty-sparkle sparkle-left">✳</i><i className="empty-sparkle sparkle-right">✦</i></div>
                <h3>{search ? "Nothing matched your search." : activeView === "completed" ? "Your finished work will live here." : activeView === "today" ? "A little breathing room today." : activeView === "upcoming" ? "Nothing is waiting in the wings." : "A clear page is a good place to start."}</h3>
                <p>{search ? "Try a different word or clear the search." : activeView === "completed" ? "When you complete a task, you’ll find it here." : activeView === "today" ? "Add a task with today’s date when something comes up." : activeView === "upcoming" ? "Tasks with a future due date will appear here." : "Capture one thing you’d like to move forward."}</p>
                {!search && activeView !== "completed" && <button className="button button-primary empty-add-button" type="button" onClick={openNewTask}><Plus size={16} /> Create your first task</button>}
              </div>
            )}
            <div className="list-footer"><span><span className="footer-dot" />PRIVATE WORKSPACE</span><span>YOUR TASKS STAY YOURS</span></div>
          </section>

          <footer className="page-footnote"><span>ONE THING AT A TIME.</span><span>DAYMARK WORKSPACE <span className="footer-asterisk">✳</span></span></footer>
        </div>
      </section>

      {toast && <div className="toast-message" role="status"><span className="toast-check"><Check size={14} /></span>{toast}<button type="button" aria-label="Dismiss" onClick={() => setToast("")}><X size={14} /></button></div>}
      {editorOpen && <TaskEditor key={editingTask?.id ?? "new-task"} task={editingTask} saving={pendingId === "saving"} onClose={() => setEditorOpen(false)} onSave={saveTask} />}
    </main>
  );
}

function SummaryCard({ icon, label, value, detail, color }: { icon: ReactNode; label: string; value: number; detail: string; color: string }) {
  return <div className="summary-card"><div className={`summary-icon ${color}`}>{icon}</div><div className="summary-main"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><div className={`summary-watermark ${color}`}>{icon}</div></div>;
}

function TaskRow({ task, pending, onToggle, onEdit, onDelete }: { task: Task; pending: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const due = dueCopy(task.due_date);
  return (
    <article className={`task-row ${task.status === "completed" ? "task-row-completed" : ""}`} role="listitem">
      <button className={`task-check ${task.status === "completed" ? "checked" : ""}`} type="button" aria-label={task.status === "completed" ? `Reopen ${task.title}` : `Complete ${task.title}`} disabled={pending} onClick={onToggle}>
        {task.status === "completed" ? <Check size={13} strokeWidth={2.8} /> : <Circle size={19} strokeWidth={1.6} />}
      </button>
      <div className="task-copy">
        <div className="task-title-line"><h3>{task.title}</h3>{task.priority === "high" && <span className="priority-tag"><Flag size={11} fill="currentColor" /> High</span>}</div>
        {task.description && <p>{task.description}</p>}
        <div className="task-meta">
          <span className={`priority-dot priority-${task.priority}`} />
          <span className="priority-label">{task.priority === "normal" ? "Normal priority" : `${task.priority[0].toUpperCase()}${task.priority.slice(1)} priority`}</span>
          {due && <><span className="meta-separator" /><span className={`due-label due-${due.kind}`}><CalendarDays size={13} />{due.label}</span></>}
        </div>
      </div>
      <div className="task-actions">
        <button className="task-action-button" type="button" aria-label={`Edit ${task.title}`} title="Edit task" onClick={onEdit}><Pencil size={15} /></button>
        <button className="task-action-button delete-action" type="button" aria-label={`Delete ${task.title}`} title="Delete task" onClick={onDelete}><Trash2 size={15} /></button>
      </div>
    </article>
  );
}

function TaskEditor({ task, saving, onClose, onSave }: { task: Task | null; saving: boolean; onClose: () => void; onSave: (draft: TaskDraft) => Promise<boolean> }) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "normal");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [validation, setValidation] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setValidation("Give your task a short, clear name.");
      return;
    }
    if (cleanTitle.length > 160) {
      setValidation("Keep the title under 160 characters.");
      return;
    }
    setValidation("");
    await onSave({ title: cleanTitle, description: description.trim(), priority, due_date: dueDate || null });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <section className="task-modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
        <div className="modal-heading"><div><span className="modal-kicker">MAKE IT YOUR NEXT STEP</span><h2 id="task-modal-title">{task ? "Edit task" : "Add a task"}</h2></div><button className="icon-button modal-close" type="button" aria-label="Close" disabled={saving} onClick={onClose}><X size={19} /></button></div>
        <form className="task-form" onSubmit={submit}>
          <label className="field-label" htmlFor="task-title">Task name <span className="required-mark">*</span></label>
          <input className="text-field" id="task-title" autoFocus maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What would you like to move forward?" required />
          <label className="field-label" htmlFor="task-description">A few more details <span className="optional-label">OPTIONAL</span></label>
          <textarea className="text-field task-description-field" id="task-description" maxLength={1200} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add a note to make the next step easier…" rows={3} />
          <div className="form-fields-row">
            <div className="form-field-column"><label className="field-label" htmlFor="task-priority">Priority</label><div className="select-wrap"><Flag size={15} /><select id="task-priority" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select><ChevronDown size={14} /></div></div>
            <div className="form-field-column"><label className="field-label" htmlFor="task-due-date">Due date <span className="optional-label">OPTIONAL</span></label><input className="text-field date-field" id="task-due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div>
          </div>
          {validation && <p className="validation-message" role="alert">{validation}</p>}
          <div className="modal-actions"><button className="button button-quiet" type="button" disabled={saving} onClick={onClose}>Cancel</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? "Saving…" : task ? "Save changes" : "Add to my list"}<ArrowRight size={16} /></button></div>
        </form>
        <div className="modal-footnote"><span className="footer-dot" /> SAVED TO YOUR PRIVATE WORKSPACE</div>
      </section>
    </div>
  );
}

function DatabaseIcon() {
  return <span className="database-icon"><Circle size={21} /><Circle size={21} /><span /></span>;
}
