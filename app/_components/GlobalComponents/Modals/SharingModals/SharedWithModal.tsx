import { Modal } from "../Modal";
import { UserAvatar } from "../../User/UserAvatar";
import { useTranslations } from "next-intl";

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
    <Modal isOpen={isOpen} onClose={onClose} title={t("sharing.sharedWith")}>
      <div className="space-y-4 py-6">
        {usernames.map((username) => (
          <div
            key={username}
            className="p-3 rounded-jotty border hover:bg-accent/50"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <UserAvatar size="sm" username={username} />
                <div className="min-w-0 flex items-center gap-2">
                  <div className="text-md lg:text-sm font-medium truncate">{username}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};
