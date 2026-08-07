"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  User,
  Calendar,
  MapPin,
  Globe,
  Venus,
  Fingerprint,
  GraduationCap,
  BookOpen,
  Award,
  CheckCircle2,
  Plus,
  FileText,
  Upload,
  ShieldCheck,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Briefcase,
  Target,
  Search,
  MessageSquare,
  History,
  Download,
  Eye,
  Trash2,
  CheckCircle,
  Share2,
  Camera,
  Loader2,
  Pencil,
  XCircle,
  ExternalLink,
  Minus,
  Trophy,
  Medal,
} from "lucide-react";
import Link from "next/link";
import type {
  Student,
  StudentDocument,
  StudentCredentialKind,
} from "@/lib/types";
import { normalizeReapplicantOutcomes } from "@/lib/profile/profileOptions";
import {
  calculateStrengthScore,
  hoursByCategoryFromExperiences,
} from "@/lib/utils/strengthScore";
import { computeExperienceStats } from "@/lib/utils/experienceStats";
import {
  useDocuments,
  useUploadDocument,
  useUpdateDocument,
  useDeleteDocument,
} from "@/lib/hooks/useDocuments";
import { useExperiences } from "@/lib/hooks/useExperiences";
import { useApplications } from "@/lib/hooks/useApplications";
import { useStudentSchools } from "@/lib/hooks/useStudentSchools";
import { useLorRequests } from "@/lib/hooks/useLor";
import { useCreateTask } from "@/lib/hooks/useTasks";
import {
  useStudentNotes,
  useCreateStudentNote,
  useDeleteStudentNote,
  useStudentDexterity,
  useCreateStudentDexterity,
  useDeleteStudentDexterity,
  useStudentCredentials,
  useCreateStudentCredential,
  useUpdateStudentCredential,
  useDeleteStudentCredential,
} from "@/lib/hooks/useStudentNotesDexterity";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuthStore } from "@/lib/stores/authStore";
import { USER_KEY } from "@/lib/auth/cookies";
import { queryKeys } from "@/lib/api/queryKeys";
import {
  Button,
  Modal,
  FormField,
  Input,
  Textarea,
  SelectMenu,
  Table,
  Badge,
  EmptyState,
  type Column,
} from "@/components/ui";
import { toast } from "sonner";
import { studentsApi } from "@/lib/api/students";
import { documentsApi } from "@/lib/api/documents";
import { usersApi } from "@/lib/api/users";
import { ProfileDetailsEditModal } from "@/components/student/ProfileDetailsEditModal";
import ApplicationReadinessPanel from "@/components/student/ApplicationReadinessPanel";
import { DAT_TYPES, isUnitedStates } from "@/lib/profile/profileOptions";
import {
  buildApplicationReadiness,
  readinessStatusFromPercent,
} from "@/lib/utils/applicationReadiness";

interface StudentProfileDocumentsViewProps {
  student: Student;
  currentUserId: string;
  onUpdateStudent?: (updates: Partial<Student>) => void;
  /** Live strength score from parent; falls back to local calculation. */
  strengthScore?: number;
}

