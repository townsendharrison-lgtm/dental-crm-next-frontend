"use client";

import React, { useState } from "react";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { TimelineCardColors, TimelineCardType, TimelineResourceLink } from "@/lib/types";
import { DEFAULT_TIMELINE_CARD_COLORS } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, FormField } from "@/components/ui/Form";
import { SelectMenu } from "@/components/ui/SelectMenu";
import {
  useTimelineBookshelf,
  useCreateBookshelfItem,
  useDeleteBookshelfItem,
} from "@/lib/hooks/useTimelineBookshelf";
import { cn } from "@/lib/utils/cn";

const TYPE_KEYS: TimelineCardType[] = ["Meeting", "Milestone", "Task", "Other"];

const TYPE_OPTIONS: { value: TimelineCardType; label: string }[] = TYPE_KEYS.map((t) => ({
  value: t,
  label: t,
}));

interface AdminTimelineBookshelfPanelProps {
  cardColors: TimelineCardColors;
  onCardColorsChange: (next: TimelineCardColors) => void;
}

export default function AdminTimelineBookshelfPanel({
  cardColors,
  onCardColorsChange,
}: AdminTimelineBookshelfPanelProps) {
  const { data, isLoading } = useTimelineBookshelf(true);
  const createItem = useCreateBookshelfItem();
  const deleteItem = useDeleteBookshelfItem();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    title: "",
    cardType: "Milestone" as TimelineCardType,
    description: "",
    resourceLinks: [] as TimelineResourceLink[],
  });

  const items = (data?.items || []).filter((i) => i.scope === "GLOBAL");
  const colors = { ...DEFAULT_TIMELINE_CARD_COLORS, ...cardColors };

  const resetForm = () => {
    setForm({
      title: "",
      cardType: "Milestone",
      description: "",
      resourceLinks: [],
    });
    setAdding(false);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      await createItem.mutateAsync({
        title: form.title.trim(),
        cardType: form.cardType,
        description: form.description,
        resourceLinks: form.resourceLinks.filter((r) => r.url.trim()),
        scope: "GLOBAL",
      });
      toast.success("Platform preset added");
      resetForm();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save preset");
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/15 text-indigo-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Timeline card colors</h3>
            <p className="text-xs text-slate-500">
              Accent colors for Meeting, Milestone, Task, and Other cards. Saved with Rules Engine.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {TYPE_KEYS.map((key) => (
            <FormField key={key} label={key}>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colors[key]}
                  onChange={(e) =>
                    onCardColorsChange({ ...colors, [key]: e.target.value })
                  }
                  className="h-10 w-12 cursor-pointer rounded border border-slate-700 bg-transparent"
                />
                <Input
                  value={colors[key]}
                  onChange={(e) =>
                    onCardColorsChange({ ...colors, [key]: e.target.value })
                  }
                  placeholder="#6366f1"
                />
              </div>
            </FormField>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/15 text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Platform bookshelf presets</h3>
              <p className="text-xs text-slate-500">
                Global presets mentors can insert into any student timeline.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setAdding((v) => !v)}
          >
            {adding ? "Cancel" : "Add preset"}
          </Button>
        </div>

        {adding && (
          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <FormField label="Type">
              <SelectMenu
                value={form.cardType}
                onChange={(v) => setForm({ ...form, cardType: v as TimelineCardType })}
                options={TYPE_OPTIONS}
              />
            </FormField>
            <FormField label="Title" required>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </FormField>
            <FormField label="Description">
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="min-h-[70px]"
              />
            </FormField>
            <Button
              size="sm"
              onClick={() => void handleCreate()}
              isLoading={createItem.isPending}
            >
              Save platform preset
            </Button>
          </div>
        )}

        {isLoading ? (
          <p className="py-6 text-center text-sm text-slate-500">Loading presets…</p>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No platform presets yet.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const color = colors[item.cardType] || DEFAULT_TIMELINE_CARD_COLORS.Milestone;
              return (
                <div
                  key={item.id}
                  className={cn(
                    "relative rounded-xl border border-slate-800 bg-slate-950/70 p-3.5",
                  )}
                >
                  <div
                    className="absolute inset-y-2.5 left-0 w-1 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex items-start justify-between gap-2 pl-2">
                    <div className="min-w-0">
                      <p
                        className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color }}
                      >
                        {item.cardType}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-white">{item.title}</p>
                      {item.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        if (!window.confirm("Delete this platform preset?")) return;
                        try {
                          await deleteItem.mutateAsync(item.id);
                          toast.success("Preset deleted");
                        } catch (err: unknown) {
                          toast.error(
                            err instanceof Error ? err.message : "Failed to delete",
                          );
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
