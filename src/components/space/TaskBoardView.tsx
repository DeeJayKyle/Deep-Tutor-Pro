import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Trash2,
  Calendar,
  Tag,
  ArrowRight,
  ArrowLeft,
  Clock,
  Filter
} from 'lucide-react';
import { TaskItem } from '../../types';

interface TaskBoardViewProps {
  tasks: TaskItem[];
  onUpdateTasks: (tasks: TaskItem[]) => void;
}

export const TaskBoardView: React.FC<TaskBoardViewProps> = ({ tasks, onUpdateTasks }) => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTag, setNewTag] = useState('Study');

  const allTags = Array.from(new Set(tasks.flatMap((t) => t.tags)));

  const handleMove = (id: string, newStatus: 'todo' | 'in_progress' | 'done') => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, status: newStatus } : t));
    onUpdateTasks(updated);
  };

  const handleDelete = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    onUpdateTasks(updated);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      title: newTitle,
      description: newDesc,
      status: 'todo',
      priority: newPriority,
      tags: [newTag],
      dueDate: 'This Week',
      createdAt: new Date().toISOString().slice(0, 10)
    };
    onUpdateTasks([newTask, ...tasks]);
    setNewTitle('');
    setNewDesc('');
    setShowAddModal(false);
  };

  const filteredTasks = selectedTag ? tasks.filter((t) => t.tags.includes(selectedTag)) : tasks;

  const columns: { id: 'todo' | 'in_progress' | 'done'; title: string; color: string }[] = [
    { id: 'todo', title: 'To Do', color: 'border-amber-500/30 text-amber-300' },
    { id: 'in_progress', title: 'In Progress', color: 'border-sky-500/30 text-sky-300' },
    { id: 'done', title: 'Done', color: 'border-emerald-500/30 text-emerald-300' }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-slate-200 overflow-y-auto p-6 space-y-6 max-w-6xl mx-auto w-full">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-400" />
            <span>Workspace Task Board</span>
          </h2>
          <p className="text-xs text-slate-400">
            Track study goals, assignments, and research milestones in the current workspace.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tag Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                selectedTag === null ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  selectedTag === tag ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
        {columns.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className="bg-[#101625] border border-[#1e293b] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold px-1">
                <span className={col.color}>{col.title}</span>
                <span className="font-mono text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-2.5">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-xl bg-[#141b2e] border border-slate-800/80 hover:border-slate-700 space-y-2.5 text-xs shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-slate-100 text-xs leading-snug">{task.title}</span>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="text-slate-500 hover:text-rose-400 p-0.5 transition-colors"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">{task.description}</p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-[10px]">
                      <div className="flex items-center gap-1 text-slate-500">
                        <Calendar className="w-3 h-3" />
                        <span>{task.dueDate}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {task.tags.map((tg, i) => (
                          <span key={i} className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                            {tg}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Move Action Controls */}
                    <div className="flex items-center justify-between pt-1">
                      {col.id !== 'todo' ? (
                        <button
                          onClick={() => handleMove(task.id, col.id === 'done' ? 'in_progress' : 'todo')}
                          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition-colors"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          <span>Back</span>
                        </button>
                      ) : <div />}

                      {col.id !== 'done' && (
                        <button
                          onClick={() => handleMove(task.id, col.id === 'todo' ? 'in_progress' : 'done')}
                          className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 font-medium transition-colors"
                        >
                          <span>Move</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#121826] border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Create Workspace Task</h3>
            <form onSubmit={handleAddTask} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Task Title:</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Derive Backpropagation Equation 3"
                  className="w-full bg-[#0d131f] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Description:</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Additional context or notes..."
                  rows={3}
                  className="w-full bg-[#0d131f] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Tag:</label>
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="w-full bg-[#0d131f] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Priority:</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full bg-[#0d131f] border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
