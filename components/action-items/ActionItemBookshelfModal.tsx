"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BookmarkPlus, Library, Pencil, Search, Trash2, X } from "lucide-react";
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

function matchesQuery(item: ActionItemBookshelfItem, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return `${item.title} ${item.description || ""}`.toLowerCase().includes(needle);
}

export function ActionItemBookshelfModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (item: ActionItemBookshelfItem) => void;
}) {
  const { data: items = [], isLoading, isError, error } = useActionItemBookshelf(open);
  const createItem = useCreateActionItemBookshelfItem();
  const updateItem = useUpdateActionItemBookshelfItem();
  const deleteItem = useDeleteActionItemBookshelfItem();
  const [tab, setTab] = useState<"platform" | "mine">("platform");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ActionItemPresetDraft>(emptyActionItemPreset);

  useEffect(() => {
    if (!open) return;
    setTab("platform");
    setQuery("");
    setFormOpen(false);
    setEditingId(null);
    setDraft(emptyActionItemPreset());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  const platform = useMemo(
    () => items.filter((item) => item.scope === "GLOBAL" && matchesQuery(item, query)),
    [items, query],
  );
  const mine = useMemo(
    () => items.filter((item) => item.scope === "MENTOR" && matchesQuery(item, query)),
    [items, query],
  );
  const visible = tab === "platform" ? platform : mine;
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
    setTab("mine");
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
    setTab("mine");
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
        toast.success("Bookshelf item updated");
      } else {
        await createItem.mutateAsync({ ...payload, scope: "MENTOR" });
        toast.success("Added to your bookshelf");
      }
      resetForm();
      setTab("mine");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't save that action item");
    }
  };

  const handleDelete = async (item: ActionItemBookshelfItem) => {
    if (!window.confirm(`Remove “${item.title}” from your bookshelf?`)) return;
    try {
      await deleteItem.mutateAsync(item.id);
      if (editingId === item.id) resetForm();
      toast.success("Removed from your bookshelf");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove that action item");
    }
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close bookshelf"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(40rem,calc(100vh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <Library className="h-4 w-4 text-indigo-400" />
              Action item bookshelf
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Search a title, then use it. Your own list stays separate from the admin list.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-800 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 border-b border-slate-800 px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles"
              className="pl-9"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-950 p-1">
              {(
                [
                  ["platform", "Admin list", platform.length],
                  ["mine", "My bookshelf", mine.length],
                ] as const
              ).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  className={cn(
                    "flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition-colors",
                    tab === value ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white",
                  )}
                >
                  {label}
                  <span className="ml-1 opacity-70">{count}</span>
                </button>
              ))}
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={startCreate}>
              Add mine
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {formOpen && tab === "mine" && (
            <div className="space-y-3 rounded-xl border border-indigo-500/30 bg-slate-950/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300">
                {editingId ? "Edit your item" : "New item for your bookshelf"}
              </p>
              <ActionItemPresetFields draft={draft} onChange={setDraft} idPrefix="mentor-shelf" />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={handleSave} isLoading={saving}>
                  Save
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading bookshelf…</p>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-rose-300">
              {error instanceof Error ? error.message : "Couldn't load the bookshelf"}
            </p>
          ) : visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-800 px-4 py-8 text-center text-sm text-slate-500">
              {query.trim()
                ? "No action items match that title."
                : tab === "platform"
                  ? "The admin list is empty."
                  : "Your bookshelf is empty. Add a task you assign often."}
            </p>
          ) : (
            <div className="space-y-2">
              {visible.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      {item.description ? (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">
                          {item.description}
                        </p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                            PRIORITY_TONE[item.priority] || PRIORITY_TONE.MEDIUM,
                          )}
                        >
                          {item.priority === "HIGH"
                            ? "High"
                            : item.priority === "LOW"
                              ? "Low"
                              : "Medium"}
                        </span>
                        {item.resourceLink ? (
                          <span className="truncate text-[11px] text-indigo-300/80">Has a resource</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {tab === "mine" && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white"
                            aria-label={`Edit ${item.title}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-rose-400"
                            aria-label={`Delete ${item.title}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      <Button type="button" size="sm" onClick={() => onPick(item)}>
                        Use
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function SaveToBookshelfButton({
  title,
  description,
  priority,
  resourceLink,
  className,
}: {
  title: string;
  description?: string;
  priority?: ActionItemPriority;
  resourceLink?: string;
  className?: string;
}) {
  const createItem = useCreateActionItemBookshelfItem();
  const { data: items = [] } = useActionItemBookshelf(true);
  const trimmed = title.trim();
  const already = items.some(
    (item) =>
      item.scope === "MENTOR" && item.title.trim().toLowerCase() === trimmed.toLowerCase(),
  );

  const handleSave = async () => {
    if (!trimmed) {
      toast.error("Add a task title first");
      return;
    }
    if (already) {
      toast.message("That title is already on your bookshelf");
      return;
    }
    try {
      await createItem.mutateAsync({
        title: trimmed,
        description: description?.trim() || "",
        priority: priority || "MEDIUM",
        resourceLink: resourceLink?.trim() || "",
        scope: "MENTOR",
      });
      toast.success("Saved to your bookshelf");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't save to your bookshelf");
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      leftIcon={<BookmarkPlus size={14} />}
      onClick={handleSave}
      isLoading={createItem.isPending}
      disabled={!trimmed || already}
      title={already ? "Already on your bookshelf" : "Save this task to your bookshelf"}
    >
      {already ? "Saved" : "Save"}
    </Button>
  );
}
