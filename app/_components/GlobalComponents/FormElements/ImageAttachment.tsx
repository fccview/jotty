"use client";

import { Download01Icon, ViewIcon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import Image from "next/image";

interface ImageAttachmentProps {
  url: string;
  fileName: string;
  className?: string;
}

export const ImageAttachment = ({
  url,
  fileName,
  className = "",
}: ImageAttachmentProps) => {
  const displayName = fileName.replace(/ \(\d+\)/, "").replace(/\.\w+$/, "");

  return (
    <span
      className={`jotty-image-attachment inline-block max-w-full ${className}`}
    >
      <span className="jotty-image-attachment-container relative group block">
        <span className="jotty-image-attachment-content max-w-sm rounded-jotty overflow-hidden border border-border bg-card block">
          <Image
            src={url}
            alt={displayName}
            width={400}
            height={300}
            className="jotty-image-attachment-image w-full h-auto object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
          />
          <span className="jotty-image-attachment-actions absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <span className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.open(url, "_blank")}
                className="bg-white/90 hover:bg-white text-black"
              >
                <ViewIcon className="h-4 w-4 mr-1" />
                View
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = fileName;
                  link.click();
                }}
                className="bg-white/90 hover:bg-white text-black"
              >
                <Download01Icon className="h-4 w-4 mr-1" />
                Download
              </Button>
            </span>
          </span>
        </span>
      </span>
    </span>
  );
};
