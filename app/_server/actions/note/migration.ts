"use server";

import { redirect } from "next/navigation";
import { isAuthenticated } from "@/app/_server/actions/users";
import { needsMigration } from "@/app/_server/actions/lib/migration-check";

export const CheckForNeedsMigration = async (): Promise<boolean> => {
  const isLoggedIn = await isAuthenticated();

  if (isLoggedIn && (await needsMigration())) {
    redirect("/migration");
  }

  return false;
};
