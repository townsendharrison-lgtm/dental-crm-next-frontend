"use client";

import React from "react";

function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    const bold = part.startsWith("**") && part.endsWith("**") && part.length > 4;
    if (!bold) return <React.Fragment key={`${keyPrefix}-${index}`}>{part}</React.Fragment>;
    return (
      <strong key={`${keyPrefix}-${index}`} className="font-semibold text-white">
        {part.slice(2, -2)}
      </strong>
    );
  });
}

/** Renders onboarding copy: **bold** and lines that start with "- " or "* ". */
export function OnboardingRichText({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];

  const flush = () => {
    if (bullets.length === 0) return;
    const items = bullets;
    bullets = [];
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc space-y-1 pl-4">
        {items.map((item, index) => (
          <li key={index}>{renderInline(item, `b-${blocks.length}-${index}`)}</li>
        ))}
      </ul>,
    );
  };

  lines.forEach((line) => {
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      bullets.push(bullet[1]);
      return;
    }
    flush();
    if (!line.trim()) return;
    blocks.push(
      <p key={`p-${blocks.length}`}>{renderInline(line, `p-${blocks.length}`)}</p>,
    );
  });
  flush();

  if (blocks.length === 0) return null;
  return <div className={className || "space-y-1.5 text-sm leading-relaxed text-slate-300"}>{blocks}</div>;
}
