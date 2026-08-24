"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Comment } from "@/app/_types";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import {
  getComments,
  addComment,
  editComment,
  deleteComment,
} from "@/app/_server/actions/comments";
import { useWebSocket } from "@/app/_providers/WebSocketProvider";
import { usePreferredDateTime } from "@/app/_hooks/usePreferredDateTime";
import { useTranslations } from "next-intl";
import {
  Comment02Icon,
  Edit02Icon,
  Delete02Icon,
  MailReply02Icon,
  FloppyDiskIcon,
  MultiplicationSignIcon,
  SentIcon,
} from "hugeicons-react";
import { MentionTextarea, MentionUser } from "./MentionTextarea";
import { MentionText } from "./MentionText";

interface KanbanCardDetailCommentsProps {
  uuid: string;
  itemId: string;
  canEdit: boolean;
  currentUsername: string;
  availableUsers: { username: string; avatarUrl?: string }[];
}

const MAX_DEPTH = 4;

interface CommentThreadProps {
  comment: Comment;
  allComments: Comment[];
  depth: number;
  canEdit: boolean;
  currentUsername: string;
  availableUsers: MentionUser[];
  onReply: (parentId: string) => void;
  onEdit: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
  replyToId: string | null;
  editingId: string | null;
  onReplySubmit: (text: string) => void;
  onEditSubmit: (commentId: string, text: string) => void;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  formatDateTimeString: (d: string) => string;
  submitting: boolean;
}

