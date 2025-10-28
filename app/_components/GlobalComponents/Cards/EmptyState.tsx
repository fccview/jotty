import { Plus } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  onButtonClick: () => void;
}

export const EmptyState = ({
  icon,
  title,
  description,
  buttonText,
  onButtonClick,
}: EmptyStateProps) => {
  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md text-center">
        {description}
      </p>
      <Button onClick={(e) => {
        e.preventDefault();
        onButtonClick();
      }} size="lg">
        <Plus className="h-5 w-5 mr-2" />
        {buttonText}
      </Button>
    </div>
  );
};
