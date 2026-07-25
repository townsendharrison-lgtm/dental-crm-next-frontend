"use client";

import React, { useMemo, useState } from "react";
import { Plus, Trash2, Save, Target } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, FormField } from "@/components/ui/Form";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { Spinner, EmptyState } from "@/components/ui";
import { NATIONAL_BENCHMARK_CATALOG } from "@/components/student/hub/hubShared";
import type { NationalBenchmark } from "@/lib/api/nationalBenchmarks";

interface AdminNationalBenchmarksViewProps {
  benchmarks: NationalBenchmark[];
  isLoading?: boolean;
  onCreate: (payload: {
    key: string;
    label: string;
    benchmark: number;
    unit: string;
    description: string;
  }) => Promise<void> | void;
  onUpdate: (
    id: string,
    updates: Partial<{
      label: string;
      benchmark: number;
      unit: string;
      description: string;
    }>,
  ) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

type Draft = {
  label: string;
  benchmark: string;
  unit: string;
  description: string;
};

function toDraft(b: NationalBenchmark): Draft {
  return {
    label: b.label,
    benchmark: String(b.benchmark),
    unit: b.unit || "",
    description: b.description || "",
  };
}

export default function AdminNationalBenchmarksView({
  benchmarks,
  isLoading,
  onCreate,
  onUpdate,
  onDelete,
}: AdminNationalBenchmarksViewProps) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState("");
  const [creating, setCreating] = useState(false);

  const availableToAdd = useMemo(() => {
    const used = new Set(benchmarks.map((b) => b.key));
    return NATIONAL_BENCHMARK_CATALOG.filter((item) => !used.has(item.key));
  }, [benchmarks]);

  const getDraft = (b: NationalBenchmark): Draft => drafts[b.id] ?? toDraft(b);

  const updateDraft = (id: string, patch: Partial<Draft>) => {
    setDrafts((prev) => {
      const base = prev[id] ?? toDraft(benchmarks.find((x) => x.id === id)!);
      return { ...prev, [id]: { ...base, ...patch } };
    });
  };

  const handleSave = async (b: NationalBenchmark) => {
    const draft = getDraft(b);
    const benchmark = Number(draft.benchmark);
    if (!draft.label.trim() || Number.isNaN(benchmark)) return;
    setSavingId(b.id);
    try {
      await onUpdate(b.id, {
        label: draft.label.trim(),
        benchmark,
        unit: draft.unit,
        description: draft.description,
      });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[b.id];
        return next;
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this benchmark section from student Analytics?")) return;
    setDeletingId(id);
    try {
      await onDelete(id);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } finally {
      setDeletingId(null);
    }
  };

  const openAdd = () => {
    setSelectedKey(availableToAdd[0]?.key || "");
    setAddOpen(true);
  };

  const handleCreate = async () => {
    const catalogItem = NATIONAL_BENCHMARK_CATALOG.find((item) => item.key === selectedKey);
    if (!catalogItem) return;
    setCreating(true);
    try {
      await onCreate({
        key: catalogItem.key,
        label: catalogItem.label,
        benchmark: catalogItem.benchmark,
        unit: catalogItem.unit,
        description: catalogItem.description,
      });
      setAddOpen(false);
    } finally {
      setCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Spinner className="h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-400" />
            <span className="text-xs font-medium uppercase tracking-wider text-indigo-400">
              Competitive Alignment Index
            </span>
          </div>
          <h2 className="text-xl font-semibold text-white">National Benchmarks</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Edit the values students see in Central Hub Analytics. Add or remove metric sections as
            national averages change.
          </p>
        </div>
        <Button onClick={openAdd} disabled={availableToAdd.length === 0}>
          <Plus className="h-4 w-4" />
          Add section
        </Button>
      </div>

      {benchmarks.length === 0 ? (
        <EmptyState
          icon={<Target className="h-8 w-8" />}
          title="No benchmark sections"
          description="Add a metric section to populate the National Benchmark Comparison grid."
          action={
            <Button onClick={openAdd} disabled={availableToAdd.length === 0}>
              <Plus className="h-4 w-4" />
              Add section
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {benchmarks.map((b) => {
            const draft = getDraft(b);
            const dirty =
              draft.label !== b.label ||
              Number(draft.benchmark) !== b.benchmark ||
              draft.unit !== (b.unit || "") ||
              draft.description !== (b.description || "");

            return (
              <div
                key={b.id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Metric key
                    </p>
                    <p className="font-mono text-sm text-slate-300">{b.key}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!dirty || savingId === b.id}
                      onClick={() => handleSave(b)}
                    >
                      <Save className="h-3.5 w-3.5" />
                      {savingId === b.id ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
                      disabled={deletingId === b.id}
                      onClick={() => handleDelete(b.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <FormField label="Label" className="md:col-span-2">
                    <Input
                      value={draft.label}
                      onChange={(e) => updateDraft(b.id, { label: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Benchmark value">
                    <Input
                      type="number"
                      step="any"
                      value={draft.benchmark}
                      onChange={(e) => updateDraft(b.id, { benchmark: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Unit">
                    <Input
                      value={draft.unit}
                      placeholder="hrs, exp…"
                      onChange={(e) => updateDraft(b.id, { unit: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Why this matters" className="md:col-span-4">
                    <Textarea
                      rows={2}
                      value={draft.description}
                      onChange={(e) => updateDraft(b.id, { description: e.target.value })}
                    />
                  </FormField>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add benchmark section"
        description="Choose a metric that maps to student Hub data."
      >
        <div className="space-y-4">
          {availableToAdd.length === 0 ? (
            <p className="text-sm text-slate-400">All available metric sections are already added.</p>
          ) : (
            <FormField label="Metric">
              <SelectMenu
                value={selectedKey}
                onChange={setSelectedKey}
                options={availableToAdd.map((item) => ({
                  value: item.key,
                  label: `${item.label} (${item.key})`,
                }))}
              />
            </FormField>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!selectedKey || creating || availableToAdd.length === 0}
            >
              {creating ? "Adding…" : "Add section"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
