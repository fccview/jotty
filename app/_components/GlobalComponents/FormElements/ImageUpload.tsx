import { useToast } from "@/app/_providers/ToastProvider";
import { FC, useState } from "react";
import { Label } from "@/app/_components/GlobalComponents/FormElements/label";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import {
  MultiplicationSignIcon,
  Image02Icon,
  Orbit01Icon,
} from "hugeicons-react";
import { uploadAppIcon } from "@/app/_server/actions/config";
import { AppSettings } from "@/app/_types";
import { Logo } from "../Layout/Logo/Logo";
import { useTranslations } from "next-intl";

interface ImageUploadProps {
  label: string;
  description: string;
  iconType?: keyof AppSettings;
  currentUrl: string;
  onUpload: (iconType: keyof AppSettings | undefined, url: string) => void;
  customUploadAction?: (
    formData: FormData
  ) => Promise<{ success: boolean; data?: { url: string }; error?: string }>;
  disabled?: boolean;
}

type IconSizeKey =
  | "16x16Icon"
  | "32x32Icon"
  | "180x180Icon"
  | "192x192Icon"
  | "512x512Icon";

const ICON_SIZES: Record<IconSizeKey, { width: number; height: number }> = {
  "16x16Icon": { width: 16, height: 16 },
  "32x32Icon": { width: 32, height: 32 },
  "180x180Icon": { width: 180, height: 180 },
  "192x192Icon": { width: 192, height: 192 },
  "512x512Icon": { width: 512, height: 512 },
} as const;

const resizeImage = (
  file: File,
  targetWidth: number,
  targetHeight: number
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas not supported"));
      return;
    }

    const img = new Image();
    img.onload = () => {
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const scale = Math.min(
        targetWidth / img.width,
        targetHeight / img.height
      );
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;

      const x = (targetWidth - scaledWidth) / 2;
      const y = (targetHeight - scaledHeight) / 2;

      ctx.clearRect(0, 0, targetWidth, targetHeight);
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to resize image"));
          }
        },
        "image/png",
        0.9
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
};

export const ImageUpload: FC<ImageUploadProps> = ({
  label,
  description,
  iconType,
  currentUrl,
  onUpload,
  customUploadAction,
  disabled = false,
}) => {
  const t = useTranslations();
  const { showToast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = async (file: File | null) => {
    if (!file || disabled) return;

    if (!file.type.startsWith("image/")) {
      return showToast({
        type: "error",
        title: "Invalid File Type",
        message: "Please select an image.",
      });
    }
    if (file.size > 5 * 1024 * 1024) {
      return showToast({
        type: "error",
        title: "File Too Large",
        message: "Image size cannot exceed 5MB.",
      });
    }

    setIsUploading(true);

    let processedFile = file;

    if (iconType && (iconType as IconSizeKey) in ICON_SIZES) {
      try {
        const { width, height } = ICON_SIZES[iconType as IconSizeKey];
        const resizedBlob = await resizeImage(file, width, height);
        processedFile = new File([resizedBlob], `${iconType}.png`, {
          type: "image/png",
        });
      } catch (error) {
        showToast({
          type: "error",
          title: "Resize Failed",
          message: "Failed to resize image. Using original.",
        });
      }
    }

    const formData = new FormData();
    formData.append("file", processedFile);
    if (iconType) {
      formData.append("iconType", iconType);
    }

    try {
      const action = customUploadAction || uploadAppIcon;
      const result = await action(formData);
      if (result.success && result.data) {
        onUpload(iconType, result.data.url);
        showToast({
          type: "success",
          title: "Upload Successful",
          message: `${label} has been updated.`,
        });
      } else {
        throw new Error(result.error || "An unknown error occurred.");
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Upload Failed",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="jotty-image-upload space-y-2 w-full">
      <Label className="text-md lg:text-sm font-medium">{label}</Label>
      <p className="text-md lg:text-sm lg:text-xs text-muted-foreground">{description}</p>
      <div
        className={`relative border-2 border-dashed rounded-jotty p-4 transition-colors ${
          disabled
            ? "border-muted-foreground/15 bg-muted/30 cursor-not-allowed"
            : dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {currentUrl && !isUploading && (
          <div className="flex items-center gap-3">
            <img
              src={currentUrl}
              alt={`${label} preview`}
              className="w-12 h-12 object-contain rounded border"
            />
            <div className="flex-1 min-w-0">
              <p className="text-md lg:text-sm font-medium truncate">{t("common.currentIcon")}</p>
              <p className="text-md lg:text-sm lg:text-xs text-muted-foreground truncate">
                {currentUrl.split("/").pop()}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onUpload(iconType, "")}
              className="flex-shrink-0 h-8 w-8 p-0"
              disabled={disabled}
            >
              <MultiplicationSignIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
        {!currentUrl && !isUploading && (
          <label
            htmlFor={`upload-${iconType || "avatar"}`}
            className={`text-center block ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
          >
            <Image02Icon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-md lg:text-sm font-medium">{t("common.dropImageOrClick")}</p>
            <p className="text-md lg:text-sm lg:text-xs text-muted-foreground">
              PNG, JPG, WebP up to 5MB
            </p>
          </label>
        )}
        {isUploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-jotty">
            <Logo className="h-6 w-6 animate-pulse" />
            <p className="text-md lg:text-sm mt-2">{t('common.uploading')}</p>
          </div>
        )}
      </div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) =>
          handleFileSelect(e.target.files ? e.target.files[0] : null)
        }
        className="hidden"
        id={`upload-${iconType || "avatar"}`}
        disabled={isUploading || disabled}
      />
    </div>
  );
};
