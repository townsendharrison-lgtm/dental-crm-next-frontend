"use client";

import React, { useMemo, useState } from "react";
import type { Resource } from "@/lib/types";
import { Plus, Trash2, Edit2, Save, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, FormField } from "@/components/ui/Form";
import { BADGE_ICON_NAMES, renderBadgeIcon } from "@/lib/utils/badgeIcons";
import { cn } from "@/lib/utils/cn";

interface AdminResourcesViewProps {
  resources: Resource[];
  onAddResource: (resource: Partial<Resource>) => void;
  onUpdateResource: (resource: Resource) => void;
  onDeleteResource: (id: string) => void;
}

type ResourceForm = {
  title: string;
  url: string;
  estimatedTime: string;
  category: string;
  icon: string;
};

function defaultForm(): ResourceForm {
  return {
    title: "",
    url: "",
    estimatedTime: "5m",
    category: "General",
    icon: "BookOpen",
  };
}

function resourceTime(r: Resource) {
  return r.estimatedTime || r.estimated_time || "5m";
}

const AdminResourcesView: React.FC<AdminResourcesViewProps> = ({
  resources,
  onAddResource,
  onUpdateResource,
  onDeleteResource,
}) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [form, setForm] = useState<ResourceForm>(defaultForm);
  const [iconQuery, setIconQuery] = useState("");

  const filteredIcons = useMemo(() => {
    const q = iconQuery.trim().toLowerCase();
    if (!q) return BADGE_ICON_NAMES;
    return BADGE_ICON_NAMES.filter((name) => name.toLowerCase().includes(q));
  }, [iconQuery]);

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm());
    setIconQuery("");
    setOpen(true);
  };

  const openEdit = (resource: Resource) => {
    setEditing(resource);
    setForm({
      title: resource.title,
      url: resource.url,
      estimatedTime: resourceTime(resource),
      category: resource.category || "General",
      icon: resource.icon || "BookOpen",
    });
    setIconQuery("");
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.url.trim()) return;

    const payload = {
      title: form.title.trim(),
      url: form.url.trim(),
      estimatedTime: form.estimatedTime.trim() || "5m",
      estimated_time: form.estimatedTime.trim() || "5m",
      category: form.category.trim() || "General",
      icon: form.icon,
    };

    if (editing) {
      onUpdateResource({ ...editing, ...payload });
    } else {
      onAddResource(payload);
    }
    setOpen(false);
    setEditing(null);
    setForm(defaultForm());
    setIconQuery("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white">Student Resources</h3>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
          Add Resource
        </Button>
      </div>

      <div className="grid gap-3">
        {resources.map((resource) => (
          <div
            key={resource.id}
            className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-indigo-500/30 transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-400 shrink-0">
                {renderBadgeIcon(resource.icon || "BookOpen", "w-5 h-5")}
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-white truncate">{resource.title}</h4>
                <p className="text-sm text-slate-500 truncate">
                  {resource.category} · {resourceTime(resource)} ·{" "}
                  <span className="text-indigo-400/70">{resource.url}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                type="button"
                onClick={() => openEdit(resource)}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-400 cursor-pointer"
                aria-label="Edit resource"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteResource(resource.id)}
                className="p-2 hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-400 cursor-pointer"
                aria-label="Delete resource"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {resources.length === 0 && (
        <div className="py-10 text-center border border-dashed border-slate-800 rounded-xl text-sm text-slate-500">
          No resources yet. Add links and tools for students.
        </div>
      )}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
          setIconQuery("");
        }}
        title={editing ? "Edit Resource" : "Add Resource"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Title" required>
            <Input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Letter Vault"
            />
          </FormField>
          <FormField label="URL or path" required>
            <Input
              required
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="/student/letters/vault or https://..."
            />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Category">
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Study"
              />
            </FormField>
            <FormField label="Estimated Time">
              <Input
                value={form.estimatedTime}
                onChange={(e) => setForm({ ...form, estimatedTime: e.target.value })}
                placeholder="10m"
              />
            </FormField>
          </div>

          <FormField label="Icon">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg border border-slate-700 bg-indigo-600/10 flex items-center justify-center text-indigo-400 shrink-0">
                  {renderBadgeIcon(form.icon, "w-6 h-6")}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{form.icon}</p>
                  <p className="text-xs text-slate-500">Selected icon preview</p>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  value={iconQuery}
                  onChange={(e) => setIconQuery(e.target.value)}
                  placeholder={`Search ${BADGE_ICON_NAMES.length} icons…`}
                  className="pl-9"
                />
              </div>

              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60 p-2 custom-scrollbar">
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
                  {filteredIcons.map((name) => {
                    const selected = form.icon === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        title={name}
                        onClick={() => setForm({ ...form, icon: name })}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-lg border p-2 transition-all cursor-pointer",
                          selected
                            ? "border-indigo-500 bg-indigo-600/20 text-indigo-300"
                            : "border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-900 hover:text-white",
                        )}
                      >
                        {renderBadgeIcon(name, "w-5 h-5")}
                        <span className="text-[8px] leading-tight truncate w-full text-center">
                          {name}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {filteredIcons.length === 0 && (
                  <p className="py-6 text-center text-xs text-slate-500">No icons match that search.</p>
                )}
              </div>
            </div>
          </FormField>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setOpen(false);
                setEditing(null);
                setIconQuery("");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" leftIcon={<Save className="w-4 h-4" />}>
              {editing ? "Update Resource" : "Add Resource"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminResourcesView;
