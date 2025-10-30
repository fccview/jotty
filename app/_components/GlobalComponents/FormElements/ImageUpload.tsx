import { useToast } from "@/app/_providers/ToastProvider";
import { FC, useState } from "react";
import { Label } from "@/app/_components/GlobalComponents/FormElements/label";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { X, Image as ImageIcon, Loader2 } from "lucide-react";
import { uploadAppIcon } from "@/app/_server/actions/config";

interface AppSettings {
  appName: string;
  appDescription: string;
  "16x16Icon": string;
  "32x32Icon": string;
  "180x180Icon": string;
}

interface ImageUploadProps {
  label: string;
  description: string;
  iconType?: keyof AppSettings;
  currentUrl: string;
  onUpload: (iconType: keyof AppSettings | undefined, url: string) => void;
  customUploadAction?: (
    formData: FormData
  ) => Promise<{ success: boolean; data?: { url: string }; error?: string }>;
}

export const ImageUpload: FC<ImageUploadProps> = ({
  label,
  description,
  iconType,
  currentUrl,
  onUpload,
  customUploadAction,
}) => {
  const { showToast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = async (file: File | null) => {
    if (!file) return;

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
    const formData = new FormData();
    formData.append("file", file);
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="jotty-image-upload space-y-2 w-full">
      <Label className="text-sm font-medium">{label}</Label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div
        className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
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
              <p className="text-sm font-medium truncate">Current icon</p>
              <p className="text-xs text-muted-foreground truncate">
                {currentUrl.split("/").pop()}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onUpload(iconType, "")}
              className="flex-shrink-0 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {!currentUrl && !isUploading && (
          <label
            htmlFor={`upload-${iconType || "avatar"}`}
            className="text-center cursor-pointer block"
          >
            <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Drop image or click to upload</p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WebP up to 5MB
            </p>
          </label>
        )}
        {isUploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm mt-2">Uploading...</p>
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
        disabled={isUploading}
      />
    </div>
  );
};
