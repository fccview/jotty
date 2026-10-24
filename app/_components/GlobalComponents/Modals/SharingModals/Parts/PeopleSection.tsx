import { useTranslations } from "next-intl";
import { Search01Icon, UserAdd01Icon, UserMinus02Icon } from "hugeicons-react";
import { PublicUserInfo, SharingPermissions } from "@/app/_types";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { ChipSpec, Permission, PermissionChips } from "./PermissionChips";
import { ShareSection } from "./ShareSection";
import { ShareeRow } from "./ShareeRow";

type Person = Pick<PublicUserInfo, "username" | "avatarUrl">;

interface PeopleSectionProps {
  sharees: Person[];
  candidates: Person[];
  chips: ChipSpec[];
  permissionsOf: (username: string) => SharingPermissions;
  onPermission: (username: string, key: Permission, value: boolean) => void;
  onShare: (username: string) => void;
  onUnshare: (username: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isLoading: boolean;
  isLocked?: boolean;
}

export const PeopleSection = ({
  sharees,
  candidates,
  chips,
  permissionsOf,
  onPermission,
  onShare,
  onUnshare,
  searchQuery,
  setSearchQuery,
  isLoading,
  isLocked,
}: PeopleSectionProps) => {
  const t = useTranslations();

  return (
    <>
      <ShareSection
        id="share-section-people"
        title={t("sharing.sharedWith")}
        aside={sharees.length > 0 ? sharees.length : undefined}
      >
        {sharees.length > 0 ? (
          sharees.map(({ username, avatarUrl }) => (
            <ShareeRow
              key={username}
              username={username}
              avatarUrl={avatarUrl}
              action={
                !isLocked && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onUnshare(username)}
                    disabled={isLoading}
                    aria-label={t("sharing.removeAccess")}
                    title={t("sharing.removeAccess")}
                    className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <UserMinus02Icon className="h-4 w-4" />
                  </Button>
                )
              }
              controls={
                <PermissionChips
                  chips={chips}
                  permissions={permissionsOf(username)}
                  onChange={(key, value) => onPermission(username, key, value)}
                  disabled={isLoading || isLocked}
                />
              }
            />
          ))
        ) : (
          <p className="px-6 pb-2 text-md lg:text-sm text-muted-foreground">
            {t("sharing.noOneYet")}
          </p>
        )}
      </ShareSection>

      {!isLocked && (
        <ShareSection id="share-section-add" title={t("sharing.addPeople")}>
          <div className="px-6 pb-2">
            <div className="relative">
              <Search01Icon className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="searchUsers"
                name="searchUsers"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("sharing.searchUsers")}
                className="pl-10"
              />
            </div>
          </div>
          {candidates.length > 0 ? (
            candidates.map(({ username, avatarUrl }) => (
              <ShareeRow
                key={username}
                username={username}
                avatarUrl={avatarUrl}
                action={
                  <Button
                    variant="soft"
                    size="xs"
                    onClick={() => onShare(username)}
                    disabled={isLoading}
                    className="gap-1.5 px-2.5"
                  >
                    <UserAdd01Icon className="h-3.5 w-3.5" />
                    {t("sharing.share")}
                  </Button>
                }
              />
            ))
          ) : (
            <p className="px-6 py-2 text-md lg:text-sm text-muted-foreground">
              {t("common.noUsersFound")}
            </p>
          )}
        </ShareSection>
      )}
    </>
  );
};
