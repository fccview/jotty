import { ShareModal } from "@/app/_components/GlobalComponents/Modals/SharingModals/ShareModal";
import { ConfirmModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/ConfirmModal";
import { BulkPasteModal } from "@/app/_components/GlobalComponents/Modals/BulkPasteModal/BulkPasteModal";
import { Checklist } from "@/app/_types";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface ChecklistModalsProps {
  localList: Checklist;
  showShareModal: boolean;
  setShowShareModal: (show: boolean) => void;
  showConversionModal: boolean;
  setShowConversionModal: (show: boolean) => void;
  showBulkPasteModal: boolean;
  setShowBulkPasteModal: (show: boolean) => void;
  handleConfirmConversion: () => void;
  getNewType: (type: "simple" | "task") => "simple" | "task";
  handleBulkPaste: (itemsText: string) => void;
  isLoading: boolean;
  DeleteModal: () => JSX.Element;
}

export const ChecklistModals = ({
  localList,
  showShareModal,
  setShowShareModal,
  showConversionModal,
  setShowConversionModal,
  handleConfirmConversion,
  getNewType,
  showBulkPasteModal,
  setShowBulkPasteModal,
  handleBulkPaste,
  isLoading,
  DeleteModal,
}: ChecklistModalsProps) => {
  const router = useRouter();
  const t = useTranslations();

  const currentType = localList.type === "simple" ? t("checklists.simpleChecklist") : t("checklists.taskProject");
  const newType = getNewType(localList.type) === "simple" ? t("checklists.simpleChecklist") : t("checklists.taskProject");

  return (
    <>
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
          message={t("checklists.convertTypeConfirmation", { currentType, newType })}
          confirmText={t("checklists.convert")}
        />
      )}
      {showBulkPasteModal && (
        <BulkPasteModal
          isOpen={showBulkPasteModal}
          onClose={() => setShowBulkPasteModal(false)}
          onSubmit={handleBulkPaste}
          isLoading={isLoading}
        />
      )}
      <DeleteModal />
    </>
  );
};
