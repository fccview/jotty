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

export const WikiLink = ({ target = "", label }: WikiLinkProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { notes, checklists, user } = useAppMode();
  const { wikis } = useRelations();
  const metadata = useOptionalMetadata();
  const [isCreating, setIsCreating] = useState(false);

  const match = useMemo(() => {
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

  if (!user) return <span>{label || target}</span>;

  if (match) {
    return (
      <InternalLinkComponent
        node={{
          attrs: {
            href: itemHref(match.type, match.uuid!),
            title: label || target,
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
    <button
      type="button"
      onClick={createFromGhost}
      disabled={isCreating}
      title={t("relations.createFromWikilink", { title: target })}
      className="inline-flex items-center gap-1.5 mx-1 px-2 py-0.5 border border-dashed border-muted-foreground/50 text-muted-foreground rounded-jotty hover:border-primary hover:text-primary transition-colors"
    >
      <FileAddIcon className="h-4 w-4" />
      <span className="text-md lg:text-sm">{label || target}</span>
    </button>
  );
};
