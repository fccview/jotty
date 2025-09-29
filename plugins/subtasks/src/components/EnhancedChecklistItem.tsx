"use client";

import React from 'react';
import { ItemWithSubtasks } from '../types';
import { SubtaskList } from './SubtaskList';
import { LabelList } from './LabelList';

interface EnhancedChecklistItemProps {
  item: ItemWithSubtasks;
  onUpdate: (item: ItemWithSubtasks) => void;
  // Original ChecklistItem props that we want to preserve
  OriginalChecklistItem: React.ComponentType<any>;
}

export function EnhancedChecklistItem({
  item,
  onUpdate,
  OriginalChecklistItem,
  ...props
}: EnhancedChecklistItemProps) {
  console.log('EnhancedChecklistItem rendering with:', {
    item,
    hasPluginData: !!item.pluginData?.['subtasks-and-labels'],
    props
  });

  const handleUpdate = (updatedItem: ItemWithSubtasks) => {
    console.log('EnhancedChecklistItem update:', updatedItem);
    onUpdate(updatedItem);
  };

  return (
    <div className="space-y-2">
      <OriginalChecklistItem
        {...props}
        item={item}
        onUpdate={handleUpdate}
      />

      <div className="pl-8">
        <LabelList item={item} onUpdate={handleUpdate} />
        <SubtaskList item={item} onUpdate={handleUpdate} />
      </div>
    </div>
  );
}