"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Input } from "../FormElements/Input";
import { useTranslations } from "next-intl";

interface ImageSizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (width: number | null, height: number | null) => void;
  currentWidth?: number;
  currentHeight?: number;
  imageUrl?: string;
}

export const ImageSizeModal = ({
  isOpen,
  onClose,
  onConfirm,
  currentWidth,
  currentHeight,
  imageUrl,
}: ImageSizeModalProps) => {
  const t = useTranslations();
  const [width, setWidth] = useState<string>("");
  const [height, setHeight] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setWidth(currentWidth?.toString() || "");
      setHeight(currentHeight?.toString() || "");
    }
  }, [isOpen, currentWidth, currentHeight]);

  const handleWidthChange = (value: string) => {
    setWidth(value);
  };

  const handleHeightChange = (value: string) => {
    setHeight(value);
  };

  const handleConfirm = () => {
    const widthNum = width && width.trim() !== "" ? parseInt(width) : null;
    const heightNum = height && height.trim() !== "" ? parseInt(height) : null;
    onConfirm(widthNum, heightNum);
    onClose();
  };

  const handleReset = () => {
    setWidth("");
    setHeight("");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("editor.imageSize")}
      className="!max-w-md"
    >
      <div className="space-y-4">
        {imageUrl && (
          <div className="flex justify-center">
            <img
              src={imageUrl}
              alt={t('editor.preview')}
              className="max-w-full max-h-48 object-contain rounded border"
              style={{
                width: width ? `${width}px` : "auto",
                height: height ? `${height}px` : "auto",
              }}
            />
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                id="width"
                label={t("editor.widthPx")}
                type="number"
                value={width}
                onChange={(e) => handleWidthChange(e.target.value)}
                placeholder={t("common.auto")}
                className="w-full px-3 py-2 border border-border rounded-jotty focus:outline-none focus:ring-none focus:ring-primary"
              />
            </div>

            <div>
              <Input
                id="height"
                label={t("editor.heightPx")}
                type="number"
                value={height}
                onChange={(e) => handleHeightChange(e.target.value)}
                placeholder={t("common.auto")}
                className="w-full px-3 py-2 border border-border rounded-jotty focus:outline-none focus:ring-none focus:ring-primary"
              />
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            {t("editor.leaveEmptyForAutoSize")}
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handleReset} className="text-sm">{t('common.reset')}</Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={onClose} className="text-sm">{t('common.cancel')}</Button>
            <Button onClick={handleConfirm} className="text-sm">{t('common.apply')}</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
