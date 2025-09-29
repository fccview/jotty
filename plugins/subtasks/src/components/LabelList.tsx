"use client";

import React, { useState } from 'react';
import { ItemWithSubtasks } from '../types';
import { Tag, Plus, X } from 'lucide-react';

interface LabelListProps {
  item: ItemWithSubtasks;
  onUpdate: (item: ItemWithSubtasks) => void;
}

export function LabelList({ item, onUpdate }: LabelListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');

  const pluginData = item.pluginData?.['subtasks-and-labels'] || {
    subtasks: [],
    labels: [],
    expanded: false
  };

  const { labels } = pluginData;

  const handleAddLabel = () => {
    if (!newLabel.trim()) return;

    onUpdate({
      ...item,
      pluginData: {
        ...item.pluginData,
        'subtasks-and-labels': {
          ...pluginData,
          labels: [...labels, newLabel.trim()]
        }
      }
    });

    setNewLabel('');
    setIsAdding(false);
  };

  const handleRemoveLabel = (label: string) => {
    onUpdate({
      ...item,
      pluginData: {
        ...item.pluginData,
        'subtasks-and-labels': {
          ...pluginData,
          labels: labels.filter(l => l !== label)
        }
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {labels.map(label => (
        <div
          key={label}
          className="flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full text-xs"
        >
          <Tag className="h-3 w-3" />
          <span>{label}</span>
          <button
            onClick={() => handleRemoveLabel(label)}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}

      {isAdding ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddLabel()}
            placeholder="New label"
            className="w-24 px-2 py-0.5 text-xs bg-muted rounded-full focus:outline-none"
            autoFocus
          />
          <button
            onClick={() => setIsAdding(false)}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 px-2 py-0.5 text-muted-foreground hover:text-foreground text-xs"
        >
          <Plus className="h-3 w-3" />
          Add label
        </button>
      )}
    </div>
  );
}