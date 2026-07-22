"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  Stethoscope,
  FlaskConical,
  Heart,
  Activity,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { Experience, Student } from "@/lib/types";
import { parseLocalDate } from "./hubShared";
import {
  useCreateExperience,
  useUpdateExperience,
  useDeleteExperience,
  useCreateExperienceSession,
  useUpdateExperienceSession,
  useDeleteExperienceSession,
} from "@/lib/hooks/useExperiences";
import {
  Badge,
  Button,
  DatePicker,
  EmptyState,
  FormField,
  Input,
  Modal,
  Textarea,
} from "@/components/ui";
import { SelectMenu } from "@/components/ui/SelectMenu";

interface HourTrackerTabProps {
  student: Student;
  experiences: Experience[];
  /** @deprecated Local-only updates; mutations now persist via API. Kept for callers that still pass it. */
  onUpdateExperiences?: (newExps: Experience[]) => void;
}

const FILTER_OPTIONS = [
  { value: "All", label: "All categories" },
  { value: "Shadowing", label: "Shadowing" },
  { value: "Research", label: "Research" },
  { value: "Volunteering", label: "Volunteering" },
  { value: "Dental Experience", label: "Dental Experiences" },
  { value: "Academic", label: "Academic Enrichment" },
  { value: "Employment", label: "Employment" },
];

const CATEGORY_OPTIONS = FILTER_OPTIONS.filter((o) => o.value !== "All");

const emptyExperienceForm = {
  category: "Volunteering",
  title: "",
  organization: "",
  supervisorName: "",
  supervisorContact: "",
  description: "",
  startDate: "",
};

const emptySessionForm = {
  date: "",
  duration: "",
  notes: "",
};

function expField(exp: Experience, camel: keyof Experience, snake: keyof Experience) {
  return (exp[camel] ?? exp[snake] ?? "") as string;
}

function expOngoing(exp: Experience) {
  return Boolean(exp.isOngoing ?? exp.is_ongoing);
}

function categoryBadgeVariant(
  category: string,
): "warning" | "primary" | "success" | "danger" | "info" | "default" {
  switch (category) {
    case "Shadowing":
      return "warning";
    case "Research":
      return "primary";
    case "Volunteering":
      return "success";
    case "Dental Experience":
      return "danger";
    case "Academic":
      return "info";
    default:
      return "default";
  }
}

function categoryLabel(category: string) {
  if (category === "Dental Experience") return "Dental Experiences";
  if (category === "Academic") return "Academic Enrichment";
  return category;
}

function CategoryIcon({ category }: { category: string }) {
  const props = { size: 12, className: "shrink-0" as const };
  if (category === "Shadowing") return <Stethoscope {...props} />;
  if (category === "Research") return <FlaskConical {...props} />;
  if (category === "Volunteering") return <Heart {...props} />;
  if (category === "Dental Experience") return <Activity {...props} />;
  if (category === "Employment") return <Briefcase {...props} />;
  return null;
}

