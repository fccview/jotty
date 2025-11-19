"use client";

import { useState, useEffect, useMemo } from "react";
import { Checklist } from "@/app/_types";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  TouchSensor,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanBoard } from "@/app/_components/FeatureComponents/Checklists/Parts/Kanban/KanbanBoard";
import { useChecklist } from "@/app/_hooks/useChecklist";
import { ChecklistHeader } from "@/app/_components/FeatureComponents/Checklists/Parts/Common/ChecklistHeader";
import { ChecklistHeading } from "@/app/_components/FeatureComponents/Checklists/Parts/Common/ChecklistHeading";
import { ChecklistBody } from "@/app/_components/FeatureComponents/Checklists/Parts/Simple/ChecklistBody";
import { ChecklistModals } from "@/app/_components/FeatureComponents/Checklists/Parts/Common/ChecklistModals";
import { ToastContainer } from "../../GlobalComponents/Feedback/ToastContainer";
import { useTranslations } from "next-intl";
import { toggleArchive } from "@/app/_server/actions/dashboard";
import { Modes } from "@/app/_types/enums";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/app/_providers/PermissionsProvider";

interface ChecklistViewProps {
  list: Checklist;
  onUpdate: (updatedChecklist: Checklist) => void;
  onBack: () => void;
  onEdit?: (checklist: Checklist) => void;
  onDelete?: (deletedId: string) => void;
  onClone?: () => void;
  currentUsername?: string;
  isAdmin?: boolean;
}

export const ChecklistView = ({
  list,
  onUpdate,
  onBack,
  onEdit,
  onDelete,
  onClone,
  currentUsername,
  isAdmin = false,
}: ChecklistViewProps) => {
  const t = useTranslations();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const checklistHookProps = useChecklist({
    list,
    onUpdate,
    onDelete,
  });
  const {
    localList,
    setShowShareModal,
    handleConvertType,
    handleDeleteList,
    focusKey,
    handleCreateItem,
    handleAddSubItem,
    setShowBulkPasteModal,
    isLoading,
    deletingItemsCount,
    pendingTogglesCount,
  } = checklistHookProps;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { permissions } = usePermissions();

  const canDelete = true
    ? isAdmin || currentUsername === localList.owner
    : true;
  const deleteHandler = canDelete ? handleDeleteList : undefined;

  const archiveHandler = async () => {
    const result = await toggleArchive(localList, Modes.CHECKLISTS);

    if (result.success) {
      router.refresh();
    }
  };

  if (!isClient) {
    return (
      <div className="h-full flex flex-col bg-background relative">
        <ChecklistHeader
          checklist={localList}
          onBack={onBack}
          onEdit={() => onEdit?.(list)}
        />
        <div className="flex-1 flex items-center justify-center">
          <p>{t("checklists.loading_checklist")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background relative">
      <ChecklistHeader
        checklist={localList}
        onBack={onBack}
        onEdit={() => onEdit?.(list)}
        onDelete={deleteHandler}
        onArchive={archiveHandler}
        onShare={() => setShowShareModal(true)}
        onConvertType={handleConvertType}
        onClone={onClone}
      />

      {deletingItemsCount > 0 && (
        <ToastContainer
          toasts={[
            {
              id: "deleting-items",
              type: "info",
              title: (
                <>
                  <label className="block">
                    {t("checklists.deleting_items", {
                      count: deletingItemsCount,
                    })}
                  </label>
                  <label>{t("checklists.do_not_refresh")}</label>
                </>
              ),
            },
          ]}
          onRemove={() => {}}
        ></ToastContainer>
      )}

      {pendingTogglesCount > 0 && (
        <ToastContainer
          toasts={[
            {
              id: "pending-toggles",
              type: "info",
              title: (
                <>
                  <label className="block">
                    Syncing {pendingTogglesCount} item(s)
                  </label>
                  <label>Do not refresh the page.</label>
                </>
              ),
            },
          ]}
          onRemove={() => {}}
        ></ToastContainer>
      )}

      {localList.type === "simple" && permissions?.canEdit && (
        <ChecklistHeading
          key={focusKey}
          checklist={localList}
          onSubmit={handleCreateItem}
          onToggleCompletedItem={checklistHookProps.handleToggleItem}
          onBulkSubmit={() => setShowBulkPasteModal(true)}
          isLoading={isLoading}
          autoFocus={true}
          focusKey={focusKey}
          placeholder={t("modals.add_new_item")}
          submitButtonText={t("modals.add_item")}
        />
      )}

      {localList.type === "simple" ? (
        <ChecklistBody
          {...checklistHookProps}
          sensors={sensors}
          isLoading={isLoading}
          isDeletingItem={deletingItemsCount > 0}
          handleAddSubItem={handleAddSubItem}
        />
      ) : (
        <div className="flex-1 overflow-hidden p-4">
          <KanbanBoard checklist={localList} onUpdate={onUpdate} />
        </div>
      )}

      <ChecklistModals {...checklistHookProps} isLoading={isLoading} />
    </div>
  );
};
