"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CheckSquare,
  FileText,
  ChevronDown,
  ChevronRight,
  Shield,
} from "lucide-react";
import { Checklist, Note, User as UserType } from "@/app/_types";
import { AdminContentColumn } from "./AdminContentColumn";
import { ExportContent } from "./AdminExport";
import { Accordion } from "@/app/_components/GlobalComponents/Layout/Accordion";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { Modes } from "@/app/_types/enums";
import { buildCategoryPath } from "@/app/_utils/global-utils";

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
  const [expandedUsers, setExpandedUsers] = useState<Set<string> | null>(null);

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

  return (
    <div className="space-y-6">
      <Accordion title="Data Export" defaultOpen={false} className="mb-6">
        <ExportContent users={users} />
      </Accordion>

      <div className="md:flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">All Content</h2>
          <p className="text-muted-foreground">
            Content organized by user with sharing status
          </p>
        </div>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <span className="text-sm text-muted-foreground">
            {allLists.length + allDocs.length} total items across {users.length}{" "}
            users
          </span>
          <button
            onClick={toggleAll}
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            {isAllExpanded ? "Collapse All" : "Expand All"}
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
              className="p-6 rounded-lg border border-border bg-card"
            >
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleUser(user.username)}
              >
                <div className="flex items-center gap-3">
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
                        <Shield className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {checklists.length} checklists • {notes.length} notes
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasContent && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                      {totalItems} items
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-border">
                  {hasContent ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <AdminContentColumn
                        title="Checklists"
                        icon={<CheckSquare className="h-4 w-4" />}
                        items={checklists.map((list) => ({
                          ...list,
                          link: `/checklist/${buildCategoryPath(
                            list.category || "Uncategorized",
                            list.id
                          )}`,
                          details: `${list.category} • ${list.items.length} items`,
                        }))}
                      />
                      <AdminContentColumn
                        title="Notes"
                        icon={<FileText className="h-4 w-4" />}
                        items={notes.map((doc) => ({
                          ...doc,
                          link: `/note/${buildCategoryPath(
                            doc.category || "Uncategorized",
                            doc.id
                          )}`,
                          details: `${doc.category} • ${doc.content.length} characters`,
                        }))}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No content yet
                      </h3>
                      <p className="text-muted-foreground">
                        This user hasn&apos;t created any checklists or notes.
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
