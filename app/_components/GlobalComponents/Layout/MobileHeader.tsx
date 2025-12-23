import { UserDropdown } from "../../FeatureComponents/Navigation/Parts/UserDropdown";
import { AppName } from "./AppName";
import { DynamicLogo } from "./Logo/DynamicLogo";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { User } from "@/app/_types";
import { logout } from "@/app/_server/actions/auth";
import { useRouter } from "next/navigation";
import { Logout01Icon } from "hugeicons-react";
import { Button } from "../Buttons/Button";

interface MobileHeaderProps {
    user: User | null;
    onOpenSettings: () => void;
}

export const MobileHeader = ({ user, onOpenSettings }: MobileHeaderProps) => {
    const { isRwMarkable } = useAppMode();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push("/auth/login");
    };

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

            {user ? (
                <UserDropdown
                    username={user.username}
                    avatarUrl={user.avatarUrl}
                    isAdmin={user.isAdmin}
                    onOpenSettings={onOpenSettings}
                />
            ) : (
                <Button
                    variant="destructive"
                    size="icon"
                    onClick={handleLogout}
                    className="lg:hidden jotty-mobile-navigation-icon"
                >
                    <Logout01Icon className="h-5 w-5" />
                </Button>
            )}
        </div>
    );
};