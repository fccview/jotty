import { ShareModal } from "@/app/_components/GlobalComponents/Modals/SharingModals/ShareModal";
import { ConversionConfirmModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/ConversionConfirmModal";
import { BulkPasteModal } from "@/app/_components/GlobalComponents/Modals/BulkPasteModal/BulkPasteModal";
import { Checklist } from "@/app/_types";
import { useRouter } from "next/navigation";

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
        <ConversionConfirmModal
          isOpen={showConversionModal}
          onClose={() => setShowConversionModal(false)}
          onConfirm={handleConfirmConversion}
          currentType={localList.type}
          newType={getNewType(localList.type)}
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
