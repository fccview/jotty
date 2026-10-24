import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useReturnPathStore } from "@/app/_utils/return-path-store";

const ITEM_ROUTES = ["/note/", "/checklist/", "/admin/note/", "/admin/checklist/"];

export const useTrackReturnPath = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { mode } = useAppMode();
  const setReturnPath = useReturnPathStore((state) => state.setReturnPath);

  useEffect(() => {
    if (!pathname || ITEM_ROUTES.some((route) => pathname.startsWith(route))) {
      return;
    }
    const params = new URLSearchParams(searchParams?.toString());
    if (pathname === "/" && !params.has("mode") && mode) {
      params.set("mode", mode);
    }
    const query = params.toString();
    setReturnPath(query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams, mode, setReturnPath]);
};

export const useReturnPath = (fallback: string) =>
  useReturnPathStore((state) => state.returnPath) || fallback;
