import { ComponentType } from "react";
import { useTranslations } from "next-intl";
import {
  Delete03Icon,
  FolderAddIcon,
  PencilEdit02Icon,
} from "hugeicons-react";
import { SharingPermissions } from "@/app/_types";
import { cn } from "@/app/_utils/global-utils";

export type Permission = keyof SharingPermissions;

export interface ChipSpec {
  key: Permission;
  icon: ComponentType<{ className?: string }>;
  labelKey: string;
  hintKey?: string;
  isDanger?: boolean;
}

const EDIT_CHIP: ChipSpec = { key: "canEdit", icon: PencilEdit02Icon, labelKey: "common.edit" };
const DELETE_CHIP: ChipSpec = {
  key: "canDelete",
  icon: Delete03Icon,
  labelKey: "common.delete",
  isDanger: true,
};
const CREATE_CHIP: ChipSpec = {
  key: "canCreate",
  icon: FolderAddIcon,
  labelKey: "common.create",
  hintKey: "sharing.createHint",
};

export const ITEM_CHIPS = [EDIT_CHIP, DELETE_CHIP];
export const FOLDER_CHIPS = [CREATE_CHIP, EDIT_CHIP, DELETE_CHIP];

interface PermissionChipsProps {
  chips: ChipSpec[];
  permissions: SharingPermissions;
  onChange: (key: Permission, value: boolean) => void;
  disabled?: boolean;
}

export const PermissionChips = ({
  chips,
  permissions,
  onChange,
  disabled,
}: PermissionChipsProps) => {
  const t = useTranslations();

  return (
    <div className="jotty-permission-chips flex shrink-0 items-center gap-1 rounded-jotty border border-border p-1">
      {chips.map(({ key, icon: Icon, labelKey, hintKey, isDanger }) => {
        const isOn = permissions[key] === true;
        const label = hintKey ? `${t(labelKey)}: ${t(hintKey)}` : t(labelKey);

        return (
          <button
            key={key}
            type="button"
            aria-pressed={isOn}
            aria-label={t(labelKey)}
            title={label}
            disabled={disabled}
            onClick={() => onChange(key, !isOn)}
            className={cn(
              "jotty-permission-chip flex h-7 w-7 items-center justify-center rounded-jotty transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
              !isOn && "text-muted-foreground/60 hover:bg-muted/60 hover:text-foreground",
              isOn && !isDanger && "bg-primary/10 text-primary",
              isOn && isDanger && "bg-destructive/10 text-destructive",
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
};
