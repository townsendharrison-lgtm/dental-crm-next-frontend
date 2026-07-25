"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  School as SchoolIcon,
  Trash2,
  Edit2,
  Trophy,
  Sparkles,
  PartyPopper,
  Clock,
  Star,
  Check,
} from "lucide-react";
import { Application, ApplicationStatus, PlatformConfig, School } from "@/lib/types";
import {
  useApplications,
  useCreateApplication,
  useUpdateApplication,
  useDeleteApplication,
} from "@/lib/hooks/useApplications";
import { useStudentSchools } from "@/lib/hooks/useStudentSchools";
import { useDentalSchoolsCatalog } from "@/lib/hooks/useDentalSchoolsCatalog";
import {
  mapDentalSchoolToHubSchool,
  type DentalSchool,
} from "@/lib/schools/sheetCatalog";
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  FormField,
  Input,
  Modal,
  SelectMenu,
  Textarea,
  DatePicker,
} from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";

interface ApplicationTrackerProps {
  studentId: string;
  /** @deprecated Applications are loaded from the API; kept for call-site compatibility */
  applications?: Application[];
  onUpdateApplications?: (apps: Application[]) => void;
  platformConfig: PlatformConfig;
}

const STATUS_OPTIONS = [
  { value: ApplicationStatus.APPLIED, label: "Applied" },
  { value: ApplicationStatus.INTERVIEWED, label: "Interviewed" },
  { value: ApplicationStatus.ACCEPTED, label: "Accepted" },
  { value: ApplicationStatus.WAITLISTED, label: "Waitlisted" },
  { value: ApplicationStatus.REJECTED, label: "Rejected" },
  { value: ApplicationStatus.APPLYING, label: "Applying" },
  { value: ApplicationStatus.INTERESTED, label: "Interested" },
];

function statusBadgeVariant(
  status: ApplicationStatus,
): "success" | "danger" | "warning" | "primary" | "default" {
  switch (status) {
    case ApplicationStatus.ACCEPTED:
      return "success";
    case ApplicationStatus.REJECTED:
      return "danger";
    case ApplicationStatus.INTERVIEWED:
      return "warning";
    case ApplicationStatus.WAITLISTED:
      return "primary";
    default:
      return "default";
  }
}

