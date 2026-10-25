"use client";

import { useState } from "react";
import { GridIcon, Tick02Icon } from "hugeicons-react";
import { Button } from "./Button";
import { copyTextToClipboard } from "@/app/_utils/global-utils";

const COPIED_MS = 2000;

interface CopyIdButtonProps {
  id: string;
  label: string;
}

export const CopyIdButton = ({ id, label }: CopyIdButtonProps) => {
  const [copied, setCopied] = useState(false);

  const copyId = async () => {
    if (!(await copyTextToClipboard(id))) return;
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_MS);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={copyId}
      className="h-6 w-6 shrink-0 p-0"
      title={label}
      aria-label={label}
    >
      {copied ? <Tick02Icon className="h-3 w-3 text-green-500" /> : <GridIcon className="h-3 w-3" />}
    </Button>
  );
};
