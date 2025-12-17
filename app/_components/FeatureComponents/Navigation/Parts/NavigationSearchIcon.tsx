import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { cn } from "@/app/_utils/global-utils";
import { Search01Icon, MultiplicationSignIcon } from "hugeicons-react";
import { SearchBar } from "../../Search/SearchBar";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { AppMode } from "@/app/_types";
import { useNavigationGuard } from "@/app/_providers/NavigationGuardProvider";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";

interface NavigationSearchIconProps {
  onModeChange?: (mode: AppMode) => void;
}

export const NavigationSearchIcon = ({
  onModeChange,
}: NavigationSearchIconProps) => {
  const { checkNavigation } = useNavigationGuard();
  const { mode } = useAppMode();
  const { isSearchOpen, toggleSearch, closeSearch } = useShortcut();

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 flex items-start justify-center bg-background/80 pt-[25vh] backdrop-blur-sm px-4 lg:hidden",
          isSearchOpen ? "flex" : "hidden"
        )}
        onClick={closeSearch}
      >
        <SearchBar
          mode={mode}
          className="w-full max-w-md"
          autoFocus={isSearchOpen}
          onResultSelect={closeSearch}
          onModeChange={
            onModeChange
              ? (mode) => checkNavigation(() => onModeChange(mode))
              : undefined
          }
        />
      </div>

      <div
        className={cn(
          "hidden lg:w-[30vw] lg:px-4",
          isSearchOpen ? "lg:flex" : "hidden"
        )}
      >
        <SearchBar
          mode={mode}
          className="w-full"
          autoFocus={isSearchOpen}
          onResultSelect={closeSearch}
          onModeChange={
            onModeChange
              ? (mode) => checkNavigation(() => onModeChange(mode))
              : undefined
          }
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSearch}
        className="text-muted-foreground hover:text-foreground"
      >
        {isSearchOpen ? (
          <MultiplicationSignIcon className="h-5 w-5" />
        ) : (
          <Search01Icon className="h-5 w-5" />
        )}
      </Button>
    </>
  );
};
