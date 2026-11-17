import { useTranslations } from "next-intl";
import { Globe02Icon } from "hugeicons-react";
import { SharingPermissions } from "@/app/_types";
import { ChipSpec, PermissionChips } from "./PermissionChips";
import { ShareSection } from "./ShareSection";
import { ShareeRow } from "./ShareeRow";

interface InheritedPerson {
  username: string;
  avatarUrl?: string;
  permissions: SharingPermissions;
}

interface InheritedSectionProps {
  id: string;
  category: string;
  isPublic: boolean;
  people: InheritedPerson[];
  chips: ChipSpec[];
}

export const InheritedSection = ({
  id,
  category,
  isPublic,
  people,
  chips,
}: InheritedSectionProps) => {
  const t = useTranslations();

  return (
    <ShareSection
      id={id}
      title={t("sharing.sharedThrough", { category })}
      aside={people.length > 0 ? people.length : undefined}
    >
      <p className="px-6 pb-2 text-sm lg:text-xs text-muted-foreground">
        {t("sharing.manageOnParent", { category })}
      </p>
      {people.map(({ username, avatarUrl, permissions }) => (
        <ShareeRow
          key={username}
          username={username}
          avatarUrl={avatarUrl}
          controls={
            <PermissionChips
              chips={chips}
              permissions={permissions}
              disabled
            />
          }
        />
      ))}
      {isPublic && (
        <p className="flex items-center gap-1.5 px-6 py-2 text-md lg:text-sm text-muted-foreground">
          <Globe02Icon className="h-4 w-4 shrink-0" />
          {t("sharing.publicThrough", { category })}
        </p>
      )}
    </ShareSection>
  );
};
