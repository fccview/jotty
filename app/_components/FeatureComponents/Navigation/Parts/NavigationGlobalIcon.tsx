import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";

interface NavigationGlobalIconProps {
  onClick: () => void;
  icon: React.ReactNode;
}

export const NavigationGlobalIcon = ({
  onClick,
  icon,
}: NavigationGlobalIconProps) => {
  return (
    <Button
      variant="ghost"
      className="jotty-mobile-navigation-icon"
      size="icon"
      onClick={() => onClick()}
    >
      {icon}
    </Button>
  );
};
