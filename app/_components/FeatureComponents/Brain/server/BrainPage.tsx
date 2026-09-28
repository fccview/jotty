import { notFound, redirect } from "next/navigation";
import { getBrain } from "@/app/_server/actions/relations";
import { getCurrentUser } from "@/app/_server/actions/users";
import { getCategories } from "@/app/_server/actions/category";
import { Modes } from "@/app/_types/enums";
import { isUuid } from "@/app/_consts/identity";
import { BrainPageClient } from "../BrainPageClient";

interface BrainPageProps {
  username?: string;
  focus?: string;
}

export const BrainPage = async ({ username, focus }: BrainPageProps) => {
  const user = await getCurrentUser();
  if (!user?.username) redirect("/");

  const [brain, categories] = await Promise.all([
    getBrain(username),
    getCategories(Modes.NOTES),
  ]);
  if (!brain.success || !brain.data) notFound();

  return (
    <BrainPageClient
      graph={brain.data}
      focus={focus && isUuid(focus) ? focus.toLowerCase() : null}
      isOwnBrain={brain.data.owner === user.username}
      categories={categories.success ? categories.data || [] : []}
      user={user}
    />
  );
};
