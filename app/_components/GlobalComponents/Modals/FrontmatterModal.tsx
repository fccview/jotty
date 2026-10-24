"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Modal, ModalVariant, ModalWidth } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { CssEditor } from "@/app/_components/GlobalComponents/FormElements/CSSEditor";
import { FeedbackMessage } from "@/app/_components/GlobalComponents/Feedback/FeedbackMessage";
import { readFrontmatter, saveFrontmatter } from "@/app/_server/actions/frontmatter";
import { useToast } from "@/app/_providers/ToastProvider";
import { itemHref } from "@/app/_utils/global-utils";
import { FrontmatterWarnings, frontmatterWarnings } from "@/app/_utils/frontmatter-warnings";
import type { ItemType } from "@/app/_types/core";

interface FrontmatterModalProps {
  uuid: string;
  itemType: ItemType;
  onClose: () => void;
  settle?: () => Promise<boolean>;
}

export const FrontmatterModal = ({ uuid, itemType, onClose, settle }: FrontmatterModalProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { showToast } = useToast();
  const [original, setOriginal] = useState("");
  const [yaml, setYaml] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const warnings = useMemo(() => frontmatterWarnings(original, yaml), [original, yaml]);
  const unreadable = useRef(t("errors.frontmatterUnreadable"));
  unreadable.current = t("errors.frontmatterUnreadable");

  useEffect(() => {
    let live = true;
    readFrontmatter(uuid, itemType)
      .then((result) => {
        if (!live) return;
        if (result.success && typeof result.data === "string") {
          setOriginal(result.data);
          setYaml(result.data);
        } else {
          setError(result.error || unreadable.current);
        }
      })
      .catch((failure) => {
        console.error("Loading frontmatter failed:", failure);
        if (live) setError(unreadable.current);
      })
      .finally(() => {
        if (live) setIsLoading(false);
      });
    return () => {
      live = false;
    };
  }, [uuid, itemType]);

  const handleSave = async (close: () => void) => {
    setIsSaving(true);
    setError(null);
    if (settle && warnings.includes(FrontmatterWarnings.UUID) && !(await settle())) {
      setIsSaving(false);
      setError(t("frontmatter.saveNoteFirst"));
      return;
    }
    let result: Awaited<ReturnType<typeof saveFrontmatter>>;
    try {
      result = await saveFrontmatter(uuid, itemType, yaml);
    } catch (failure) {
      console.error("Saving frontmatter failed:", failure);
      result = { success: false };
    } finally {
      setIsSaving(false);
    }

    if (!result.success || !result.data) {
      setError(result.error || t("errors.frontmatterSaveFailed"));
      return;
    }
    showToast({ type: "success", title: t("frontmatter.saved") });
    close();
    if (result.data.uuid !== uuid) router.replace(itemHref(itemType, result.data.uuid));
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      variant={ModalVariant.PANEL}
      width={ModalWidth.WIDE}
      title={t("frontmatter.title")}
      description={t("frontmatter.hint")}
      footer={(close) => (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={close} disabled={isSaving}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => handleSave(close)} disabled={isLoading || isSaving}>
            {isSaving ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      )}
    >
      <div className="space-y-4">
        <FeedbackMessage error={error} success={null} />
        {isLoading ? (
          <p className="text-md lg:text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <CssEditor language="yaml" value={yaml} onChange={setYaml} />
        )}
        {warnings.map((warning) => (
          <FeedbackMessage
            key={warning}
            error={null}
            success={null}
            warning={t(`frontmatter.warnings.${warning}`)}
          />
        ))}
      </div>
    </Modal>
  );
};
