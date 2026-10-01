import React from 'react';
import type { NotionTask } from '../types';
import { Calendar, CheckCircle2, Clock, Layers, ArrowUpRight, ChevronUp, ChevronDown, Check } from 'lucide-react';

interface TaskCardProps {
  task: NotionTask;
  isSelected: boolean;
  onSelect: () => void;
  isCheckedForBatch: boolean;
  onToggleBatchCheck: (e: React.MouseEvent) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirstInBatch?: boolean;
  isLastInBatch?: boolean;
  onToggleDone?: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isSelected,
  onSelect,
  isCheckedForBatch,
  onToggleBatchCheck,
  onMoveUp,
  onMoveDown,
  isFirstInBatch,
  isLastInBatch,
  onToggleDone,
}) => {
  const isDone =
    (task.status || '').toLowerCase().includes('done') ||
    (task.status || '').toLowerCase().includes('complete');

  const getPriorityBadge = (prio: string) => {
    switch (prio.toLowerCase()) {
      case 'urgent':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800">Urgent</span>;
      case 'high':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900">High</span>;
      case 'medium':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-800">Med</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-200 text-zinc-800">{prio}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('progress') || s.includes('doing')) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleDone?.();
          }}
          className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#ede7ff] hover:bg-[#dfd4ff] text-[#6314ff] transition cursor-pointer shrink-0"
          title="Mark Done"
        >
          Active
        </button>
      );
    }
    if (s.includes('done') || s.includes('complete')) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleDone?.();
          }}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 hover:bg-emerald-200 text-emerald-900 transition cursor-pointer shrink-0"
          title="Unmark Done"
        >
          <Check className="w-2.5 h-2.5 text-emerald-700" />
          <span>Done</span>
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleDone?.();
        }}
        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-200/80 hover:bg-zinc-300 text-zinc-700 transition cursor-pointer shrink-0"
        title="Mark Done"
      >
        To Do
      </button>
    );
  };

  return (
    <div
      onClick={onSelect}
      className={`group relative px-3 py-2.5 rounded-md cursor-pointer transition-colors duration-150 select-none ${
        isSelected
          ? 'bg-[#f3efff] shadow-xs'
          : 'bg-[#f0f4f8] hover:bg-[#e6edf4]'
      } ${isDone ? 'opacity-70' : ''}`}
    >
      <div className="flex items-center gap-2.5">
        
        {/* Selection Checkbox & Up/Down Sequence Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onToggleBatchCheck}
            className={`w-5 h-5 rounded flex items-center justify-center transition-colors cursor-pointer ${
              isCheckedForBatch
                ? 'bg-[#6314ff] text-white shadow-xs'
                : 'bg-white hover:bg-zinc-200 text-transparent border border-zinc-300/80'
            }`}
            title={isCheckedForBatch ? 'Remove from print roll' : 'Add to print roll'}
            aria-label="Toggle batch print selection"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>

          {isCheckedForBatch && (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp?.();
                }}
                disabled={isFirstInBatch}
                className="p-0.5 rounded hover:bg-white text-zinc-400 hover:text-[#6314ff] disabled:opacity-20 transition cursor-pointer"
                title="Move up in roll"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown?.();
                }}
                disabled={isLastInBatch}
                className="p-0.5 rounded hover:bg-white text-zinc-400 hover:text-[#6314ff] disabled:opacity-20 transition cursor-pointer"
                title="Move down in roll"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Task Content */}
        <div className="flex-1 min-w-0">
          {/* Main Title Row */}
          <div className="flex items-center gap-2 min-w-0">
            {getStatusBadge(task.status || 'todo')}
            <h4
              className={`text-xs sm:text-sm font-bold truncate leading-tight flex-1 ${
                isDone ? 'line-through text-zinc-500' : 'text-zinc-950'
              }`}
              title={task.title}
            >
              {task.title}
            </h4>
            {task.priority && getPriorityBadge(task.priority)}
          </div>

          {/* Compact Metadata Sub-Row */}
          <div className="flex items-center gap-2.5 text-[11px] text-zinc-500 font-medium pt-1">
            {task.project && (
              <span className="flex items-center gap-1 text-[#00213f] font-semibold truncate max-w-[120px]">
                <Layers className="w-2.5 h-2.5 text-[#6314ff] shrink-0" />
                <span className="truncate">{task.project}</span>
              </span>
            )}

            {(task.dueDate || task.dueTime) && (
              <span className="flex items-center gap-1 shrink-0">
                <Calendar className="w-2.5 h-2.5 text-zinc-400" />
                <span>{task.dueDate}</span>
              </span>
            )}

            {task.estimatePomodoros ? (
              <span className="flex items-center gap-1 text-[#6314ff] font-bold shrink-0">
                <Clock className="w-2.5 h-2.5" />
                <span>{task.estimatePomodoros}p</span>
              </span>
            ) : null}
          </div>
        </div>

        {/* Notion Link */}
        {task.notionUrl && (
          <a
            href={task.notionUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded text-zinc-400 hover:text-[#6314ff] hover:bg-white transition shrink-0"
            title="Open in Notion"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        )}

      </div>
    </div>
  );
};
