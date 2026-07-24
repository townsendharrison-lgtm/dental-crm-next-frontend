"use client";

import React from "react";
import type { MessageLinkPreview } from "@/lib/types";
import { linkifyText } from "@/lib/messages/linkify";

interface MessageBubbleBodyProps {
  text?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  linkPreview?: MessageLinkPreview | null;
  isMe: boolean;
}

export function MessageBubbleBody({
  text,
  attachmentUrl,
  attachmentName,
  linkPreview,
  isMe,
}: MessageBubbleBodyProps) {
  const hasText = Boolean(text?.trim());
  const preview = linkPreview?.url ? linkPreview : null;

  return (
    <div className="space-y-2">
      {attachmentUrl && (
        <a
          href={attachmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-xl -mx-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachmentUrl}
            alt={attachmentName || "Attachment"}
            className="max-h-64 w-full object-cover bg-black/20"
          />
        </a>
      )}

      {hasText && (
        <div className="whitespace-pre-wrap break-words">{linkifyText(text!, isMe)}</div>
      )}

      {preview && (
        <a
          href={preview.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`block overflow-hidden rounded-xl border text-left transition-colors ${
            isMe
              ? "border-indigo-400/40 bg-indigo-950/40 hover:bg-indigo-950/70"
              : "border-slate-700 bg-slate-900/80 hover:bg-slate-900"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {preview.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.image}
              alt=""
              className="h-28 w-full object-cover bg-slate-950"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <div className="px-3 py-2 space-y-0.5">
            <p
              className={`text-[10px] uppercase tracking-wide truncate ${
                isMe ? "text-indigo-200/70" : "text-slate-500"
              }`}
            >
              {preview.siteName || (() => {
                try {
                  return new URL(preview.url).hostname;
                } catch {
                  return "Link";
                }
              })()}
            </p>
            {preview.title && (
              <p className={`text-sm font-semibold line-clamp-2 ${isMe ? "text-white" : "text-slate-100"}`}>
                {preview.title}
              </p>
            )}
            {preview.description && (
              <p className={`text-xs line-clamp-2 ${isMe ? "text-indigo-100/80" : "text-slate-400"}`}>
                {preview.description}
              </p>
            )}
          </div>
        </a>
      )}
    </div>
  );
}

export function conversationPreviewText(msg: {
  text?: string | null;
  attachment_url?: string | null;
} | null | undefined): string {
  if (!msg) return "No messages yet";
  if (msg.text?.trim()) return msg.text;
  if (msg.attachment_url) return "Sent an image";
  return "No messages yet";
}
