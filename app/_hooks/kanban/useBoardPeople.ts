"use client";

import { useCallback, useEffect, useState } from "react";
import { usersWithAccess } from "@/app/_server/actions/share/lookups";
import { getUsers } from "@/app/_server/actions/users";
import { BoardPerson } from "@/app/_types/kanban-assignee";

interface UseBoardPeopleProps {
  uuid: string;
  owner?: string;
  isOpen: boolean;
  canEdit: boolean;
}

export const useBoardPeople = ({ uuid, owner, isOpen, canEdit }: UseBoardPeopleProps) => {
  const [people, setPeople] = useState<BoardPerson[]>([]);
  const [isShared, setIsShared] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [shared, users] = await Promise.all([usersWithAccess(uuid), getUsers()]);
      const access = new Set(shared);
      if (owner) access.add(owner);

      setIsShared(shared.length > 0);
      setPeople(
        users.map(({ username, avatarUrl }) => ({
          username,
          avatarUrl,
          hasAccess: access.has(username),
        })),
      );
    } catch (error) {
      console.error("Failed to load board people:", error);
    }
  }, [uuid, owner]);

  useEffect(() => {
    if (isOpen && canEdit) reload();
  }, [isOpen, canEdit, reload]);

  const mentionable = isShared ? people.filter((person) => person.hasAccess) : people;

  return { people, mentionable, reload };
};
