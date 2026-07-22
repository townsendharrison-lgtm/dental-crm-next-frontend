"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { toast } from "sonner";
import { Student, Milestone } from "@/lib/types";
import {
  MilestoneCard,
  SortableMilestoneCard,
  DroppableMonth,
} from "./hubShared";
import { Button, FormField, Input, Modal, Spinner } from "@/components/ui";
import {
  useMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
  useSyncMilestones,
} from "@/lib/hooks/useMilestones";
import { studentsApi } from "@/lib/api/students";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";

interface TimelineTabProps {
  student: Student;
  milestones?: Milestone[];
  onUpdateMilestones?: (milestones: Milestone[]) => void;
  onUpdateStudent?: (updates: Partial<Student>) => void;
}

export default function TimelineTab({ student }: TimelineTabProps) {
  const studentId = student.id;
  const queryClient = useQueryClient();
  const { data: milestones = [], isLoading } = useMilestones(studentId);
  const createMilestone = useCreateMilestone(studentId);
  const updateMilestone = useUpdateMilestone(studentId);
  const deleteMilestone = useDeleteMilestone(studentId);
  const syncMilestones = useSyncMilestones(studentId);

  const [monthColors, setMonthColors] = useState<Record<string, string>>(
    student.monthColors || student.profile?.month_colors || {},
  );
  const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState<{ month: string } | null>(null);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [savingColor, setSavingColor] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const colors = student.monthColors || student.profile?.month_colors;
    if (colors) setMonthColors(colors);
  }, [student.monthColors, student.profile?.month_colors]);

  useEffect(() => {
    if (isAddMilestoneOpen) {
      setMilestoneTitle("");
      requestAnimationFrame(() => titleInputRef.current?.focus());
    }
  }, [isAddMilestoneOpen]);

  const roadmapMonths = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({
        label: d.toLocaleString("default", { month: "short" }),
        year: d.getFullYear(),
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      });
    }
    return months;
  }, []);

  const handleAddMilestone = async (title: string, month: string) => {
    if (!title.trim()) return;
    try {
      await createMilestone.mutateAsync({
        title: title.trim(),
        month,
        status: "Planned",
        isCustom: true,
      });
      toast.success("Milestone added");
      setIsAddMilestoneOpen(null);
      setMilestoneTitle("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add milestone");
    }
  };

  const handleToggleMilestone = async (id: string) => {
    const current = milestones.find((m) => m.id === id);
    if (!current) return;
    try {
      await updateMilestone.mutateAsync({
        id,
        updates: {
          status: current.status === "Completed" ? "Planned" : "Completed",
        },
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update milestone");
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    try {
      await deleteMilestone.mutateAsync(id);
      toast.success("Milestone deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete milestone");
    }
  };

  const persistOrder = async (next: Milestone[]) => {
    queryClient.setQueryData(queryKeys.milestones.all(studentId), next);
    try {
      await syncMilestones.mutateAsync(
        next.map((m, index) => ({
          id: m.id,
          month: m.month,
          sortOrder: index,
          status: m.status,
          title: m.title,
        })),
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to save roadmap order");
      queryClient.invalidateQueries({ queryKey: queryKeys.milestones.all(studentId) });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeData = active.data.current;
    const dragId = active.id as string;
    const overId = over.id as string;
    if (activeData?.type !== "milestone") return;

    const activeMilestone = milestones.find((m) => m.id === dragId);
    if (!activeMilestone) return;

    let overMonth = roadmapMonths.find((m) => m.value === overId)?.value;
    if (!overMonth) {
      const overMilestone = milestones.find((m) => m.id === overId);
      if (overMilestone) overMonth = overMilestone.month;
    }

    if (overMonth && activeMilestone.month !== overMonth) {
      const next = milestones.map((m) =>
        m.id === dragId ? { ...m, month: overMonth! } : m,
      );
      queryClient.setQueryData(queryKeys.milestones.all(studentId), next);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const activeData = active.data.current;
    const dragId = active.id as string;
    const overId = over.id as string;
    if (activeData?.type !== "milestone") return;

    let next = [...milestones];
    if (dragId !== overId) {
      const oldIndex = next.findIndex((m) => m.id === dragId);
      const newIndex = next.findIndex((m) => m.id === overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        next = arrayMove(next, oldIndex, newIndex);
      }
    }

    // Recompute sortOrder within each month for stable persistence
    const byMonth = new Map<string, Milestone[]>();
    for (const m of next) {
      const list = byMonth.get(m.month) || [];
      list.push(m);
      byMonth.set(m.month, list);
    }
    const ordered: Milestone[] = [];
    for (const month of roadmapMonths) {
      const list = byMonth.get(month.value) || [];
      list.forEach((m, i) => ordered.push({ ...m, sortOrder: i }));
      byMonth.delete(month.value);
    }
    // Any leftover months
    for (const list of byMonth.values()) {
      list.forEach((m, i) => ordered.push({ ...m, sortOrder: i }));
    }

    await persistOrder(ordered);
  };

  const handleColorChange = async (monthValue: string, color?: string) => {
    const newColors = { ...monthColors };
    if (color) newColors[monthValue] = color;
    else delete newColors[monthValue];
    setMonthColors(newColors);
    setSavingColor(true);
    try {
      await studentsApi.update(studentId, { month_colors: newColors });
      await queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(studentId) });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save month color");
    } finally {
      setSavingColor(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const openMonth = isAddMilestoneOpen
    ? roadmapMonths.find((m) => m.value === isAddMilestoneOpen.month)
    : null;

  if (isLoading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Spinner className="h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Application Roadmap</h2>
        <p className="mt-1 text-sm text-slate-500">
          Plan milestones by month — drag to rearrange. {savingColor ? "Saving colors…" : ""}
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={(e) => void handleDragEnd(e)}
      >
        <div className="custom-scrollbar overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex gap-6 pb-4">
            {roadmapMonths.map((month) => (
              <DroppableMonth
                key={month.value}
                month={month}
                onAdd={() => setIsAddMilestoneOpen({ month: month.value })}
                customColor={monthColors[month.value]}
                onColorChange={(color) => void handleColorChange(month.value, color)}
              >
                <SortableContext
                  id={month.value}
                  items={milestones.filter((m) => m.month === month.value).map((m) => m.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {milestones
                      .filter((m) => m.month === month.value)
                      .map((milestone) => (
                        <SortableMilestoneCard
                          key={milestone.id}
                          milestone={milestone}
                          onToggle={(id) => void handleToggleMilestone(id)}
                          onDelete={(id) => void handleDeleteMilestone(id)}
                        />
                      ))}
                    {milestones.filter((m) => m.month === month.value).length === 0 && (
                      <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 p-4 text-center">
                        <p className="text-sm text-slate-500">No milestones</p>
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DroppableMonth>
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeId && milestones.find((m) => m.id === activeId) ? (
            <MilestoneCard
              milestone={milestones.find((m) => m.id === activeId)!}
              onToggle={() => {}}
              onDelete={() => {}}
              isOverlay={true}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <Modal
        open={!!isAddMilestoneOpen}
        onClose={() => setIsAddMilestoneOpen(null)}
        title="Add Milestone"
        description={openMonth ? `For ${openMonth.label} ${openMonth.year}` : undefined}
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddMilestoneOpen(null)}
              disabled={createMilestone.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              isLoading={createMilestone.isPending}
              onClick={() => {
                if (isAddMilestoneOpen) void handleAddMilestone(milestoneTitle, isAddMilestoneOpen.month);
              }}
              disabled={!milestoneTitle.trim()}
            >
              Add Milestone
            </Button>
          </>
        }
      >
        <FormField label="Milestone Title" htmlFor="milestone-title" required>
          <Input
            ref={titleInputRef}
            id="milestone-title"
            type="text"
            value={milestoneTitle}
            onChange={(e) => setMilestoneTitle(e.target.value)}
            placeholder="e.g., Submit Primary Application"
            onKeyDown={(e) => {
              if (e.key === "Enter" && isAddMilestoneOpen) {
                void handleAddMilestone(milestoneTitle, isAddMilestoneOpen.month);
              }
            }}
          />
        </FormField>
      </Modal>
    </div>
  );
}
