import { useTranslations } from "next-intl";
import { Modal, ModalVariant } from "../Modal";
import { ShareeRow } from "./Parts/ShareeRow";

interface SharedWithModalProps {
  usernames: string[];
  isOpen: boolean;
  onClose: () => void;
}

export const SharedWithModal = ({
  usernames,
  isOpen,
  onClose,
}: SharedWithModalProps) => {
  const t = useTranslations();
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant={ModalVariant.PANEL}
      title={t("sharing.sharedWith")}
      flush
    >
      <div className="py-3">
        {usernames.map((username) => (
          <ShareeRow key={username} username={username} />
        ))}
      </div>
    </Modal>
  );
};
