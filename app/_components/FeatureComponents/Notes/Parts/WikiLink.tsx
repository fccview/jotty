"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileAddIcon } from "hugeicons-react";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useOptionalMetadata } from "@/app/_providers/MetadataProvider";
import { useRelations } from "@/app/_providers/RelationsProvider";
import { createNote } from "@/app/_server/actions/note";
import { itemHref } from "@/app/_utils/global-utils";
import { ItemTypes } from "@/app/_types/enums";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { InternalLinkComponent } from "./TipTap/CustomExtensions/InternalLinkComponent";

interface WikiLinkProps {
  target?: string;
  label?: string;
  showCategory?: boolean;
}

interface Candidate {
  type: ItemTypes;
  uuid?: string;
  title?: string;
  owner?: string;
  createdAt?: string;
}

const titleKey = (title = "") => title.trim().replace(/\s+/g, " ").toLowerCase();

const byAge = (a: Candidate, b: Candidate) =>
  (a.createdAt || "").localeCompare(b.createdAt || "") ||
  (a.uuid || "").localeCompare(b.uuid || "");

export const useWikiMatch = (target: string): Candidate | null => {
  const { notes, checklists, user } = useAppMode();
  const { wikis } = useRelations();

  return useMemo(() => {
    const key = titleKey(target);
    const candidates: Candidate[] = [
      ...notes.map((item) => ({ ...item, type: ItemTypes.NOTE })),
      ...checklists.map((item) => ({ ...item, type: ItemTypes.CHECKLIST })),
    ].filter((item) => item.uuid);

    const bound = wikis[key]?.toLowerCase();
    if (bound) {
      const pinned = candidates.find((item) => item.uuid!.toLowerCase() === bound);
      if (pinned) return pinned;
    }

    return (
      candidates
        .filter((item) => (!item.owner || item.owner === user?.username) && titleKey(item.title) === key)
        .sort(byAge)[0] || null
    );
  }, [notes, checklists, target, wikis, user?.username]);
};

export const WikiLink = ({ target = "", label, showCategory = true }: WikiLinkProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { user } = useAppMode();
  const metadata = useOptionalMetadata();
  const [isCreating, setIsCreating] = useState(false);

  const match = useWikiMatch(target);

  if (!user) return <span>{label || target}</span>;

  if (match) {
    return (
      <InternalLinkComponent
        showCategory={showCategory}
        node={{
          attrs: {
            href: itemHref(match.type, match.uuid!),
            title: target,
            alias: label,
            type: match.type,
            uuid: match.uuid!,
          },
        }}
      />
    );
  }

  const createFromGhost = async () => {
    if (isCreating || !target.trim()) return;
    setIsCreating(true);
    try {
      const formData = new FormData();
      formData.append("title", target.trim());
      formData.append("category", metadata?.category || UNCATEGORIZED);
      formData.append("rawContent", "");
      const result = await createNote(formData);
      if (result.success && result.data?.uuid) {
        router.push(itemHref(ItemTypes.NOTE, result.data.uuid));
        return;
      }
      console.error("Could not create note from wikilink:", result.error);
    } catch (error) {
      console.error("Could not create note from wikilink:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <span
      role="button"
      tabIndex={0}
      aria-disabled={isCreating}
      onClick={createFromGhost}
      onKeyDown={(event) => {
        if (event.key === "Enter") createFromGhost();
      }}
      title={t("relations.createFromWikilink", { title: target })}
      className="inline cursor-pointer text-muted-foreground underline decoration-dashed underline-offset-4 hover:text-primary transition-colors"
    >
      <FileAddIcon className="inline h-[1em] w-[1em] mr-1 align-[-0.125em]" />
      {label || target}
    </span>
  );
};
