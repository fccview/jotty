"use client";

import {
  ArrowLeft,
  Trash2,
  Edit3,
  Share2,
  BarChart3,
  CheckSquare,
  Users,
  Globe,
  Hash,
  Check,
} from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Checklist } from "@/app/_types";
import { useChecklist } from "../../../../../_hooks/useChecklist";
import { useSharing } from "@/app/_hooks/useSharing";

interface ChecklistHeaderProps {
  checklist: Checklist;
  onBack: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onConvertType?: () => void;
}

export const ChecklistHeader = ({
  checklist,
  onBack,
  onEdit,
  onDelete,
  onShare,
  onConvertType,
}: ChecklistHeaderProps) => {
  const { handleCopyId, copied } = useChecklist({
    list: checklist,
    onUpdate: () => { },
  });

  const { sharingStatus } = useSharing({
    itemId: checklist.id,
    itemType: "checklist",
    itemOwner: checklist.owner || "",
    onClose: () => { },
    enabled: true,
    itemTitle: checklist.title,
    itemCategory: checklist.category,
    isOpen: true,
  });

  return (
    <div className="bg-background border-b border-border px-3 py-4 lg:px-6 lg:py-[12px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 lg:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-10 w-10 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <ArrowLeft className="h-4 w-4 lg:h-5 lg:w-5" />
          </Button>

          <div className="flex items-center gap-3 max-w-[30vw] lg:max-w-none">
            <h1 className="text-xl font-bold truncate lg:text-2xl text-foreground tracking-tight">
              {checklist.title}
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyId}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              title={`Copy ID: ${checklist.id}`}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Hash className="h-3 w-3" />
              )}
            </Button>
            {sharingStatus?.isPubliclyShared && (
              <Globe className="h-3 w-3 text-primary" />
            )}
            {sharingStatus?.isShared && !sharingStatus.isPubliclyShared && (
              <Users className="h-3 w-3 text-primary" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onConvertType && (
            <Button
              variant="outline"
              size="sm"
              onClick={onConvertType}
              className="h-10 w-10 p-0"
              title={
                checklist.type === "task"
                  ? "Convert to Simple Checklist"
                  : "Convert to Task Project"
              }
            >
              {checklist.type === "task" ? (
                <CheckSquare className="h-4 w-4 lg:h-5 lg:w-5" />
              ) : (
                <BarChart3 className="h-4 w-4 lg:h-5 lg:w-5" />
              )}
            </Button>
          )}
          {onShare && (
            <Button
              variant="outline"
              size="sm"
              onClick={onShare}
              className="h-10 w-10 p-0"
            >
              <Share2 className="h-4 w-4 lg:h-5 lg:w-5" />
            </Button>
          )}
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="h-10 w-10 p-0"
            >
              <Edit3 className="h-4 w-4 lg:h-5 lg:w-5" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="h-10 w-10 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 lg:h-5 lg:w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
