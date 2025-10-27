"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Item, Checklist } from "@/app/_types";
import { cn } from "@/app/_utils/global-utils";
import {
  Clock,
  Timer,
  Pause,
  Plus,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { ProgressBar } from "@/app/_components/GlobalComponents/Statistics/ProgressBar";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { useState, useEffect, useRef } from "react";
import { updateItemStatus } from "@/app/_server/actions/checklist-item";
import { TaskStatus, TaskStatusLabels } from "@/app/_types/enums";
import { updateItem, deleteItem } from "@/app/_server/actions/checklist-item";
import { SubtaskModal } from "./SubtaskModal";
import { useAppMode } from "@/app/_providers/AppModeProvider";

interface TimeEntriesAccordionProps {
  timeEntries: any[];
  totalTime: number;
  formatTimerTime: (seconds: number) => string;
}

function TimeEntriesAccordion({
  timeEntries,
  totalTime,
  formatTimerTime,
}: TimeEntriesAccordionProps) {
  const { usersPublicData } = useAppMode();

  const getUserAvatarUrl = (username: string) => {
    if (!usersPublicData) return "";

    return (
      usersPublicData.find(
        (user) => user.username?.toLowerCase() === username?.toLowerCase()
      )?.avatarUrl || ""
    );
  };

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-border/30 rounded-md bg-muted/20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          <span className="font-medium text-left">
            {timeEntries.length} sessions
          </span>
          <span className="text-muted-foreground/60">•</span>
          <span className="font-semibold text-foreground">
            {formatTimerTime(totalTime)}
          </span>
        </span>
        {isOpen ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-border/30 py-2 space-y-1.5 max-h-32 overflow-y-auto">
          {timeEntries.map((entry, index) => (
            <div
              key={entry.id || index}
              className="bg-background/50 border border-border/50 rounded p-2"
            >
              <div className="flex gap-1.5 items-center">
                {entry.user && (
                  <UserAvatar
                    username={entry.user}
                    size="xs"
                    avatarUrl={getUserAvatarUrl(entry.user) || ""}
                  />
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    {formatTimerTime(entry.duration || 0)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.startTime).toLocaleTimeString()}
                </span>
              </div>
              {entry.endTime && (
                <div className="text-xs text-muted-foreground/70 mt-0.5">
                  {new Date(entry.startTime).toLocaleDateString()} •{" "}
                  {new Date(entry.endTime).toLocaleTimeString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface KanbanItemProps {
  item: Item;
  isDragging?: boolean;
  checklistId: string;
  category: string;
  onUpdate: (updatedChecklist: Checklist) => void;
  isShared: boolean;
}

export const KanbanItem = ({
  item,
  isDragging,
  checklistId,
  category,
  onUpdate,
  isShared,
}: KanbanItemProps) => {
  const { usersPublicData } = useAppMode();

  const getUserAvatarUrl = (username: string) => {
    if (!usersPublicData) return "";

    return (
      usersPublicData.find(
        (user) => user.username?.toLowerCase() === username?.toLowerCase()
      )?.avatarUrl || ""
    );
  };

  const [isRunning, setIsRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [totalTime, setTotalTime] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    const existingTime =
      item.timeEntries?.reduce((total, entry) => {
        if (entry.endTime) {
          const start = new Date(entry.startTime).getTime();
          const end = new Date(entry.endTime).getTime();
          return total + (end - start);
        }
        return total;
      }, 0) || 0;
    setTotalTime(Math.floor(existingTime / 1000));
  }, [item.timeEntries]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && startTime) {
      interval = setInterval(() => {
        setCurrentTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isSortableDragging && isRunning && startTime) {
      const saveTimer = async () => {
        const endTime = new Date();
        const newTimeEntry = {
          id: Date.now().toString(),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: Math.floor(
            (endTime.getTime() - startTime.getTime()) / 1000
          ),
        };

        const updatedTimeEntries = [...(item.timeEntries || []), newTimeEntry];
        const formData = new FormData();
        formData.append("listId", checklistId);
        formData.append("itemId", item.id);
        formData.append("timeEntries", JSON.stringify(updatedTimeEntries));
        formData.append("category", category);
        await updateItemStatus(formData);

        setTotalTime(
          (prev) =>
            prev + Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
        );
        setIsRunning(false);
        setStartTime(null);
        setCurrentTime(0);
      };

      saveTimer();
    }
  }, [isSortableDragging]);

  const handleTimerToggle = async () => {
    if (isRunning) {
      setIsRunning(false);
      if (startTime) {
        const endTime = new Date();
        const newTimeEntry = {
          id: Date.now().toString(),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: Math.floor(
            (endTime.getTime() - startTime.getTime()) / 1000
          ),
        };

        const updatedTimeEntries = [...(item.timeEntries || []), newTimeEntry];
        const formData = new FormData();
        formData.append("listId", checklistId);
        formData.append("itemId", item.id);
        formData.append("timeEntries", JSON.stringify(updatedTimeEntries));
        formData.append("category", category);
        await updateItemStatus(formData);

        setTotalTime(
          (prev) =>
            prev + Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
        );
        const result = await updateItemStatus(formData);
        if (result.success && result.data) {
          onUpdate(result.data);
        }
      }
      setStartTime(null);
      setCurrentTime(0);
    } else {
      setIsRunning(true);
      setStartTime(new Date());
      setCurrentTime(0);
    }
  };

  const handleResetTimer = async () => {
    const formData = new FormData();
    formData.append("listId", checklistId);
    formData.append("itemId", item.id);
    formData.append("timeEntries", JSON.stringify([]));
    formData.append("category", category || "Uncategorized");
    const result = await updateItemStatus(formData);
    setTotalTime(0);
    if (result.success && result.data) {
      onUpdate(result.data);
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    const formData = new FormData();
    formData.append("listId", checklistId);
    formData.append("itemId", item.id);
    formData.append("status", newStatus);
    formData.append("category", category || "Uncategorized");
    const result = await updateItemStatus(formData);
    if (result.success && result.data) {
      onUpdate(result.data);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditText(item.text);
  };

  const handleSave = async () => {
    setIsEditing(false);
    if (editText.trim() && editText !== item.text) {
      const formData = new FormData();
      formData.append("listId", checklistId);
      formData.append("itemId", item.id);
      formData.append("text", editText.trim());
      formData.append("category", category || "Uncategorized");
      const result = await updateItem(formData);
      if (result.success && result.data) {
        onUpdate(result.data);
      }
    }
  };

  const handleCancel = () => {
    setEditText(item.text);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this task?")) {
      const formData = new FormData();
      formData.append("listId", checklistId);
      formData.append("itemId", item.id);
      formData.append("category", category || "Uncategorized");

      const result = await deleteItem(formData);
      if (result.success) {
        onUpdate({
          id: checklistId,
          title: "",
          type: "task",
          items: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          category,
          isDeleted: true,
        });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      handleCancel();
    }
  };

  const statusOptions = [
    { id: TaskStatus.TODO, name: TaskStatusLabels.TODO },
    { id: TaskStatus.IN_PROGRESS, name: TaskStatusLabels.IN_PROGRESS },
    { id: TaskStatus.COMPLETED, name: TaskStatusLabels.COMPLETED },
    { id: TaskStatus.PAUSED, name: TaskStatusLabels.PAUSED },
  ];

  const formatTimerTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case TaskStatus.TODO:
        return "bg-background/50 border-border";
      case TaskStatus.IN_PROGRESS:
        return "bg-primary/10 border-primary/30";
      case TaskStatus.COMPLETED:
        return "bg-green-500/10 border-green-500/30";
      case TaskStatus.PAUSED:
        return "bg-yellow-500/10 border-yellow-500/30";
      default:
        return "bg-muted/50 border-border";
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case TaskStatus.IN_PROGRESS:
        return <Timer className="h-3 w-3 text-primary" />;
      case TaskStatus.COMPLETED:
        return <Clock className="h-3 w-3 text-green-600 dark:text-green-400" />;
      case TaskStatus.PAUSED:
        return (
          <Clock className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {showSubtaskModal && (
        <SubtaskModal
          item={item}
          isShared={isShared}
          isOpen={showSubtaskModal}
          onClose={() => setShowSubtaskModal(false)}
          onUpdate={onUpdate}
          checklistId={checklistId}
          category={category}
        />
      )}

      <div className="relative">
        <div
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          className={cn(
            "group relative bg-background border rounded-lg p-3 transition-all duration-200 hover:shadow-md cursor-grab active:cursor-grabbing",
            getStatusColor(item.status),
            (isDragging || isSortableDragging) &&
              "opacity-50 scale-95 rotate-1 shadow-lg z-50"
          )}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {item.createdBy && isShared && (
                  <div
                    className="flex-shrink-0"
                    title={`Created by ${item.createdBy}`}
                  >
                    <UserAvatar
                      username={item.createdBy}
                      size="xs"
                      avatarUrl={getUserAvatarUrl(item.createdBy) || ""}
                    />
                  </div>
                )}
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-sm font-medium text-foreground leading-tight bg-transparent border-none outline-none resize-none"
                  />
                ) : (
                  <p
                    className="text-sm font-medium text-foreground leading-tight truncate cursor-pointer"
                    title={item.text}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => setShowSubtaskModal(true)}
                    onClick={(e) => setShowSubtaskModal(true)}
                  >
                    {item.text}
                  </p>
                )}
              </div>

              <div
                className="flex items-center"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="relative">
                  <Dropdown
                    value=""
                    options={[
                      { id: "view", name: "View Task" },
                      { id: "add", name: "Add Subtask" },
                      { id: "rename", name: "Rename Task" },
                      { id: "delete", name: "Delete Task" },
                    ]}
                    onChange={(action) => {
                      switch (action) {
                        case "view":
                          setShowSubtaskModal(true);
                          break;
                        case "add":
                          setShowSubtaskModal(true);
                          break;
                        case "rename":
                          handleEdit();
                          break;
                        case "delete":
                          handleDelete();
                          break;
                      }
                    }}
                    iconDropdown
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                {getStatusIcon(item.status)}
                <span>
                  {item.status === TaskStatus.TODO && TaskStatusLabels.TODO}
                  {item.status === TaskStatus.IN_PROGRESS &&
                    TaskStatusLabels.IN_PROGRESS}
                  {item.status === TaskStatus.COMPLETED &&
                    TaskStatusLabels.COMPLETED}
                  {item.status === TaskStatus.PAUSED && TaskStatusLabels.PAUSED}
                  {!item.status && TaskStatusLabels.TODO}
                </span>
              </div>
              {item.lastModifiedBy && isShared && (
                <div
                  className="flex items-center gap-1"
                  title={`Last modified by ${item.lastModifiedBy}${
                    item.lastModifiedAt
                      ? ` on ${new Date(item.lastModifiedAt).toLocaleString()}`
                      : ""
                  }`}
                >
                  <UserAvatar
                    username={item.lastModifiedBy}
                    size="xs"
                    avatarUrl={getUserAvatarUrl(item.lastModifiedBy) || ""}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {item.lastModifiedAt
                      ? new Date(item.lastModifiedAt).toLocaleDateString()
                      : ""}
                  </span>
                </div>
              )}
            </div>

            {item.children && item.children.length > 0 && (
              <>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Subtasks</span>
                  <span>
                    {item.children.filter((c) => c.completed).length}/
                    {item.children.length}
                  </span>
                </div>
                <ProgressBar
                  progress={Math.round(
                    (item.children.filter((c) => c.completed).length /
                      item.children.length) *
                      100
                  )}
                />
              </>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatTimerTime(totalTime + currentTime)}</span>
                </div>
                <div
                  className="flex"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTimerToggle();
                    }}
                  >
                    {isRunning ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Timer className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      const minutes = prompt("Enter time in minutes:");
                      if (minutes && !isNaN(Number(minutes))) {
                        const now = new Date();
                        const start = new Date(
                          now.getTime() - Number(minutes) * 60000
                        );
                        const newTimeEntry = {
                          id: Date.now().toString(),
                          startTime: start.toISOString(),
                          endTime: now.toISOString(),
                          duration: Number(minutes) * 60,
                        };
                        const formData = new FormData();
                        formData.append("listId", checklistId);
                        formData.append("itemId", item.id);
                        formData.append(
                          "timeEntries",
                          JSON.stringify([
                            ...(item.timeEntries || []),
                            newTimeEntry,
                          ])
                        );
                        formData.append("category", category);
                        updateItemStatus(formData).then((result) => {
                          if (result.success && result.data) {
                            onUpdate(result.data);
                          }
                        });
                      }
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {item.timeEntries && item.timeEntries.length > 0 && (
              <div onPointerDown={(e) => e.stopPropagation()}>
                <TimeEntriesAccordion
                  timeEntries={item.timeEntries}
                  totalTime={totalTime + currentTime}
                  formatTimerTime={formatTimerTime}
                />
              </div>
            )}

            <div
              className="lg:hidden"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <Dropdown
                value={item.status || TaskStatus.TODO}
                options={statusOptions}
                onChange={(newStatus) =>
                  handleStatusChange(newStatus as TaskStatus)
                }
                className={`w-full text-sm`}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