export default function HourTrackerTab({ student, experiences }: HourTrackerTabProps) {
  const createExperience = useCreateExperience();
  const updateExperience = useUpdateExperience();
  const deleteExperience = useDeleteExperience();
  const createSession = useCreateExperienceSession();
  const updateSession = useUpdateExperienceSession();
  const deleteSession = useDeleteExperienceSession();

  const [experienceSearch, setExperienceSearch] = useState("");
  const [experienceFilter, setExperienceFilter] = useState<string>("All");
  const [isAddExperienceOpen, setIsAddExperienceOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);
  const [isAddSessionOpen, setIsAddSessionOpen] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<{ expId: string; session: any } | null>(
    null,
  );
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: "experience" | "session";
    id: string;
    expId?: string;
  } | null>(null);
  const [experienceForm, setExperienceForm] = useState(emptyExperienceForm);
  const [sessionForm, setSessionForm] = useState(emptySessionForm);

  const savingExperience = createExperience.isPending || updateExperience.isPending;
  const savingSession = createSession.isPending || updateSession.isPending;
  const deleting = deleteExperience.isPending || deleteSession.isPending;

  useEffect(() => {
    if (!isAddExperienceOpen) return;
    if (editingExperience) {
      setExperienceForm({
        category: editingExperience.category || "Volunteering",
        title: editingExperience.title || "",
        organization: editingExperience.organization || "",
        supervisorName: expField(editingExperience, "supervisorName", "supervisor_name"),
        supervisorContact: expField(editingExperience, "supervisorContact", "supervisor_contact"),
        description: editingExperience.description || "",
        startDate: expField(editingExperience, "startDate", "start_date"),
      });
    } else {
      setExperienceForm(emptyExperienceForm);
    }
  }, [isAddExperienceOpen, editingExperience]);

  useEffect(() => {
    if (!isAddSessionOpen) return;
    if (editingSession?.session) {
      setSessionForm({
        date: editingSession.session.date || "",
        duration:
          editingSession.session.duration != null ? String(editingSession.session.duration) : "",
        notes: editingSession.session.notes || "",
      });
    } else {
      setSessionForm({
        ...emptySessionForm,
        date: new Date().toISOString().slice(0, 10),
      });
    }
  }, [isAddSessionOpen, editingSession]);

  const experienceStats = useMemo(() => {
    return (experiences || []).map((exp) => {
      const sessions = exp.sessions || [];
      const totalHours = sessions.reduce((sum, s) => sum + Number(s.duration || 0), 0);
      const distinctWeeks = new Set<number>();
      sessions.forEach((s) => {
        const d = parseLocalDate(s.date);
        const weekStart = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
        distinctWeeks.add(weekStart.getTime());
      });
      const totalWeeks = Math.max(1, distinctWeeks.size);
      const sessionDates = sessions.map((s) => parseLocalDate(s.date).getTime());
      const startRaw = expField(exp, "startDate", "start_date");
      const endRaw = expField(exp, "endDate", "end_date");
      const ongoing = expOngoing(exp);
      const startDate =
        sessionDates.length > 0
          ? new Date(Math.min(...sessionDates))
          : startRaw
            ? parseLocalDate(startRaw)
            : new Date();
      const avgHoursPerWeek = totalHours / totalWeeks;
      return {
        ...exp,
        sessions,
        isOngoing: ongoing,
        startDate: startRaw,
        endDate: endRaw || null,
        totalHours,
        totalWeeks,
        avgHoursPerWeek,
        displayStartDate: startDate.toLocaleDateString(),
        displayEndDate: ongoing
          ? "Current"
          : endRaw
            ? new Date(endRaw).toLocaleDateString()
            : "N/A",
      };
    });
  }, [experiences]);

  const filteredExperiences = useMemo(() => {
    return experienceStats.filter((exp) => {
      const matchesSearch =
        exp.title.toLowerCase().includes(experienceSearch.toLowerCase()) ||
        exp.organization.toLowerCase().includes(experienceSearch.toLowerCase()) ||
        exp.category.toLowerCase().includes(experienceSearch.toLowerCase());
      const matchesFilter = experienceFilter === "All" || exp.category === experienceFilter;
      return matchesSearch && matchesFilter;
    });
  }, [experienceStats, experienceSearch, experienceFilter]);

  const handleEditExperience = (exp: Experience) => {
    setEditingExperience(exp);
    setIsAddExperienceOpen(true);
  };

  const closeExperienceModal = () => {
    setIsAddExperienceOpen(false);
    setEditingExperience(null);
    setExperienceForm(emptyExperienceForm);
  };

  const closeSessionModal = () => {
    setIsAddSessionOpen(null);
    setEditingSession(null);
    setSessionForm(emptySessionForm);
  };

  const submitExperience = async () => {
    if (
      !experienceForm.title.trim() ||
      !experienceForm.organization.trim() ||
      !experienceForm.supervisorName.trim() ||
      !experienceForm.supervisorContact.trim() ||
      !experienceForm.description.trim() ||
      !experienceForm.startDate
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const payload = {
      studentId: student.id,
      category: experienceForm.category as Experience["category"],
      title: experienceForm.title.trim(),
      organization: experienceForm.organization.trim(),
      supervisorName: experienceForm.supervisorName.trim(),
      supervisorContact: experienceForm.supervisorContact.trim(),
      description: experienceForm.description.trim(),
      startDate: experienceForm.startDate,
      isOngoing: true,
    };

    try {
      if (editingExperience) {
        await updateExperience.mutateAsync({
          id: editingExperience.id,
          updates: payload,
        });
        toast.success("Experience updated");
      } else {
        await createExperience.mutateAsync(payload);
        toast.success("Experience created");
      }
      closeExperienceModal();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save experience");
    }
  };

  const submitSession = async () => {
    if (!isAddSessionOpen || !sessionForm.date || !sessionForm.duration) {
      toast.error("Date and duration are required");
      return;
    }
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (sessionForm.date > today) {
      toast.error("Session date cannot be in the future");
      return;
    }
    const duration = Number(sessionForm.duration);
    if (!Number.isFinite(duration) || duration <= 0) {
      toast.error("Enter a valid duration in hours");
      return;
    }

    const notes = sessionForm.notes.trim() || undefined;

    try {
      if (editingSession) {
        await updateSession.mutateAsync({
          experienceId: editingSession.expId,
          sessionId: editingSession.session.id,
          updates: { date: sessionForm.date, duration, notes },
        });
        toast.success("Session updated");
      } else {
        await createSession.mutateAsync({
          experienceId: isAddSessionOpen,
          payload: { date: sessionForm.date, duration, notes },
        });
        toast.success("Session logged");
      }
      closeSessionModal();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save session");
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    try {
      if (deleteConfirmation.type === "experience") {
        await deleteExperience.mutateAsync({
          id: deleteConfirmation.id,
          studentId: student.id,
        });
        toast.success("Experience deleted");
      } else if (deleteConfirmation.expId) {
        await deleteSession.mutateAsync({
          experienceId: deleteConfirmation.expId,
          sessionId: deleteConfirmation.id,
        });
        toast.success("Session deleted");
      }
      setDeleteConfirmation(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Experience Portfolio</h2>
            <p className="text-sm text-slate-500 mt-1">
              Track hours, sessions, and clinical experience.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-48 lg:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                type="text"
                placeholder="Search..."
                value={experienceSearch}
                onChange={(e) => setExperienceSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="w-full sm:w-48 lg:w-56">
              <SelectMenu
                value={experienceFilter}
                onChange={setExperienceFilter}
                options={FILTER_OPTIONS}
                leftIcon={<Filter className="h-4 w-4" />}
              />
            </div>

            <Button
              leftIcon={<Plus size={16} />}
              onClick={() => setIsAddExperienceOpen(true)}
              className="w-full sm:w-auto whitespace-nowrap"
            >
              New Experience
            </Button>
          </div>
        </div>

        {filteredExperiences.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="h-8 w-8" />}
            title="No experiences found"
            description={
              experienceSearch || experienceFilter !== "All"
                ? "Try adjusting your search or filter."
                : "Add your first experience to start tracking hours."
            }
            action={
              !experienceSearch && experienceFilter === "All" ? (
                <Button leftIcon={<Plus size={16} />} onClick={() => setIsAddExperienceOpen(true)}>
                  New Experience
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredExperiences.map((exp) => (
              <div
                key={exp.id}
                className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden hover:border-indigo-500/30 transition-all group"
              >
                <div className="p-5 flex flex-col lg:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <Badge variant={categoryBadgeVariant(exp.category)}>
                            <CategoryIcon category={exp.category} />
                            {categoryLabel(exp.category)}
                          </Badge>
                          {exp.isOngoing && (
                            <Badge variant="success">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                              Ongoing
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-1">{exp.title}</h3>
                        <p className="text-sm text-slate-400">{exp.organization}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditExperience(exp);
                          }}
                          className="h-9 w-9 text-slate-500 hover:text-white"
                          aria-label="Edit experience"
                        >
                          <Edit3 size={18} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmation({ type: "experience", id: exp.id });
                          }}
                          className="h-9 w-9 text-slate-500 hover:text-rose-400"
                          aria-label="Delete experience"
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </div>

                    <p className="text-sm text-slate-500 leading-relaxed max-w-3xl mb-4">
                      {exp.description}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                          Total Hours
                        </p>
                        <p className="text-xl font-semibold text-white">{exp.totalHours}</p>
                      </div>
                      <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                          Avg Hrs/Wk
                        </p>
                        <p className="text-xl font-semibold text-white">
                          {exp.avgHoursPerWeek.toFixed(1)}
                        </p>
                      </div>
                      <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                          Weeks
                        </p>
                        <p className="text-xl font-semibold text-white">{exp.totalWeeks}</p>
                      </div>
                      <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                          Timeline
                        </p>
                        <p className="text-sm font-medium text-slate-400 mt-0.5">
                          {exp.displayStartDate} – {exp.displayEndDate}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="lg:w-80 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Recent Sessions
                      </h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        leftIcon={<Plus size={14} />}
                        onClick={() => setIsAddSessionOpen(exp.id)}
                        className="h-8 text-indigo-400 hover:text-indigo-300"
                      >
                        Log Session
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                      {(exp.sessions || []).length === 0 ? (
                        <p className="text-sm text-slate-500 py-6 text-center">
                          No sessions logged yet.
                        </p>
                      ) : (
                        (exp.sessions || [])
                          .slice()
                          .reverse()
                          .map((session) => (
                            <div
                              key={session.id}
                              className="flex items-center justify-between p-3 bg-slate-950/30 rounded-xl border border-slate-800/50 group/session"
                            >
                              <div className="flex flex-col flex-1 min-w-0">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-slate-400">
                                    {parseLocalDate(session.date).toLocaleDateString()}
                                  </span>
                                  <span className="text-sm font-semibold text-white">
                                    {session.duration} hrs
                                  </span>
                                </div>
                                {session.notes && (
                                  <p className="text-xs text-slate-500 mt-1 italic truncate">
                                    &ldquo;{session.notes}&rdquo;
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-0.5 opacity-0 group-hover/session:opacity-100 transition-all">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditingSession({ expId: exp.id, session });
                                    setIsAddSessionOpen(exp.id);
                                  }}
                                  className="h-8 w-8 text-slate-500 hover:text-white"
                                  aria-label="Edit session"
                                >
                                  <Edit3 size={14} />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    setDeleteConfirmation({
                                      type: "session",
                                      id: session.id,
                                      expId: exp.id,
                                    })
                                  }
                                  className="h-8 w-8 text-slate-500 hover:text-rose-400"
                                  aria-label="Delete session"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={isAddExperienceOpen}
        onClose={closeExperienceModal}
        title={editingExperience ? "Edit Experience" : "New Experience"}
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={closeExperienceModal}
              disabled={savingExperience}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void submitExperience()}
              isLoading={savingExperience}
            >
              {editingExperience ? "Save Changes" : "Create Experience"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Category" htmlFor="exp-category" required>
              <SelectMenu
                value={experienceForm.category}
                onChange={(value) => setExperienceForm((prev) => ({ ...prev, category: value }))}
                options={CATEGORY_OPTIONS}
              />
            </FormField>
            <FormField label="Start Date" htmlFor="exp-startDate" required>
              <DatePicker
                value={experienceForm.startDate}
                onChange={(value) => setExperienceForm((prev) => ({ ...prev, startDate: value }))}
                placeholder="Select start date"
              />
            </FormField>
          </div>
          <FormField label="Title" htmlFor="exp-title" required>
            <Input
              id="exp-title"
              value={experienceForm.title}
              onChange={(e) => setExperienceForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Lead Volunteer"
            />
          </FormField>
          <FormField label="Organization" htmlFor="exp-organization" required>
            <Input
              id="exp-organization"
              value={experienceForm.organization}
              onChange={(e) =>
                setExperienceForm((prev) => ({ ...prev, organization: e.target.value }))
              }
              placeholder="e.g. City Hospital"
            />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Supervisor" htmlFor="exp-supervisorName" required>
              <Input
                id="exp-supervisorName"
                value={experienceForm.supervisorName}
                onChange={(e) =>
                  setExperienceForm((prev) => ({ ...prev, supervisorName: e.target.value }))
                }
              />
            </FormField>
            <FormField label="Contact Info" htmlFor="exp-supervisorContact" required>
              <Input
                id="exp-supervisorContact"
                value={experienceForm.supervisorContact}
                onChange={(e) =>
                  setExperienceForm((prev) => ({ ...prev, supervisorContact: e.target.value }))
                }
              />
            </FormField>
          </div>
          <FormField label="Description" htmlFor="exp-description" required>
            <Textarea
              id="exp-description"
              value={experienceForm.description}
              onChange={(e) =>
                setExperienceForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Briefly describe your responsibilities..."
              className="h-28 resize-none"
            />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={!!isAddSessionOpen}
        onClose={closeSessionModal}
        title={editingSession ? "Edit Session" : "Log Session"}
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={closeSessionModal}
              disabled={savingSession}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitSession()} isLoading={savingSession}>
              {editingSession ? "Save Changes" : "Log Hours"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Session Date" htmlFor="session-date" required>
            <DatePicker
              value={sessionForm.date}
              onChange={(value) => setSessionForm((prev) => ({ ...prev, date: value }))}
              placeholder="Select session date"
              max={(() => {
                const d = new Date();
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              })()}
            />
          </FormField>
          <FormField label="Duration (Hours)" htmlFor="session-duration" required>
            <Input
              id="session-duration"
              type="number"
              step="0.5"
              min="0"
              value={sessionForm.duration}
              onChange={(e) => setSessionForm((prev) => ({ ...prev, duration: e.target.value }))}
              placeholder="e.g. 4.5"
            />
          </FormField>
          <FormField label="Session Notes" htmlFor="session-notes">
            <Textarea
              id="session-notes"
              value={sessionForm.notes}
              onChange={(e) => setSessionForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="What did you learn or accomplish during this session?"
              className="min-h-[100px] resize-none"
            />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={!!deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        title="Confirm Delete"
        description={
          deleteConfirmation?.type === "experience"
            ? "Are you sure you want to delete this experience? All logged sessions will be permanently lost."
            : "Are you sure you want to delete this session? This action cannot be undone."
        }
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteConfirmation(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={deleting}
              onClick={() => void confirmDelete()}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-400">This cannot be undone.</p>
      </Modal>
    </>
  );
}
