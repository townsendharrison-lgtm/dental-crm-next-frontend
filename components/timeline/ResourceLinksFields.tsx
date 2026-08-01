"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import type { TimelineResourceLink } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";

interface ResourceLinksFieldsProps {
  links: TimelineResourceLink[];
  onChange: (links: TimelineResourceLink[]) => void;
}

export function ResourceLinksFields({ links, onChange }: ResourceLinksFieldsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Resource links</p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => onChange([...links, { label: "", url: "" }])}
        >
          Add link
        </Button>
      </div>
      {links.length === 0 ? (
        <p className="text-xs text-slate-500">Optional links mentors can open from the card.</p>
      ) : (
        links.map((link, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
            <Input
              placeholder="Label"
              value={link.label}
              onChange={(e) => {
                const next = [...links];
                next[index] = { ...next[index], label: e.target.value };
                onChange(next);
              }}
            />
            <Input
              placeholder="https://…"
              value={link.url}
              onChange={(e) => {
                const next = [...links];
                next[index] = { ...next[index], url: e.target.value };
                onChange(next);
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => onChange(links.filter((_, i) => i !== index))}
              aria-label="Remove link"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))
      )}
    </div>
  );
}

export function resourceLinksSummary(links?: TimelineResourceLink[] | null) {
  const count = (links || []).filter((r) => r.url?.trim()).length;
  if (count === 0) return null;
  return count === 1 ? "1 resource link" : `${count} resource links`;
}
