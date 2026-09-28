"use client";

import { Fragment, ReactNode, SyntheticEvent } from "react";
import { WIKILINK_REGEX } from "@/app/_consts/relations";
import { currentOrigins, parseItemHref } from "@/app/_utils/item-href-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { TagLinkViewComponent } from "@/app/_components/FeatureComponents/Tags/TagLinkComponent";
import { InternalLinkComponent } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/InternalLinkComponent";
import { WikiLink } from "@/app/_components/FeatureComponents/Notes/Parts/WikiLink";

interface ChecklistItemTextProps {
  text: string;
  tagsEnabled?: boolean;
  compact?: boolean;
}

const LINK_SOURCE = String.raw`\[((?:[^\[\]\\]|\\.)*)\]\(([^()\s]+)\)`;
const TAG_SOURCE = String.raw`#([a-zA-Z][a-zA-Z0-9_/-]*)`;
const TOKENS = new RegExp(`${LINK_SOURCE}|${WIKILINK_REGEX.source}|${TAG_SOURCE}`, "g");

const _unescape = (label: string) => label.replace(/\\(.)/g, "$1");

const _hush = (event: SyntheticEvent) => event.stopPropagation();

const Inline = ({ children }: { children: ReactNode }) => (
  <span
    className="inline"
    onPointerDown={_hush}
    onMouseDown={_hush}
    onClick={_hush}
  >
    {children}
  </span>
);

export const ChecklistItemText = ({
  text,
  tagsEnabled = false,
  compact = false,
}: ChecklistItemTextProps) => {
  const { appSettings } = useAppMode();
  const linksEnabled = appSettings?.editor?.enableBilateralLinks !== false;
  const parts: ReactNode[] = [];
  let last = 0;

  for (const match of Array.from(text.matchAll(TOKENS))) {
    const at = match.index ?? 0;
    const [whole, label, href, wikiTarget, wikiLabel, tag] = match;
    let piece: ReactNode = null;

    if (href !== undefined && linksEnabled) {
      const target = parseItemHref(href, currentOrigins());
      if (target) {
        piece = (
          <InternalLinkComponent
            showCategory={!compact}
            node={{ attrs: { href, title: _unescape(label || ""), type: target.type, uuid: target.uuid } }}
          />
        );
      }
    } else if (wikiTarget !== undefined && linksEnabled) {
      piece = (
        <WikiLink
          target={wikiTarget.trim()}
          label={wikiLabel?.trim() || undefined}
          showCategory={!compact}
        />
      );
    } else if (tag !== undefined && tagsEnabled) {
      piece = <TagLinkViewComponent tag={tag} />;
    }

    if (!piece) continue;
    if (at > last) parts.push(text.slice(last, at));
    parts.push(
      <Inline key={at}>
        {piece}
      </Inline>,
    );
    last = at + whole.length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return <>{parts.map((part, index) => <Fragment key={index}>{part}</Fragment>)}</>;
};