const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({
  studentId,
  platformConfig,
}) => {
  const { data: fetchedApps = [], isLoading } = useApplications(studentId);
  const { data: studentSchools = [] } = useStudentSchools(studentId);
  const {
    schools: catalogSchools,
    loading: catalogLoading,
    error: catalogError,
  } = useDentalSchoolsCatalog();
  const createMutation = useCreateApplication();
  const updateMutation = useUpdateApplication();
  const deleteMutation = useDeleteApplication();

  const applications = fetchedApps;

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    schoolName: string;
    schoolId?: string;
    status: ApplicationStatus;
    appliedDate: string;
    interviewDate?: string;
    decisionDate?: string;
    notes?: string;
  }>({
    schoolName: "",
    status: ApplicationStatus.APPLIED,
    appliedDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  /** Canonical school from the sheet catalog (preferred for research / ensure). */
  const [catalogPick, setCatalogPick] = useState<DentalSchool | null>(null);
  const [schoolSuggestOpen, setSchoolSuggestOpen] = useState(false);
  const schoolInputRef = useRef<HTMLInputElement>(null);
  const schoolSuggestRef = useRef<HTMLDivElement>(null);
  const [suggestPos, setSuggestPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [showCelebration, setShowCelebration] = useState<{
    type: "ACCEPTED" | "INTERVIEWED" | "WAITLISTED";
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const schoolOptions = useMemo(
    () =>
      studentSchools.map((s: School) => ({
        value: s.id,
        label: s.name,
      })),
    [studentSchools],
  );

  const catalogSuggestions = useMemo(() => {
    const q = formData.schoolName.trim().toLowerCase();
    if (q.length < 1) return [];
    return catalogSchools
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [catalogSchools, formData.schoolName]);

  const measureSuggestPos = () => {
    const el = schoolInputRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const menuHeight = Math.min(catalogSuggestions.length * 52 + 12, 280);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight && rect.top > spaceBelow;
    return {
      top: openUp ? rect.top - menuHeight - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    };
  };

  useLayoutEffect(() => {
    if (!schoolSuggestOpen) {
      setSuggestPos(null);
      return;
    }
    setSuggestPos(measureSuggestPos());
  }, [schoolSuggestOpen, catalogSuggestions.length, formData.schoolName]);

  useEffect(() => {
    if (!schoolSuggestOpen) return;
    const onScroll = () => setSuggestPos(measureSuggestPos());
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (schoolInputRef.current?.contains(t) || schoolSuggestRef.current?.contains(t)) {
        return;
      }
      setSchoolSuggestOpen(false);
    };
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    document.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("mousedown", onClick);
    };
  }, [schoolSuggestOpen, catalogSuggestions.length]);

  const selectCatalogSchool = (school: DentalSchool) => {
    const fromList = studentSchools.find(
      (s) => s.name.toLowerCase() === school.name.toLowerCase(),
    );
    setCatalogPick(school);
    setFormData((prev) => ({
      ...prev,
      schoolName: school.name,
      schoolId: fromList?.id,
    }));
    setSchoolSuggestOpen(false);
  };

  const triggerConfetti = () => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }
      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setCatalogPick(null);
    setSchoolSuggestOpen(false);
    setFormData({
      schoolName: "",
      schoolId: undefined,
      status: ApplicationStatus.APPLIED,
      appliedDate: new Date().toISOString().split("T")[0],
      notes: "",
    });
  };

  const maybeCelebrate = (status: ApplicationStatus) => {
    if (status === ApplicationStatus.ACCEPTED) {
      triggerConfetti();
      setShowCelebration({
        type: "ACCEPTED",
        message:
          platformConfig.acceptedMessage ||
          "Congratulations on your acceptance! We are so proud of you.",
      });
    } else if (status === ApplicationStatus.INTERVIEWED) {
      setShowCelebration({
        type: "INTERVIEWED",
        message:
          platformConfig.interviewMessage ||
          "Amazing news! You've landed an interview. Good luck!",
      });
    } else if (status === ApplicationStatus.WAITLISTED) {
      setShowCelebration({
        type: "WAITLISTED",
        message:
          platformConfig.waitlistMessage ||
          "You're still in the running! A waitlist is a 'not yet', not a 'no'. Stay positive!",
      });
    }
  };

  const resolveSchoolForCreate = (): {
    schoolId?: string;
    schoolName: string;
    school?: School;
  } | null => {
    const fromList = formData.schoolId
      ? studentSchools.find((s) => s.id === formData.schoolId)
      : undefined;

    if (fromList) {
      return {
        schoolId: fromList.id,
        schoolName: fromList.name,
        school: fromList,
      };
    }

    const typed = formData.schoolName.trim();
    if (!typed && !catalogPick) {
      return null;
    }

    const pick =
      catalogPick &&
      catalogPick.name.toLowerCase() === (typed || catalogPick.name).toLowerCase()
        ? catalogPick
        : catalogSchools.find((s) => s.name.toLowerCase() === typed.toLowerCase());

    if (pick) {
      return {
        schoolName: pick.name,
        school: mapDentalSchoolToHubSchool(pick),
      };
    }

    // Catalog loaded: require a list pick so research uses the canonical name
    if (catalogSchools.length > 0) {
      toast.error("Select a school from the suggestions so the name matches our catalog");
      setSchoolSuggestOpen(true);
      return null;
    }

    if (!typed) return null;
    return { schoolName: typed };
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const status = formData.status;
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          studentId,
          updates: {
            status,
            appliedDate: formData.appliedDate || null,
            interviewDate: formData.interviewDate || null,
            decisionDate: formData.decisionDate || null,
            notes: formData.notes || null,
          },
        });
        toast.success("Application updated");
      } else {
        const resolved = resolveSchoolForCreate();
        if (!resolved) {
          if (!formData.schoolName.trim() && !formData.schoolId) {
            toast.error("Select or enter a dental school");
          }
          setSaving(false);
          return;
        }
        await createMutation.mutateAsync({
          studentId,
          schoolId: resolved.schoolId,
          schoolName: resolved.schoolName,
          school: resolved.school,
          status,
          appliedDate: formData.appliedDate || null,
          interviewDate: formData.interviewDate || null,
          decisionDate: formData.decisionDate || null,
          notes: formData.notes || null,
        });
        toast.success("Application logged");
      }
      maybeCelebrate(status);
      resetForm();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save application");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ id, studentId });
      toast.success("Application removed");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete application");
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showCelebration && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full max-w-lg rounded-3xl border bg-slate-900 p-10 text-center shadow-2xl ${
                showCelebration.type === "ACCEPTED"
                  ? "border-emerald-500/30"
                  : showCelebration.type === "INTERVIEWED"
                    ? "border-amber-500/30"
                    : "border-cyan-500/30"
              }`}
            >
              <div className="relative z-10 space-y-6">
                <div
                  className={`mx-auto flex h-20 w-20 items-center justify-center rounded-2xl ${
                    showCelebration.type === "ACCEPTED"
                      ? "bg-emerald-600/20 text-emerald-400"
                      : showCelebration.type === "INTERVIEWED"
                        ? "bg-amber-600/20 text-amber-400"
                        : "bg-cyan-600/20 text-cyan-400"
                  }`}
                >
                  {showCelebration.type === "ACCEPTED" ? (
                    <PartyPopper className="h-10 w-10" />
                  ) : showCelebration.type === "INTERVIEWED" ? (
                    <Sparkles className="h-10 w-10" />
                  ) : (
                    <Clock className="h-10 w-10" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-white">
                  {showCelebration.type === "ACCEPTED"
                    ? "Officially accepted!"
                    : showCelebration.type === "INTERVIEWED"
                      ? "Interview secured!"
                      : "Waitlisted"}
                </h2>
                <p className="text-slate-300">{showCelebration.message}</p>
                <Button onClick={() => setShowCelebration(null)} className="w-full">
                  Got it!
                </Button>
              </div>
              {showCelebration.type === "INTERVIEWED" && (
                <>
                  <Star className="absolute left-8 top-8 h-6 w-6 text-amber-400/30" />
                  <Star className="absolute bottom-8 right-8 h-5 w-5 text-amber-400/30" />
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <SchoolIcon className="h-5 w-5 text-indigo-400" />
          Dental School Applications
        </h3>
        <Button
          size="sm"
          leftIcon={<Plus size={14} />}
          onClick={() => {
            resetForm();
            setIsAdding(true);
          }}
        >
          Log Application
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading applications…</p>
      ) : applications.length > 0 ? (
        <div className="grid gap-3">
          {applications.map((app) => (
            <Card key={app.id} className="border-slate-800 bg-slate-900/60 shadow-none">
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-indigo-400">
                    <SchoolIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">
                      {app.schoolName || app.school?.name || "Unknown school"}
                    </h4>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant={statusBadgeVariant(app.status)}>{app.status}</Badge>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                        Applied:{" "}
                        {app.appliedDate || app.applied_date
                          ? new Date(
                              (app.appliedDate || app.applied_date) as string,
                            ).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {(app.interviewDate || app.interview_date) && (
                    <div className="text-center">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                        Interview
                      </p>
                      <p className="text-xs font-semibold text-amber-400">
                        {new Date(
                          (app.interviewDate || app.interview_date) as string,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {(app.decisionDate || app.decision_date) && (
                    <div className="text-center">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                        Decision
                      </p>
                      <p className="text-xs font-semibold text-white">
                        {new Date(
                          (app.decisionDate || app.decision_date) as string,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      aria-label="Edit application"
                      onClick={() => {
                        setFormData({
                          schoolName: app.schoolName || app.school?.name || "",
                          schoolId: app.schoolId || app.school_id,
                          status: app.status,
                          appliedDate:
                            (app.appliedDate || app.applied_date || "").toString().slice(0, 10),
                          interviewDate:
                            (app.interviewDate || app.interview_date || "")
                              ?.toString()
                              .slice(0, 10) || undefined,
                          decisionDate:
                            (app.decisionDate || app.decision_date || "")
                              ?.toString()
                              .slice(0, 10) || undefined,
                          notes: app.notes || "",
                        });
                        setEditingId(app.id);
                        setIsAdding(true);
                      }}
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-rose-400"
                      aria-label="Delete application"
                      onClick={() => void handleDelete(app.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<SchoolIcon size={28} />}
          title="No applications logged yet"
          description="Start tracking your dental school application journey."
          action={
            <Button
              leftIcon={<Plus size={14} />}
              onClick={() => {
                resetForm();
                setIsAdding(true);
              }}
            >
              Log Your First Application
            </Button>
          }
          className="border-slate-800 bg-slate-900/40"
        />
      )}

      <Modal
        open={isAdding}
        onClose={resetForm}
        title={editingId ? "Edit Application" : "Log Application"}
        size="md"
      >
        <div className="space-y-4">
          {schoolOptions.length > 0 && !editingId ? (
            <FormField label="School from your list">
              <SelectMenu
                value={formData.schoolId || ""}
                onChange={(schoolId) => {
                  const match = studentSchools.find((s) => s.id === schoolId);
                  const catalogMatch = match
                    ? catalogSchools.find(
                        (s) => s.name.toLowerCase() === match.name.toLowerCase(),
                      )
                    : null;
                  setCatalogPick(catalogMatch || null);
                  setSchoolSuggestOpen(false);
                  setFormData({
                    ...formData,
                    schoolId: schoolId || undefined,
                    schoolName: match?.name || "",
                  });
                }}
                options={[{ value: "", label: "Or search the catalog below…" }, ...schoolOptions]}
                placeholder="Select a school…"
              />
            </FormField>
          ) : null}

          <FormField
            label="Dental school name"
            hint={
              editingId
                ? undefined
                : catalogError
                  ? "Catalog unavailable — type the school name carefully."
                  : catalogLoading
                    ? "Loading school catalog…"
                    : catalogPick
                      ? "Matched to catalog — spelling is locked for research."
                      : "Start typing and pick a school from the list (avoids misspellings)."
            }
          >
            <div className="relative">
              <Input
                ref={schoolInputRef}
                value={formData.schoolName}
                onChange={(e) => {
                  const schoolName = e.target.value;
                  setCatalogPick(null);
                  setFormData({
                    ...formData,
                    schoolName,
                    schoolId: undefined,
                  });
                  setSchoolSuggestOpen(schoolName.trim().length > 0);
                }}
                onFocus={() => {
                  if (!editingId && formData.schoolName.trim().length > 0) {
                    setSchoolSuggestOpen(true);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setSchoolSuggestOpen(false);
                  if (e.key === "Enter" && catalogSuggestions[0]) {
                    e.preventDefault();
                    selectCatalogSchool(catalogSuggestions[0]);
                  }
                }}
                placeholder="e.g. Harvard School of Dental Medicine"
                disabled={!!editingId}
                autoComplete="off"
                className={cn(catalogPick && "pr-9")}
              />
              {catalogPick && !editingId ? (
                <Check
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400"
                  aria-hidden
                />
              ) : null}
            </div>
          </FormField>

          {schoolSuggestOpen &&
          !editingId &&
          suggestPos &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              ref={schoolSuggestRef}
              role="listbox"
              style={{
                top: suggestPos.top,
                left: suggestPos.left,
                width: suggestPos.width,
              }}
              className="fixed z-[200] max-h-[17.5rem] overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-xl shadow-black/30 opacity-0 animate-[menu-fade-in_100ms_ease-out_forwards]"
            >
              {catalogLoading ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">Loading schools…</p>
              ) : catalogSuggestions.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  {catalogError
                    ? "Could not load school catalog."
                    : "No matching schools — try another spelling."}
                </p>
              ) : (
                catalogSuggestions.map((school) => {
                  const selected =
                    catalogPick?.id === school.id ||
                    formData.schoolName.toLowerCase() === school.name.toLowerCase();
                  return (
                    <button
                      key={school.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectCatalogSchool(school)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                        "hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selected && "bg-surface-muted",
                      )}
                    >
                      <SchoolIcon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-foreground">
                          {school.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {school.location}
                        </span>
                      </span>
                      {selected ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>,
            document.body,
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Current status">
              <SelectMenu
                value={formData.status}
                onChange={(status) =>
                  setFormData({ ...formData, status: status as ApplicationStatus })
                }
                options={STATUS_OPTIONS}
              />
            </FormField>
            <FormField label="Applied date">
              <DatePicker
                value={formData.appliedDate || ""}
                onChange={(appliedDate) => setFormData({ ...formData, appliedDate })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Interview date (optional)">
              <DatePicker
                value={formData.interviewDate || ""}
                onChange={(interviewDate) => setFormData({ ...formData, interviewDate })}
              />
            </FormField>
            <FormField label="Decision date (optional)">
              <DatePicker
                value={formData.decisionDate || ""}
                onChange={(decisionDate) => setFormData({ ...formData, decisionDate })}
              />
            </FormField>
          </div>

          <FormField label="Notes">
            <Textarea
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any specific details about this application…"
              className="min-h-[96px]"
            />
          </FormField>

          {formData.status === ApplicationStatus.ACCEPTED && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
              <Trophy className="h-5 w-5 text-emerald-400" />
              <p className="text-xs font-semibold uppercase text-emerald-400">
                Congratulations on your acceptance!
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} isLoading={saving}>
              Save Application
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ApplicationTracker;
