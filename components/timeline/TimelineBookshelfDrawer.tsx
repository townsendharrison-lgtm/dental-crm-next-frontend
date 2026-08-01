"use client";

import React, { useMemo, useState } from "react";
import { BookOpen, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type {
  TimelineBookshelfItem,
  TimelineCardColors,
  TimelineCardType,
  TimelineResourceLink,
} from "@/lib/types";
import { DEFAULT_TIMELINE_CARD_COLORS } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, FormField } from "@/components/ui/Form";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { MonthPicker } from "@/components/ui/MonthPicker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import {
  useTimelineBookshelf,
  useCreateBookshelfItem,
  useUpdateBookshelfItem,
  useDeleteBookshelfItem,
} from "@/lib/hooks/useTimelineBookshelf";
import {
  ResourceLinksFields,
  resourceLinksSummary,
} from "@/components/timeline/ResourceLinksFields";

const TYPE_OPTIONS: { value: TimelineCardType; label: string }[] = [
  { value: "Meeting", label: "Meeting" },
  { value: "Milestone", label: "Milestone" },
  { value: "Task", label: "Task" },
  { value: "Other", label: "Other" },
];

const emptyForm = () => ({
  title: "",
  cardType: "Milestone" as TimelineCardType,
  description: "",
  resourceLinks: [] as TimelineResourceLink[],
});

export interface TimelineBookshelfDrawerProps {
  open: boolean;
  onClose: () => void;
  /** When inserting into a student timeline */
  onPick?: (item: TimelineBookshelfItem) => void;
  /** Allow managing personal presets (mentor) */
  allowPersonalManage?: boolean;
  /** Allow managing global presets (admin UI uses separate page; keep false here) */
  pickMode?: boolean;
  cardColors?: TimelineCardColors;
  /** YYYY-MM target for insert */
  targetMonth?: string | null;
  onTargetMonthChange?: (month: string | null) => void;
  /** Optional constrained month list for insert target */
  monthOptions?: Array<{ value: string; label: string }>;
}

