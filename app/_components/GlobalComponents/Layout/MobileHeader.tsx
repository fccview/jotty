import { NavigationLogoutIcon } from "../../FeatureComponents/Navigation/Parts/NavigationLogoutIcon";
import { AppName } from "./AppName";
import { DynamicLogo } from "./Logo/DynamicLogo";
import { useAppMode } from "@/app/_providers/AppModeProvider";

export const MobileHeader = () => {
    const { isRwMarkable } = useAppMode();

    return (
        <div className="lg:hidden flex items-center justify-between w-full py-3 border-b border-border px-4">
            <a href="/" className="flex items-center gap-3 w-full justify-between">
                <div className="flex items-center gap-3">
                    <DynamicLogo className="h-8 w-8" size="32x32" />
                    <div className="flex items-center gap-2">
                        <AppName
                            className="text-xl font-bold text-foreground"
                            fallback={isRwMarkable ? "rwMarkable" : "jotty·page"}
                        />
                    </div>
                </div>
            </a>

            <NavigationLogoutIcon />
        </div>
    );
};