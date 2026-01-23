"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Category, Checklist, SanitisedUser } from "@/app/_types";
import { ChecklistView } from "@/app/_components/FeatureComponents/Checklists/Checklist";
import { KanbanBoard } from "@/app/_components/FeatureComponents/Checklists/Parts/Kanban/KanbanBoard";
import { ChecklistHeader } from "@/app/_components/FeatureComponents/Checklists/Parts/Common/ChecklistHeader";
import { ShareModal } from "@/app/_components/GlobalComponents/Modals/SharingModals/ShareModal";
import { ConfirmModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/ConfirmModal";
import { EditChecklistModal } from "@/app/_components/GlobalComponents/Modals/ChecklistModals/EditChecklistModal";
import { CreateListModal } from "@/app/_components/GlobalComponents/Modals/ChecklistModals/CreateListModal";
import { CreateCategoryModal } from "@/app/_components/GlobalComponents/Modals/CategoryModals/CreateCategoryModal";
import { CloneCategoryModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/CloneCategoryModal";
import { useNavigationGuard } from "@/app/_providers/NavigationGuardProvider";
import { Layout } from "@/app/_components/GlobalComponents/Layout/Layout";
import { useChecklist } from "@/app/_hooks/useChecklist";
import { Modes } from "@/app/_types/enums";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";
import { toggleArchive } from "@/app/_server/actions/dashboard";
import { buildCategoryPath } from "@/app/_utils/global-utils";
import { useTranslations } from "next-intl";

interface ChecklistClientProps {
  checklist: Checklist;
  categories: Category[];
  user: SanitisedUser | null;
}

export const ChecklistClient = ({
  checklist,
  categories,
  user,
}: ChecklistClientProps) => {
  const router = useRouter();
  const t = useTranslations();
  const { checkNavigation } = useNavigationGuard();
  const [localChecklist, setLocalChecklist] = useState<Checklist>(checklist);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [initialCategory, setInitialCategory] = useState<string>("");
  const [initialParentCategory, setInitialParentCategory] =
    useState<string>("");
  const { openCreateChecklistModal, openCreateCategoryModal, openSettings } =
    useShortcut();
  const prevChecklistId = useRef(checklist.id);

  useEffect(() => {
    if (checklist.id !== prevChecklistId.current) {
      setLocalChecklist(checklist);
      prevChecklistId.current = checklist.id;
    }
  }, [checklist]);

  const handleUpdate = useCallback((updatedChecklist: Checklist) => {
    setLocalChecklist(updatedChecklist);
  }, []);

  const handleBack = () => {
    checkNavigation(() => {
      router.push("/");
    });
  };

  const handleArchive = async () => {
    const result = await toggleArchive(localChecklist, Modes.CHECKLISTS);
    if (result.success) {
      router.refresh();
    }
  };

  const handleClone = () => {
    setShowCloneModal(true);
  };

  const handleCloneConfirm = async (targetCategory: string) => {
    const formData = new FormData();
    formData.append("id", localChecklist.id);
    formData.append("originalCategory", localChecklist.category || "Uncategorized");
    formData.append("category", targetCategory || "Uncategorized");
    if (localChecklist.owner) {
      formData.append("user", localChecklist.owner);
    }

    const { cloneChecklist } = await import("@/app/_server/actions/checklist");
    const result = await cloneChecklist(formData);

    if (result.success && result.data) {
      router.push(
        `/checklist/${buildCategoryPath(
          result.data.category || "Uncategorized",
          result.data.id
        )}`
      );
      router.refresh();
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleDelete = (deletedId: string) => {
    checkNavigation(() => {
      router.push("/");
    });
  };

  const {
    handleDeleteList,
    getNewType,
    handleConfirmConversion,
    sensors,
    DeleteModal,
  } = useChecklist({
    list: localChecklist,
    onUpdate: handleUpdate,
    onDelete: handleDelete,
  });

  const renderContent = () => {
    if (localChecklist.type === "task") {
      return (
        <div className="h-full flex flex-col bg-background">
          <ChecklistHeader
            checklist={localChecklist}
            onBack={handleBack}
            onEdit={handleEdit}
            onDelete={
              localChecklist.isShared
                ? user?.isAdmin || user?.username === localChecklist.owner
                  ? handleDeleteList
                  : undefined
                : handleDeleteList
            }
            onShare={() => setShowShareModal(true)}
            onConvertType={() => setShowConversionModal(true)}
            onArchive={handleArchive}
            onClone={handleClone}
          />
          <KanbanBoard checklist={localChecklist} onUpdate={handleUpdate} />
        </div>
      );
    }

    return (
      <ChecklistView
        list={localChecklist}
        onUpdate={handleUpdate}
        onBack={handleBack}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onClone={handleClone}
        currentUsername={user?.username}
        isAdmin={user?.isAdmin}
        sensors={sensors}
      />
    );
  };

  return (
    <Layout
      categories={categories}
      onOpenSettings={openSettings}
      onOpenCreateModal={openCreateChecklistModal}
      onOpenCategoryModal={openCreateCategoryModal}
      user={user}
      extraClasses="jotty-checklist-page"
    >
      {renderContent()}

      {showShareModal && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            router.refresh();
          }}
        />
      )}

      {showConversionModal && (
        <ConfirmModal
          isOpen={showConversionModal}
          onClose={() => setShowConversionModal(false)}
          onConfirm={handleConfirmConversion}
          title={t("checklists.convertChecklistType")}
          message={t("checklists.convertTypeConfirmation", {
            currentType: localChecklist.type === "simple" ? t("checklists.simpleChecklist") : t("checklists.taskProject"),
            newType: getNewType(localChecklist.type) === "simple" ? t("checklists.simpleChecklist") : t("checklists.taskProject")
          })}
          confirmText={t("checklists.convert")}
        />
      )}

      {showEditModal && (
        <EditChecklistModal
          checklist={localChecklist}
          categories={categories}
          onClose={() => setShowEditModal(false)}
          onUpdated={() => {
            setShowEditModal(false);
            router.refresh();
          }}
        />
      )}

      {showCreateModal && (
        <CreateListModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(newChecklist) => {
            if (newChecklist) {
              router.push(`/checklist/${newChecklist.id}`);
            }
            setShowCreateModal(false);
            router.refresh();
          }}
          categories={categories}
          initialCategory={initialCategory}
        />
      )}

      {showCategoryModal && (
        <CreateCategoryModal
          mode={Modes.CHECKLISTS}
          categories={categories}
          initialParent={initialParentCategory}
          onClose={() => {
            setShowCategoryModal(false);
            setInitialParentCategory("");
          }}
          onCreated={() => {
            setShowCategoryModal(false);
            setInitialParentCategory("");
            router.refresh();
          }}
        />
      )}

      <DeleteModal />
      {showCloneModal && (
        <CloneCategoryModal
          isOpen={showCloneModal}
          onClose={() => setShowCloneModal(false)}
          onConfirm={handleCloneConfirm}
          categories={categories}
          currentCategory={localChecklist.category || ""}
          itemType="checklist"
        />
      )}
    </Layout>
  );
};
