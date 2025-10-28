"use client";

import { NodeViewWrapper, ReactNodeViewProps } from "@tiptap/react";
import { FileAttachment } from "@/app/_components/GlobalComponents/FormElements/FileAttachment";
import { ImageAttachment } from "@/app/_components/GlobalComponents/FormElements/ImageAttachment";
import { VideoAttachment } from "@/app/_components/GlobalComponents/FormElements/VideoAttachment";

export const FileAttachmentNode = ({ node }: ReactNodeViewProps) => {
  const { url, fileName, mimeType, type } = node.attrs as {
    url: string;
    fileName: string;
    mimeType: string;
    type: "image" | "file" | "video";
  };

  return (
    <NodeViewWrapper
      className="file-attachment-wrapper"
      data-file-attachment=""
      data-url={url}
      data-file-name={fileName}
      data-mime-type={mimeType}
      data-type={type}
    >
      {type === "image" ? (
        <ImageAttachment url={url} fileName={fileName} className="my-4" />
      ) : type === "video" ? (
        <VideoAttachment
          url={url}
          fileName={fileName}
          mimeType={mimeType}
          className="my-4"
        />
      ) : (
        <FileAttachment
          url={url}
          fileName={fileName}
          mimeType={mimeType}
          className="my-4"
        />
      )}
    </NodeViewWrapper>
  );
};
