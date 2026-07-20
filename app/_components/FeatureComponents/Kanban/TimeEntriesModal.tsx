"use client";

import { useState, memo } from "react";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { TimeEntry, Checklist } from "@/app/_types";
import { Delete03Icon, FloppyDiskIcon, Cancel01Icon } from "hugeicons-react";
import { DateTimePicker } from "@/app/_components/GlobalComponents/FormElements/DatePicker";
import { editTimeEntry, deleteTimeEntry } from "@/app/_server/actions/kanban";
import { useTranslations } from "next-intl";
import { ConfirmModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/ConfirmModal";
import { UserAvatar } from "../../GlobalComponents/User/UserAvatar";

interface TimeEntriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeEntries: TimeEntry[];
  checklistUuid: string;
  itemId: string;
  onUpdate: (updatedChecklist: Checklist) => void;
  usersPublicData?: { username?: string; avatarUrl?: string }[];
}

const _toLocalDateTimeValue = (isoStr: string): string => {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const _formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const _getUserAvatarUrl = (
  username: string,
  usersPublicData?: { username?: string; avatarUrl?: string }[],
): string => {
  if (!usersPublicData) return "";
  return (
    usersPublicData.find(
      (u) => u.username?.toLowerCase() === username?.toLowerCase(),
    )?.avatarUrl || ""
  );
};

interface EditingState {
  entryId: string;
  startTime: string;
  endTime: string;
}

const TimeEntriesModalComponent = ({
  isOpen,
  onClose,
  timeEntries,
  checklistUuid,
  itemId,
  onUpdate,
  usersPublicData,
}: TimeEntriesModalProps) => {
  const t = useTranslations();
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const totalSeconds = timeEntries.reduce(
    (sum, e) => sum + (e.duration || 0),
    0,
  );

  const handleStartEdit = (entry: TimeEntry) => {
    setEditing({
      entryId: entry.id,
      startTime: _toLocalDateTimeValue(entry.startTime),
      endTime: _toLocalDateTimeValue(entry.endTime || ""),
    });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const formData = new FormData();
    formData.append("uuid", checklistUuid);
    formData.append("itemId", itemId);
    formData.append("entryId", editing.entryId);
    if (editing.startTime)
      formData.append("startTime", new Date(editing.startTime).toISOString());
    if (editing.endTime) {
      formData.append("endTime", new Date(editing.endTime).toISOString());
      const start = new Date(editing.startTime).getTime();
      const end = new Date(editing.endTime).getTime();
      if (end > start)
        formData.append(
          "duration",
          Math.floor((end - start) / 1000).toString(),
        );
    }
    const result = await editTimeEntry(formData);
    if (result.success && result.data) {
      onUpdate(result.data);
    }
    setEditing(null);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    const formData = new FormData();
    formData.append("uuid", checklistUuid);
    formData.append("itemId", itemId);
    formData.append("entryId", deleteTarget);
    const result = await deleteTimeEntry(formData);
    if (result.success && result.data) {
      onUpdate(result.data);
    }
    setDeleteTarget(null);
    setSaving(false);
  };

  const sorted = [...timeEntries].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t("kanban.timeEntries")}
        className="lg:!max-w-[600px] lg:!w-full !max-h-[80vh] overflow-y-auto"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground border-b border-border pb-3">
            <span>
              {sorted.length}{" "}
              {sorted.length === 1 ? t("kanban.session") : t("kanban.sessions")}
            </span>
            <span className="font-semibold text-foreground">
              {_formatDuration(totalSeconds)}
            </span>
          </div>

          <div className="space-y-2 max-h-[55vh] overflow-y-auto">
            {sorted.map((entry) => {
              const isEditing = editing?.entryId === entry.id;

              return (
                <div
                  key={entry.id}
                  className="border border-border rounded-jotty p-3 bg-card transition-colors hover:bg-muted/20"
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">
                            {t("kanban.startTime")}
                          </label>
                          <DateTimePicker
                            value={editing.startTime}
                            onChange={(v) =>
                              setEditing({ ...editing, startTime: v })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">
                            {t("kanban.endTime")}
                          </label>
                          <DateTimePicker
                            value={editing.endTime}
                            onChange={(v) =>
                              setEditing({ ...editing, endTime: v })
                            }
                          />
                        </div>
                      </div>
                      {editing.startTime && editing.endTime && (
                        <div className="text-xs text-muted-foreground">
                          {_formatDuration(
                            Math.max(
                              0,
                              Math.floor(
                                (new Date(editing.endTime).getTime() -
                                  new Date(editing.startTime).getTime()) /
                                  1000,
                              ),
                            ),
                          )}
                        </div>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditing(null)}
                          disabled={saving}
                        >
                          <Cancel01Icon className="h-3 w-3 mr-1" />
                          {t("common.cancel")}
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={saving}
                        >
                          <FloppyDiskIcon className="h-3 w-3 mr-1" />
                          {t("admin.saveChanges")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => handleStartEdit(entry)}
                    >
                      {entry.user && (
                        <UserAvatar
                          username={entry.user}
                          size="xs"
                          avatarUrl={_getUserAvatarUrl(
                            entry.user,
                            usersPublicData,
                          )}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {_formatDuration(entry.duration || 0)}
                          </span>
                          {entry.user && (
                            <span className="text-xs text-muted-foreground">
                              {entry.user}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(entry.startTime).toLocaleDateString(
                            undefined,
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            },
                          )}{" "}
                          {new Date(entry.startTime).toLocaleTimeString(
                            undefined,
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            },
                          )}
                          {entry.endTime && (
                            <>
                              {" → "}
                              {new Date(entry.endTime).toLocaleTimeString(
                                undefined,
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                },
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(entry.id);
                        }}
                        className="p-1.5 rounded-jotty hover:bg-destructive/10 transition-colors shrink-0"
                      >
                        <Delete03Icon className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {sorted.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                {t("kanban.noTimeEntries")}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t("common.delete")}
        message={t("common.confirmDeleteItem", {
          itemTitle: t("common.thisEntry"),
        })}
        confirmText={t("common.delete")}
        variant="destructive"
      />
    </>
  );
};

export const TimeEntriesModal = memo(TimeEntriesModalComponent);
