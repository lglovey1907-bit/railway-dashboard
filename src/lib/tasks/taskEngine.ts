// ─────────────────────────────────────────────────────────────────────────────
// Task Management Engine — Enterprise Task System
// Per-cell, stored under rly_tasks_[cell]
// ─────────────────────────────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked' | 'cancelled';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TaskComment {
  id: string;
  text: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  reminderDate?: string;
  recurring?: 'none' | 'daily' | 'weekly' | 'monthly';
  assignedTo?: string;
  assignedToName?: string;
  assignedBy?: string;
  assignedByName?: string;
  createdBy: string;
  createdByName: string;
  checklist: ChecklistItem[];
  comments: TaskComment[];
  tags: string[];
  dependencies: string[];   // Task IDs this depends on
  attachments: { name: string; url: string }[];
  progress: number;         // 0–100
  estimatedHours?: number;
  loggedHours?: number;
  cell: string;
  tableRef?: string;        // linked database table ID
  rowRef?: string;          // linked database row ID
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  order: number;
}

export interface TaskStore {
  cell: string;
  tasks: Task[];
  updatedAt: string;
}

const KEY = (cell: string) => `rly_tasks_${cell.replace(/[^a-zA-Z0-9]/g, '_')}`;
function gid() { return `task_${Date.now()}_${Math.floor(Math.random() * 9999)}`; }

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do', in_progress: 'In Progress', review: 'Review',
  done: 'Done', blocked: 'Blocked', cancelled: 'Cancelled',
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-slate-100 text-slate-700 border-slate-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  review: 'bg-purple-100 text-purple-700 border-purple-200',
  done: 'bg-green-100 text-green-700 border-green-200',
  blocked: 'bg-red-100 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};

export const STATUS_BG: Record<TaskStatus, string> = {
  todo: 'bg-slate-50 border-slate-200',
  in_progress: 'bg-blue-50 border-blue-200',
  review: 'bg-purple-50 border-purple-200',
  done: 'bg-green-50 border-green-200',
  blocked: 'bg-red-50 border-red-200',
  cancelled: 'bg-gray-50 border-gray-200',
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  critical: 'text-red-600 bg-red-50 border-red-200',
  high: 'text-orange-600 bg-orange-50 border-orange-200',
  medium: 'text-amber-600 bg-amber-50 border-amber-200',
  low: 'text-slate-500 bg-slate-50 border-slate-200',
};

export const PRIORITY_DOT: Record<TaskPriority, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-400',
  low: 'bg-slate-300',
};

export function getTaskStore(cell: string): TaskStore {
  if (typeof window === 'undefined') return { cell, tasks: [], updatedAt: new Date().toISOString() };
  try {
    const raw = localStorage.getItem(KEY(cell));
    if (raw) return JSON.parse(raw) as TaskStore;
  } catch {}
  return { cell, tasks: [], updatedAt: new Date().toISOString() };
}

export function saveTaskStore(store: TaskStore): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY(store.cell), JSON.stringify({ ...store, updatedAt: new Date().toISOString() }));
}

export function createTask(
  store: TaskStore,
  data: Partial<Task> & Pick<Task, 'title'>,
  userId: string,
  userName: string,
): TaskStore {
  const now = new Date().toISOString();
  const maxOrder = Math.max(0, ...store.tasks.filter(t => t.status === (data.status ?? 'todo')).map(t => t.order));
  const task: Task = {
    id: gid(),
    title: data.title,
    description: data.description,
    status: data.status ?? 'todo',
    priority: data.priority ?? 'medium',
    dueDate: data.dueDate,
    reminderDate: data.reminderDate,
    recurring: data.recurring ?? 'none',
    assignedTo: data.assignedTo,
    assignedToName: data.assignedToName,
    assignedBy: data.assignedBy ?? userId,
    assignedByName: data.assignedByName ?? userName,
    createdBy: userId,
    createdByName: userName,
    checklist: data.checklist ?? [],
    comments: [],
    tags: data.tags ?? [],
    dependencies: data.dependencies ?? [],
    attachments: [],
    progress: 0,
    estimatedHours: data.estimatedHours,
    cell: store.cell,
    createdAt: now,
    updatedAt: now,
    order: maxOrder + 1,
  };
  return { ...store, tasks: [task, ...store.tasks] };
}

export function updateTask(store: TaskStore, id: string, patch: Partial<Task>): TaskStore {
  return {
    ...store,
    tasks: store.tasks.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, ...patch, updatedAt: new Date().toISOString() };
      if (patch.status === 'done' && t.status !== 'done') {
        updated.completedAt = new Date().toISOString();
        updated.progress = 100;
      }
      return updated;
    }),
  };
}

export function deleteTask(store: TaskStore, id: string): TaskStore {
  return { ...store, tasks: store.tasks.filter(t => t.id !== id) };
}

export function addComment(
  store: TaskStore, taskId: string, text: string, userId: string, userName: string,
): TaskStore {
  const comment: TaskComment = {
    id: gid(), text, userId, userName, createdAt: new Date().toISOString(),
  };
  return {
    ...store,
    tasks: store.tasks.map(t => t.id !== taskId ? t : {
      ...t, comments: [...t.comments, comment], updatedAt: new Date().toISOString(),
    }),
  };
}

export function moveTaskToStatus(store: TaskStore, taskId: string, newStatus: TaskStatus): TaskStore {
  return updateTask(store, taskId, { status: newStatus });
}

export function getTasksByStatus(store: TaskStore, status: TaskStatus): Task[] {
  return store.tasks.filter(t => t.status === status).sort((a, b) => a.order - b.order);
}

export function getOverdueTasks(store: TaskStore): Task[] {
  const now = new Date();
  return store.tasks.filter(t =>
    t.dueDate && new Date(t.dueDate) < now && t.status !== 'done' && t.status !== 'cancelled'
  );
}

export function getMyTasks(store: TaskStore, userId: string): Task[] {
  return store.tasks.filter(t =>
    t.assignedTo === userId || t.createdBy === userId
  ).filter(t => t.status !== 'done' && t.status !== 'cancelled');
}
