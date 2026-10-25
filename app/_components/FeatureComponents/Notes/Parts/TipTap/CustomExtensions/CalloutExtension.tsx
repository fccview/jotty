"use client";

import type { NodeConfig } from "@tiptap/core";
import {
  NodeViewWrapper,
  NodeViewContent,
  ReactNodeViewRenderer,
  ReactNodeViewProps,
} from "@tiptap/react";
import { FC } from "react";
import {
  Idea01Icon,
  AlertDiamondIcon,
  Tick02Icon,
  AlertCircleIcon,
} from "hugeicons-react";
import { useTranslations } from "next-intl";
import { DropdownMenu } from "@/app/_components/GlobalComponents/Dropdowns/DropdownMenu";
import { CalloutType } from "@/app/_consts/callouts";
import { MENU_ITEM_ACTIVE_CLASS } from "@/app/_consts/styling";
import { DEFAULT_CALLOUT } from "@/app/_utils/markdown/schema/callout";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (type?: CalloutType) => ReturnType;
    };
  }
}

const CalloutIcons: Record<CalloutType, typeof Idea01Icon> = {
  info: Idea01Icon,
  warning: AlertDiamondIcon,
  success: Tick02Icon,
  danger: AlertCircleIcon,
};

const CalloutNodeView: FC<ReactNodeViewProps> = ({
  node,
  updateAttributes,
}) => {
  const t = useTranslations();
  const calloutType: CalloutType = node.attrs.type || DEFAULT_CALLOUT;
  const IconComponent = CalloutIcons[calloutType];

  const dropdownItems = (Object.keys(CalloutIcons) as CalloutType[]).map(
    (type) => {
      const TypeIcon = CalloutIcons[type];
      return {
        label: t(`editor.callout${type.charAt(0).toUpperCase() + type.slice(1)}`),
        icon: <TypeIcon className={`h-4 w-4 callout-icon-${type}`} />,
        onClick: () => updateAttributes({ type }),
        className: type === calloutType ? MENU_ITEM_ACTIVE_CLASS : "",
      };
    }
  );

  return (
    <NodeViewWrapper
      className={`callout callout-${calloutType}`}
      data-type="callout"
      data-callout-type={calloutType}
    >
      <div className="callout-wrapper">
        <div className="flex-none select-none">
          <DropdownMenu
            trigger={
              <div
                className={`callout-icon callout-icon-button callout-icon-${calloutType}`}
                title={t("editor.changeCalloutType")}
              >
                <IconComponent />
              </div>
            }
            items={dropdownItems}
            align="left"
          />
        </div>
        <NodeViewContent className="callout-content" />
      </div>
    </NodeViewWrapper>
  );
};

export const CALLOUT_VIEW: Partial<NodeConfig> = {
  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeView);
  },

  addCommands() {
    return {
      setCallout:
        (type: CalloutType = DEFAULT_CALLOUT) =>
          ({ commands }) =>
            commands.insertContent({
              type: this.name,
              attrs: { type },
              content: [{ type: "paragraph" }],
            }),
    };
  },

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { selection } = editor.state;
        const { $from, empty } = selection;

        if (!empty) return false;

        if ($from.parentOffset === 0 && $from.depth >= 2) {
          const calloutDepth = $from.depth - 1;
          const calloutNode = $from.node(calloutDepth);

          if (calloutNode?.type.name === "callout") {
            const indexInCallout = $from.index(calloutDepth);
            if (indexInCallout === 0) {
              return editor.commands.lift("callout");
            }
          }
        }

        return false;
      },
      Enter: ({ editor }) => {
        const { selection } = editor.state;
        const { $from, empty } = selection;

        if (!empty) return false;

        for (let depth = $from.depth; depth > 0; depth--) {
          const node = $from.node(depth);
          if (node.type.name === "callout") {
            const parent = $from.parent;
            const isEmptyParagraph =
              parent.type.name === "paragraph" && parent.content.size === 0;
            const calloutNode = $from.node(depth);
            const indexInCallout = $from.index(depth);
            const isLastChild = indexInCallout === calloutNode.childCount - 1;

            if (isEmptyParagraph && isLastChild) {
              const pos = $from.after(depth);
              return editor
                .chain()
                .deleteNode("paragraph")
                .insertContentAt(pos, { type: "paragraph" })
                .focus()
                .run();
            }
            break;
          }
        }

        return false;
      },
    };
  },
};
