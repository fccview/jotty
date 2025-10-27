import { BarChart3, CheckSquare, Clock } from "lucide-react";
import { ChecklistProgress } from "../../Checklists/Parts/Simple/ChecklistProgress";
import { Checklist, User } from "@/app/_types";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { useTranslations } from "next-intl";

interface PublicChecklistHeaderProps {
  checklist: Checklist;
  totalCount: number;
  user: User | null;
  avatarUrl: string;
}

export const PublicChecklistHeader = ({
  checklist,
  totalCount,
  user,
  avatarUrl,
}: PublicChecklistHeaderProps) => {
  const t = useTranslations();

  return (
    <header className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        {checklist.type === "task" ? (
          <BarChart3 className="h-8 w-8 text-primary" />
        ) : (
          <CheckSquare className="h-8 w-8 text-primary" />
        )}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {checklist.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
            <div className="flex items-center gap-1">
              <UserAvatar size="sm" username={user?.username || ""} avatarUrl={avatarUrl} />
              <span>{t("public.by", { username: user?.username || "" })}</span>
            </div>
            {checklist.category && <span>• {checklist.category}</span>}
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>
                {t("public.updated", { date: new Date(checklist.updatedAt).toLocaleDateString() })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {totalCount > 0 && <ChecklistProgress checklist={checklist} />}
    </header>
  );
};
