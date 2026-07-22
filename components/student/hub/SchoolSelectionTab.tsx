"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Plus, School as SchoolIcon, PartyPopper, Sparkles, Clock, Star, Save
} from 'lucide-react';
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
  DragMoveEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  Student, School, ApplicationStatus, Application, PlatformConfig, SchoolCategory
} from '@/lib/types';
import SchoolFilterView from '../SchoolFilterView';
import type { DentalSchool } from '@/lib/schools/sheetCatalog';
import { mapDentalSchoolToHubSchool } from '@/lib/schools/sheetCatalog';
import {
  useStudentSchools,
  useAddStudentSchool,
  useUpdateStudentSchool,
  useRemoveStudentSchool,
} from '@/lib/hooks/useStudentSchools';
import {
  useApplications,
  useCreateApplication,
  useUpdateApplication,
  useDeleteApplication,
} from '@/lib/hooks/useApplications';
import {
  ICON_MAP,
  DEFAULT_CATEGORIES,
  AVAILABLE_COLORS,
  AVAILABLE_ICONS,
  SchoolCard,
  SortableSchoolCard,
  DroppableCategory,
} from './hubShared';
import { Button, EmptyState, FormField, Input, Modal } from '@/components/ui';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/queryKeys';
import { useSchoolCategories, useReplaceSchoolCategories } from '@/lib/hooks/useSchoolCategories';

const EMPTY_SCHOOLS: School[] = [];
const EMPTY_APPLICATIONS: Application[] = [];

interface SchoolSelectionTabProps {
  student: Student;
  isMentorView?: boolean;
  onUpdateSchools?: (schools: School[]) => void;
  onUpdateStudent?: (updates: Partial<Student>) => void;
  onUpdateApplications?: (applications: Application[]) => void;
  platformConfig?: PlatformConfig;
}

