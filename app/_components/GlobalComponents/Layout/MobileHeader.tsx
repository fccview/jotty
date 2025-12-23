import { UserDropdown } from "../../FeatureComponents/Navigation/Parts/UserDropdown";
import { AppName } from "./AppName";
import { DynamicLogo } from "./Logo/DynamicLogo";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { User } from "@/app/_types";

interface MobileHeaderProps {
    user: User | null;
    onOpenSettings: () => void;
}

export const MobileHeader = ({ user, onOpenSettings }: MobileHeaderProps) => {
    const { isRwMarkable } = useAppMode();

    return (
        <div className="lg:hidden flex items-center justify-between w-full py-3 border-b border-border px-4">
            <a href="/" className="flex items-center gap-3">
                <DynamicLogo className="h-8 w-8" size="32x32" />
                <div className="flex items-center gap-2">
                    <AppName
                        className="text-xl font-bold text-foreground jotty-app-name"
                        fallback={isRwMarkable ? "rwMarkable" : "jotty·page"}
                    />
                </div>
            </a>

            {user && (
                <UserDropdown
                    username={user.username}
                    avatarUrl={user.avatarUrl}
                    isAdmin={user.isAdmin}
                    onOpenSettings={onOpenSettings}
                />
            )}
        </div>
    );
};