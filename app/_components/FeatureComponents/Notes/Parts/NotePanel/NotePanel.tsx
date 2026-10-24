"use client";

import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Modal, ModalVariant } from "@/app/_components/GlobalComponents/Modals/Modal";
import { NotePanelBody, NotePanelBodyProps } from "./NotePanelBody";

interface NotePanelProps extends NotePanelBodyProps {
  onClose: () => void;
}

export const NotePanel = ({ onClose, ...body }: NotePanelProps) => {
  const t = useTranslations();

  return (
    <aside
      aria-label={t("notePanel.title")}
      className="hidden lg:flex w-[22rem] flex-none flex-col min-h-0 border-l border-border bg-background"
    >
      <NotePanelBody
        {...body}
        trailing={
          <button
            type="button"
            onClick={onClose}
            title={t("notePanel.hide")}
            aria-label={t("notePanel.hide")}
            className="flex-none rounded-[calc(var(--jotty-radius-effective)*0.75)] p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
          </button>
        }
      />
    </aside>
  );
};

export const NotePanelSheet = ({ onClose, ...body }: NotePanelProps) => {
  const t = useTranslations();

  return (
    <Modal isOpen={true} onClose={onClose} variant={ModalVariant.PANEL} title={t("notePanel.title")} flush>
      <div className="flex flex-col">
        <NotePanelBody {...body} />
      </div>
    </Modal>
  );
};
