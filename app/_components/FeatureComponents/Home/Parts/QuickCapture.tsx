"use client";

import { FormEvent, useState } from "react";
import { Add01Icon, QuillWrite01Icon } from "hugeicons-react";
import { useRandomLine } from "@/app/_hooks/useRandomLine";

interface QuickCaptureProps {
  promptsKey: string;
  buttonLabel: string;
  onCapture: (title: string) => void;
}

export const QuickCapture = ({ promptsKey, buttonLabel, onCapture }: QuickCaptureProps) => {
  const placeholder = useRandomLine(promptsKey);
  const [title, setTitle] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onCapture(title.trim());
    setTitle("");
  };

  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 max-w-2xl">
      <label className="sm:flex-1 min-w-0 flex items-center gap-3 h-12 px-4 rounded-jotty bg-primary-foreground/[0.15] focus-within:bg-primary-foreground/25 transition-colors cursor-text">
        <QuillWrite01Icon className="h-5 w-5 shrink-0" />
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={placeholder}
          aria-label={buttonLabel}
          className="flex-1 min-w-0 bg-transparent outline-none text-primary-foreground placeholder:text-primary-foreground/70"
        />
      </label>
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-jotty bg-primary-foreground text-primary text-sm font-semibold hover:bg-primary-foreground/90 transition-colors"
      >
        <Add01Icon className="h-4 w-4" />
        {buttonLabel}
      </button>
    </form>
  );
};
