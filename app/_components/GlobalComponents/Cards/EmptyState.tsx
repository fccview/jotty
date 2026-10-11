import { ReactNode } from "react";
import { Add01Icon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";

interface EmptyStateProps {
  icon?: ReactNode;
  illustration?: ReactNode;
  title: string;
  description: string;
  buttonText: string;
  onButtonClick: () => void;
}

export const EmptyState = ({
  icon,
  illustration,
  title,
  description,
  buttonText,
  onButtonClick,
}: EmptyStateProps) => {
  return (
    <div className="jotty-empty-state h-full flex flex-col items-center justify-center p-4 py-16 text-center">
      {illustration ? (
        <div className="mb-8">{illustration}</div>
      ) : (
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          {icon}
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