const CommentThread: React.FC<CommentThreadProps> = ({
  comment,
  allComments,
  depth,
  canEdit,
  currentUsername,
  availableUsers,
  onReply,
  onEdit,
  onDelete,
  replyToId,
  editingId,
  onReplySubmit,
  onEditSubmit,
  onCancelReply,
  onCancelEdit,
  formatDateTimeString,
  submitting,
}) => {
  const t = useTranslations();
  const [replyText, setReplyText] = useState("");
  const [editText, setEditText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmDeleteRef = useRef<HTMLDivElement>(null);

  const isReplying = replyToId === comment.id;
  const isEditing = editingId === comment.id;
  const canModify = canEdit && comment.author === currentUsername;
  const replies = allComments
    .filter((c) => c.parentId === comment.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  useEffect(() => {
    if (isEditing) setEditText(comment.text);
  }, [isEditing, comment.text]);

  useEffect(() => {
    if (confirmDelete && confirmDeleteRef.current) {
      confirmDeleteRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [confirmDelete]);

  const _submitReply = () => {
    if (!replyText.trim()) return;
    onReplySubmit(replyText.trim());
    setReplyText("");
  };

  const _submitEdit = () => {
    if (!editText.trim()) return;
    onEditSubmit(comment.id, editText.trim());
    setEditText("");
  };

  return (
    <div className="space-y-2">
      <div
        className="group relative flex gap-2"
        style={{ marginLeft: 0 }}
      >
        <UserAvatar username={comment.author} size="sm" className="mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">{comment.author}</span>
            <span className="text-xs text-muted-foreground">
              {formatDateTimeString(comment.createdAt)}
            </span>
            {comment.updatedAt && (
              <span className="text-xs text-muted-foreground/50 italic">
                ({t("comments.edited")})
              </span>
            )}
          </div>

          {isEditing ? (
            <div className="mt-1 space-y-2">
              <MentionTextarea
                value={editText}
                onChange={setEditText}
                wrapperClassName="w-full"
                className="px-2 py-1.5 text-sm bg-background border border-input rounded-jotty focus:outline-none focus:border-ring transition-all min-h-[60px] resize-y"
                placeholder={t("comments.edit")}
                autoFocus
                users={availableUsers}
                excludeUsername={currentUsername}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); _submitEdit(); }
                  else if (e.key === "Escape") { e.preventDefault(); onCancelEdit(); }
                }}
              />
              <div className="flex justify-end gap-1.5">
                <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                  <MultiplicationSignIcon className="h-3.5 w-3.5 mr-1" />
                  {t("comments.cancel")}
                </Button>
                <Button size="sm" onClick={_submitEdit} disabled={!editText.trim()}>
                  <FloppyDiskIcon className="h-3.5 w-3.5 mr-1" />
                  {t("comments.save")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-0.5 text-sm text-card-foreground prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap break-words">
              <MentionText text={comment.text} />
            </div>
          )}

          {!isEditing && canEdit && (
            <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
              {depth < MAX_DEPTH && (
                <button
                  onClick={() => onReply(comment.id)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-accent"
                >
                  <MailReply02Icon className="h-3 w-3" />
                  {t("comments.reply")}
                </button>
              )}
              {canModify && (
                <>
                  <button
                    onClick={() => onEdit(comment)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-accent"
                  >
                    <Edit02Icon className="h-3 w-3" />
                    {t("comments.edit")}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-accent"
                  >
                    <Delete02Icon className="h-3 w-3" />
                    {t("comments.delete")}
                  </button>
                </>
              )}
            </div>
          )}

          {confirmDelete && (
            <div
              ref={confirmDeleteRef}
              className="mt-2 p-2 bg-destructive/5 border border-destructive/20 rounded-jotty text-sm space-y-2"
            >
              <p className="text-foreground">{t("comments.deleteConfirmMessage")}</p>
              <div className="flex justify-end gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  {t("comments.cancel")}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => { onDelete(comment.id); setConfirmDelete(false); }}
                >
                  {t("comments.delete")}
                </Button>
              </div>
            </div>
          )}

          {isReplying && (
            <div className="mt-2 space-y-2 border-l-2 border-border pl-4 ml-2">
              <div className="flex gap-2">
                <UserAvatar username={currentUsername} size="sm" className="mt-0.5" />
                <div className="flex-1">
                  <MentionTextarea
                    value={replyText}
                    onChange={setReplyText}
                    wrapperClassName="w-full"
                    className="px-2 py-1.5 text-sm bg-background border border-input rounded-jotty focus:outline-none focus:border-ring transition-all min-h-[50px] resize-y"
                    placeholder={t("comments.replyPlaceholder")}
                    autoFocus
                    users={availableUsers}
                    excludeUsername={currentUsername}
                    disabled={submitting}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); _submitReply(); }
                      else if (e.key === "Escape") { e.preventDefault(); onCancelReply(); }
                    }}
                  />
                  <div className="flex justify-end gap-1.5 mt-1">
                    <Button size="sm" variant="ghost" onClick={onCancelReply}>
                      <MultiplicationSignIcon className="h-3.5 w-3.5 mr-1" />
                      {t("comments.cancel")}
                    </Button>
                    <Button size="sm" onClick={_submitReply} disabled={!replyText.trim() || submitting}>
                      <SentIcon className="h-3.5 w-3.5 mr-1" />
                      {t("comments.post")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {replies.length > 0 && (
        <div className="border-l-2 border-border pl-4 ml-2 space-y-2">
          {replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              allComments={allComments}
              depth={depth + 1}
              canEdit={canEdit}
              currentUsername={currentUsername}
              availableUsers={availableUsers}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              replyToId={replyToId}
              editingId={editingId}
              onReplySubmit={onReplySubmit}
              onEditSubmit={onEditSubmit}
              onCancelReply={onCancelReply}
              onCancelEdit={onCancelEdit}
              formatDateTimeString={formatDateTimeString}
              submitting={submitting}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const KanbanCardDetailComments: React.FC<KanbanCardDetailCommentsProps> = ({
  uuid,
  itemId,
  canEdit,
  currentUsername,
  availableUsers,
}) => {
  const t = useTranslations();
  const { formatDateTimeString } = usePreferredDateTime();
  const { subscribe } = useWebSocket();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const loadingRef = useRef(false);

  const _loadComments = useCallback(async () => {
    loadingRef.current = true;
    try {
      const result = await getComments(uuid, itemId);
      if (result.success) {
        setComments(result.data || []);
        setError(null);
      } else {
        setError(result.error || t("comments.failedToLoad"));
      }
    } catch {
      setError(t("comments.failedToLoad"));
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [uuid, itemId, t]);

  useEffect(() => {
    _loadComments();
  }, [_loadComments]);

  useEffect(() => {
    if (!uuid) return;
    const unsubscribe = subscribe((event) => {
      if (
        event.type === "checklist" &&
        event.action === "updated" &&
        event.entityId === uuid &&
        !loadingRef.current
      ) {
        _loadComments();
      }
    });
    return unsubscribe;
  }, [subscribe, uuid, _loadComments]);

  const _buildFormData = (fields: Record<string, string>): FormData => {
    const fd = new FormData();
    fd.append("uuid", uuid);
    fd.append("itemId", itemId);
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
    return fd;
  };

  const _handleAdd = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await addComment(_buildFormData({ text: newComment.trim() }));
      if (result.success && result.data) {
        setComments((prev) => [...prev, result.data!]);
        setNewComment("");
      } else {
        setError(result.error || t("comments.failedToAdd"));
      }
    } catch {
      setError(t("comments.failedToAdd"));
    } finally {
      setSubmitting(false);
    }
  };

  const _handleReply = (parentId: string) => setReplyToId(parentId);
  const _handleCancelReply = () => setReplyToId(null);

  const _handleReplySubmit = async (text: string) => {
    if (!replyToId || !text.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await addComment(
        _buildFormData({ text: text.trim(), parentId: replyToId }),
      );
      if (result.success && result.data) {
        setComments((prev) => [...prev, result.data!]);
        setReplyToId(null);
      } else {
        setError(result.error || t("comments.failedToAdd"));
      }
    } catch {
      setError(t("comments.failedToAdd"));
    } finally {
      setSubmitting(false);
    }
  };

  const _handleEdit = (comment: Comment) => setEditingId(comment.id);
  const _handleCancelEdit = () => setEditingId(null);

  const _handleEditSubmit = async (commentId: string, text: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await editComment(_buildFormData({ commentId, text }));
      if (result.success && result.data) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, ...result.data! } : c)),
        );
        setEditingId(null);
      } else {
        setError(result.error || t("comments.failedToEdit"));
      }
    } catch {
      setError(t("comments.failedToEdit"));
    } finally {
      setSubmitting(false);
    }
  };

  const _handleDelete = async (commentId: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await deleteComment(_buildFormData({ commentId }));
      if (result.success) {
        const removeIds = new Set<string>([commentId]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const c of comments) {
            if (c.parentId && removeIds.has(c.parentId) && !removeIds.has(c.id)) {
              removeIds.add(c.id);
              changed = true;
            }
          }
        }
        setComments((prev) => prev.filter((c) => !removeIds.has(c.id)));
      } else {
        setError(result.error || t("comments.failedToDelete"));
      }
    } catch {
      setError(t("comments.failedToDelete"));
    } finally {
      setSubmitting(false);
    }
  };

  const topLevelComments = comments
    .filter((c) => !c.parentId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Comment02Icon className="h-4 w-4" />
          {t("comments.title")}
          {comments.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {comments.length}
            </span>
          )}
        </h4>
      </div>

      {error && (
        <div className="mb-2 p-2 bg-destructive/5 border border-destructive/20 rounded-jotty text-xs text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="py-4 text-center text-sm text-muted-foreground">
          {t("common.loading")}
        </div>
      ) : topLevelComments.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm bg-muted/20 rounded-jotty border border-dashed border-border mb-3">
          {t("comments.noComments")}
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto mb-3 pr-1">
          {topLevelComments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              allComments={comments}
              depth={0}
              canEdit={canEdit}
              currentUsername={currentUsername}
              availableUsers={availableUsers}
              onReply={_handleReply}
              onEdit={_handleEdit}
              onDelete={_handleDelete}
              replyToId={replyToId}
              editingId={editingId}
              onReplySubmit={_handleReplySubmit}
              onEditSubmit={_handleEditSubmit}
              onCancelReply={_handleCancelReply}
              onCancelEdit={_handleCancelEdit}
              formatDateTimeString={formatDateTimeString}
              submitting={submitting}
            />
          ))}
        </div>
      )}

      {canEdit ? (
        <div className="flex gap-2">
          <MentionTextarea
            value={newComment}
            onChange={setNewComment}
            placeholder={t("comments.addComment")}
            wrapperClassName="flex-1"
            className="px-3 py-2 text-sm bg-background border border-input rounded-jotty focus:outline-none focus:border-ring transition-all min-h-[40px] resize-y"
            rows={1}
            disabled={submitting}
            users={availableUsers}
            excludeUsername={currentUsername}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); _handleAdd(); }
            }}
          />
          <Button
            onClick={_handleAdd}
            disabled={!newComment.trim() || submitting}
          >
            <SentIcon className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        !isLoading && comments.length === 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {t("comments.readOnly")}
          </p>
        )
      )}
    </div>
  );
};