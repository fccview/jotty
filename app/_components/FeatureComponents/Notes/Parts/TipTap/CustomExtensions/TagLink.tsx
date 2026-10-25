import type { NodeConfig } from "@tiptap/core";
import { ReactNodeViewProps, ReactNodeViewRenderer } from "@tiptap/react";
import { TagLinkComponent } from "@/app/_components/FeatureComponents/Tags/TagLinkComponent";
import { ComponentType } from "react";

export const TAG_LINK_VIEW: Partial<NodeConfig> = {
  addNodeView() {
    return ReactNodeViewRenderer(
      TagLinkComponent as unknown as ComponentType<ReactNodeViewProps<HTMLElement>>,
    );
  },
};
