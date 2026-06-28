'use client';
import { useState, useCallback, useRef } from 'react';
import {
  CheckSquare, Plus, X, ChevronDown, Flag, Calendar, User2,
  MoreHorizontal, Check, Trash2, Edit3, MessageCircle, Clock,
  AlertCircle, List, Columns, Send, Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getTaskStore, saveTaskStore, createTask, updateTask, deleteTask,
  addComment, moveTaskToStatus, getTasksByStatus,
  STATUS_LABELS, STATUS_COLORS, STATUS_BG, PRIORITY_COLORS, PRIORITY_DOT,
  type Task, type TaskStatus, type TaskPriority, type TaskStore,
} from '@/lib/tasks/taskEngine';

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'review', 'done', 'blocked'];
const PRIORITIES: TaskPriority[] = ['critical', 'high', 'medium', 'low'];

// ── Task Detail Modal ─────────────────────────────────────────────────────────
function TaskDetail({
  task, store, onSave, onDelete, onClose, userId, userName,
}: {
  task: Task; store: TaskStore;
  onSave: (s: TaskStore) => void; onDelete: () => void; onClose: () => void;
  userId: string; userName: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: task.title, description: task.description ?? '', priority: task.priority, dueDate: task.dueDate ?? '', status: task.status });
  const [comment, setComment] = useState('');
  const [newCheckItem, setNewCheckItem] = useState('');

  const save = () => {
    const updated = updateTask(store, task.id, {
      title: draft.title, description: draft.description,
      priority: draft.priority as TaskPriority, dueDate: draft.dueDate || undefined,
      status: draft.status as TaskStatus,
    });
    onSave(updated);
    setEditing(false);
  };

  const sendComment = () => {
    if (!comment.trim()) return;
    onSave(addComment(store, task.id, comment.trim(), userId, userName));
    setComment('');
  };

  const addCheckItem = () => {
    if (!newCheckItem.trim()) return;
    const updated = updateTask(store, task.id, {
      checklist: [...task.checklist, { id: `ci_${Date.now()}`, text: newCheckItem.trim(), done: false }],
    });
    onSave(updated);
    setNewCheckItem('');
  };

  const toggleCheckItem = (itemId: string) => {
    const updated = updateTask(store, task.id, {
      checklist: task.checklist.map(ci => ci.id === itemId ? { ...ci, done: !ci.done } : ci),
    });
    onSave(updated);
  };

  // live task from store
  const liveTask = store.tasks.find(t => t.id === task.id) ?? task;
  const doneCount = liveTask.checklist.filter(ci => ci.done).length;

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-100">
          <button
            onClick={() => onSave(updateTask(store, task.id, { status: liveTask.status === 'done' ? 'todo' : 'done' }))}
            className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
              liveTask.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-emerald-400')}
          >
            {liveTask.status === 'done' && <Check size={11}/>}
          </button>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                className="w-full text-sm font-bold border-b-2 border-rail-400 focus:outline-none pb-0.5"/>
            ) : (
              <h2 className={cn('text-sm font-bold text-slate-900', liveTask.status === 'done' && 'line-through text-slate-400')}>{liveTask.title}</h2>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border', STATUS_COLORS[liveTask.status])}>
                {STATUS_LABELS[liveTask.status]}
              </span>
              <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border', PRIORITY_COLORS[liveTask.priority])}>
                {liveTask.priority}
              </span>
              {liveTask.dueDate && (
                <span className={cn('text-[9px] flex items-center gap-0.5', new Date(liveTask.dueDate) < new Date() && liveTask.status !== 'done' ? 'text-red-500 font-bold' : 'text-slate-400')}>
                  <Calendar size={8}/> {liveTask.dueDate}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!editing && <button onClick={() => setEditing(true)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><Edit3 size={12}/></button>}
            {editing && <>
              <button onClick={save} className="px-3 py-1.5 bg-rail-600 text-white text-xs font-bold rounded-lg hover:bg-rail-700">Save</button>
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg">Cancel</button>
            </>}
            <button onClick={onDelete} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-400"><Trash2 size={12}/></button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><X size={13}/></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Description */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Description</label>
            {editing ? (
              <textarea value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                rows={3} className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-rail-400 resize-none"/>
            ) : (
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                {liveTask.description || <span className="text-slate-300 italic">No description</span>}
              </p>
            )}
          </div>

          {/* Properties */}
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status</label>
                <select value={draft.status} onChange={e => setDraft(d => ({ ...d, status: e.target.value as TaskStatus }))}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none">
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Priority</label>
                <select value={draft.priority} onChange={e => setDraft(d => ({ ...d, priority: e.target.value as TaskPriority }))}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none">
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Due Date</label>
                <input type="date" value={draft.dueDate} onChange={e => setDraft(d => ({ ...d, dueDate: e.target.value }))}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none"/>
              </div>
            </div>
          )}

          {/* Checklist */}
          {(liveTask.checklist.length > 0 || true) && (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <CheckSquare size={10}/> Checklist
                {liveTask.checklist.length > 0 && (
                  <span className="text-[9px] font-semibold text-slate-300">{doneCount}/{liveTask.checklist.length}</span>
                )}
              </label>
              {liveTask.checklist.length > 0 && (
                <div className="mb-2">
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${liveTask.checklist.length ? (doneCount / liveTask.checklist.length) * 100 : 0}%` }}/>
                  </div>
                  {liveTask.checklist.map(ci => (
                    <div key={ci.id} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                      <button onClick={() => toggleCheckItem(ci.id)}
                        className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                          ci.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-emerald-400')}>
                        {ci.done && <Check size={9}/>}
                      </button>
                      <span className={cn('text-xs', ci.done && 'line-through text-slate-300')}>{ci.text}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCheckItem()}
                  placeholder="Add checklist item…"
                  className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-rail-400"/>
                <button onClick={addCheckItem} className="px-2.5 py-1.5 text-[10px] font-bold text-rail-600 bg-rail-50 border border-rail-200 rounded-lg hover:bg-rail-100">
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Comments */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <MessageCircle size={10}/> Comments ({liveTask.comments.length})
            </label>
            <div className="space-y-2 mb-2 max-h-36 overflow-y-auto">
              {liveTask.comments.map(c => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-rail-100 flex items-center justify-center text-[9px] font-black text-rail-700 shrink-0">
                    {c.userName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-slate-700">{c.userName}</span>
                      <span className="text-[9px] text-slate-300">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-600">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input value={comment} onChange={e => setComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendComment()}
                placeholder="Add a comment…"
                className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-rail-400"/>
              <button onClick={sendComment} className="p-1.5 bg-rail-600 text-white rounded-lg hover:bg-rail-700">
                <Send size={11}/>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add Task Form ─────────────────────────────────────────────────────────────
function AddTaskForm({ store, onSave, onClose, userId, userName, defaultStatus }: {
  store: TaskStore; onSave: (s: TaskStore) => void; onClose: () => void;
  userId: string; userName: string; defaultStatus?: TaskStatus;
}) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium' as TaskPriority, dueDate: '', status: defaultStatus ?? 'todo' as TaskStatus });

  const submit = () => {
    if (!form.title.trim()) return;
    const updated = createTask(store, {
      title: form.title, description: form.description || undefined,
      priority: form.priority, dueDate: form.dueDate || undefined,
      status: form.status,
    }, userId, userName);
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-bold text-slate-900">New Task</p>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><X size={14}/></button>
        </div>
        <div className="p-5 space-y-3">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Task title *"
            className="w-full text-sm font-semibold border-b-2 border-slate-200 focus:border-rail-400 pb-1.5 focus:outline-none"/>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)" rows={2}
            className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-rail-400 resize-none"/>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}
                className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none">
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}
                className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none">
                {PRIORITIES.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none"/>
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={submit} className="ml-auto px-5 py-2 bg-rail-600 text-white text-xs font-bold rounded-lg hover:bg-rail-700">Create Task</button>
        </div>
      </div>
    </div>
  );
}

// ── Task Card (Kanban) ─────────────────────────────────────────────────────────
function TaskCard({ task, onClick, dragStart, dragEnd }: {
  task: Task; onClick: () => void;
  dragStart: () => void; dragEnd: () => void;
}) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
  const doneCheck = task.checklist.filter(c => c.done).length;

  return (
    <div
      draggable
      onDragStart={dragStart}
      onDragEnd={dragEnd}
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-xl p-3 cursor-pointer hover:shadow-md hover:border-rail-200 transition-all group select-none"
    >
      <div className="flex items-start gap-2">
        <div className={cn('w-2 h-2 rounded-full shrink-0 mt-1', PRIORITY_DOT[task.priority])}/>
        <p className={cn('text-xs font-semibold text-slate-800 leading-snug flex-1', task.status === 'done' && 'line-through text-slate-400')}>
          {task.title}
        </p>
      </div>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {task.dueDate && (
          <span className={cn('text-[9px] flex items-center gap-0.5 font-medium', isOverdue ? 'text-red-500' : 'text-slate-400')}>
            <Calendar size={8}/> {task.dueDate}
          </span>
        )}
        {task.checklist.length > 0 && (
          <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
            <CheckSquare size={8}/> {doneCheck}/{task.checklist.length}
          </span>
        )}
        {task.comments.length > 0 && (
          <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
            <MessageCircle size={8}/> {task.comments.length}
          </span>
        )}
        {task.assignedToName && (
          <span className="ml-auto text-[9px] text-slate-400 flex items-center gap-0.5 max-w-[70px] truncate">
            <User2 size={8}/> {task.assignedToName}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({
  status, tasks, onOpenTask, onAddTask, canManage,
  onDragOver, onDrop, onTaskDragStart, onTaskDragEnd,
}: {
  status: TaskStatus; tasks: Task[];
  onOpenTask: (t: Task) => void; onAddTask: () => void;
  canManage: boolean;
  onDragOver: () => void; onDrop: () => void;
  onTaskDragStart: (id: string) => void; onTaskDragEnd: () => void;
}) {
  return (
    <div
      className={cn('flex flex-col w-56 shrink-0 rounded-xl border overflow-hidden', STATUS_BG[status])}
      onDragOver={e => { e.preventDefault(); onDragOver(); }}
      onDrop={onDrop}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200/50">
        <span className={cn('w-2 h-2 rounded-full', PRIORITY_DOT['medium'])}/>
        <p className="text-[10px] font-black text-slate-700 flex-1 uppercase tracking-wider">{STATUS_LABELS[status]}</p>
        <span className="text-[9px] font-bold text-slate-400 bg-white/70 rounded-full px-1.5 py-0.5">{tasks.length}</span>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto" style={{ maxHeight: 420 }}>
        {tasks.map(task => (
          <TaskCard
            key={task.id} task={task}
            onClick={() => onOpenTask(task)}
            dragStart={() => onTaskDragStart(task.id)}
            dragEnd={onTaskDragEnd}
          />
        ))}
      </div>
      {canManage && (
        <div className="p-2 border-t border-slate-200/50">
          <button onClick={onAddTask}
            className="w-full flex items-center gap-1.5 px-3 py-2 text-[10px] text-slate-400 hover:text-rail-600 hover:bg-white/70 rounded-lg transition-all">
            <Plus size={11}/> Add task
          </button>
        </div>
      )}
    </div>
  );
}

// ── List View Row ─────────────────────────────────────────────────────────────
function ListRow({ task, onClick }: { task: Task; onClick: () => void }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
  return (
    <div onClick={onClick} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 cursor-pointer group">
      <div className={cn('w-2 h-2 rounded-full shrink-0', PRIORITY_DOT[task.priority])}/>
      <p className={cn('text-xs font-semibold text-slate-700 flex-1 truncate group-hover:text-rail-700', task.status === 'done' && 'line-through text-slate-300')}>
        {task.title}
      </p>
      <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0', STATUS_COLORS[task.status])}>
        {STATUS_LABELS[task.status]}
      </span>
      <span className={cn('text-[9px] shrink-0 hidden sm:block', PRIORITY_COLORS[task.priority].split(' ')[0])}>
        {task.priority}
      </span>
      {task.dueDate && (
        <span className={cn('text-[9px] shrink-0 hidden md:flex items-center gap-0.5', isOverdue ? 'text-red-500 font-bold' : 'text-slate-400')}>
          <Calendar size={8}/> {task.dueDate}
        </span>
      )}
      {task.assignedToName && (
        <span className="text-[9px] text-slate-400 shrink-0 hidden lg:flex items-center gap-0.5 max-w-[80px] truncate">
          <User2 size={8}/>{task.assignedToName}
        </span>
      )}
    </div>
  );
}

// ── Main Task Manager ─────────────────────────────────────────────────────────
export function TaskManagerBlock({
  cell, canManage, userId, userName,
}: {
  cell: string;
  canManage: boolean;
  userId: string;
  userName: string;
}) {
  const [store, setStore] = useState<TaskStore>(() => getTaskStore(cell));
  const [viewTask, setViewTask] = useState<Task | null>(null);
  const [addStatus, setAddStatus] = useState<TaskStatus | null>(null);
  const [layout, setLayout] = useState<'board' | 'list'>('board');
  const dragTask = useRef<string | null>(null);
  const dragTarget = useRef<TaskStatus | null>(null);

  const save = useCallback((s: TaskStore) => { saveTaskStore(s); setStore(s); }, []);

  const overallStats = {
    total: store.tasks.length,
    done: store.tasks.filter(t => t.status === 'done').length,
    overdue: store.tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !['done','cancelled'].includes(t.status)).length,
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center">
            <CheckSquare size={14} className="text-white"/>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">{cell} Tasks</p>
            <p className="text-[10px] text-slate-400">
              {overallStats.total} total · {overallStats.done} done
              {overallStats.overdue > 0 && <span className="text-red-500 font-bold"> · {overallStats.overdue} overdue</span>}
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            {([['board', <Columns size={11}/>], ['list', <List size={11}/>]] as const).map(([id, icon]) => (
              <button key={id} onClick={() => setLayout(id as 'board' | 'list')}
                className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all capitalize',
                  layout === id ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
                {icon} {id}
              </button>
            ))}
          </div>
          {canManage && (
            <button onClick={() => setAddStatus('todo')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors">
              <Plus size={12}/> New Task
            </button>
          )}
        </div>
      </div>

      {/* Board / List */}
      {layout === 'board' ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STATUSES.map(status => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={getTasksByStatus(store, status)}
              onOpenTask={setViewTask}
              onAddTask={() => setAddStatus(status)}
              canManage={canManage}
              onDragOver={() => { dragTarget.current = status; }}
              onDrop={() => {
                if (dragTask.current && dragTarget.current) {
                  save(moveTaskToStatus(store, dragTask.current, dragTarget.current));
                }
                dragTask.current = null;
                dragTarget.current = null;
              }}
              onTaskDragStart={id => { dragTask.current = id; }}
              onTaskDragEnd={() => { dragTask.current = null; }}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {store.tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <CheckSquare size={24} className="text-slate-200"/>
              <p className="text-xs text-slate-400">No tasks yet</p>
            </div>
          ) : (
            store.tasks.map(task => (
              <ListRow key={task.id} task={task} onClick={() => setViewTask(task)}/>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      {viewTask && (
        <TaskDetail
          task={store.tasks.find(t => t.id === viewTask.id) ?? viewTask}
          store={store}
          onSave={s => { save(s); setViewTask(s.tasks.find(t => t.id === viewTask.id) ?? null); }}
          onDelete={() => { save(deleteTask(store, viewTask.id)); setViewTask(null); }}
          onClose={() => setViewTask(null)}
          userId={userId} userName={userName}
        />
      )}
      {addStatus && (
        <AddTaskForm
          store={store} onSave={save} onClose={() => setAddStatus(null)}
          userId={userId} userName={userName} defaultStatus={addStatus}
        />
      )}
    </div>
  );
}
