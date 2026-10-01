import React, { useState } from 'react';
import { X, Plus, Sparkles, Clock, Minus } from 'lucide-react';
import type { NotionTask, PriorityLevel } from '../types';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: NotionTask) => void;
}

const PRIORITIES: { id: PriorityLevel; label: string; activeClass: string; inactiveClass: string }[] = [
  { id: 'urgent', label: 'Urgent', activeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold', inactiveClass: 'bg-zinc-100 text-zinc-600 hover:bg-rose-50 hover:text-rose-700' },
  { id: 'high', label: 'High', activeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold', inactiveClass: 'bg-zinc-100 text-zinc-600 hover:bg-amber-50 hover:text-amber-800' },
  { id: 'medium', label: 'Medium', activeClass: 'bg-blue-100 text-blue-800 border-blue-300 font-extrabold', inactiveClass: 'bg-zinc-100 text-zinc-600 hover:bg-blue-50 hover:text-blue-700' },
  { id: 'low', label: 'Low', activeClass: 'bg-zinc-200 text-zinc-900 border-zinc-400 font-extrabold', inactiveClass: 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200' },
];

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
}) => {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('high');
  const [project, setProject] = useState('');
  const [tags, setTags] = useState('');
  const [dueDate, setDueDate] = useState('Today');
  const [pomodoros, setPomodoros] = useState(2);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [subtasks, setSubtasks] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleAddSubtask = () => {
    if (!subtaskInput.trim()) return;
    setSubtasks([...subtasks, subtaskInput.trim()]);
    setSubtaskInput('');
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: NotionTask = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      status: 'todo',
      priority,
      project: project.trim() || undefined,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      dueDate: dueDate.trim() || undefined,
      estimatePomodoros: pomodoros,
      completedPomodoros: 0,
      subtasks: subtasks.map((text, idx) => ({
        id: `sub-${idx}`,
        text,
        completed: false,
      })),
      notionUrl: 'https://notion.so',
      properties: {
        ...(priority ? { Priority: { name: 'Priority', type: 'select', value: priority, displayString: priority } } : {}),
        ...(project ? { Project: { name: 'Project', type: 'select', value: project, displayString: project } } : {}),
        ...(dueDate ? { 'Due Date': { name: 'Due Date', type: 'date', value: dueDate, displayString: dueDate } } : {}),
        ...(pomodoros > 0 ? { 'Estimated Pomodoros': { name: 'Estimated Pomodoros', type: 'number', value: pomodoros, displayString: String(pomodoros) } } : {}),
      },
    };

    onAddTask(newTask);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
    >
      <div className="w-full max-w-lg bg-white rounded-md p-6 sm:p-7 space-y-5 my-8 shadow-2xl border border-zinc-100 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#f3efff] flex items-center justify-center text-[#6314ff]">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-[#00213f] tracking-tight">
                New Task
              </h3>
              <p className="text-xs text-zinc-500">Create a task to print on your thermal strip</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-md bg-[#f0f4f8] hover:bg-[#e4ebf3] text-zinc-600 flex items-center justify-center transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">Task Title</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="What needs to get done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#f0f4f8] px-3.5 py-2.5 rounded-md text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-[#e6edf5] focus:ring-1 focus:ring-[#6314ff] transition font-medium"
            />
          </div>

          {/* Custom Priority Segmented Selector (Replaces ugly native select) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">Priority</label>
            <div className="grid grid-cols-4 gap-1.5">
              {PRIORITIES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id)}
                  className={`py-2 px-2 rounded-md text-xs transition border flex items-center justify-center cursor-pointer ${
                    priority === p.id
                      ? `${p.activeClass} shadow-xs`
                      : `${p.inactiveClass} border-transparent`
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date & Project */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">Due Date</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="e.g. Today, Tomorrow..."
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="flex-1 bg-[#f0f4f8] px-3 py-2 rounded-md text-xs text-zinc-900 focus:outline-none focus:bg-[#e6edf5]"
                />
                <button
                  type="button"
                  onClick={() => setDueDate('Today')}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                    dueDate === 'Today' ? 'bg-[#00213f] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  Today
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">Project / Category</label>
              <input
                type="text"
                placeholder="e.g. Work, Research..."
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full bg-[#f0f4f8] px-3 py-2 rounded-md text-xs text-zinc-900 focus:outline-none focus:bg-[#e6edf5]"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">Tags (comma separated)</label>
            <input
              type="text"
              placeholder="e.g. dev, urgent, feature..."
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full bg-[#f0f4f8] px-3 py-2 rounded-md text-xs text-zinc-900 focus:outline-none focus:bg-[#e6edf5]"
            />
          </div>

          {/* Pomodoro Focus Stepper & Quick-Select (Replaces tiny hard-to-use slider) */}
          <div className="space-y-1.5 bg-[#f8fafc] p-3 rounded-md border border-zinc-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#6314ff]" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">Estimated Pomodoros</span>
              </div>
              <span className="text-xs font-extrabold text-[#6314ff]">
                {pomodoros} {pomodoros === 1 ? 'Pomodoro' : 'Pomodoros'} ({pomodoros * 25} mins)
              </span>
            </div>

            {/* Stepper + Quick Number Pills */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPomodoros(Math.max(0, pomodoros - 1))}
                className="w-8 h-8 rounded-md bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 flex items-center justify-center transition cursor-pointer shrink-0"
                title="Decrease pomodoros"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <div className="flex-1 grid grid-cols-6 gap-1">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPomodoros(num)}
                    className={`py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                      pomodoros === num
                        ? 'bg-[#6314ff] text-white shadow-xs'
                        : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setPomodoros(Math.min(12, pomodoros + 1))}
                className="w-8 h-8 rounded-md bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 flex items-center justify-center transition cursor-pointer shrink-0"
                title="Increase pomodoros"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Subtasks */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">Subtasks</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add checklist step..."
                value={subtaskInput}
                onChange={(e) => setSubtaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                className="flex-1 bg-[#f0f4f8] px-3 py-2 rounded-md text-xs text-zinc-900 focus:outline-none focus:bg-[#e6edf5]"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3.5 py-2 rounded-md bg-[#f3efff] hover:bg-[#ede7ff] text-xs font-bold text-[#6314ff] transition cursor-pointer"
              >
                Add
              </button>
            </div>

            {subtasks.length > 0 && (
              <div className="space-y-1 pt-1 max-h-28 overflow-y-auto">
                {subtasks.map((sub, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-1.5 rounded bg-[#f0f4f8] text-xs text-zinc-800"
                  >
                    <span className="truncate">✓ {sub}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(i)}
                      className="text-zinc-400 hover:text-rose-600 transition p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-md bg-[#f0f4f8] hover:bg-[#e4ebf3] text-zinc-700 text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-md bg-[#6314ff] hover:bg-[#5300f5] active:bg-[#4300c7] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-200" />
              <span>Create Task</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
