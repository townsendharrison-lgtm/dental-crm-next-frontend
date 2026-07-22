"use client";

import React, { useMemo, useState } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Video,
  FileText,
  ClipboardCheck,
  Award,
  Trash2,
  Edit2,
  Inbox,
  CheckCircle2,
  RotateCcw,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import type {
  Course,
  CourseModule,
  CourseSubmission,
  CourseStatus,
  CourseModuleType,
  CourseSubmissionStatus,
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input, FormField, Textarea } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";
import {
  useCreateCourse,
  useUpdateCourse,
  useDeleteCourse,
  useCreateCourseModule,
  useUpdateCourseModule,
  useDeleteCourseModule,
  useReviewCourseSubmission,
} from "@/lib/hooks/useCourses";

type Tab = "courses" | "modules" | "submissions";

interface AdminCoursesViewProps {
  courses: Course[];
  submissions: CourseSubmission[];
}

const MODULE_TYPES: { value: CourseModuleType; label: string; icon: typeof Video }[] = [
  { value: "VIDEO", label: "Video", icon: Video },
  { value: "WORKSHEET", label: "Worksheet", icon: FileText },
  { value: "EXAM", label: "Exam", icon: ClipboardCheck },
  { value: "CERTIFICATE", label: "Certificate", icon: Award },
];

function moduleIcon(type: string) {
  return MODULE_TYPES.find((t) => t.value === type)?.icon || FileText;
}

function statusTone(status: string) {
  if (status === "PUBLISHED" || status === "APPROVED") {
    return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
  }
  if (status === "PENDING" || status === "DRAFT") {
    return "bg-amber-500/15 text-amber-400 border-amber-500/20";
  }
  if (status === "NEEDS_REVISION") {
    return "bg-indigo-500/15 text-indigo-400 border-indigo-500/20";
  }
  if (status === "ARCHIVED" || status === "REJECTED") {
    return "bg-rose-500/15 text-rose-400 border-rose-500/20";
  }
  return "bg-slate-800 text-slate-400 border-slate-700";
}

