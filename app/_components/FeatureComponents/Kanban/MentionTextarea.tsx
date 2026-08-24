"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/app/_utils/global-utils";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { useTranslations } from "next-intl";

export interface MentionUser {
  username: string;
  avatarUrl?: string;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  rows?: number;
  users: MentionUser[];
  excludeUsername?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export const MentionTextarea = React.forwardRef<
  HTMLTextAreaElement,
  MentionTextareaProps
>(
  (
    {
      value,
      onChange,
      placeholder,
      className,
      wrapperClassName,
      disabled,
      autoFocus,
      rows,
      users,
      excludeUsername,
      onKeyDown,
    },
    forwardedRef,
  ) => {
    const t = useTranslations();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionStart, setMentionStart] = useState(-1);
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      if (typeof forwardedRef === "function") {
        forwardedRef(textareaRef.current);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current =
          textareaRef.current;
      }
    }, [forwardedRef]);

    const excludeSet = new Set<string>();
    if (excludeUsername) excludeSet.add(excludeUsername);

    const filteredUsers = (
      mentionQuery
        ? users.filter((u) =>
            u.username.toLowerCase().includes(mentionQuery.toLowerCase()),
          )
        : users
    ).filter((u) => !excludeSet.has(u.username));

    useEffect(() => {
      setSelectedIndex(0);
    }, [mentionQuery]);

    const _detectMention = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = value.substring(0, cursorPos);

      // Find the last @ that is either at the start or preceded by whitespace
      const match = textBeforeCursor.match(/(?:^|\s)@([\w.-]*)$/);
      if (match) {
        const atSymbolIndex =
          cursorPos - match[0].length + match[0].indexOf("@");
        setShowDropdown(true);
        setMentionQuery(match[1]);
        setMentionStart(atSymbolIndex);
      } else {
        setShowDropdown(false);
        setMentionQuery("");
        setMentionStart(-1);
      }
    }, [value]);

    const _insertMention = (username: string) => {
      const textarea = textareaRef.current;
      if (!textarea || mentionStart < 0) return;
      const cursorPos = textarea.selectionStart;
      const newText =
        value.substring(0, mentionStart) +
        "@" +
        username +
        " " +
        value.substring(cursorPos);
      onChange(newText);
      setShowDropdown(false);
      setMentionQuery("");
      setMentionStart(-1);

      // Move cursor to just after the inserted mention + space
      const newCursorPos = mentionStart + username.length + 2;
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      });
    };

    const _handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showDropdown && filteredUsers.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) =>
            Math.min(filteredUsers.length - 1, prev + 1),
          );
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(0, prev - 1));
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          _insertMention(filteredUsers[selectedIndex].username);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setShowDropdown(false);
          return;
        }
      }
      onKeyDown?.(e);
    };

    const _handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      requestAnimationFrame(_detectMention);
    };

    const _handleSelect = () => {
      if (showDropdown) _detectMention();
    };

    const _handleBlur = () => {
      setTimeout(() => setShowDropdown(false), 150);
    };

    return (
      <div className={cn("relative", wrapperClassName)}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={_handleChange}
          onKeyUp={_detectMention}
          onSelect={_handleSelect}
          onClick={_handleSelect}
          onKeyDown={_handleKeyDown}
          onBlur={_handleBlur}
          placeholder={placeholder}
          className={cn("w-full", className)}
          disabled={disabled}
          autoFocus={autoFocus}
          rows={rows}
        />
        {showDropdown && filteredUsers.length > 0 && (
          <div className="absolute z-50 bottom-full mb-1 left-0 bg-card border border-border rounded-jotty shadow-lg p-1.5 min-w-56 max-h-48 overflow-y-auto">
            {filteredUsers.map((user, index) => (
              <button
                key={user.username}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  _insertMention(user.username);
                }}
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1.5 text-left rounded-jotty text-sm transition-colors",
                  index === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50",
                )}
              >
                <UserAvatar
                  username={user.username}
                  size="xs"
                  className="flex-shrink-0"
                />
                <span className="font-medium truncate">{user.username}</span>
              </button>
            ))}
          </div>
        )}
        {showDropdown && filteredUsers.length === 0 && mentionQuery && (
          <div className="absolute z-50 bottom-full mb-1 left-0 bg-card border border-border rounded-jotty shadow-lg p-3 min-w-56">
            <p className="text-xs text-muted-foreground text-center">
              {t("comments.noUsersFound")}
            </p>
          </div>
        )}
      </div>
    );
  },
);

MentionTextarea.displayName = "MentionTextarea";