export function StudentProfileDocumentsView({
  student,
  currentUserId: _currentUserId,
  onUpdateStudent,
  strengthScore: strengthScoreProp,
}: StudentProfileDocumentsViewProps) {
  const { user } = useAuth();
  const setAuthUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();
  const canWriteNotes =
    user?.role === "ADMIN" ||
    user?.role === "MENTOR_MANAGER" ||
    user?.role === "MENTOR" ||
    (!!user && user.id === student.id && user.role === "STUDENT");
  const canEditAvatar = !!user && user.id === student.id;
  /** Students can edit their own snapshot/identity + academic scores (GPA/DAT re-verify silently server-side). */
  const canEditOwnProfile = !!user && user.id === student.id && user.role === "STUDENT";
  const canReviewDocuments =
    user?.role === "ADMIN" || user?.role === "MENTOR_MANAGER" || user?.role === "MENTOR";
  const [reviewingDocId, setReviewingDocId] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);
  const [profileEditMode, setProfileEditMode] = useState<"personal" | "academic" | null>(null);
  const [lorExternalEnabled, setLorExternalEnabled] = useState(
    student.profile?.lor_external_service || false,
  );
  const [externalCollected, setExternalCollectedState] = useState(() =>
    Math.max(0, Number(student.profile?.lor_external_collected ?? 0) || 0),
  );

  const [activeSection, setActiveSection] = useState("snapshot");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const clickingSection = useRef<string | null>(null);

  const { data: experiences = [], refetch: refetchExperiences } = useExperiences(student.id);
  const { data: documents = [] } = useDocuments(student.id);
  const { data: applicationsForStrength = [] } = useApplications(student.id);
  const { data: schoolsForStrength = [] } = useStudentSchools(student.id);
  const { data: rawLorRequests = [], isLoading: lorLoading } = useLorRequests(
    undefined,
    // Students are scoped server-side; staff search by student name then we filter by id
    user?.role === "STUDENT" ? undefined : student.name,
  );
  const { data: notes = [] } = useStudentNotes(student.id);
  const { data: manualDexterity = [] } = useStudentDexterity(student.id);
  const { data: credentials = [] } = useStudentCredentials(student.id);

  useEffect(() => {
    setLorExternalEnabled(student.profile?.lor_external_service || false);
    setExternalCollectedState(
      Math.max(0, Number(student.profile?.lor_external_collected ?? 0) || 0),
    );
  }, [
    student.id,
    student.profile?.lor_external_service,
    student.profile?.lor_external_collected,
  ]);

  const lorRequests = useMemo(
    () => rawLorRequests.filter((r) => r.studentId === student.id),
    [rawLorRequests, student.id],
  );

  const lorRequired = useMemo(() => {
    const raw = Number(student.lorRequired ?? student.profile?.lor_required ?? 0);
    return raw > 0 ? raw : 4;
  }, [student.lorRequired, student.profile?.lor_required]);

  const vaultReviewedCount = useMemo(
    () => lorRequests.filter((r) => r.status === "REVIEWED").length,
    [lorRequests],
  );

  const lorReceived = useMemo(() => {
    if (lorExternalEnabled) {
      return Math.min(externalCollected, lorRequired);
    }
    return Math.min(vaultReviewedCount, lorRequired);
  }, [lorExternalEnabled, externalCollected, vaultReviewedCount, lorRequired]);

  const computedStrength = useMemo(() => {
    return calculateStrengthScore({
      gpa: student.gpa ?? student.profile?.gpa,
      gpaVerified: student.gpaVerified ?? student.profile?.gpa_verified,
      datAa: student.datAA ?? student.profile?.dat_aa,
      datScore: student.datScore ?? student.profile?.dat_score,
      datVerified: student.datVerified ?? student.profile?.dat_verified,
      hoursByCategory: hoursByCategoryFromExperiences(experiences),
      documentTypes: documents.map((d) => d.type),
      lorRequired,
      lorReceivedApprox: lorReceived,
      applicationCount: applicationsForStrength.length,
      schoolCount: schoolsForStrength.length,
      isReapplicant: student.isReapplicant ?? student.profile?.is_reapplicant,
    }).total;
  }, [
    student,
    experiences,
    documents,
    applicationsForStrength,
    schoolsForStrength,
    lorRequired,
    lorReceived,
  ]);

  const storedStrength = Math.round(
    Number(student.strengthScore ?? student.profile?.strength_score ?? NaN),
  );

  const displayStrength =
    typeof strengthScoreProp === "number"
      ? strengthScoreProp
      : Number.isFinite(storedStrength)
        ? storedStrength
        : computedStrength;

  const [docSearch, setDocSearch] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("All Types");

  const uploadDocMutation = useUploadDocument();
  const updateDocMutation = useUpdateDocument();
  const deleteDocMutation = useDeleteDocument();
  const createTaskMutation = useCreateTask();
  const createNoteMutation = useCreateStudentNote(student.id);
  const deleteNoteMutation = useDeleteStudentNote(student.id);
  const createDexterityMutation = useCreateStudentDexterity(student.id);
  const deleteDexterityMutation = useDeleteStudentDexterity(student.id);
  const createCredentialMutation = useCreateStudentCredential(student.id);
  const updateCredentialMutation = useUpdateStudentCredential(student.id);
  const deleteCredentialMutation = useDeleteStudentCredential(student.id);

  const persistProfile = (updates: Record<string, unknown>, opts?: { silent?: boolean }) => {
    if (!onUpdateStudent) {
      toast.message("Profile editing isn't available here");
      return;
    }
    onUpdateStudent(updates as Partial<Student>);
    if (!opts?.silent) toast.success("Profile updated");
  };

  const openPersonalEditor = () => setProfileEditMode("personal");
  const openAcademicEditor = () => setProfileEditMode("academic");

  const readinessProgress = useMemo(() => {
    return buildApplicationReadiness({
      student,
      experiences,
      lorRequests,
      credentials,
    }).percent;
  }, [student, experiences, lorRequests, credentials]);

  const profileCompleteness = useMemo(() => {
    const p = student.profile;
    const country = p?.country || student.country;
    const checks = [
      Boolean(student.name?.trim()),
      Boolean(country),
      !isUnitedStates(country) || Boolean(p?.state || student.state),
      Boolean(p?.ethnicity || student.ethnicity),
      Boolean(p?.gender || student.gender),
      p?.age != null || student.age != null,
      p?.gpa != null || student.gpa != null,
      p?.sgpa != null,
      Boolean(p?.major?.trim()),
      Boolean(p?.applicant_type),
      Boolean(p?.dat_type),
      p?.dat_type === "NOT_TAKEN" || p?.dat_aa != null || student.datAA != null,
      Array.isArray(p?.considering_schools) && p!.considering_schools!.length > 0,
      documents.length > 0,
      experiences.length > 0,
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [student, documents.length, experiences.length]);

  const progressDonut = (
    value: number,
    label: string,
    tone: string,
  ) => {
    const size = 112;
    const stroke = 9;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(100, value));
    const offset = c - (c * clamped) / 100;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/50 px-4 py-6">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="transparent"
              stroke="currentColor"
              strokeWidth={stroke}
              className="text-slate-800"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="transparent"
              stroke="currentColor"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              className={`${tone} transition-[stroke-dashoffset] duration-500`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums text-white">{clamped}%</span>
          </div>
        </div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      </div>
    );
  };

  const toggleLorExternal = () => {
    if (!canEditOwnProfile) return;
    const next = !lorExternalEnabled;
    setLorExternalEnabled(next);
    if (next) {
      // Keep progress when switching to external; student can adjust manually
      const seeded = Math.max(externalCollected, vaultReviewedCount);
      setExternalCollectedState(seeded);
      persistProfile({
        lor_external_service: true,
        lor_external_collected: seeded,
      });
    } else {
      persistProfile({ lor_external_service: false });
    }
  };

  const setExternalCollected = (count: number) => {
    if (!canEditOwnProfile || !lorExternalEnabled) return;
    const next = Math.max(0, Math.min(lorRequired, count));
    setExternalCollectedState(next);
    persistProfile({ lor_external_collected: next }, { silent: true });
    toast.success(
      next === 0
        ? "Letter collection reset"
        : `${next} letter${next === 1 ? "" : "s"} marked as collected`,
    );
  };

  const reviewDocument = async (
    docId: string,
    status: "Reviewed" | "Cancelled" | "Needs Revision",
  ) => {
    setReviewingDocId(docId);
    try {
      await updateDocMutation.mutateAsync({ id: docId, updates: { status } });
      toast.success(
        status === "Reviewed"
          ? "Document verified"
          : status === "Cancelled"
            ? "Document cancelled"
            : "Document marked for revision",
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to update document");
    } finally {
      setReviewingDocId(null);
    }
  };

  const [isAddDexterityOpen, setIsAddDexterityOpen] = useState(false);
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("Transcript");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [dexActivity, setDexActivity] = useState("");
  const [dexDescription, setDexDescription] = useState("");
  const [isAddCredentialOpen, setIsAddCredentialOpen] = useState(false);
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(null);
  const [credentialKind, setCredentialKind] = useState<StudentCredentialKind>("LICENSE");
  const [credentialTitle, setCredentialTitle] = useState("");
  const [credentialIssuer, setCredentialIssuer] = useState("");
  const [credentialYear, setCredentialYear] = useState("");
  const [credentialDescription, setCredentialDescription] = useState("");

  /** Staff edit Application Readiness under Plan â†’ Applications; students keep it here. */
  const showReadinessSection = !canReviewDocuments;

  const sections = useMemo(() => {
    const base: Array<{ id: string; label: string; icon: typeof User }> = [
      { id: "snapshot", label: "Student Snapshot", icon: User },
    ];
    if (showReadinessSection) {
      base.push({ id: "readiness", label: "Application Readiness", icon: Target });
    }
    base.push(
      { id: "academic", label: "Academic Background", icon: GraduationCap },
      { id: "lor", label: "Letters of Rec", icon: FileText },
      { id: "dexterity", label: "Manual Dexterity", icon: Fingerprint },
      { id: "credentials", label: "Licenses & Achievements", icon: Trophy },
      { id: "experience", label: "Experience Summary", icon: Briefcase },
      { id: "notes", label: "Additional Info", icon: MessageSquare },
      { id: "documents", label: "Document Center", icon: Upload },
    );
    return base;
  }, [showReadinessSection]);

  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections]);

  const getScrollRoot = useCallback((): HTMLElement | null => {
    const start = contentRef.current;
    if (!start) return (document.querySelector("main") as HTMLElement) || null;
    let node: HTMLElement | null = start;
    while (node) {
      const { overflowY } = getComputedStyle(node);
      if (
        (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
        node.scrollHeight > node.clientHeight
      ) {
        return node;
      }
      node = node.parentElement;
    }
    return (document.querySelector("main") as HTMLElement) || null;
  }, []);

  const scrollToSection = useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      const root = getScrollRoot();
      if (!el) return;

      clickingSection.current = id;
      setActiveSection(id);

      // Mobile sticky section chips + app chrome; desktop sidebar nav is taller offset.
      const headerOffset = window.matchMedia("(min-width: 1024px)").matches ? 112 : 96;
      if (root) {
        const rootRect = root.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const top = root.scrollTop + (elRect.top - rootRect.top) - headerOffset;
        root.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      } else {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      window.setTimeout(() => {
        if (clickingSection.current === id) clickingSection.current = null;
      }, 700);
    },
    [getScrollRoot],
  );

  // Viewport scroll-spy: highlight the section currently near the top of the scroll container
  useEffect(() => {
    const root = getScrollRoot();
    if (!root) return;

      const HEADER_OFFSET = 112;

    const updateActiveFromScroll = () => {
      if (clickingSection.current) return;

      let current: string = sectionIds[0];
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top;
        if (top <= HEADER_OFFSET) current = id;
      }
      setActiveSection((prev) => (prev === current ? prev : current));
    };

    updateActiveFromScroll();
    root.addEventListener("scroll", updateActiveFromScroll, { passive: true });
    window.addEventListener("resize", updateActiveFromScroll);
    return () => {
      root.removeEventListener("scroll", updateActiveFromScroll);
      window.removeEventListener("resize", updateActiveFromScroll);
    };
  }, [getScrollRoot, sectionIds, student.id]);

  const experienceStats = useMemo(() => {
    const categories = [
      "Volunteering",
      "Research",
      "Shadowing",
      "Dental Experience",
      "Academic",
      "Employment",
    ] as const;
    return categories.map((cat) => {
      const catExps = (experiences || []).filter((e) => e.category === cat);
      const entries = catExps.map((e) => {
        const stats = computeExperienceStats(e);
        return {
          id: e.id,
          title: e.title,
          location: e.organization || "—",
          ...stats,
        };
      });
      const totalHours = entries.reduce((sum, e) => sum + e.totalHours, 0);
      return {
        category: cat,
        hours: totalHours,
        entries,
      };
    });
  }, [experiences]);

  const licenses = useMemo(
    () => credentials.filter((c) => c.kind === "LICENSE"),
    [credentials],
  );
  const achievements = useMemo(
    () => credentials.filter((c) => c.kind === "ACHIEVEMENT"),
    [credentials],
  );

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch = doc.title
        .toLowerCase()
        .includes(docSearch.toLowerCase());
      const matchesType =
        docTypeFilter === "All Types" || doc.type === docTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [documents, docSearch, docTypeFilter]);

  const handleAddNote = async () => {
    if (!newNoteContent.trim() || !canWriteNotes) return;
    try {
      await createNoteMutation.mutateAsync({
        content: newNoteContent.trim(),
      });
      setNewNoteContent("");
      setIsNoteEditorOpen(false);
      toast.success("Saved");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!canWriteNotes) return;
    try {
      await deleteNoteMutation.mutateAsync(noteId);
      toast.success("Removed");
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove");
    }
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      await deleteDocMutation.mutateAsync({ id, studentId: student.id });
      toast.success("Document deleted");
    } catch {
      toast.error("Failed to delete document");
    }
  };

  const handleDeleteDexterity = async (id: string) => {
    try {
      await deleteDexterityMutation.mutateAsync(id);
      toast.success("Dexterity activity deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete activity");
    }
  };

  const resetDexterityForm = () => {
    setDexActivity("");
    setDexDescription("");
  };

  const handleAddDexterity = async () => {
    if (!dexActivity.trim()) {
      toast.error("Activity name is required");
      return;
    }
    try {
      await createDexterityMutation.mutateAsync({
        activity: dexActivity.trim(),
        description: dexDescription.trim(),
      });
      resetDexterityForm();
      setIsAddDexterityOpen(false);
      toast.success("Activity added");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add activity");
    }
  };

  const resetCredentialForm = () => {
    setEditingCredentialId(null);
    setCredentialKind("LICENSE");
    setCredentialTitle("");
    setCredentialIssuer("");
    setCredentialYear("");
    setCredentialDescription("");
  };

  const openAddCredential = (kind: StudentCredentialKind = "LICENSE") => {
    resetCredentialForm();
    setCredentialKind(kind);
    setIsAddCredentialOpen(true);
  };

  const openEditCredential = (item: {
    id: string;
    kind: StudentCredentialKind;
    title: string;
    issuer?: string | null;
    year?: string | null;
    description?: string | null;
  }) => {
    setEditingCredentialId(item.id);
    setCredentialKind(item.kind);
    setCredentialTitle(item.title || "");
    setCredentialIssuer(item.issuer || "");
    setCredentialYear(item.year || "");
    setCredentialDescription(item.description || "");
    setIsAddCredentialOpen(true);
  };

  const handleSaveCredential = async () => {
    if (!credentialTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    const payload = {
      kind: credentialKind,
      title: credentialTitle.trim(),
      issuer: credentialIssuer.trim(),
      year: credentialYear.trim(),
      description: credentialDescription.trim(),
    };
    try {
      if (editingCredentialId) {
        await updateCredentialMutation.mutateAsync({
          itemId: editingCredentialId,
          updates: payload,
        });
        toast.success(
          credentialKind === "LICENSE" ? "License updated" : "Achievement updated",
        );
      } else {
        await createCredentialMutation.mutateAsync(payload);
        toast.success(
          credentialKind === "LICENSE" ? "License added" : "Achievement added",
        );
      }
      resetCredentialForm();
      setIsAddCredentialOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save");
    }
  };

  const handleDeleteCredential = async (id: string) => {
    try {
      await deleteCredentialMutation.mutateAsync(id);
      toast.success("Removed");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    }
  };

  const handleSyncHours = async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.experiences.all(student.id),
    });
    await refetchExperiences();
    toast.success("Hours refreshed from tracker");
  };

  const handleDownloadProfile = async () => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const safeName = (student.name || "student").replace(/[^\w\-]+/g, "_");
      await studentsApi.exportPdf(student.id, `${safeName}_profile.pdf`);
      toast.success("PDF downloaded");
    } catch (err: any) {
      toast.error(err?.message || "Failed to download PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleShareProfile = async () => {
    try {
      const { token, shareUrl } = await studentsApi.createShareLink(student.id);
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}/share/students/${token}`
          : shareUrl;
      await navigator.clipboard.writeText(url);
      toast.success("Public read-only link copied");
    } catch (err: any) {
      toast.error(err?.message || "Could not create share link");
    }
  };

  const handleOpenDocument = async (docId: string) => {
    setOpeningDocId(docId);
    try {
      const detail = await documentsApi.get(docId);
      if (!detail.downloadUrl) {
        toast.error("Could not open document — signed URL unavailable");
        return;
      }
      window.open(detail.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast.error(err?.message || "Failed to open document");
    } finally {
      setOpeningDocId(null);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !canEditAvatar) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      const updated = await usersApi.uploadAvatar(file);
      onUpdateStudent?.({ avatar: updated.avatar });
      queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(student.id) });
      if (user && user.id === updated.id) {
        const nextUser = { ...user, avatar: updated.avatar };
        setAuthUser(nextUser);
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
        } catch {
          /* ignore */
        }
      }
      toast.success("Profile photo updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload profile photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadTitle.trim()) {
      toast.error("Please provide a title");
      return;
    }
    if (!uploadFile) {
      toast.error("Please select a file to upload");
      return;
    }

    try {
      await uploadDocMutation.mutateAsync({
        file: uploadFile,
        title: uploadTitle.trim(),
        type: selectedDocType as any,
        studentId: student.id,
      });

      if (selectedDocType === "Essay" && student.profile?.mentor_id) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 4);
        await createTaskMutation.mutateAsync({
          assignedTo: student.profile.mentor_id,
          task: `Review Essay: ${uploadTitle.trim()}`,
          description: `Student ${student.name} submitted an essay for review.`,
          dueDate: dueDate.toISOString().split("T")[0],
          priority: "MEDIUM",
          studentId: student.id,
        });
      }

      toast.success("Document uploaded successfully");
      setIsAddDocOpen(false);
      setSelectedDocType("Transcript");
      setUploadTitle("");
      setUploadFile(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload document");
    }
  };

  const documentColumns: Column<StudentDocument>[] = useMemo(
    () => [
      {
        key: "title",
        header: "Document Name",
        render: (doc) => (
          <div className="flex min-w-0 max-w-[14rem] items-center gap-3 sm:max-w-xs">
            <div className="shrink-0 rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400">
              <FileText size={16} />
            </div>
            <span className="truncate font-semibold text-white" title={doc.title}>
              {doc.title}
            </span>
          </div>
        ),
      },
      {
        key: "type",
        header: "Type",
        render: (doc) => <span className="text-slate-400">{doc.type}</span>,
      },
      {
        key: "status",
        header: "Status",
        render: (doc) => (
          <Badge
            variant={
              doc.status === "Reviewed"
                ? "success"
                : doc.status === "Pending Review"
                  ? "warning"
                  : "danger"
            }
          >
            {doc.status === "Reviewed" ? "Verified" : doc.status}
          </Badge>
        ),
      },
      {
        key: "uploaded_at",
        header: "Uploaded",
        render: (doc) => (
          <span className="text-slate-500">
            {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : "—"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (doc) => {
          const busy = reviewingDocId === doc.id;
          const pending = doc.status === "Pending Review";
          return (
            <div className="flex flex-nowrap items-center justify-end gap-1">
              {canReviewDocuments && pending && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-8 shrink-0 px-2 text-emerald-300 hover:text-emerald-200"
                    disabled={busy}
                    isLoading={busy}
                    leftIcon={!busy ? <ShieldCheck size={14} /> : undefined}
                    onClick={() => void reviewDocument(doc.id, "Reviewed")}
                  >
                    Verify
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 shrink-0 px-2 text-rose-300 hover:text-rose-200"
                    disabled={busy}
                    leftIcon={<XCircle size={14} />}
                    onClick={() => void reviewDocument(doc.id, "Cancelled")}
                  >
                    Cancel
                  </Button>
                </>
              )}
              {doc.url && doc.url !== "#" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => void handleOpenDocument(doc.id)}
                  disabled={openingDocId === doc.id}
                  aria-label="Open document"
                >
                  {openingDocId === doc.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Eye size={16} />
                  )}
                </Button>
              ) : null}
              {(canEditOwnProfile || canReviewDocuments) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500 hover:text-rose-400"
                  onClick={() => handleDeleteDoc(doc.id)}
                  aria-label="Delete document"
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [student.id, canReviewDocuments, canEditOwnProfile, reviewingDocId, openingDocId],
  );

  const renderStatBlock = (
    label: string,
    value: string | number | undefined | null,
    icon: any,
    verified?: boolean
  ) => (
    <div className="relative min-w-0 overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/50 p-3 transition-colors hover:border-indigo-500/35 sm:rounded-2xl sm:p-4">
      <div className="relative z-10 mb-2 flex items-center justify-between gap-2 sm:mb-3">
        <div className="rounded-lg bg-slate-900 p-1.5 text-slate-400 sm:p-2">
          {React.createElement(icon, { size: 16 })}
        </div>
        {verified === true && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
            <ShieldCheck size={10} />
            Verified
          </span>
        )}
      </div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 sm:text-[10px]">
        {label}
      </p>
      <p className="mt-1 min-w-0 break-words text-sm font-semibold tabular-nums text-white sm:text-lg">
        {value ?? "—"}
      </p>
    </div>
  );

  return (
    <div
      ref={contentRef}
      className="grid w-full min-w-0 grid-cols-1 gap-4 overflow-x-clip pb-20 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-x-8 lg:gap-y-6"
    >
      {/* Profile header — first on mobile so sticky nav cannot cover the name */}
      <header className="order-1 min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 sm:rounded-3xl lg:col-start-2 lg:row-start-1">
        <div className="flex min-w-0 flex-col gap-4 p-4 sm:gap-6 sm:p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-5">
            <div className="relative shrink-0">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-900 text-xl font-bold text-white ring-4 ring-slate-950 sm:h-20 sm:w-20 sm:rounded-2xl sm:text-2xl">
                {student.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={student.avatar} className="h-full w-full object-cover" alt="" />
                ) : (
                  student.name[0]?.toUpperCase()
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-300" />
                  </div>
                )}
              </div>
              {canEditAvatar && (
                <>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={(e) => void handleAvatarChange(e)}
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-950 bg-indigo-500 text-white shadow transition hover:bg-indigo-400 disabled:opacity-60"
                    aria-label="Upload profile photo"
                    title="Upload profile photo"
                  >
                    <Camera size={13} />
                  </button>
                </>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="break-words text-xl font-bold tracking-tight text-white sm:truncate sm:text-2xl md:text-3xl">
                {student.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    student.profile?.status === "Preparing"
                      ? "border-indigo-500/25 bg-indigo-500/10 text-indigo-300"
                      : student.profile?.status === "Applying"
                        ? "border-amber-500/25 bg-amber-500/10 text-amber-300"
                        : "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                  }`}
                >
                  {student.profile?.status || "Preparing"}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    readinessStatusFromPercent(readinessProgress) === "GREEN"
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                      : readinessStatusFromPercent(readinessProgress) === "RED"
                        ? "border-rose-500/25 bg-rose-500/10 text-rose-300"
                        : "border-amber-500/25 bg-amber-500/10 text-amber-300"
                  }`}
                >
                  {readinessStatusFromPercent(readinessProgress).toLowerCase()} readiness
                </span>
              </div>
              <div className="mt-2 flex flex-col gap-1 text-sm text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <Calendar size={14} className="shrink-0" /> Cycle{" "}
                  {student.profile?.application_cycle || "—"}
                </span>
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <MapPin size={14} className="shrink-0" />
                  <span className="break-words">
                    {[student.profile?.state || student.state, student.profile?.country || student.country]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex w-full min-w-0 items-center justify-between gap-3 border-t border-slate-800/80 pt-3 sm:gap-4 md:w-auto md:justify-end md:border-0 md:pt-0">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center sm:h-16 sm:w-16">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#1e293b" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${Math.max(0, Math.min(100, Number(displayStrength) || 0)) * 0.973} 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm font-bold tabular-nums text-white">
                    {displayStrength || 0}
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Strength
                </p>
                <p className="text-xs text-slate-400">Competitive score</p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void handleDownloadProfile()}
                disabled={downloadingPdf}
                aria-label="Download profile PDF"
                title={downloadingPdf ? "Generating PDF…" : "Download profile PDF"}
              >
                {downloadingPdf ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Download size={18} />
                )}
              </Button>
              <Button
                type="button"
                leftIcon={<Share2 size={16} />}
                onClick={handleShareProfile}
              >
                Share
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Section nav — below header on mobile; left rail on desktop */}
      <aside
        aria-label="Records sections"
        className="sticky top-2 z-20 order-2 min-w-0 self-start lg:col-start-1 lg:row-span-2 lg:top-24 lg:self-start"
      >
        <nav className="overflow-x-auto overflow-y-hidden rounded-2xl border border-slate-800 bg-slate-950/95 p-1.5 shadow-lg shadow-black/20 backdrop-blur-md no-scrollbar sm:p-2 lg:overflow-visible lg:bg-slate-950 lg:shadow-none lg:backdrop-blur-none">
          <div className="flex gap-1 lg:flex-col lg:space-y-1 lg:gap-0">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium transition-colors sm:px-3 sm:py-2.5 sm:text-sm lg:w-full lg:gap-3 lg:px-3.5 ${
                  activeSection === section.id
                    ? "bg-primary text-primary-foreground"
                    : "text-slate-500 hover:bg-slate-900/60 hover:text-slate-200"
                }`}
              >
                <section.icon size={16} className="shrink-0" />
                <span className="whitespace-nowrap lg:truncate">{section.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </aside>

      {/* Main sections */}
      <div className="order-3 min-w-0 space-y-8 sm:space-y-12 lg:col-start-2 lg:row-start-2">
        {/* Student Snapshot Section — identity / progress only (academics live below) */}
        <section id="snapshot" className="min-w-0 space-y-5 scroll-mt-24 lg:scroll-mt-28">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-white">Student Snapshot</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {canEditOwnProfile
                  ? "Your identity and progress at a glance."
                  : canReviewDocuments
                    ? "Read-only identity snapshot. Academics are in the next section."
                    : "Identity and progress overview."}
              </p>
            </div>
            {canEditOwnProfile && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Pencil className="h-3.5 w-3.5" />}
                onClick={openPersonalEditor}
              >
                Edit personal
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
            {renderStatBlock("Full Name", student.name, User)}
            {renderStatBlock(
              "Location",
              [
                isUnitedStates(student.profile?.country || student.country)
                  ? student.profile?.state || student.state
                  : null,
                student.profile?.country || student.country,
              ]
                .filter(Boolean)
                .join(", ") || "—",
              MapPin,
            )}
            {renderStatBlock("Ethnicity", student.profile?.ethnicity ?? student.ethnicity, Globe)}
            {renderStatBlock("Gender", student.profile?.gender ?? student.gender, Venus)}
            {renderStatBlock("Age", student.profile?.age ?? student.age, Calendar)}
            {renderStatBlock("Strength Score", displayStrength, GraduationCap)}
            {renderStatBlock(
              "Goal Application Cycle",
              student.profile?.application_cycle || student.applicationCycle || "—",
              Target,
            )}
            {renderStatBlock(
              "Applicant type",
              student.profile?.applicant_type === "REAPPLICANT"
                ? "Reapplicant"
                : student.profile?.applicant_type === "FIRST_TIME"
                  ? "First-time"
                  : student.isReapplicant || student.profile?.is_reapplicant
                    ? "Reapplicant"
                    : "—",
              Fingerprint,
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {progressDonut(readinessProgress, "Application Readiness", "text-indigo-400")}
            {progressDonut(profileCompleteness, "Profile Completion", "text-emerald-400")}
          </div>
        </section>

        {showReadinessSection ? (
          <section id="readiness" className="space-y-4 scroll-mt-24 lg:scroll-mt-28">
            <ApplicationReadinessPanel student={student} />
          </section>
        ) : null}

        {/* Academic Background Section */}
        <section id="academic" className="min-w-0 space-y-6 scroll-mt-24 lg:scroll-mt-28">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="flex min-w-0 items-center gap-2 text-xl font-bold text-white">
              <GraduationCap className="shrink-0 text-indigo-400" size={20} /> Academic Background
            </h2>
            {canEditOwnProfile && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Pencil className="h-3.5 w-3.5" />}
                onClick={openAcademicEditor}
              >
                Edit academics
              </Button>
            )}
          </div>
          <div className="min-w-0 space-y-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:space-y-8 sm:rounded-3xl sm:p-6 md:p-8">
            <div className="grid gap-6 md:grid-cols-3 md:gap-8">
              <div className="min-w-0">
                <label className="mb-2 block text-xs font-bold uppercase text-slate-500">
                  Major
                </label>
                <p className="break-words text-lg font-bold text-white">
                  {student.profile?.major || "Not specified"}
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                  GPA
                  {(student.profile?.gpa_verified || student.gpaVerified) && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                      <ShieldCheck size={10} />
                      Verified
                    </span>
                  )}
                </label>
                <p className="text-lg font-bold tabular-nums text-white">
                  {student.profile?.gpa ?? student.gpa ?? "Not specified"}
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  sGPA
                </label>
                <p className="text-lg font-bold tabular-nums text-white">
                  {student.profile?.sgpa ?? "Not specified"}
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Online classes
                </label>
                <p className="text-lg font-bold text-white">
                  {student.profile?.took_online_classes == null
                    ? "Not specified"
                    : student.profile.took_online_classes
                      ? "Yes"
                      : "No"}
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Community college classes
                </label>
                <p className="text-lg font-bold text-white">
                  {student.profile?.took_cc_classes == null
                    ? "Not specified"
                    : student.profile.took_cc_classes
                      ? "Yes"
                      : "No"}
                </p>
              </div>
              <div className="min-w-0">
                <label className="mb-2 block text-xs font-bold uppercase text-slate-500">
                  Undergraduate institution
                </label>
                <p className="break-words text-lg font-bold text-white">
                  {student.profile?.undergrad_institution || "Not specified"}
                </p>
              </div>
            </div>

            <div className="h-[1px] bg-slate-800" />

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">
                Additional schooling
              </label>
              <div className="grid gap-4 md:grid-cols-3">
                {(student.profile?.post_bac?.enabled ||
                  student.profile?.additional_schooling?.includes("POST_BAC")) && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                    <p className="text-sm font-bold text-white">Post-Bac Program</p>
                    <p className="mt-2 text-xs uppercase tracking-wider text-slate-500">GPA</p>
                    <p className="text-lg font-bold tabular-nums text-white">
                      {student.profile?.post_bac?.gpa ?? "—"}
                    </p>
                  </div>
                )}
                {(student.profile?.masters?.enabled ||
                  student.profile?.additional_schooling?.includes("MASTERS")) && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                    <p className="text-sm font-bold text-white">Masters</p>
                    <p className="mt-2 text-xs uppercase tracking-wider text-slate-500">GPA</p>
                    <p className="text-lg font-bold tabular-nums text-white">
                      {student.profile?.masters?.gpa ?? "—"}
                    </p>
                  </div>
                )}
                {(student.profile?.additional_schooling?.includes("OTHER") ||
                  student.profile?.additional_schooling_other) && (
                  <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                    <p className="text-sm font-bold text-white">Other</p>
                    <p className="mt-2 break-words text-sm text-slate-300">
                      {student.profile?.additional_schooling_other || "—"}
                    </p>
                  </div>
                )}
                {!student.profile?.post_bac?.enabled &&
                  !student.profile?.masters?.enabled &&
                  !(student.profile?.additional_schooling?.length) && (
                    <p className="text-sm text-slate-500">None specified</p>
                  )}
              </div>
            </div>

            <div className="h-[1px] bg-slate-800" />

            <div>
              <label className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
                DAT
                {(student.profile?.dat_verified || student.datVerified) && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                    <ShieldCheck size={10} />
                    Verified
                  </span>
                )}
              </label>
              <p className="mb-4 text-sm font-semibold text-white">
                {DAT_TYPES.find((d) => d.value === student.profile?.dat_type)?.label ||
                  (student.profile?.dat_aa != null || student.datAA != null
                    ? "Scores on file"
                    : "Not specified")}
              </p>
              {student.profile?.dat_type !== "NOT_TAKEN" && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    { label: "AA", value: student.profile?.dat_aa ?? student.datAA },
                    { label: "PAT", value: student.profile?.dat_pat },
                    { label: "BIO", value: student.profile?.dat_bio },
                    { label: "GC", value: student.profile?.dat_gc },
                    { label: "OC", value: student.profile?.dat_oc },
                    { label: "RC", value: student.profile?.dat_rc },
                    { label: "QR", value: student.profile?.dat_qr },
                    { label: "SNS", value: student.profile?.dat_sns },
                    { label: "TS", value: student.profile?.dat_ts ?? student.datTS },
                    { label: "MDT", value: student.profile?.dat_mdt },
                  ]
                    .filter((row) => row.value != null)
                    .map((row) => (
                      <div
                        key={row.label}
                        className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {row.label}
                        </p>
                        <p className="text-base font-bold tabular-nums text-white">{row.value}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {(student.profile?.considering_schools?.length || 0) > 0 && (
              <>
                <div className="h-[1px] bg-slate-800" />
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">
                    Schools currently considering
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {student.profile!.considering_schools!.map((s) => (
                      <span
                        key={s.id}
                        className="rounded-lg border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-100"
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {(student.profile?.applicant_type === "REAPPLICANT" ||
              student.profile?.is_reapplicant) &&
              (student.profile?.reapplicant_schools?.length || 0) > 0 && (
                <>
                  <div className="h-[1px] bg-slate-800" />
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">
                      Previous application schools
                    </label>
                    <div className="space-y-2">
                      {student.profile!.reapplicant_schools!.map((s) => (
                        <div
                          key={s.schoolId}
                          className="flex min-w-0 flex-col gap-1 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2"
                        >
                          <p className="min-w-0 break-words text-sm font-medium text-white">
                            {s.schoolName}
                          </p>
                          <p className="break-words text-xs text-slate-400">
                            {normalizeReapplicantOutcomes(s.outcomes).join(" · ") || "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
          </div>
        </section>

        {/* Letters of Recommendation Tracker — synced with Letter Vault */}
        <section id="lor" className="space-y-6 scroll-mt-24 lg:scroll-mt-28">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="text-indigo-400" size={20} /> Letters of Recommendation
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {canEditOwnProfile && !lorExternalEnabled && (
                <Link
                  href="/student/letters/vault"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-indigo-500/40 hover:text-white"
                >
                  Open Letter Vault
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
              <div className="flex items-center gap-3 bg-slate-900/40 border border-slate-800 px-4 py-2 rounded-xl">
                <span className="text-xs font-bold text-slate-500 uppercase">External Service</span>
                <button
                  type="button"
                  onClick={toggleLorExternal}
                  disabled={!canEditOwnProfile}
                  title={
                    canEditOwnProfile
                      ? lorExternalEnabled
                        ? "Using an external service — mark letters collected manually"
                        : "Turn on if letters are collected outside Letter Vault"
                      : "Students control this on their profile"
                  }
                  className={`w-10 h-5 rounded-full p-1 transition-colors focus:outline-none ${
                    canEditOwnProfile ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                  } ${lorExternalEnabled ? "bg-indigo-600" : "bg-slate-800"}`}
                >
                  <div
                    className={`w-3 h-3 bg-white rounded-full transition-transform ${
                      lorExternalEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:space-y-8 sm:rounded-3xl sm:p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-1">
                <p className="text-4xl font-black text-white">
                  {lorReceived}
                  <span className="mx-2 text-slate-600">/</span>
                  {lorRequired}
                </p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  {lorExternalEnabled
                    ? "Letters marked collected"
                    : "Letters received & verified"}
                </p>
                <p className="text-xs text-slate-500">
                  {lorExternalEnabled
                    ? "External service mode — mark each letter when you collect it."
                    : "Counts Letter Vault requests after admin verification (Reviewed)."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[...Array(lorRequired)].map((_, i) => {
                  const filled = i < lorReceived;
                  const interactive = canEditOwnProfile && lorExternalEnabled;
                  return (
                    <motion.button
                      key={i}
                      type="button"
                      disabled={!interactive}
                      title={
                        interactive
                          ? filled
                            ? `Unmark letter ${i + 1}`
                            : `Mark letter ${i + 1} collected`
                          : undefined
                      }
                      onClick={() => {
                        if (!interactive) return;
                        // Clicking a filled slot sets count to that index (remove last);
                        // clicking empty sets count to i+1
                        setExternalCollected(filled ? i : i + 1);
                      }}
                      initial={false}
                      animate={{
                        backgroundColor: filled ? "#4f46e5" : "#0f172a",
                        scale: filled ? 1 : 1,
                      }}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 transition-opacity ${
                        interactive
                          ? "cursor-pointer hover:opacity-90"
                          : "cursor-default"
                      }`}
                    >
                      {filled ? (
                        <CheckCircle2 size={20} className="text-white" />
                      ) : (
                        <FileText size={18} className="text-slate-700" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="relative h-3 overflow-hidden rounded-full border border-slate-800 bg-slate-950">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${lorRequired ? (lorReceived / lorRequired) * 100 : 0}%`,
                }}
                className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]"
              />
            </div>

            {lorExternalEnabled && canEditOwnProfile && (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                <p className="mr-auto text-sm text-slate-300">
                  Manually track letters collected outside the vault.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  leftIcon={<Minus size={14} />}
                  disabled={lorReceived <= 0}
                  onClick={() => setExternalCollected(lorReceived - 1)}
                >
                  Remove one
                </Button>
                <Button
                  type="button"
                  size="sm"
                  leftIcon={<Plus size={14} />}
                  disabled={lorReceived >= lorRequired}
                  onClick={() => setExternalCollected(lorReceived + 1)}
                >
                  Mark collected
                </Button>
              </div>
            )}

            {!lorExternalEnabled && (
              <div className="space-y-4 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Letter Vault requests
                  </h3>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                    {vaultReviewedCount} verified
                  </span>
                </div>
                <div className="grid gap-3">
                  {lorLoading && (
                    <p className="py-4 text-center text-xs text-slate-500">Loading requests…</p>
                  )}
                  {!lorLoading &&
                    lorRequests.map((req) => {
                      const statusLabel =
                        req.status === "REVIEWED"
                          ? "Verified"
                          : req.status === "UPLOADED"
                            ? "Uploaded — pending review"
                            : req.status === "DECLINED"
                              ? "Declined"
                              : "Requested";
                      return (
                        <div
                          key={req.id}
                          className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-4">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                                req.status === "REVIEWED"
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                  : req.status === "UPLOADED"
                                    ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                                    : req.status === "DECLINED"
                                      ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                                      : "border-slate-800 bg-slate-900 text-slate-400"
                              }`}
                            >
                              {req.status === "REVIEWED" ? (
                                <CheckCircle2 size={16} />
                              ) : (
                                <User size={16} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-white">{req.writerName}</p>
                              <p className="truncate text-[10px] text-slate-500">{req.writerEmail}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                            <div className="text-left sm:text-right">
                              <p className="mb-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-600">
                                Due
                              </p>
                              <p className="text-xs font-bold text-slate-400">
                                {req.dueDate
                                  ? new Date(req.dueDate).toLocaleDateString()
                                  : "—"}
                              </p>
                            </div>
                            {req.uploadedAt && (
                              <div className="text-left sm:text-right">
                                <p className="mb-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-600">
                                  Uploaded
                                </p>
                                <p className="text-xs font-bold text-slate-400">
                                  {new Date(req.uploadedAt).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                            <div
                              className={`rounded-lg border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                                req.status === "REVIEWED"
                                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                  : req.status === "UPLOADED"
                                    ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-400"
                                    : req.status === "DECLINED"
                                      ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
                                      : "border-amber-500/20 bg-amber-500/10 text-amber-400"
                              }`}
                            >
                              {statusLabel}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  {!lorLoading && lorRequests.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-800 py-8 text-center">
                      <p className="text-xs italic text-slate-500">
                        No Letter Vault requests yet.
                      </p>
                      {canEditOwnProfile && (
                        <Link
                          href="/student/letters/vault"
                          className="mt-3 inline-flex text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                        >
                          Request a letter in Letter Vault â†’
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Manual Dexterity Development Section */}
        <section id="dexterity" className="space-y-6 scroll-mt-24 lg:scroll-mt-28">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Fingerprint className="text-indigo-400" size={20} /> Manual Dexterity Development
            </h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={() => setIsAddDexterityOpen(true)}
            >
              Add Activity
            </Button>
          </div>
          <div className="space-y-4">
            {manualDexterity.map((activity) => (
              <div
                key={activity.id}
                className="group flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 transition-all hover:border-indigo-500/30 sm:p-6"
              >
                <div className="min-w-0 space-y-2">
                  <h4 className="break-words text-lg font-bold text-white">{activity.activity}</h4>
                  {activity.description ? (
                    <p className="max-w-2xl break-words text-sm leading-relaxed text-slate-400">
                      {activity.description}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-slate-600 hover:text-rose-400"
                  onClick={() => handleDeleteDexterity(activity.id)}
                  aria-label="Delete activity"
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            ))}
            {manualDexterity.length === 0 && (
              <EmptyState
                icon={<Fingerprint className="h-10 w-10" />}
                title="No manual dexterity activities logged yet."
              />
            )}
          </div>
        </section>

        {/* Licenses & Achievements */}
        <section id="credentials" className="space-y-6 scroll-mt-24 lg:scroll-mt-28">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Trophy className="text-indigo-400" size={20} /> Licenses & Achievements
            </h2>
            {(canEditOwnProfile || canReviewDocuments) && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={() => openAddCredential("LICENSE")}
              >
                Add
              </Button>
            )}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Medal className="h-4 w-4 text-amber-400" /> Licenses
              </h3>
              {licenses.length === 0 ? (
                <p className="text-xs italic text-slate-500">No licenses listed yet.</p>
              ) : (
                licenses.map((item) => (
                  <div
                    key={item.id}
                    className="flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-white">{item.title}</p>
                      {(item.issuer || item.year) && (
                        <p className="mt-1 break-words text-xs text-slate-500">
                          {[item.issuer, item.year].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {item.description ? (
                        <p className="mt-2 break-words text-sm text-slate-400">{item.description}</p>
                      ) : null}
                    </div>
                    {(canEditOwnProfile || canReviewDocuments) && (
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-slate-600 hover:text-indigo-400"
                          onClick={() => openEditCredential(item)}
                          aria-label="Edit license"
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-slate-600 hover:text-rose-400"
                          onClick={() => void handleDeleteCredential(item.id)}
                          aria-label="Delete license"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Trophy className="h-4 w-4 text-indigo-400" /> Achievements
              </h3>
              {achievements.length === 0 ? (
                <p className="text-xs italic text-slate-500">No achievements listed yet.</p>
              ) : (
                achievements.map((item) => (
                  <div
                    key={item.id}
                    className="flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-white">{item.title}</p>
                      {(item.issuer || item.year) && (
                        <p className="mt-1 break-words text-xs text-slate-500">
                          {[item.issuer, item.year].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {item.description ? (
                        <p className="mt-2 break-words text-sm text-slate-400">{item.description}</p>
                      ) : null}
                    </div>
                    {(canEditOwnProfile || canReviewDocuments) && (
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-slate-600 hover:text-indigo-400"
                          onClick={() => openEditCredential(item)}
                          aria-label="Edit achievement"
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-slate-600 hover:text-rose-400"
                          onClick={() => void handleDeleteCredential(item.id)}
                          aria-label="Delete achievement"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Experience Summary Section */}
        <section id="experience" className="space-y-6 scroll-mt-24 lg:scroll-mt-28">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Briefcase className="text-indigo-400" size={20} /> Experience Summary
            </h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<History size={14} />}
              onClick={handleSyncHours}
            >
              Sync from Hour Tracker
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {experienceStats.map((stat) => (
              <div
                key={stat.category}
                className="group min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 transition-all sm:rounded-3xl"
              >
                <button
                  onClick={() =>
                    setExpandedCategory(
                      expandedCategory === stat.category ? null : stat.category
                    )
                  }
                  className="flex w-full min-w-0 cursor-pointer items-center justify-between gap-3 p-4 transition-colors hover:bg-slate-800/30 sm:p-6 md:p-8"
                >
                  <div className="flex min-w-0 items-center gap-3 sm:gap-6">
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 transition-all group-hover:border-indigo-500/30 sm:h-16 sm:w-16">
                      <p className="text-xl font-black text-white">{stat.hours}</p>
                      <p className="text-[8px] font-bold uppercase text-slate-500">Hours</p>
                    </div>
                    <div className="min-w-0 text-left">
                      <h4 className="truncate text-base font-bold text-white sm:text-lg">
                        {stat.category}
                      </h4>
                      <p className="text-xs font-medium text-slate-500">
                        {stat.entries.length} Total Entries
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 rounded-xl bg-slate-800/60 p-2 text-slate-500 transition-all group-hover:text-white">
                    {expandedCategory === stat.category ? (
                      <ChevronDown size={20} />
                    ) : (
                      <ChevronRight size={20} />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {expandedCategory === stat.category && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-800 bg-slate-950/30 overflow-hidden"
                    >
                      <div className="p-6 space-y-4">
                        {stat.entries.map((entry) => (
                          <div
                            key={entry.id}
                            className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4"
                          >
                            <div>
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                {entry.isCurrent && (
                                  <Badge variant="success">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                                    Current
                                  </Badge>
                                )}
                              </div>
                              <h5 className="break-words font-bold text-white">{entry.title}</h5>
                              {entry.location && entry.location !== "—" ? (
                                <p className="mt-0.5 break-words text-sm text-slate-400">
                                  {entry.location}
                                </p>
                              ) : null}
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-2.5">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                  Total Hours
                                </p>
                                <p className="text-base font-semibold text-white">
                                  {Number(entry.totalHours.toFixed(1))}
                                </p>
                              </div>
                              <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-2.5">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                  Avg Hrs/Wk
                                </p>
                                <p className="text-base font-semibold text-white">
                                  {entry.avgHoursPerWeek.toFixed(1)}
                                </p>
                              </div>
                              <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-2.5">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                  Weeks
                                </p>
                                <p className="text-base font-semibold text-white">
                                  {entry.totalWeeks}
                                </p>
                              </div>
                              <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-2.5">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                  Timeline
                                </p>
                                <p className="text-xs font-medium text-slate-300">
                                  {entry.displayStartDate} – {entry.displayEndDate}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {stat.entries.length === 0 && (
                          <p className="text-center py-4 text-xs text-slate-600 italic">
                            No entries for this category.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

        {/* Additional Information */}
        <section id="notes" className="space-y-6 scroll-mt-24 lg:scroll-mt-28">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageSquare className="text-indigo-400" size={20} /> Additional Information
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Anything else you want staff to know — context, updates, or notes about your profile.
              </p>
            </div>
            {canWriteNotes ? (
              <Button
                type="button"
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={() => setIsNoteEditorOpen(true)}
              >
                Add info
              </Button>
            ) : null}
          </div>

          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 sm:rounded-3xl">
            <div className="space-y-6 p-4 sm:space-y-8 sm:p-6 md:p-8">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="relative space-y-4 pl-6 before:absolute before:bottom-0 before:left-0 before:top-0 before:w-[2px] before:bg-indigo-500/30 sm:pl-8"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-[10px] font-bold text-white">
                        {(note.authorName || "?")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{note.authorName}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          {new Date(note.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {note.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={
                            tag === "Risk"
                              ? "danger"
                              : tag === "Strength"
                                ? "success"
                                : tag === "Academic"
                                  ? "primary"
                                  : "warning"
                          }
                        >
                          {tag}
                        </Badge>
                      ))}
                      {canWriteNotes ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-rose-400"
                          onClick={() => handleDeleteNote(note.id)}
                          aria-label="Delete entry"
                        >
                          <Trash2 size={14} />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 sm:p-6">
                    <p className="break-words text-sm leading-relaxed whitespace-pre-wrap text-slate-300">
                      {note.content}
                    </p>
                  </div>
                </div>
              ))}
              {notes.length === 0 && (
                <EmptyState
                  icon={<MessageSquare className="h-10 w-10" />}
                  title="No additional information yet."
                  description={
                    canWriteNotes
                      ? "Add anything that doesn't fit elsewhere on your profile."
                      : undefined
                  }
                />
              )}
            </div>
          </div>
        </section>

        {/* Documents & File Management Center */}
        <section id="documents" className="space-y-6 scroll-mt-24 lg:scroll-mt-28">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Upload className="text-indigo-400" size={20} /> Documents & File Management
              </h2>
              {canReviewDocuments && (
                <p className="mt-1 text-xs text-slate-500">
                  Pending uploads can be verified or cancelled here.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                leftIcon={<Upload size={14} />}
                onClick={() => setIsAddDocOpen(true)}
              >
                Upload File
              </Button>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 sm:rounded-3xl">
            <div className="flex min-w-0 flex-col items-stretch justify-between gap-3 border-b border-slate-800 bg-slate-900/20 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-6">
              <div className="relative w-full min-w-0 max-w-md">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={16}
                />
                <Input
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder="Search documents..."
                  className="w-full pl-10"
                />
              </div>
              <div className="w-full min-w-0 sm:w-56">
                <SelectMenu
                  value={docTypeFilter}
                  onChange={setDocTypeFilter}
                  options={[
                    { value: "All Types", label: "All Types" },
                    { value: "Transcript", label: "Transcript" },
                    { value: "Letter of Recommendation", label: "Letter of Recommendation" },
                    { value: "Resume", label: "Resume" },
                    { value: "Essay", label: "Essay" },
                    { value: "Previous Application", label: "Previous Application" },
                    { value: "Other", label: "Other" },
                  ]}
                />
              </div>
            </div>

            <div className="min-w-0 max-w-full overflow-x-auto overflow-y-hidden no-scrollbar">
              <Table
                columns={documentColumns}
                data={filteredDocuments}
                rowKey={(doc) => doc.id}
                emptyMessage="No matching documents found."
                className="min-w-0 rounded-none border-0"
              />
            </div>
          </div>
        </section>
      </div>

      <Modal
        open={isNoteEditorOpen}
        onClose={() => {
          setIsNoteEditorOpen(false);
          setNewNoteContent("");
        }}
        title="Add additional information"
        description="Visible to you and your mentoring team."
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsNoteEditorOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddNote}
              isLoading={createNoteMutation.isPending}
            >
              Save
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField label="Details" htmlFor="note-content" required>
            <Textarea
              id="note-content"
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Share any extra context, updates, or details about your application…"
              className="min-h-[140px]"
            />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={isAddDexterityOpen}
        onClose={() => {
          setIsAddDexterityOpen(false);
          resetDexterityForm();
        }}
        title="Add Manual Dexterity Activity"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsAddDexterityOpen(false);
                resetDexterityForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddDexterity}
              isLoading={createDexterityMutation.isPending}
            >
              Save Activity
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField label="Activity Name" htmlFor="dex-activity" required>
            <Input
              id="dex-activity"
              value={dexActivity}
              onChange={(e) => setDexActivity(e.target.value)}
              placeholder="e.g. Oil Painting, Piano, etc."
            />
          </FormField>
          <FormField label="Description" htmlFor="dex-description">
            <Textarea
              id="dex-description"
              value={dexDescription}
              onChange={(e) => setDexDescription(e.target.value)}
              placeholder="Describe your involvement..."
            />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={isAddCredentialOpen}
        onClose={() => {
          setIsAddCredentialOpen(false);
          resetCredentialForm();
        }}
        title={
          editingCredentialId
            ? "Edit License or Achievement"
            : "Add License or Achievement"
        }
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsAddCredentialOpen(false);
                resetCredentialForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveCredential()}
              isLoading={
                createCredentialMutation.isPending ||
                updateCredentialMutation.isPending
              }
            >
              {editingCredentialId ? "Save changes" : "Save"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField label="Type" required>
            <SelectMenu
              value={credentialKind}
              onChange={(v) => setCredentialKind(v as StudentCredentialKind)}
              options={[
                { value: "LICENSE", label: "License" },
                { value: "ACHIEVEMENT", label: "Achievement" },
              ]}
            />
          </FormField>
          <FormField label="Title" required>
            <Input
              value={credentialTitle}
              onChange={(e) => setCredentialTitle(e.target.value)}
              placeholder={
                credentialKind === "LICENSE"
                  ? "e.g. Dental Radiography License"
                  : "e.g. Dean's List"
              }
            />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Issuer / Organization">
              <Input
                value={credentialIssuer}
                onChange={(e) => setCredentialIssuer(e.target.value)}
                placeholder="Optional"
              />
            </FormField>
            <FormField label="Year">
              <Input
                value={credentialYear}
                onChange={(e) => setCredentialYear(e.target.value)}
                placeholder="e.g. 2024"
              />
            </FormField>
          </div>
          <FormField label="Notes">
            <Textarea
              value={credentialDescription}
              onChange={(e) => setCredentialDescription(e.target.value)}
              placeholder="Optional details"
              className="min-h-[80px]"
            />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={isAddDocOpen}
        onClose={() => {
          setIsAddDocOpen(false);
          setUploadTitle("");
          setUploadFile(null);
          setSelectedDocType("Transcript");
        }}
        title="Upload Document"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsAddDocOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUploadSubmit}
              isLoading={uploadDocMutation.isPending}
            >
              Complete Submission
            </Button>
          </div>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleUploadSubmit();
          }}
        >
          <FormField label="Document Title" htmlFor="doc-title" required>
            <Input
              id="doc-title"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="e.g. Fall 2023 Transcript"
            />
          </FormField>
          <FormField label="Document Type" required>
            <SelectMenu
              value={selectedDocType}
              onChange={setSelectedDocType}
              options={[
                { value: "Transcript", label: "Transcript" },
                { value: "Resume", label: "Resume" },
                { value: "Letter of Recommendation", label: "Letter of Recommendation" },
                { value: "Post-Bac Transcript", label: "Post-Bac Transcript" },
                { value: "DAT Report", label: "DAT Report" },
                { value: "Essay", label: "Essay" },
                { value: "Previous Application", label: "Previous Application" },
                { value: "Other", label: "Other" },
              ]}
            />
          </FormField>
          <FormField label="File" required hint="PDF, DOCX, or images (max 10MB)">
            <div className="relative rounded-xl border-2 border-dashed border-slate-800 p-8 text-center hover:border-indigo-500/50 transition-colors">
              <input
                type="file"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
              <Upload className="mx-auto mb-3 h-8 w-8 text-slate-600" />
              <p className="text-sm font-medium text-slate-400">
                {uploadFile ? uploadFile.name : "Click to select a file"}
              </p>
            </div>
          </FormField>
        </form>
      </Modal>

      {canEditOwnProfile && profileEditMode && (
        <ProfileDetailsEditModal
          open
          mode={profileEditMode}
          student={student}
          onClose={() => setProfileEditMode(null)}
        />
      )}
    </div>
  );
}
