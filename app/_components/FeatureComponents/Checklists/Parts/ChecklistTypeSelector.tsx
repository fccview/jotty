"use client";

import { CheckmarkSquare04Icon, TaskDaily01Icon } from "hugeicons-react";
import { useTranslations } from "next-intl";
import { ChecklistType } from "@/app/_types";
import { ChecklistsTypes } from "@/app/_types/enums";

interface ChecklistTypeSelectorProps {
  selectedType: ChecklistType;
  onTypeChange: (type: ChecklistType) => void;
  disabled: boolean;
}

export const ChecklistTypeSelector = ({
  selectedType,
  onTypeChange,
  disabled,
}: ChecklistTypeSelectorProps) => {
  const t = useTranslations();

  return (
    <div>
      <label className="block text-md lg:text-sm font-medium text-foreground mb-2">
        {t("checklists.checklistType")}
      </label>

      <div className="grid grid-cols-2 gap-3">
        {([ChecklistsTypes.SIMPLE, ChecklistsTypes.TASK] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onTypeChange(type)}
            className={`p-4 rounded-jotty border-2 transition-all text-center ${
              selectedType === type
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            disabled={disabled}
          >
            <div className="flex flex-col items-center gap-2">
              {type === ChecklistsTypes.SIMPLE ? (
                <CheckmarkSquare04Icon className="h-6 w-6 text-muted-foreground" />
              ) : (
                <TaskDaily01Icon className="h-6 w-6 text-muted-foreground" />
              )}
              <div className="font-medium text-sm">
                {type === ChecklistsTypes.SIMPLE
                  ? t("checklists.simpleChecklist")
                  : t("checklists.taskProject")}
              </div>
              <div className="text-md lg:text-sm lg:text-xs text-muted-foreground">
                {type === ChecklistsTypes.SIMPLE
                  ? t("checklists.basicTodoItems")
                  : t("checklists.withTimeTracking")}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