function relativeTime(iso?: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminCoursesView({ courses, submissions }: AdminCoursesViewProps) {
  const [tab, setTab] = useState<Tab>("courses");
  const [search, setSearch] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || "");
  const [submissionFilter, setSubmissionFilter] = useState<string>("ALL");

  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    category: "General",
    status: "DRAFT" as CourseStatus,
  });

  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [moduleForm, setModuleForm] = useState({
    title: "",
    description: "",
    type: "VIDEO" as CourseModuleType,
    contentUrl: "",
  });

  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();
  const createModule = useCreateCourseModule();
  const updateModule = useUpdateCourseModule();
  const deleteModule = useDeleteCourseModule();
  const reviewSubmission = useReviewCourseSubmission();

  const selectedCourse =
    courses.find((c) => c.id === selectedCourseId) || courses[0] || null;

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q),
    );
  }, [courses, search]);

  const filteredSubmissions = useMemo(() => {
    let list = submissions;
    if (submissionFilter !== "ALL") {
      list = list.filter((s) => s.status === submissionFilter);
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.student?.name?.toLowerCase().includes(q) ||
        s.student?.email?.toLowerCase().includes(q) ||
        s.course?.title?.toLowerCase().includes(q) ||
        s.type?.toLowerCase().includes(q),
    );
  }, [submissions, submissionFilter, search]);

  const pendingCount = submissions.filter((s) => s.status === "PENDING").length;
  const publishedCount = courses.filter((c) => c.status === "PUBLISHED").length;
  const moduleCount = courses.reduce((n, c) => n + (c.modules?.length || 0), 0);

  const openCreateCourse = () => {
    setEditingCourse(null);
    setCourseForm({ title: "", description: "", category: "General", status: "DRAFT" });
    setCourseModalOpen(true);
  };

  const openEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description || "",
      category: course.category || "General",
      status: course.status,
    });
    setCourseModalOpen(true);
  };

  const saveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.title.trim()) return;
    const payload = {
      title: courseForm.title.trim(),
      description: courseForm.description.trim() || undefined,
      category: courseForm.category,
      status: courseForm.status,
    };
    if (editingCourse) {
      updateCourse.mutate(
        { id: editingCourse.id, updates: payload },
        {
          onSuccess: () => {
            toast.success("Course updated");
            setCourseModalOpen(false);
          },
          onError: (err: any) => toast.error(err?.message || "Failed to update course"),
        },
      );
    } else {
      createCourse.mutate(payload, {
        onSuccess: (created) => {
          toast.success("Course created");
          setSelectedCourseId(created.id);
          setCourseModalOpen(false);
        },
        onError: (err: any) => toast.error(err?.message || "Failed to create course"),
      });
    }
  };

  const openCreateModule = () => {
    if (!selectedCourse) return;
    setEditingModule(null);
    setModuleForm({ title: "", description: "", type: "VIDEO", contentUrl: "" });
    setModuleModalOpen(true);
  };

  const openEditModule = (mod: CourseModule) => {
    setEditingModule(mod);
    setModuleForm({
      title: mod.title,
      description: mod.description || "",
      type: mod.type,
      contentUrl: mod.contentUrl || mod.content_url || "",
    });
    setModuleModalOpen(true);
  };

  const saveModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleForm.title.trim() || !selectedCourse) return;
    const payload = {
      title: moduleForm.title.trim(),
      description: moduleForm.description.trim() || undefined,
      type: moduleForm.type,
      contentUrl: moduleForm.contentUrl.trim() || undefined,
    };
    if (editingModule) {
      updateModule.mutate(
        { moduleId: editingModule.id, updates: payload },
        {
          onSuccess: () => {
            toast.success("Module updated");
            setModuleModalOpen(false);
          },
          onError: (err: any) => toast.error(err?.message || "Failed to update module"),
        },
      );
    } else {
      createModule.mutate(
        { courseId: selectedCourse.id, payload },
        {
          onSuccess: () => {
            toast.success("Module added");
            setModuleModalOpen(false);
          },
          onError: (err: any) => toast.error(err?.message || "Failed to add module"),
        },
      );
    }
  };

  const review = (id: string, status: CourseSubmissionStatus) => {
    reviewSubmission.mutate(
      { id, status },
      {
        onSuccess: () => toast.success(`Marked ${status.toLowerCase().replace("_", " ")}`),
        onError: (err: any) => toast.error(err?.message || "Review failed"),
      },
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="overflow-x-auto no-scrollbar">
        <div className="inline-flex min-w-max items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-1 sm:min-w-0">
          {(
            [
              { id: "courses" as const, label: "Courses", icon: BookOpen },
              { id: "modules" as const, label: "Modules", icon: Video },
              { id: "submissions" as const, label: "Submissions", icon: Inbox, badge: pendingCount },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all",
                  selected
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {"badge" in item && item.badge > 0 && (
                  <span className="rounded-md bg-indigo-500/20 px-1.5 py-0.5 text-[10px] text-indigo-300">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewStat label="Courses" value={courses.length} hint={`${publishedCount} published`} tone="indigo" />
        <OverviewStat label="Modules" value={moduleCount} hint="Videos, worksheets, exams" tone="emerald" />
        <OverviewStat label="Pending reviews" value={pendingCount} hint="Awaiting staff action" tone="amber" />
        <OverviewStat
          label="Total submissions"
          value={submissions.length}
          hint="All-time student uploads"
          tone="rose"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              tab === "submissions"
                ? "Search by student, course, or type…"
                : "Search courses…"
            }
            className="pl-9"
          />
        </div>
        {tab === "courses" && (
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateCourse}>
            Add Course
          </Button>
        )}
        {tab === "modules" && (
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={openCreateModule}
            disabled={!selectedCourse}
          >
            Add Module
          </Button>
        )}
        {tab === "submissions" && (
          <div className="w-full sm:w-44">
            <SelectMenu
              value={submissionFilter}
              onChange={setSubmissionFilter}
              options={[
                { value: "ALL", label: "All status" },
                { value: "PENDING", label: "Pending" },
                { value: "APPROVED", label: "Approved" },
                { value: "NEEDS_REVISION", label: "Needs revision" },
                { value: "REJECTED", label: "Rejected" },
              ]}
            />
          </div>
        )}
      </div>

      {tab === "courses" && (
        filteredCourses.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-8 w-8" />}
            title="No courses yet"
            description="Create a curriculum course to get started."
          />
        ) : (
          <div className="grid gap-2">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 transition-colors hover:border-indigo-500/30"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="mb-0.5 flex flex-wrap items-center gap-2">
                      <h4 className="truncate font-semibold text-white">{course.title}</h4>
                      <span
                        className={cn(
                          "rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                          statusTone(course.status),
                        )}
                      >
                        {course.status}
                      </span>
                      <span className="text-xs text-slate-500">{course.category}</span>
                    </div>
                    <p className="truncate text-sm text-slate-500">
                      {course.description || "No description"}
                      <span className="text-slate-600"> · </span>
                      {course.modules?.length || 0} modules
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedCourseId(course.id);
                        setTab("modules");
                      }}
                    >
                      Modules
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      leftIcon={<Edit2 className="h-3.5 w-3.5" />}
                      onClick={() => openEditCourse(course)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={() => {
                        if (window.confirm(`Delete “${course.title}”? This removes modules and submissions.`)) {
                          deleteCourse.mutate(course.id, {
                            onSuccess: () => toast.success("Course deleted"),
                            onError: (err: any) => toast.error(err?.message || "Delete failed"),
                          });
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === "modules" && (
        <div className="space-y-3">
          <div className="w-full sm:w-72">
            <SelectMenu
              value={selectedCourse?.id || ""}
              onChange={setSelectedCourseId}
              options={courses.map((c) => ({ value: c.id, label: c.title }))}
              placeholder="Select course"
            />
          </div>
          {!selectedCourse ? (
            <EmptyState
              icon={<Video className="h-8 w-8" />}
              title="Select a course"
              description="Pick a course to manage its modules."
            />
          ) : (selectedCourse.modules || []).length === 0 ? (
            <EmptyState
              icon={<Video className="h-8 w-8" />}
              title="No modules yet"
              description="Add videos, worksheets, exams, or certificate uploads."
            />
          ) : (
            <div className="grid gap-2">
              {(selectedCourse.modules || []).map((mod) => {
                const Icon = moduleIcon(mod.type);
                return (
                  <div
                    key={mod.id}
                    className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-indigo-400">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="mb-0.5 flex flex-wrap items-center gap-2">
                            <h4 className="truncate font-semibold text-white">{mod.title}</h4>
                            <span className="rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                              {mod.type}
                            </span>
                          </div>
                          <p className="truncate text-sm text-slate-500">
                            {mod.description || "No description"}
                            {(mod.contentUrl || mod.content_url) && (
                              <>
                                <span className="text-slate-600"> · </span>
                                <a
                                  href={mod.contentUrl || mod.content_url || "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-indigo-400 hover:underline"
                                >
                                  Open link <ExternalLink className="h-3 w-3" />
                                </a>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<Edit2 className="h-3.5 w-3.5" />}
                          onClick={() => openEditModule(mod)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                          onClick={() => {
                            if (window.confirm(`Delete module “${mod.title}”?`)) {
                              deleteModule.mutate(mod.id, {
                                onSuccess: () => toast.success("Module deleted"),
                                onError: (err: any) => toast.error(err?.message || "Delete failed"),
                              });
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "submissions" && (
        filteredSubmissions.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-8 w-8" />}
            title="No submissions"
            description="Student worksheet and certificate uploads will appear here."
          />
        ) : (
          <div className="grid gap-2">
            {filteredSubmissions.map((sub) => (
              <div
                key={sub.id}
                className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      name={sub.student?.name || sub.student?.email || "Student"}
                      src={sub.student?.avatar}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="mb-0.5 flex flex-wrap items-center gap-2">
                        <h4 className="truncate font-semibold text-white">
                          {sub.student?.name || sub.student?.email || "Unknown student"}
                        </h4>
                        <span
                          className={cn(
                            "rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                            statusTone(sub.status),
                          )}
                        >
                          {sub.status.replace("_", " ")}
                        </span>
                        <span className="rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          {sub.type}
                        </span>
                      </div>
                      <p className="truncate text-sm text-slate-500">
                        {sub.course?.title || "Course"}
                        {sub.module?.title ? ` · ${sub.module.title}` : ""}
                        <span className="text-slate-600"> · </span>
                        {relativeTime(sub.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(sub.fileUrl || sub.file_url) && (
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
                        onClick={() =>
                          window.open(sub.fileUrl || sub.file_url || "", "_blank")
                        }
                      >
                        File
                      </Button>
                    )}
                    {sub.status === "PENDING" && (
                      <>
                        <Button
                          size="sm"
                          leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                          onClick={() => review(sub.id, "APPROVED")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                          onClick={() => review(sub.id, "NEEDS_REVISION")}
                        >
                          Revise
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          leftIcon={<XCircle className="h-3.5 w-3.5" />}
                          onClick={() => review(sub.id, "REJECTED")}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <Modal
        open={courseModalOpen}
        onClose={() => setCourseModalOpen(false)}
        title={editingCourse ? "Edit Course" : "Add Course"}
        description="Curriculum courses for shadowing, DAT, and prep tracks."
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCourseModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCourse as any} isLoading={createCourse.isPending || updateCourse.isPending}>
              {editingCourse ? "Save changes" : "Create course"}
            </Button>
          </div>
        }
      >
        <form onSubmit={saveCourse} className="space-y-4 p-5">
          <FormField label="Title">
            <Input
              value={courseForm.title}
              onChange={(e) => setCourseForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Shadowing 101"
              required
            />
          </FormField>
          <FormField label="Description">
            <Textarea
              value={courseForm.description}
              onChange={(e) => setCourseForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What students learn in this course"
              rows={3}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Category">
              <Input
                value={courseForm.category}
                onChange={(e) => setCourseForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="Shadowing"
              />
            </FormField>
            <FormField label="Status">
              <SelectMenu
                value={courseForm.status}
                onChange={(v) => setCourseForm((f) => ({ ...f, status: v as CourseStatus }))}
                options={[
                  { value: "DRAFT", label: "Draft" },
                  { value: "PUBLISHED", label: "Published" },
                  { value: "ARCHIVED", label: "Archived" },
                ]}
              />
            </FormField>
          </div>
        </form>
      </Modal>

      <Modal
        open={moduleModalOpen}
        onClose={() => setModuleModalOpen(false)}
        title={editingModule ? "Edit Module" : "Add Module"}
        description={selectedCourse ? `Course: ${selectedCourse.title}` : undefined}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModuleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveModule as any}
              isLoading={createModule.isPending || updateModule.isPending}
            >
              {editingModule ? "Save changes" : "Add module"}
            </Button>
          </div>
        }
      >
        <form onSubmit={saveModule} className="space-y-4 p-5">
          <FormField label="Title">
            <Input
              value={moduleForm.title}
              onChange={(e) => setModuleForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Hours Worksheet"
              required
            />
          </FormField>
          <FormField label="Description">
            <Textarea
              value={moduleForm.description}
              onChange={(e) => setModuleForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Type">
              <SelectMenu
                value={moduleForm.type}
                onChange={(v) => setModuleForm((f) => ({ ...f, type: v as CourseModuleType }))}
                options={MODULE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              />
            </FormField>
            <FormField label="Content URL">
              <Input
                value={moduleForm.contentUrl}
                onChange={(e) => setModuleForm((f) => ({ ...f, contentUrl: e.target.value }))}
                placeholder="https://…"
              />
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function OverviewStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone: "indigo" | "emerald" | "amber" | "rose";
}) {
  const tones = {
    indigo: "text-indigo-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    rose: "text-rose-400",
  };
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className={cn("text-[10px] font-bold uppercase tracking-wider", tones[tone])}>
          {label}
        </span>
      </div>
      <p className="text-3xl font-black tabular-nums text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
