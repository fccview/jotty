import { ShareModal } from "@/app/_components/GlobalComponents/Modals/SharingModals/ShareModal";
import { ConversionConfirmModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/ConversionConfirmModal";
import { BulkPasteModal } from "@/app/_components/GlobalComponents/Modals/BulkPasteModal/BulkPasteModal";
import { Checklist } from "@/app/_types";
import { useRouter } from "next/navigation";
import { ItemTypes } from "@/app/_types/enums";

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
          itemId={localList.id}
          itemTitle={localList.title}
          itemType={ItemTypes.CHECKLIST}
          itemCategory={localList.category}
          itemOwner={localList.owner || ""}
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
    </>
  );
};
