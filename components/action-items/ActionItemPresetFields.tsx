"use client";

import { FormField, Input, Textarea, SelectMenu, ResourcePicker } from "@/components/ui";
import type { ActionItemPriority } from "@/lib/types";

export interface ActionItemPresetDraft {
  title: string;
  description: string;
  priority: ActionItemPriority;
  resourceLink: string;
}

export const ACTION_ITEM_PRIORITY_OPTIONS: { value: ActionItemPriority; label: string }[] = [
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

export function emptyActionItemPreset(): ActionItemPresetDraft {
  return { title: "", description: "", priority: "MEDIUM", resourceLink: "" };
}

export function ActionItemPresetFields({
  draft,
  onChange,
  idPrefix,
}: {
  draft: ActionItemPresetDraft;
  onChange: (next: ActionItemPresetDraft) => void;
  idPrefix: string;
}) {
  return (
    <div className="space-y-3">
      <FormField label="Title" htmlFor={`${idPrefix}-title`} required>
        <Input
          id={`${idPrefix}-title`}
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          placeholder="e.g. Finish Casper practice"
        />
      </FormField>
      <FormField label="Details" htmlFor={`${idPrefix}-details`} hint="Optional">
        <Textarea
          id={`${idPrefix}-details`}
          value={draft.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
          placeholder="Steps or notes that should come along with this task"
          className="min-h-[72px]"
        />
      </FormField>
      <FormField label="Priority" htmlFor={`${idPrefix}-priority`}>
        <SelectMenu
          value={draft.priority}
          onChange={(value) => onChange({ ...draft, priority: value as ActionItemPriority })}
          options={ACTION_ITEM_PRIORITY_OPTIONS}
          className="w-full"
        />
      </FormField>
      <FormField label="Resource link" htmlFor={`${idPrefix}-link`} hint="Optional">
        <div className="flex items-center gap-2">
          <Input
            id={`${idPrefix}-link`}
            type="url"
            value={draft.resourceLink}
            onChange={(e) => onChange({ ...draft, resourceLink: e.target.value })}
            placeholder="https://..."
            className="min-w-0 flex-1"
          />
          <ResourcePicker
            value={draft.resourceLink}
            onPick={(link) => onChange({ ...draft, resourceLink: link })}
          />
        </div>
      </FormField>
    </div>
  );
}
