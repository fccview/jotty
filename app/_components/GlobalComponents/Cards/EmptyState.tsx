import { ComponentType, ReactNode } from "react";
import { Add01Icon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";

export enum EmptyActions {
  CREATE = "create",
  CLEAR = "clear",
}

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  illustration?: ReactNode;
  title: string;
  description: string;
  buttonText: string;
  onButtonClick: () => void;
  action?: EmptyActions;
}

export const EmptyState = ({
  icon: Icon,
  illustration,
  title,
  description,
  buttonText,
  onButtonClick,
  action = EmptyActions.CREATE,
}: EmptyStateProps) => {
  if (action === EmptyActions.CLEAR) {
    return (
      <div className="rounded-jotty border border-dashed border-border px-6 py-14 text-center">
        {Icon && <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />}
        <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
        <div className="mt-5 flex justify-center">
          <Button variant="outline" size="sm" onClick={onButtonClick}>
            {buttonText}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="jotty-empty-state h-full flex flex-col items-center justify-center p-4 py-16 text-center">
      {illustration ? (
        <div className="mb-8">{illustration}</div>
      ) : (
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          {Icon && <Icon className="h-10 w-10 text-muted-foreground" />}
        </div>
      )}
      <h3
        className={
          illustration
            ? "text-2xl font-bold text-foreground mb-2"
            : "text-xl font-semibold text-foreground mb-2"
        }
      >
        {title}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
      <Button
        onClick={(e) => {
          e.preventDefault();
          onButtonClick();
        }}
        size="lg"
      >
        <Add01Icon className="h-5 w-5 mr-2" />
        {buttonText}
      </Button>
    </div>
  );
};
