"use client";

import {
  CheckCircle,
  Folder,
  Plus,
  TrendingUp,
  Clock,
  BarChart3,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Checklist } from "@/app/_types";
import { EmptyState } from "@/app/_components/GlobalComponents/Cards/EmptyState";
import { ChecklistCard } from "@/app/_components/GlobalComponents/Cards/ChecklistCard";
import { isItemCompleted } from "@/app/_utils/checklist-utils";
import { StatCard } from "@/app/_components/GlobalComponents/Cards/StatCard";
import { TaskStatusLabels } from "@/app/_types/enums";

interface ChecklistHomeProps {
  lists: Checklist[];
  onCreateModal: () => void;
  onSelectChecklist?: (list: Checklist) => void;
}

export const ChecklistHome = ({
  lists,
  onCreateModal,
  onSelectChecklist,
}: ChecklistHomeProps) => {
  const useHomeStats = () => {
    const totalItems = lists.reduce((sum, list) => sum + list.items.length, 0);
    const completedItems = lists.reduce(
      (sum, list) =>
        sum +
        list.items.filter((item) => isItemCompleted(item, list.type)).length,
      0
    );
    const completionRate =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    const recentLists = [...lists]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 12);
    const taskLists = recentLists.filter((list) => list.type === "task");
    const simpleLists = recentLists.filter((list) => list.type === "simple");

    return {
      totalItems,
      completedItems,
      completionRate,
      recentLists,
      taskLists,
      simpleLists,
    };
  };

  const {
    totalItems,
    completedItems,
    completionRate,
    recentLists,
    taskLists,
    simpleLists,
  } = useHomeStats();

  if (lists.length === 0) {
    return (
      <div className="h-full overflow-y-auto bg-background">
        <EmptyState
          icon={<Folder className="h-10 w-10 text-muted-foreground" />}
          title="No checklists yet"
          description="Create your first checklist to get started. You can organize your tasks, track progress, and more."
          buttonText="Create New Checklist"
          onButtonClick={() => onCreateModal()}
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-full pt-6 pb-4 px-4 lg:pt-8 lg:pb-8 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
              Welcome Back
            </h1>
            <p className="text-lg text-muted-foreground">
              Your most recently updated checklists
            </p>
          </div>
          <Button onClick={() => onCreateModal()} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            New Checklist
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Folder className="h-6 w-6 text-primary" />}
            title="Total Lists"
            value={lists.length}
          />
          <StatCard
            icon={<CheckCircle className="h-6 w-6 text-primary" />}
            title={TaskStatusLabels.COMPLETED}
            value={completedItems}
          />
          <StatCard
            icon={<TrendingUp className="h-6 w-6 text-primary" />}
            title="Progress"
            value={`${completionRate}%`}
          />
          <StatCard
            icon={<Clock className="h-6 w-6 text-primary" />}
            title="Total Items"
            value={totalItems}
          />
        </div>

        {taskLists.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Tasks
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {taskLists.map((list) => (
                <ChecklistCard
                  key={list.id}
                  list={list}
                  onSelect={onSelectChecklist!}
                />
              ))}
            </div>
          </div>
        )}

        {simpleLists.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              Simple Checklists
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {simpleLists.map((list) => (
                <ChecklistCard
                  key={list.id}
                  list={list}
                  onSelect={onSelectChecklist!}
                />
              ))}
            </div>
          </div>
        )}

        {lists.length > 12 && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Showing {recentLists.length} of {lists.length} checklists. Use the
              sidebar to browse all or search above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
