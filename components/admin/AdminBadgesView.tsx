"use client";

import React, { useMemo, useState } from "react";
import type { Badge } from "@/lib/types";
import { Plus, Trash2, Edit2, Save, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, FormField } from "@/components/ui/Form";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { BADGE_ICON_NAMES, renderBadgeIcon } from "@/lib/utils/badgeIcons";
import { cn } from "@/lib/utils/cn";

interface AdminBadgesViewProps {
  badges: Badge[];
  onAddBadge: (badge: Partial<Badge>) => void;
  onUpdateBadge: (badge: Badge) => void;
  onDeleteBadge: (id: string) => void;
}

type BadgeForm = {
  name: string;
  description: string;
  icon: string;
  color: string;
  benchmarkType: Badge["benchmark_type"];
  benchmarkValue: number;
};

const COLOR_OPTIONS = [
  { value: "bg-amber-400/10 text-amber-400", label: "Amber" },
  { value: "bg-indigo-400/10 text-indigo-400", label: "Indigo" },
  { value: "bg-emerald-400/10 text-emerald-400", label: "Emerald" },
  { value: "bg-rose-400/10 text-rose-400", label: "Rose" },
  { value: "bg-violet-400/10 text-violet-400", label: "Violet" },
  { value: "bg-cyan-400/10 text-cyan-400", label: "Cyan" },
  { value: "bg-orange-400/10 text-orange-400", label: "Orange" },
  { value: "bg-pink-400/10 text-pink-400", label: "Pink" },
  { value: "bg-lime-400/10 text-lime-400", label: "Lime" },
  { value: "bg-sky-400/10 text-sky-400", label: "Sky" },
  { value: "bg-fuchsia-400/10 text-fuchsia-400", label: "Fuchsia" },
  { value: "bg-yellow-400/10 text-yellow-400", label: "Yellow" },
];

const BENCHMARK_OPTIONS: Array<{ value: Badge["benchmark_type"]; label: string }> = [
  { value: "PROGRESS", label: "Progress %" },
  { value: "STRENGTH_SCORE", label: "Strength Score" },
  { value: "DAT", label: "DAT Score" },
  { value: "TASKS_COMPLETED", label: "Tasks Completed" },
  { value: "MEETINGS_ATTENDED", label: "Meetings Attended" },
];

function defaultForm(): BadgeForm {
  return {
    name: "",
    description: "",
    icon: "Award",
    color: "bg-amber-400/10 text-amber-400",
    benchmarkType: "PROGRESS",
    benchmarkValue: 50,
  };
}

function badgeType(b: Badge) {
  return b.benchmarkType || b.benchmark_type;
}
function badgeValue(b: Badge) {
  return b.benchmarkValue ?? b.benchmark_value;
}

const AdminBadgesView: React.FC<AdminBadgesViewProps> = ({
  badges,
  onAddBadge,
  onUpdateBadge,
  onDeleteBadge,
}) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Badge | null>(null);
  const [form, setForm] = useState<BadgeForm>(defaultForm);
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

  const openEdit = (badge: Badge) => {
    setEditing(badge);
    const color = badge.color.includes("bg-")
      ? badge.color
      : `bg-slate-800 ${badge.color}`;
    setForm({
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      color,
      benchmarkType: badgeType(badge),
      benchmarkValue: badgeValue(badge),
    });
    setIconQuery("");
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.description.trim()) return;

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      icon: form.icon,
      color: form.color,
      benchmarkType: form.benchmarkType,
      benchmark_type: form.benchmarkType,
      benchmarkValue: form.benchmarkValue,
      benchmark_value: form.benchmarkValue,
    };

    if (editing) {
      onUpdateBadge({ ...editing, ...payload } as Badge);
    } else {
      onAddBadge(payload);
    }
    setOpen(false);
    setEditing(null);
    setForm(defaultForm());
    setIconQuery("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white">Achievement Badges</h3>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
          Create Badge
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {badges.map((badge) => {
          const type = badgeType(badge);
          const value = badgeValue(badge);
          return (
            <div
              key={badge.id}
              className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-indigo-500/30 transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <div
                  className={`w-12 h-12 rounded-lg border border-slate-800 flex items-center justify-center ${badge.color}`}
                >
                  {renderBadgeIcon(badge.icon, "w-6 h-6")}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(badge)}
                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-400 cursor-pointer"
                    aria-label="Edit badge"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteBadge(badge.id)}
                    className="p-2 hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-400 cursor-pointer"
                    aria-label="Delete badge"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h4 className="font-semibold text-white mb-1">{badge.name}</h4>
              <p className="text-sm text-slate-500 line-clamp-2 mb-3">{badge.description}</p>
              <div className="pt-3 border-t border-slate-800/50 flex items-center justify-between text-xs">
                <span className="font-medium text-indigo-400 uppercase tracking-wider">
                  {String(type).replace(/_/g, " ")}
                </span>
                <span className="font-semibold text-white">
                  {value}
                  {type === "PROGRESS" ? "%" : ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {badges.length === 0 && (
        <div className="py-10 text-center border border-dashed border-slate-800 rounded-xl text-sm text-slate-500">
          No badges yet. Create one to reward student milestones.
        </div>
      )}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
          setIconQuery("");
        }}
        title={editing ? "Edit Badge" : "Create Badge"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Badge Name" required>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Early Bird"
            />
          </FormField>
          <FormField label="Description" required>
            <Textarea
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What achievement does this reward?"
              rows={3}
            />
          </FormField>

          <FormField label="Icon">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-lg border border-slate-700 flex items-center justify-center shrink-0 ${form.color}`}
                >
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

          <FormField label="Color">
            <SelectMenu
              value={form.color}
              onChange={(v) => setForm({ ...form, color: v })}
              options={COLOR_OPTIONS}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Benchmark Type">
              <SelectMenu
                value={form.benchmarkType}
                onChange={(v) =>
                  setForm({ ...form, benchmarkType: v as Badge["benchmark_type"] })
                }
                options={BENCHMARK_OPTIONS}
              />
            </FormField>
            <FormField label="Value">
              <Input
                type="number"
                step="0.1"
                value={form.benchmarkValue}
                onChange={(e) =>
                  setForm({ ...form, benchmarkValue: Number(e.target.value) })
                }
              />
            </FormField>
          </div>
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
              {editing ? "Update Badge" : "Create Badge"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminBadgesView;
