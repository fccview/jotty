"use client";

import { cn } from "@/app/_utils/global-utils";
import { DynamicLogo } from "@/app/_components/GlobalComponents/Layout/Logo/DynamicLogo";
import { AppName } from "@/app/_components/GlobalComponents/Layout/AppName";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useResizing } from "@/app/_hooks/useResizing";
import { ReactNode, Ref } from "react";

interface SidebarWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string | ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  navigation?: ReactNode;
  headerActions?: ReactNode;
  scrollRef?: Ref<HTMLDivElement>;
}

export const SidebarWrapper = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  navigation,
  headerActions,
  scrollRef,
}: SidebarWrapperProps) => {
  const { isDemoMode, isRwMarkable } = useAppMode();
  const { sidebarWidth, isResizing, startResizing } = useResizing();

  return (
    <>
      <div
        className={cn(
          "jotty-sidebar-overlay fixed inset-0 z-40 bg-black/50 lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      <aside
        style={
          {
            "--sidebar-desktop-width": `${sidebarWidth}px`,
            transition: isResizing ? "none" : undefined,
          } as React.CSSProperties
        }
        className={cn(
          "jotty-sidebar rounded-tr-[0.25em] rounded-br-[0.25em] fixed left-0 top-0 z-50 h-full bg-background border-r border-border flex flex-col lg:static",
          "transition-transform duration-300 ease-in-out",
          "w-[88vw]",
          "lg:w-[var(--sidebar-desktop-width)] lg:min-w-[var(--sidebar-desktop-width)] lg:max-w-[var(--sidebar-desktop-width)]",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "flex-none"
        )}
      >
        <div
          className="jotty-sidebar-resize-handle absolute top-0 right-0 w-2 h-full cursor-ew-resize hidden lg:block hover:bg-primary/10"
          onMouseDown={startResizing}
        />

        <div className="jotty-sidebar-content flex flex-col h-full">
          <div className="jotty-sidebar-header p-4 lg:p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <a href="/" className="flex items-center gap-3">
                <DynamicLogo className="h-10 w-10 lg:h-8 lg:w-8" size="32x32" />
                <div className="flex items-center gap-2">
                  <AppName
                    className="text-2xl lg:text-xl font-bold text-foreground jotty-app-name"
                    fallback={isRwMarkable ? "rwMarkable" : "jotty·page"}
                  />
                  {isDemoMode && (
                    <span className="text-md lg:text-sm text-muted-foreground font-medium">
                      (demo)
                    </span>
                  )}
                </div>
              </a>
            </div>
          </div>
          {navigation}
          <div ref={scrollRef} className="jotty-sidebar-categories flex-1 overflow-y-auto hide-scrollbar p-2 space-y-4">
            <div className="px-2 pt-2">
              <div className="flex items-center justify-between">
                {typeof title === 'string' ? (
                  <h3 className="jotty-sidebar-categories-title text-sm lg:text-xs font-bold uppercase text-muted-foreground tracking-wider">
                    {title}
                  </h3>
                ) : (
                  title
                )}
                {headerActions}
              </div>
            </div>

            {children}
          </div>

          {footer}
        </div>
      </aside>
    </>
  );
};
