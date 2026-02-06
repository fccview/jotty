import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../users";

const EXCLUDED_PATHS = ["/auth", "/migration", "/public"];

export const redirectGuards = async () => {
  const user = await getCurrentUser();
  const pathname = (await headers()).get("x-pathname");

  if (!user && !EXCLUDED_PATHS.some((path) => pathname?.includes(path))) {
    redirect("/auth/login");
  }

  if (user && pathname?.includes("/auth")) {
    redirect("/");
  }
};
