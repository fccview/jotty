"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { useTranslations } from "next-intl";

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
}

export const PromptModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  placeholder,
  defaultValue = "",
  confirmText,
  cancelText,
}: PromptModalProps) => {
  const t = useTranslations();
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [isOpen, defaultValue]);

  const handleConfirm = () => {
    onConfirm(value);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirm();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{message}</p>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-border rounded-jotty bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {cancelText || t("common.cancel")}
          </Button>
          <Button onClick={handleConfirm}>
            {confirmText || t("common.confirm")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