export default function SchoolSelectionTab({
  student,
  isMentorView = false,
  onUpdateSchools,
  onUpdateStudent,
  onUpdateApplications,
  platformConfig,
}: SchoolSelectionTabProps) {
  const studentId = student.id;
  const queryClient = useQueryClient();
  const { data: schoolsQueryData, isLoading: schoolsLoading } = useStudentSchools(studentId);
  const loadedSchools = schoolsQueryData ?? EMPTY_SCHOOLS;
  const addSchoolMutation = useAddStudentSchool();
  const updateSchoolMutation = useUpdateStudentSchool();
  const removeSchoolMutation = useRemoveStudentSchool();
  const { data: applicationsQueryData } = useApplications(studentId);
  const loadedApplications = applicationsQueryData ?? EMPTY_APPLICATIONS;
  const createAppMutation = useCreateApplication();
  const updateAppMutation = useUpdateApplication();
  const deleteAppMutation = useDeleteApplication();
  const { data: categoriesQueryData, isLoading: categoriesLoading } = useSchoolCategories(studentId);
  const replaceCategoriesMutation = useReplaceSchoolCategories();

  const [schools, setLocalSchools] = useState<School[]>(EMPTY_SCHOOLS);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletedSelectionIds, setDeletedSelectionIds] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState<{ type: 'ACCEPTED' | 'INTERVIEWED' | 'WAITLISTED', message: string } | null>(null);
  const [isSchoolSelectorOpen, setIsSchoolSelectorOpen] = useState(false);
  const [addToCategoryId, setAddToCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#6366f1');
  const [newCategoryIcon, setNewCategoryIcon] = useState('SchoolIcon');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const triggerConfetti = () => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  // Sync from server only when there are no unsaved local edits
  useEffect(() => {
    if (!dirty) {
      setLocalSchools(loadedSchools);
      setDeletedSelectionIds([]);
    }
  }, [loadedSchools, dirty]);

  const markDirty = () => setDirty(true);

  const setSchools = (newSchools: School[] | ((prev: School[]) => School[])) => {
    markDirty();
    setLocalSchools(newSchools);
  };

  const normalizeCategories = (categories: any[] | undefined): SchoolCategory[] => {
    if (!categories || categories.length === 0) return DEFAULT_CATEGORIES;
    return categories.map(c => {
      if (typeof c === 'string') {
        const def = DEFAULT_CATEGORIES.find(d => d.id === c);
        return def || { id: c, name: c, color: '#94a3b8', icon: 'SchoolIcon' };
      }
      return c;
    });
  };

  const categoriesKey = JSON.stringify(categoriesQueryData ?? student.schoolCategories ?? null);
  const [schoolCategories, setSchoolCategories] = useState<SchoolCategory[]>(() =>
    normalizeCategories(student.schoolCategories),
  );
  const [savingCategories, setSavingCategories] = useState(false);
  const schoolCategoriesRef = useRef(schoolCategories);
  schoolCategoriesRef.current = schoolCategories;
  const categoryBoardRef = useRef<HTMLDivElement>(null);
  const pendingScrollCategoryId = useRef<string | null>(null);
  const dragScrollRaf = useRef<number | null>(null);

  // Prefer dedicated categories API; fall back to student profile field
  useEffect(() => {
    if (dirty || savingCategories) return;
    const serverCats = normalizeCategories(categoriesQueryData ?? student.schoolCategories);
    const local = schoolCategoriesRef.current;
    const serverIds = new Set(serverCats.map((c) => c.id));
    const hasUnsyncedLocal = local.some((c) => !serverIds.has(c.id));
    if (hasUnsyncedLocal) return;
    setSchoolCategories(serverCats);
  }, [student.id, categoriesKey, categoriesQueryData, dirty, savingCategories]);

  const scrollCategoryIntoView = (categoryId: string) => {
    const board = categoryBoardRef.current;
    if (!board) return;
    const el = Array.from(board.children).find(
      (child) => child.getAttribute('data-category-id') === categoryId,
    ) as HTMLElement | undefined;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
  };

  useEffect(() => {
    const id = pendingScrollCategoryId.current;
    if (!id) return;
    if (!schoolCategories.some((c) => c.id === id)) return;
    requestAnimationFrame(() => {
      scrollCategoryIntoView(id);
      pendingScrollCategoryId.current = null;
    });
  }, [schoolCategories]);

  const persistCategories = async (newCategories: SchoolCategory[]) => {
    setSchoolCategories(newCategories);
    setSavingCategories(true);
    try {
      const saved = await replaceCategoriesMutation.mutateAsync({
        studentId,
        categories: newCategories,
      });
      setSchoolCategories(saved.length ? saved : newCategories);
      onUpdateStudent?.({ schoolCategories: saved.length ? saved : newCategories });
      await queryClient.invalidateQueries({ queryKey: queryKeys.schoolCategories.all(studentId) });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save categories');
      throw err;
    } finally {
      setSavingCategories(false);
    }
  };

  const handleAddSchool = (school: School, categoryId?: string) => {
    if (schools.some((s) => s.name.toLowerCase() === school.name.toLowerCase())) {
      toast.message('School already on the list');
      return;
    }
    const targetCategory =
      categoryId || addToCategoryId || schoolCategories[0]?.id || 'Target';
    setSchools((prev) => [
      ...prev,
      {
        ...school,
        type: targetCategory,
        selectionId: undefined,
      },
    ]);
    toast.message(`${school.name} added — click Save to persist`);
  };

  const openAddSchoolForCategory = (categoryId: string) => {
    setAddToCategoryId(categoryId);
    setIsSchoolSelectorOpen(true);
  };

  const closeSchoolSelector = () => {
    setIsSchoolSelectorOpen(false);
    setAddToCategoryId(null);
  };

  const handleAddSchoolFromFilter = (dentalSchool: DentalSchool) => {
    const categoryId = addToCategoryId || schoolCategories[0]?.id || 'Target';
    handleAddSchool(mapDentalSchoolToHubSchool(dentalSchool, categoryId), categoryId);
    closeSchoolSelector();
  };

  const handleDeleteSchool = (schoolId: string) => {
    const target = schools.find((s) => s.id === schoolId);
    if (target?.selectionId) {
      setDeletedSelectionIds((prev) =>
        prev.includes(target.selectionId!) ? prev : [...prev, target.selectionId!],
      );
    }
    setSchools((prev) => prev.filter((s) => s.id !== schoolId));
  };

  const handleUpdateSchoolNotes = (schoolId: string, notes: string) => {
    setSchools((prev) => prev.map((s) => (s.id === schoolId ? { ...s, notes } : s)));
  };

  const handleSaveSelection = async () => {
    // Flush any in-progress strategy notes before persisting
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    await new Promise((resolve) => setTimeout(resolve, 0));

    setSaving(true);
    try {
      // Persist category definitions in dedicated table
      await replaceCategoriesMutation.mutateAsync({
        studentId,
        categories: schoolCategories,
      });
      onUpdateStudent?.({ schoolCategories });

      // Remove deleted selections
      if (deletedSelectionIds.length > 0) {
        await Promise.all(
          deletedSelectionIds.map((id) =>
            removeSchoolMutation.mutateAsync({ id, studentId }),
          ),
        );
      }

      // Create or update each school on the list
      for (const school of schools) {
        const category = school.type || schoolCategories[0]?.id || 'Target';
        const notes = typeof school.notes === 'string' ? school.notes : undefined;
        if (school.selectionId) {
          await updateSchoolMutation.mutateAsync({
            id: school.selectionId,
            studentId,
            updates: { category, notes },
          });
        } else {
          await addSchoolMutation.mutateAsync({
            studentId,
            school,
            category,
          });
        }
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.studentSchools.all(studentId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(studentId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.students.all() });

      setDeletedSelectionIds([]);
      setDirty(false);
      onUpdateSchools?.(schools);
      toast.success('School selection saved');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save school selection');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSchoolStatus = async (schoolId: string, status: ApplicationStatus | '') => {
    const school = schools.find((s) => s.id === schoolId);
    const existing = loadedApplications.find(
      (a) => a.schoolId === schoolId || a.school_id === schoolId,
    );

    try {
      if (status === '') {
        if (existing?.id) {
          await deleteAppMutation.mutateAsync({ id: existing.id, studentId });
        }
        if (school?.selectionId) {
          await updateSchoolMutation.mutateAsync({
            id: school.selectionId,
            studentId,
            updates: { status: 'Interested' },
          });
        }
      } else if (existing?.id) {
        await updateAppMutation.mutateAsync({
          id: existing.id,
          studentId,
          updates: { status: status as ApplicationStatus },
        });
        if (school?.selectionId) {
          await updateSchoolMutation.mutateAsync({
            id: school.selectionId,
            studentId,
            updates: { status: status as any },
          });
        }
      } else {
        await createAppMutation.mutateAsync({
          studentId,
          schoolId,
          schoolName: school?.name || 'Unknown School',
          school: school || undefined,
          status: status as ApplicationStatus,
          appliedDate: new Date().toISOString().split('T')[0],
        });
        if (school?.selectionId) {
          await updateSchoolMutation.mutateAsync({
            id: school.selectionId,
            studentId,
            updates: { status: status as any },
          });
        }
      }
      onUpdateApplications?.(loadedApplications);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update status');
      return;
    }

    if (status === ApplicationStatus.ACCEPTED) {
      triggerConfetti();
      setShowCelebration({
        type: 'ACCEPTED',
        message: platformConfig?.acceptedMessage || "Congratulations on your acceptance! We are so proud of you."
      });
    } else if (status === ApplicationStatus.INTERVIEWED) {
      setShowCelebration({
        type: 'INTERVIEWED',
        message: platformConfig?.interviewMessage || "You've secured an interview! This is a huge step forward."
      });
    } else if (status === ApplicationStatus.WAITLISTED) {
      setShowCelebration({
        type: 'WAITLISTED',
        message: platformConfig?.waitlistMessage || "You're still in the running! A waitlist is a 'not yet', not a 'no'. Stay positive!"
      });
    }
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name || schoolCategories.find((c) => c.name === name || c.id === name)) {
      return;
    }
    const created = {
      id: name,
      name,
      color: newCategoryColor,
      icon: newCategoryIcon,
    };
    const next = [...schoolCategories, created];
    pendingScrollCategoryId.current = created.id;
    setNewCategoryName('');
    setNewCategoryColor('#6366f1');
    setNewCategoryIcon('SchoolIcon');
    setIsAddingCategory(false);
    try {
      await persistCategories(next);
      toast.success('Category added');
      requestAnimationFrame(() => scrollCategoryIntoView(created.id));
    } catch {
      pendingScrollCategoryId.current = null;
    }
  };

  const handleRemoveCategory = async (category: string) => {
    if (!confirm(`Are you sure you want to remove the "${category}" category? Schools in this category will be removed.`)) {
      return;
    }
    const toRemove = schools.filter((s) => s.type === category);
    const nextCategories = schoolCategories.filter((c) => c.id !== category);

    try {
      await persistCategories(nextCategories);

      const selectionIds = toRemove
        .map((s) => s.selectionId)
        .filter((id): id is string => Boolean(id));
      if (selectionIds.length > 0) {
        await Promise.all(
          selectionIds.map((id) => removeSchoolMutation.mutateAsync({ id, studentId })),
        );
        await queryClient.invalidateQueries({ queryKey: queryKeys.studentSchools.all(studentId) });
      }

      setDeletedSelectionIds((prev) => prev.filter((id) => !selectionIds.includes(id)));
      setLocalSchools((prev) => prev.filter((s) => s.type !== category));
      toast.success('Category removed');
    } catch {
      // Error toast handled in persistCategories / mutations
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const board = categoryBoardRef.current;
    const translated = event.active.rect.current.translated;
    if (!board || !translated) return;

    const centerX = translated.left + translated.width / 2;
    const rect = board.getBoundingClientRect();
    const edge = 64;
    let speed = 0;
    if (centerX < rect.left + edge) {
      speed = -Math.max(6, Math.ceil((edge - (centerX - rect.left)) / 4));
    } else if (centerX > rect.right - edge) {
      speed = Math.max(6, Math.ceil((edge - (rect.right - centerX)) / 4));
    }

    if (dragScrollRaf.current) {
      cancelAnimationFrame(dragScrollRaf.current);
      dragScrollRaf.current = null;
    }
    if (speed === 0) return;

    const step = () => {
      if (!categoryBoardRef.current) return;
      categoryBoardRef.current.scrollLeft += speed;
      dragScrollRaf.current = requestAnimationFrame(step);
    };
    dragScrollRaf.current = requestAnimationFrame(step);
  };

  const stopDragScroll = () => {
    if (dragScrollRaf.current) {
      cancelAnimationFrame(dragScrollRaf.current);
      dragScrollRaf.current = null;
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeData = active.data.current;
    const dragId = active.id as string;
    const overId = over.id as string;
    if (activeData?.type !== 'school') return;

    const activeSchool = schools.find(s => s.id === dragId);
    if (!activeSchool) return;

    let overCategory = schoolCategories.find(c => c.id === overId)?.id;
    if (!overCategory) {
      const overSchool = schools.find(s => s.id === overId);
      if (overSchool) overCategory = overSchool.type;
    }

    if (overCategory && activeSchool.type !== overCategory) {
      setSchools(prev => {
        const schoolIndex = prev.findIndex(s => s.id === dragId);
        if (schoolIndex === -1) return prev;
        const newSchools = [...prev];
        newSchools[schoolIndex] = { ...newSchools[schoolIndex], type: overCategory! };
        return newSchools;
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    stopDragScroll();
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const activeData = active.data.current;
    const dragId = active.id as string;
    const overId = over.id as string;
    if (activeData?.type !== 'school') return;

    if (dragId !== overId) {
      setSchools((prev) => {
        const oldIndex = prev.findIndex((s) => s.id === dragId);
        const newIndex = prev.findIndex((s) => s.id === overId);
        if (oldIndex !== -1 && newIndex !== -1) {
          return arrayMove(prev, oldIndex, newIndex);
        }
        return prev;
      });
    }
  };

  const handleDragCancel = () => {
    stopDragScroll();
    setActiveId(null);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div>
            <h2 className="text-lg font-semibold text-white">Strategic School Selection</h2>
            <p className="text-sm text-slate-500 mt-1">
              Curate your list based on fit, stats, and strategy.
              {(schoolsLoading || categoriesLoading) && <span className="ml-2 text-indigo-400">Loading…</span>}
              {dirty && !saving && <span className="ml-2 text-amber-400">Unsaved changes</span>}
              {saving && <span className="ml-2 text-indigo-400">Saving…</span>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Button variant="secondary" leftIcon={<Plus size={16} />} onClick={() => setIsAddingCategory(true)}>
              New Category
            </Button>
            <Button
              leftIcon={<Save size={16} />}
              onClick={() => void handleSaveSelection()}
              disabled={!dirty || saving}
            >
              {saving ? 'Saving…' : 'Save selection'}
            </Button>
          </div>
        </div>

        {isAddingCategory && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Category Name" htmlFor="new-category-name">
                <Input
                  id="new-category-name"
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Safety Schools, In-State, etc."
                />
              </FormField>

              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Category Color</p>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {AVAILABLE_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCategoryColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newCategoryColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Category Icon</p>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-slate-950/30 rounded-xl custom-scrollbar">
                  {AVAILABLE_ICONS.map(iconName => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setNewCategoryIcon(iconName)}
                      className={`p-2 rounded-lg border transition-all ${
                        newCategoryIcon === iconName
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white hover:border-slate-700'
                      }`}
                      aria-label={`Select icon ${iconName}`}
                    >
                      {ICON_MAP[iconName]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800/50">
              <Button variant="secondary" onClick={() => setIsAddingCategory(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleAddCategory()} disabled={savingCategories || !newCategoryName.trim()}>
                {savingCategories ? 'Saving…' : 'Create Category'}
              </Button>
            </div>
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          autoScroll={{
            threshold: { x: 0.12, y: 0.2 },
            acceleration: 12,
            interval: 5,
          }}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div
            ref={categoryBoardRef}
            className="flex w-full items-start gap-4 overflow-x-auto overflow-y-hidden pb-2 custom-scrollbar"
          >
            {schoolCategories.map(category => (
              <div
                key={category.id}
                data-category-id={category.id}
                className="w-[calc((100%-2rem)/3)] min-w-[260px] shrink-0"
              >
                <DroppableCategory
                  category={category}
                  schoolsCount={schools.filter(s => s.type === category.id).length}
                  onRemove={(id) => void handleRemoveCategory(id)}
                  onAdd={openAddSchoolForCategory}
                  isDefault={['Reach', 'Target', 'Strong Fit'].includes(category.id)}
                >
                  <SortableContext
                    id={category.id}
                    items={schools.filter(s => s.type === category.id).map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="min-w-0 space-y-3">
                      {schools.filter(s => s.type === category.id).map(school => (
                        <SortableSchoolCard
                          key={school.id}
                          school={school}
                          status={
                            loadedApplications.find(
                              (a) => a.schoolId === school.id || a.school_id === school.id,
                            )?.status ||
                            (school.selectionStatus as ApplicationStatus | undefined)
                          }
                          onDelete={(id) => void handleDeleteSchool(id)}
                          onUpdateNotes={handleUpdateSchoolNotes}
                          onUpdateStatus={handleUpdateSchoolStatus}
                        />
                      ))}
                      {schools.filter(s => s.type === category.id).length === 0 && (
                        <EmptyState
                          icon={<SchoolIcon size={24} />}
                          title="No schools yet"
                          description="Use + to add a school, or drag one here."
                          className="min-h-[120px] border-slate-800 py-4"
                        />
                      )}
                    </div>
                  </SortableContext>
                </DroppableCategory>
              </div>
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeId ? (
              <SchoolCard
                school={schools.find(s => s.id === activeId)!}
                status={
                  loadedApplications.find(
                    (a) => a.schoolId === activeId || a.school_id === activeId,
                  )?.status
                }
                isOverlay={true}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <Modal
        open={isSchoolSelectorOpen}
        onClose={closeSchoolSelector}
        title="Select School"
        description={
          addToCategoryId
            ? `Add a school to ${schoolCategories.find((c) => c.id === addToCategoryId)?.name || 'this category'}.`
            : 'Browse the database and add schools to your strategy.'
        }
        size="full"
        fullHeight
      >
        <SchoolFilterView
          onSelectSchool={handleAddSchoolFromFilter}
          isModal={true}
          isMentorView={isMentorView}
        />
      </Modal>

      <AnimatePresence>
        {showCelebration && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCelebration(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full max-w-lg bg-slate-900 border ${
                showCelebration.type === 'ACCEPTED' ? 'border-emerald-500/30' :
                showCelebration.type === 'INTERVIEWED' ? 'border-amber-500/30' :
                'border-cyan-500/30'
              } rounded-xl p-8 text-center overflow-hidden shadow-2xl`}
            >
              <div className={`absolute inset-0 opacity-20 blur-3xl -z-10 ${
                showCelebration.type === 'ACCEPTED' ? 'bg-emerald-500' :
                showCelebration.type === 'INTERVIEWED' ? 'bg-amber-500' :
                'bg-cyan-500'
              }`} />

              <div className="relative z-10">
                <motion.div
                  initial={{ rotate: -10, scale: 0.5 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', damping: 10 }}
                  className={`w-16 h-16 mx-auto mb-6 rounded-xl flex items-center justify-center ${
                    showCelebration.type === 'ACCEPTED' ? 'bg-emerald-600/20 text-emerald-400' :
                    showCelebration.type === 'INTERVIEWED' ? 'bg-amber-600/20 text-amber-400' :
                    'bg-cyan-600/20 text-cyan-400'
                  }`}
                >
                  {showCelebration.type === 'ACCEPTED' ? <PartyPopper className="w-8 h-8" /> :
                   showCelebration.type === 'INTERVIEWED' ? <Sparkles className="w-8 h-8" /> :
                   <Clock className="w-8 h-8" />}
                </motion.div>

                <h2 className="text-lg font-semibold text-white mb-3">
                  {showCelebration.type === 'ACCEPTED' ? 'Officially Accepted!' :
                   showCelebration.type === 'INTERVIEWED' ? 'Interview Secured!' :
                   'Waitlisted Status'}
                </h2>

                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                  {showCelebration.message}
                </p>

                <Button
                  onClick={() => setShowCelebration(null)}
                  className={`w-full ${
                    showCelebration.type === 'ACCEPTED' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20' :
                    showCelebration.type === 'INTERVIEWED' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20' :
                    'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/20'
                  }`}
                >
                  Got it!
                </Button>
              </div>

              {showCelebration.type === 'INTERVIEWED' && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute top-8 left-8 text-amber-400/30"
                  >
                    <Star className="w-6 h-6 fill-current" />
                  </motion.div>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    className="absolute bottom-8 right-8 text-amber-400/30"
                  >
                    <Star className="w-5 h-5 fill-current" />
                  </motion.div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
