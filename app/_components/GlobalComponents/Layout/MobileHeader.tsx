import { UserDropdown } from "../../FeatureComponents/Navigation/Parts/UserDropdown";
import { AppName } from "./AppName";
import { DynamicLogo } from "./Logo/DynamicLogo";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { SanitisedUser } from "@/app/_types";
import { logout } from "@/app/_server/actions/auth";
import { useRouter } from "next/navigation";
import { Logout01Icon } from "hugeicons-react";
import { Button } from "../Buttons/Button";
import { useEffect, useRef, useState } from "react";
import { cn, handleScroll } from "@/app/_utils/global-utils";
import { useTranslations } from "next-intl";

interface MobileHeaderProps {
  user: SanitisedUser | null;
  onOpenSettings: () => void;
  currentLocale: string;
}

export const MobileHeader = ({
  user,
  onOpenSettings,
  currentLocale,
}: MobileHeaderProps) => {
  const { isRwMarkable } = useAppMode();
  const [isScrolled, setIsScrolled] = useState(true);
  const [scrollPos, setScrollPos] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const lastScrollY = useRef(0);
  const router = useRouter();
  const t = useTranslations();

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  useEffect(() => {
    const handleGlobalScroll = (e: Event) => {
      handleScroll(e, "jotty-scrollable-content", setIsScrolled, lastScrollY);
      setScrollPos(lastScrollY.current);
    };

    window.addEventListener("scroll", handleGlobalScroll, true);

    return () => {
      window.removeEventListener("scroll", handleGlobalScroll, true);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  const mobileHeaderClasses = cn(
    "w-full z-30 border-transparent border-b border-border -mt-20",
    `lg:hidden flex items-center justify-between w-full py-3 px-4 transition-all duration-300 ease-in-out`,
    scrollPos < 150
      ? "relative bg-background !mt-0 !max-w-[100%] !left-0"
      : "fixed max-w-[80%] mt-5 left-[10%] border rounded-jotty bg-muted",
    isScrolled && scrollPos > 500 ? "mt-5" : scrollPos > 500 && "-mt-20",
  );

  return (
    <div className={mobileHeaderClasses}>
      <a href="/" className="flex items-center gap-3">
        <div className="relative">
          <DynamicLogo className="h-10 w-10" size="32x32" />
          {isOffline && (
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-destructive border-[3px] ${scrollPos < 150 ? "border-background" : "border-muted"}`}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <AppName
            className="text-2xl font-bold text-foreground jotty-app-name"
            fallback={isRwMarkable ? "rwMarkable" : "jotty·page"}
          />
        </div>
      </a>

      {user ? (
        <UserDropdown
          username={user.username}
          avatarUrl={user.avatarUrl}
          onOpenSettings={onOpenSettings}
          currentLocale={currentLocale}
        />
      ) : (
        <Button
          variant="destructive"
          size="icon"
          onClick={handleLogout}
          className="lg:hidden jotty-mobile-navigation-icon"
          aria-label={t("common.logout")}
        >
          <Logout01Icon className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};