export function TimelineBookshelfDrawer({
  open,
  onClose,
  onPick,
  allowPersonalManage = true,
  pickMode = true,
  cardColors = DEFAULT_TIMELINE_CARD_COLORS,
  targetMonth,
  onTargetMonthChange,
  monthOptions,
}: TimelineBookshelfDrawerProps) {
  const { data } = useTimelineBookshelf(open);
  const createItem = useCreateBookshelfItem();
  const updateItem = useUpdateBookshelfItem();
  const deleteItem = useDeleteBookshelfItem();
  const [tab, setTab] = useState<"platform" | "mine">("platform");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const items = data?.items || [];
  const colors = data?.cardColors || cardColors;
  const globalItems = useMemo(() => items.filter((i) => i.scope === "GLOBAL"), [items]);
  const mineItems = useMemo(() => items.filter((i) => i.scope === "MENTOR"), [items]);
  const saving = createItem.isPending || updateItem.isPending;

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
    setFormOpen(false);
  };

  const startCreate = () => {
    if (formOpen && !editingId) {
      resetForm();
      return;
    }
    setForm(emptyForm());
    setEditingId(null);
    setFormOpen(true);
    setTab("mine");
  };

  const startEdit = (item: TimelineBookshelfItem) => {
    setForm({
      title: item.title || "",
      cardType: item.cardType || "Milestone",
      description: item.description || "",
      resourceLinks: [...(item.resourceLinks || [])],
    });
    setEditingId(item.id);
    setFormOpen(true);
    setTab("mine");
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const payload = {
      title: form.title.trim(),
      cardType: form.cardType,
      description: form.description,
      resourceLinks: form.resourceLinks.filter((r) => r.url.trim()),
    };
    try {
      if (editingId) {
        await updateItem.mutateAsync({ id: editingId, updates: payload });
        toast.success("Preset updated");
      } else {
        await createItem.mutateAsync({ ...payload, scope: "MENTOR" });
        toast.success("Added to your bookshelf");
      }
      resetForm();
      setTab("mine");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save preset");
    }
  };

  const renderList = (list: TimelineBookshelfItem[], canManage: boolean) => {
    if (list.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-10 text-center">
          <p className="text-sm text-slate-500">No presets yet.</p>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {list.map((item) => {
          const color = colors[item.cardType] || DEFAULT_TIMELINE_CARD_COLORS.Milestone;
          const isEditing = editingId === item.id;
          return (
            <div
              key={item.id}
              className={`relative overflow-hidden rounded-xl border bg-slate-950/70 p-3.5 transition-colors hover:border-slate-700 ${
                isEditing ? "border-indigo-500/40" : "border-slate-800"
              }`}
            >
              <div
                className="absolute inset-y-0 left-0 w-[3px]"
                style={{ backgroundColor: color }}
              />
              <div className="flex items-start justify-between gap-3 pl-2.5">
                <div className="min-w-0">
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.12em]"
                    style={{ color }}
                  >
                    {item.cardType}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-white">{item.title}</p>
                  {item.description ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">
                      {item.description}
                    </p>
                  ) : null}
                  {resourceLinksSummary(item.resourceLinks) ? (
                    <p className="mt-1 text-[11px] font-medium text-indigo-400/80">
                      {resourceLinksSummary(item.resourceLinks)}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {pickMode && onPick && (
                    <Button size="sm" onClick={() => onPick(item)}>
                      Add
                    </Button>
                  )}
                  {canManage && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Edit preset"
                        onClick={() => startEdit(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Delete preset"
                        onClick={async () => {
                          if (!window.confirm("Delete this preset?")) return;
                          try {
                            await deleteItem.mutateAsync(item.id);
                            if (editingId === item.id) resetForm();
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
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Preset Bookshelf"
      description="Add common meetings, milestones, tasks, and resources in one click."
      size="lg"
    >
      <div className="space-y-4">
        {pickMode && onTargetMonthChange ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <FormField label="Insert into" className="sm:w-56 sm:shrink-0">
                {monthOptions && monthOptions.length > 0 ? (
                  <SelectMenu
                    value={targetMonth || monthOptions[0]?.value || ""}
                    onChange={(v) => onTargetMonthChange(v || null)}
                    options={monthOptions}
                    placeholder="Select month"
                  />
                ) : (
                  <MonthPicker
                    value={targetMonth || ""}
                    onChange={(v) => onTargetMonthChange(v || null)}
                    placeholder="Select month"
                    allowClear={false}
                  />
                )}
              </FormField>
              <p className="pb-2 text-xs leading-relaxed text-slate-500 sm:flex-1">
                Presets are added to this month on the student roadmap.
              </p>
            </div>
          </div>
        ) : null}

        <Tabs
          defaultValue="platform"
          value={tab}
          onValueChange={(v) => setTab(v as "platform" | "mine")}
        >
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="platform" className="flex-1 justify-center text-center">
              Platform presets
            </TabsTrigger>
            <TabsTrigger value="mine" className="flex-1 justify-center text-center">
              My presets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="platform">{renderList(globalItems, false)}</TabsContent>

          <TabsContent value="mine" className="space-y-3">
            {allowPersonalManage && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500">Your personal reusable cards</p>
                <Button
                  size="sm"
                  variant={formOpen && !editingId ? "ghost" : "secondary"}
                  leftIcon={
                    formOpen && !editingId ? (
                      <X className="h-3.5 w-3.5" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )
                  }
                  onClick={startCreate}
                >
                  {formOpen && !editingId ? "Cancel" : "New preset"}
                </Button>
              </div>
            )}

            {allowPersonalManage && formOpen && (
              <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {editingId ? "Edit preset" : "New preset"}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[140px_1fr]">
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
                      placeholder="e.g. DAT strategy call"
                    />
                  </FormField>
                </div>
                <FormField label="Description">
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="min-h-[72px] resize-none"
                    placeholder="Optional notes or talking points…"
                  />
                </FormField>
                <ResourceLinksFields
                  links={form.resourceLinks}
                  onChange={(resourceLinks) => setForm({ ...form, resourceLinks })}
                />
                <div className="flex justify-end gap-2">
                  {editingId ? (
                    <Button size="sm" variant="ghost" onClick={resetForm} disabled={saving}>
                      Cancel
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    onClick={() => void handleSave()}
                    isLoading={saving}
                    leftIcon={<BookOpen className="h-3.5 w-3.5" />}
                  >
                    {editingId ? "Update preset" : "Save preset"}
                  </Button>
                </div>
              </div>
            )}

            {renderList(mineItems, allowPersonalManage)}
          </TabsContent>
        </Tabs>
      </div>
    </Modal>
  );
}
