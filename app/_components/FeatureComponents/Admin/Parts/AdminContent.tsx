"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CheckmarkSquare04Icon,
  File02Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  ShieldUserIcon,
} from "hugeicons-react";
import { Checklist, Note, User as UserType } from "@/app/_types";
import { AdminContentColumn } from "./AdminContentColumn";
import { ExportContent } from "./AdminExport";
import { Accordion } from "@/app/_components/GlobalComponents/Layout/Accordion";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { buildCategoryPath } from "@/app/_utils/global-utils";
import { rebuildLinkIndex } from "@/app/_server/actions/link";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useTranslations } from "next-intl";

interface AdminContentProps {
  allLists: Checklist[];
  allDocs: Note[];
  users: UserType[];
}

export const AdminContent = ({
  allLists,
  allDocs,
  users,
}: AdminContentProps) => {
  const t = useTranslations();
  const [expandedUsers, setExpandedUsers] = useState<Set<string> | null>(null);
  const [rebuildingIndex, setRebuildingIndex] = useState<string | null>(null);

  const sortedUserContent = useMemo(() => {
    const listsByOwner = new Map<string, Checklist[]>();
    allLists.forEach((list) => {
      if (list.owner) {
        const ownerLists = listsByOwner.get(list.owner) || [];
        ownerLists.push(list);
        listsByOwner.set(list.owner, ownerLists);
      }
    });

    const docsByOwner = new Map<string, Note[]>();
    allDocs.forEach((doc) => {
      if (doc.owner) {
        const ownerDocs = docsByOwner.get(doc.owner) || [];
        ownerDocs.push(doc);
        docsByOwner.set(doc.owner, ownerDocs);
      }
    });

    return users
      .map((user) => {
        const checklists = listsByOwner.get(user.username) || [];
        const notes = docsByOwner.get(user.username) || [];
        return {
          user,
          checklists,
          notes,
          totalItems: checklists.length + notes.length,
        };
      })
      .sort((a, b) => b.totalItems - a.totalItems);
  }, [users, allLists, allDocs]);

  useEffect(() => {
    if (expandedUsers === null && sortedUserContent.length > 0) {
      setExpandedUsers(
        new Set(sortedUserContent.map((uc) => uc.user.username))
      );
    }
  }, [sortedUserContent, expandedUsers]);

  const toggleUser = (username: string) => {
    setExpandedUsers((prev) => {
      const newExpanded = new Set(prev || []);
      if (newExpanded.has(username)) {
        newExpanded.delete(username);
      } else {
        newExpanded.add(username);
      }
      return newExpanded;
    });
  };

  const toggleAll = () => {
    if (expandedUsers?.size === sortedUserContent.length) {
      setExpandedUsers(new Set());
    } else {
      setExpandedUsers(
        new Set(sortedUserContent.map((uc) => uc.user.username))
      );
    }
  };

  const isAllExpanded = expandedUsers?.size === sortedUserContent.length;

  const handleRebuildIndex = async (username: string) => {
    setRebuildingIndex(username);
    try {
      await rebuildLinkIndex(username);
      alert(t('admin.successfullyRebuiltIndex', { username }));
    } catch (error) {
      console.error("Failed to rebuild index:", error);
      alert(`${t('admin.failedToRebuildIndex', { username })}`);
    } finally {
      setRebuildingIndex(null);
    }
  };

  return (
    <div className="space-y-6">
      <Accordion title={t('admin.dataExport')} defaultOpen={false} className="mb-6">
        <ExportContent users={users} />
      </Accordion>

      <div className="md:flex items-center justify-between">
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <span className="text-sm text-muted-foreground">
            {t('admin.totalItems', { items: allLists.length + allDocs.length, userCount: users.length })}
          </span>
          <button
            onClick={toggleAll}
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            {isAllExpanded ? t('common.collapseAll') : t('common.expandAll')}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {sortedUserContent.map(({ user, checklists, notes, totalItems }) => {
          const isExpanded = expandedUsers?.has(user.username) ?? false;
          const hasContent = totalItems > 0;

          return (
            <div
              key={user.username}
              className="p-6 rounded-jotty border border-border bg-card"
            >
              <div
                className="lg:flex items-center justify-between cursor-pointer"
                onClick={() => toggleUser(user.username)}
              >
                <div className="mb-2 lg:mb-0 flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
                    <UserAvatar
                      size="lg"
                      username={user.username}
                      avatarUrl={user.avatarUrl}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">
                        {user.username}
                      </h3>
                      {user.isAdmin && (
                        <ShieldUserIcon className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.userContent', { checklistsLength: checklists.length, notesLength: notes.length })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRebuildIndex(user.username);
                    }}
                    disabled={rebuildingIndex === user.username}
                    title={t('admin.rebuildLinkIndexesTitle')}
                  >
                    {rebuildingIndex === user.username
                      ? t('admin.rebuilding')
                      : t('admin.rebuildIndexes')}
                  </Button>
                  {hasContent && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                      {t('common.itemCount', { count: totalItems })}
                    </span>
                  )}
                  {isExpanded ? (
                    <ArrowDown01Icon className="h-5 w-5" />
                  ) : (
                    <ArrowRight01Icon className="h-5 w-5" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-border">
                  {hasContent ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <AdminContentColumn
                        title={t('checklists.title')}
                        icon={<CheckmarkSquare04Icon className="h-4 w-4" />}
                        items={checklists.map((list) => ({
                          ...list,
                          link: `/admin/checklist/${list.uuid}`,
                          details: `${list.owner} • ${list.category} • ${t('common.itemCount', { count: list.items.length })}`,
                        }))}
                      />
                      <AdminContentColumn
                        title={t('notes.title')}
                        icon={<File02Icon className="h-4 w-4" />}
                        items={notes.map((doc) => ({
                          ...doc,
                          link: `/admin/note/${doc.uuid}`,
                          details: `${doc.owner} • ${doc.category} • ${t('common.characterCount', { count: doc.content.length })}`,
                        }))}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <File02Icon className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {t('admin.noContentYet')}
                      </h3>
                      <p className="text-muted-foreground">
                        {t('admin.userHasNoContent')}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
