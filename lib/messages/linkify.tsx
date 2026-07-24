import React from "react";

const URL_RE = /(https?:\/\/[^\s<>"'`]+)/gi;

function sanitizeHref(raw: string): string | null {
  const cleaned = raw.replace(/[),.;!?]+$/g, "");
  try {
    const u = new URL(cleaned);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Split text into plain spans and clickable http(s) links. */
export function linkifyText(text: string, isOwnMessage = false): React.ReactNode[] {
  if (!text) return [];

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(URL_RE.source, URL_RE.flags);

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const raw = match[0];
    const trailing = raw.match(/[),.;!?]+$/)?.[0] ?? "";
    const core = trailing ? raw.slice(0, -trailing.length) : raw;
    const href = sanitizeHref(core);

    if (href) {
      parts.push(
        <a
          key={`link-${match.index}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={
            isOwnMessage
              ? "underline underline-offset-2 text-indigo-100 hover:text-white break-all"
              : "underline underline-offset-2 text-sky-400 hover:text-sky-300 break-all"
          }
          onClick={(e) => e.stopPropagation()}
        >
          {core}
        </a>,
      );
      if (trailing) parts.push(trailing);
    } else {
      parts.push(raw);
    }

    lastIndex = match.index + raw.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}
