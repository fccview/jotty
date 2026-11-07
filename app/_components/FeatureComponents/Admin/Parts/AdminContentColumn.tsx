"use client";

import { AdminRow } from "@/app/_types";
import { LinkForwardIcon } from "hugeicons-react";
import Link from "next/link";
import { ReactNode, useRef } from "react";
import { useTranslations } from "next-intl";
import { useVirtualizer } from "@tanstack/react-virtual";

const VIRTUAL_FROM = 50;
const ROW_ESTIMATE = 84;
const ROW_OVERSCAN = 6;

interface RowLook {
  linkBase: string;
  sizeText: (size: number) => string;
}

const keyOf = (item: AdminRow) => item.uuid || `${item.category}/${item.id}`;

const AdminContentRow = ({ item, linkBase, sizeText }: RowLook & { item: AdminRow }) => {
  const t = useTranslations();
  return (
    <Link
      href={`${linkBase}/${item.uuid}`}
      className="block p-3 bg-muted/50 rounded-jotty hover:bg-muted/70 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground text-md lg:text-sm truncate">
              {item.title}
            </p>
            <LinkForwardIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          </div>
          <p className="text-md lg:text-xs text-muted-foreground mt-1">
            {`${item.owner} • ${item.category} • ${sizeText(item.size)}`}
          </p>
        </div>
        {item.isShared && (
          <span className="text-md lg:text-xs bg-primary/10 text-primary px-2 py-1 rounded-full ml-2 flex-shrink-0">{t('common.shared')}</span>
        )}
      </div>
    </Link>
  );
};

const AdminContentRows = ({ items, ...look }: RowLook & { items: AdminRow[] }) => {
  const scroller = useRef<HTMLDivElement>(null);
  const virtual = items.length > VIRTUAL_FROM;
  const virtualizer = useVirtualizer({
    count: items.length,
    enabled: virtual,
    getScrollElement: () => scroller.current,
    estimateSize: () => ROW_ESTIMATE,
    getItemKey: (index) => keyOf(items[index]),
    overscan: ROW_OVERSCAN,
  });

  if (!virtual) {
    return (
      <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
        {items.map((item) => (
          <AdminContentRow key={keyOf(item)} item={item} {...look} />
        ))}
      </div>
    );
  }

  return (
    <div ref={scroller} className="max-h-64 overflow-y-auto pr-2">
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((row) => (
          <div
            key={row.key}
            ref={virtualizer.measureElement}
            data-index={row.index}
            className="absolute left-0 top-0 w-full pb-2"
            style={{ transform: `translateY(${row.start}px)` }}
          >
            <AdminContentRow item={items[row.index]} {...look} />
          </div>
        ))}
      </div>
    </div>
  );
};

export const AdminContentColumn = ({
  title,
  icon,
  items,
  ...look
}: RowLook & {
  title: string;
  icon: ReactNode;
  items: AdminRow[];
}) => (
  <div>
    <h4 className="text-md lg:text-sm font-medium text-foreground mb-3 flex items-center gap-2">
      {icon}
      {title} ({items.length})
    </h4>
    {items.length > 0 ? <AdminContentRows items={items} {...look} /> : null}
  </div>
);
