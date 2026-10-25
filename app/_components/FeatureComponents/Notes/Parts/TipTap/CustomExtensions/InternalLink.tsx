import type { NodeConfig } from "@tiptap/core";
import { ReactNodeViewProps, ReactNodeViewRenderer } from "@tiptap/react";
import { InternalLinkComponent } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/InternalLinkComponent";
import { ComponentType } from "react";

export const INTERNAL_LINK_VIEW: Partial<NodeConfig> = {
  addNodeView() {
    return ReactNodeViewRenderer(
      InternalLinkComponent as unknown as ComponentType<ReactNodeViewProps<HTMLElement>>,
    );
  },
};
