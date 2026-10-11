"use client";

import type { ReactNode } from "react";

export enum NoticeTone {
  Loading = "loading",
  Error = "error",
}

interface DiagramNoticeProps {
  tone: NoticeTone;
  message: string;
  action?: ReactNode;
}

export const DiagramNotice = ({ tone, message, action }: DiagramNoticeProps) => (
  <div
    role={tone === NoticeTone.Error ? "alert" : "status"}
    className="flex h-full min-h-[8rem] flex-col items-center justify-center gap-3 p-6 text-center"
  >
    <p className={tone === NoticeTone.Error ? "text-destructive" : "text-muted-foreground animate-pulse"}>
      {message}
    </p>
    {action}
  </div>
);
