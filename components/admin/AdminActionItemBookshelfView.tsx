"use client";

import { useMemo, useState } from "react";
import { Library, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ActionItemBookshelfItem, ActionItemPriority } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";
import { cn } from "@/lib/utils/cn";
import {
  useActionItemBookshelf,
  useCreateActionItemBookshelfItem,
  useDeleteActionItemBookshelfItem,
  useUpdateActionItemBookshelfItem,
} from "@/lib/hooks/useActionItemBookshelf";
import {
  ActionItemPresetFields,
  emptyActionItemPreset,
  type ActionItemPresetDraft,
} from "@/components/action-items/ActionItemPresetFields";

const PRIORITY_TONE: Record<ActionItemPriority, string> = {
  HIGH: "text-rose-300 bg-rose-500/10",
  MEDIUM: "text-amber-300 bg-amber-500/10",
  LOW: "text-slate-300 bg-slate-500/10",
};

export default function AdminActionItemBookshelfView() {
  const { data: items = [], isLoading, isError, error } = useActionItemBookshelf(true);
  const createItem = useCreateActionItemBookshelfItem();
  const updateItem = useUpdateActionItemBookshelfItem();
  const deleteItem = useDeleteActionItemBookshelfItem();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ActionItemPresetDraft>(emptyActionItemPreset());

  const platform = useMemo(
    () => items.filter((item) => item.scope === "GLOBAL"),
    [items],
  );
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return platform;
    return platform.filter((item) =>
      `${item.title} ${item.description || ""}`.toLowerCase().includes(needle),
    );
  }, [platform, query]);

  const saving = createItem.isPending || updateItem.isPending;

  const resetForm = () => {
    setDraft(emptyActionItemPreset());
    setEditingId(null);
    setFormOpen(false);
  };

  const startCreate = () => {
    setDraft(emptyActionItemPreset());
    setEditingId(null);
    setFormOpen(true);
  };

  const startEdit = (item: ActionItemBookshelfItem) => {
    setDraft({
      title: item.title || "",
      description: item.description || "",
      priority: item.priority || "MEDIUM",
      resourceLink: item.resourceLink || "",
    });
    setEditingId(item.id);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!draft.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      priority: draft.priority,
      resourceLink: draft.resourceLink.trim(),
    };
    try {
      if (editingId) {
        await updateItem.mutateAsync({ id: editingId, updates: payload });
        toast.success("Action item updated");
      } else {
        await createItem.mutateAsync({ ...payload, scope: "GLOBAL" });
        toast.success("Added to the admin list");
      }
      resetForm();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't save that action item");
    }
  };

  const handleDelete = async (item: ActionItemBookshelfItem) => {
    if (!window.confirm(`Delete “${item.title}” from the admin list? Mentors will no longer see it.`)) {
      return;
    }
    try {
      await deleteItem.mutateAsync(item.id);
      if (editingId === item.id) resetForm();
      toast.success("Action item deleted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete that action item");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Library className="h-5 w-5 text-indigo-400" />
            Shared action items
          </h2>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Mentors search this list by title when they give a student an action item. Each mentor
            can also keep a private bookshelf of their own.
          </p>
        </div>
        <Button type="button" leftIcon={<Plus size={16} />} onClick={startCreate}>
          Add action item
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search titles"
          className="pl-9"
        />
      </div>

      {formOpen && (
        <div className="space-y-3 rounded-xl border border-indigo-500/30 bg-slate-900 p-4">
          <p className="text-sm font-semibold text-white">
            {editingId ? "Edit action item" : "New action item"}
          </p>
          <ActionItemPresetFields draft={draft} onChange={setDraft} idPrefix="admin-shelf" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} isLoading={saving}>
              {editingId ? "Save changes" : "Add to list"}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="py-10 text-center text-sm text-slate-500">Loading action items…</p>
      ) : isError ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-6 text-sm text-rose-200">
          {error instanceof Error ? error.message : "Couldn't load the bookshelf"}
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-800 px-4 py-10 text-center text-sm text-slate-500">
          {query.trim() ? "No action items match that title." : "No shared action items yet."}
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:flex-row sm:items-start sm:justify-between",
                editingId === item.id && "border-indigo-500/40",
              )}
            >
              <div className="min-w-0">
                <p className="font-semibold text-white">{item.title}</p>
                {item.description ? (
                  <p className="mt-1 text-sm text-slate-400">{item.description}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-bold uppercase tracking-wide",
                      PRIORITY_TONE[item.priority] || PRIORITY_TONE.MEDIUM,
                    )}
                  >
                    {item.priority === "HIGH" ? "High" : item.priority === "LOW" ? "Low" : "Medium"}
                  </span>
                  {item.resourceLink ? (
                    <span className="truncate text-indigo-300">{item.resourceLink}</span>
                  ) : (
                    <span className="text-slate-500">No resource link</span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<Pencil size={14} />}
                  onClick={() => startEdit(item)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-rose-300 hover:text-rose-200"
                  leftIcon={<Trash2 size={14} />}
                  onClick={() => handleDelete(item)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
