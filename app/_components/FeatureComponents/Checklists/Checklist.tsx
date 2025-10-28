"use client";

import { useState, useEffect } from "react";
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
import { useSharing } from "@/app/_hooks/useSharing";

interface ChecklistViewProps {
  list: Checklist;
  onUpdate: (updatedChecklist: Checklist) => void;
  onBack: () => void;
  onEdit?: (checklist: Checklist) => void;
  onDelete?: (deletedId: string) => void;
  currentUsername?: string;
  isAdmin?: boolean;
}

export const ChecklistView = ({
  list,
  onUpdate,
  onBack,
  onEdit,
  onDelete,
  currentUsername,
  isAdmin = false,
}: ChecklistViewProps) => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const checklistHookProps = useChecklist({ list, onUpdate, onDelete });
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
  } = checklistHookProps;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { sharingStatus } = useSharing({
    itemId: localList.id,
    itemType: "checklist",
    itemOwner: localList.owner || "",
    onClose: () => { },
    enabled: true,
    itemTitle: localList.title,
    itemCategory: localList.category,
    isOpen: true,
  });

  const isShared =
    (sharingStatus?.isShared || sharingStatus?.isPubliclyShared) ?? false;

  const canDelete = isShared
    ? isAdmin || currentUsername === localList.owner
    : true;
  const deleteHandler = canDelete ? handleDeleteList : undefined;

  if (!isClient) {
    return (
      <div className="h-full flex flex-col bg-background relative">
        <ChecklistHeader
          checklist={localList}
          onBack={onBack}
          onEdit={() => onEdit?.(list)}
        />
        <div className="flex-1 flex items-center justify-center">
          <p>Loading checklist...</p>
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
        onShare={() => setShowShareModal(true)}
        onConvertType={handleConvertType}
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
                    Deleting {deletingItemsCount} item(s)
                  </label>
                  <label>Do not refresh the page.</label>
                </>
              ),
            },
          ]}
          onRemove={() => { }}
        ></ToastContainer>
      )}

      {localList.type === "simple" && (
        <ChecklistHeading
          checklist={localList}
          key={focusKey}
          onSubmit={handleCreateItem}
          onBulkSubmit={() => setShowBulkPasteModal(true)}
          isLoading={isLoading}
          autoFocus={true}
          focusKey={focusKey}
          placeholder="Add new item..."
          submitButtonText="Add Item"
        />
      )}

      {localList.type === "simple" ? (
        <ChecklistBody
          {...checklistHookProps}
          sensors={sensors}
          isLoading={isLoading}
          isShared={isShared}
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
