"use client";

import React from 'react';
import { Subtask, ItemWithSubtasks } from '../types';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';

interface SubtaskListProps {
  item: ItemWithSubtasks;
  onUpdate: (item: ItemWithSubtasks) => void;
}

export function SubtaskList({ item, onUpdate }: SubtaskListProps) {
  const pluginData = item.pluginData?.['subtasks-and-labels'] || {
    subtasks: [],
    labels: [],
    expanded: false
  };

  const { subtasks, expanded } = pluginData;

  const handleToggleExpand = () => {
    onUpdate({
      ...item,
      pluginData: {
        ...item.pluginData,
        'subtasks-and-labels': {
          ...pluginData,
          expanded: !expanded
        }
      }
    });
  };

  const handleAddSubtask = () => {
    const newSubtask: Subtask = {
      id: `${item.id}-subtask-${Date.now()}`,
      text: '',
      completed: false
    };

    onUpdate({
      ...item,
      pluginData: {
        ...item.pluginData,
        'subtasks-and-labels': {
          ...pluginData,
          subtasks: [...subtasks, newSubtask],
          expanded: true
        }
      }
    });
  };

  const handleUpdateSubtask = (subtaskId: string, updates: Partial<Subtask>) => {
    onUpdate({
      ...item,
      pluginData: {
        ...item.pluginData,
        'subtasks-and-labels': {
          ...pluginData,
          subtasks: subtasks.map(st =>
            st.id === subtaskId ? { ...st, ...updates } : st
          )
        }
      }
    });
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    onUpdate({
      ...item,
      pluginData: {
        ...item.pluginData,
        'subtasks-and-labels': {
          ...pluginData,
          subtasks: subtasks.filter(st => st.id !== subtaskId)
        }
      }
    });
  };

  if (subtasks.length === 0) {
    return (
      <button
        onClick={handleAddSubtask}
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        <Plus className="h-3 w-3" />
        Add subtask
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={handleToggleExpand}
          className="text-muted-foreground hover:text-foreground"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <span className="text-sm text-muted-foreground">
          {subtasks.filter(st => st.completed).length} / {subtasks.length} subtasks
        </span>
        <button
          onClick={handleAddSubtask}
          className="ml-auto text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="pl-6 space-y-2">
          {subtasks.map(subtask => (
            <div key={subtask.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={subtask.completed}
                onChange={e => handleUpdateSubtask(subtask.id, { completed: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              <input
                type="text"
                value={subtask.text}
                onChange={e => handleUpdateSubtask(subtask.id, { text: e.target.value })}
                placeholder="Subtask"
                className="flex-1 bg-transparent border-none text-sm focus:outline-none"
              />
              <button
                onClick={() => handleDeleteSubtask(subtask.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}