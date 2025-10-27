"use client";

import { Download, Eye } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import Image from "next/image";
import { useTranslations } from "next-intl";

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
  const t = useTranslations();
  const displayName = fileName.replace(/ \(\d+\)/, "").replace(/\.\w+$/, "");

  return (
    <span className={`inline-block max-w-full ${className}`}>
      <span className="relative group block">
        <span className="max-w-sm rounded-lg overflow-hidden border border-border bg-card block">
          <Image
            src={url}
            alt={displayName}
            width={400}
            height={300}
            className="w-full h-auto object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
          />
          <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <span className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.open(url, "_blank")}
                className="bg-white/90 hover:bg-white text-black"
              >
                <Eye className="h-4 w-4 mr-1" />
                {t("upload.view")}
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
                <Download className="h-4 w-4 mr-1" />
                {t("upload.download")}
              </Button>
            </span>
          </span>
        </span>
      </span>
    </span>
  );
};
