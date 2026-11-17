"use client";

import { Fragment } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkSquare04Icon, File02Icon } from "@hugeicons/core-free-icons";
import { ItemTypes } from "@/app/_types/enums";
import type { PublicLinks } from "@/app/_types/relations";
import { cn, publicHref } from "@/app/_utils/global-utils";
import { MENU_DIVIDER_CLASS, MENU_ITEM_CLASS } from "@/app/_consts/styling";
import { PanelKicker } from "@/app/_components/FeatureComponents/Notes/Parts/NotePanel/PanelKicker";

const _iconOf = (type: ItemTypes) => (type === ItemTypes.NOTE ? File02Icon : CheckmarkSquare04Icon);

export const PublicLinkList = ({ links }: { links: PublicLinks }) => {
  const t = useTranslations();
  const sections = [
    { label: t("notes.referencedBy"), items: links.backlinks },
    { label: t("brain.linksTo"), items: links.links },
  ].filter(({ items }) => items.length > 0);

  return (
    <div className="flex flex-col gap-0.5">
      {sections.map(({ label, items }, index) => (
        <Fragment key={label}>
          {index > 0 && <div className={MENU_DIVIDER_CLASS} />}
          <PanelKicker label={label} count={items.length} />
          {items.map((item) => (
            <Link
              key={`${item.type}-${item.uuid}`}
              href={publicHref(item.type, item.uuid)}
              className={cn(MENU_ITEM_CLASS, "items-start")}
            >
              <HugeiconsIcon icon={_iconOf(item.type)} className="mt-0.5 h-4 w-4 flex-none text-primary" />
              <span className="min-w-0 flex-1 truncate">{item.title}</span>
            </Link>
          ))}
        </Fragment>
      ))}
    </div>
  );
};
