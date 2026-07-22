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
  Clock,
  Search,
  MessageSquare,
  History,
  Tag,
  Download,
  Eye,
  Trash2,
  CheckCircle,
  Share2,
  Camera,
  Loader2,
  Pencil,
  XCircle,
} from "lucide-react";
import type { Student, StudentDocument, StudentNote } from "@/lib/types";
import {
  calculateStrengthScore,
  hoursByCategoryFromExperiences,
} from "@/lib/utils/strengthScore";
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
  DatePicker,
  Table,
  Badge,
  EmptyState,
  type Column,
} from "@/components/ui";
import { toast } from "sonner";
import { studentsApi } from "@/lib/api/students";
import { documentsApi } from "@/lib/api/documents";
import { usersApi } from "@/lib/api/users";

type NoteTag = StudentNote["tags"][number];

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
    user?.role === "MENTOR";
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
  const [snapshotEditOpen, setSnapshotEditOpen] = useState(false);
  const [snapshotSaving, setSnapshotSaving] = useState(false);
  const [snapshotForm, setSnapshotForm] = useState({
    name: "",
    state: "",
    country: "",
    ethnicity: "",
    gender: "",
    age: "",
    gpa: "",
    dat_aa: "",
    dat_ts: "",
  });

  const [activeSection, setActiveSection] = useState("snapshot");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const clickingSection = useRef<string | null>(null);

  const { data: experiences = [], refetch: refetchExperiences } = useExperiences(student.id);
  const { data: documents = [] } = useDocuments(student.id);
  const { data: applicationsForStrength = [] } = useApplications(student.id);
  const { data: schoolsForStrength = [] } = useStudentSchools(student.id);
  const { data: rawLorRequests = [] } = useLorRequests(undefined, student.name);
  const { data: notes = [] } = useStudentNotes(student.id);
  const { data: manualDexterity = [] } = useStudentDexterity(student.id);

  const computedStrength = useMemo(() => {
    const lorDocs = documents.filter((d) => d.type === "Letter of Recommendation").length;
    return calculateStrengthScore({
      gpa: student.gpa ?? student.profile?.gpa,
      gpaVerified: student.gpaVerified ?? student.profile?.gpa_verified,
      datAa: student.datAA ?? student.profile?.dat_aa,
      datScore: student.datScore ?? student.profile?.dat_score,
      datVerified: student.datVerified ?? student.profile?.dat_verified,
      hoursByCategory: hoursByCategoryFromExperiences(experiences),
      documentTypes: documents.map((d) => d.type),
      lorRequired: student.lorRequired ?? student.profile?.lor_required,
      lorReceivedApprox: lorDocs,
      applicationCount: applicationsForStrength.length,
      schoolCount: schoolsForStrength.length,
      isReapplicant: student.isReapplicant ?? student.profile?.is_reapplicant,
    }).total;
  }, [student, experiences, documents, applicationsForStrength, schoolsForStrength]);

  const storedStrength = Math.round(
    Number(student.strengthScore ?? student.profile?.strength_score ?? NaN),
  );

  const displayStrength =
    typeof strengthScoreProp === "number"
      ? strengthScoreProp
      : Number.isFinite(storedStrength)
        ? storedStrength
        : computedStrength;

  const lorRequests = useMemo(
    () => rawLorRequests.filter((r) => r.studentId === student.id),
    [rawLorRequests, student.id],
  );

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

  // Toggles / Modal States
  const [postBacEnabled, setPostBacEnabled] = useState(
    student.profile?.post_bac?.enabled || false
  );
  const [mastersEnabled, setMastersEnabled] = useState(
    student.profile?.masters?.enabled || false
  );
  const [lorExternalEnabled, setLorExternalEnabled] = useState(
    student.profile?.lor_external_service || false
  );

  useEffect(() => {
    setPostBacEnabled(student.profile?.post_bac?.enabled || false);
    setMastersEnabled(student.profile?.masters?.enabled || false);
    setLorExternalEnabled(student.profile?.lor_external_service || false);
  }, [
    student.id,
    student.profile?.post_bac?.enabled,
    student.profile?.masters?.enabled,
    student.profile?.lor_external_service,
  ]);

  const persistProfile = (updates: Record<string, unknown>, opts?: { silent?: boolean }) => {
    if (!onUpdateStudent) {
      toast.message("Profile editing isn’t available here");
      return;
    }
    onUpdateStudent(updates as Partial<Student>);
    if (!opts?.silent) toast.success("Profile updated");
  };

  const openSnapshotEditor = () => {
    setSnapshotForm({
      name: student.name || "",
      state: String(student.profile?.state ?? student.state ?? ""),
      country: String(student.profile?.country ?? student.country ?? ""),
      ethnicity: String(student.profile?.ethnicity ?? student.ethnicity ?? ""),
      gender: String(student.profile?.gender ?? student.gender ?? ""),
      age:
        student.profile?.age != null || student.age != null
          ? String(student.profile?.age ?? student.age)
          : "",
      gpa:
        student.profile?.gpa != null || student.gpa != null
          ? String(student.profile?.gpa ?? student.gpa)
          : "",
      dat_aa:
        student.profile?.dat_aa != null || student.datAA != null
          ? String(student.profile?.dat_aa ?? student.datAA)
          : "",
      dat_ts:
        student.profile?.dat_ts != null || student.datTS != null
          ? String(student.profile?.dat_ts ?? student.datTS)
          : "",
    });
    setSnapshotEditOpen(true);
  };

  const saveSnapshotEditor = async () => {
    if (!canEditOwnProfile || !onUpdateStudent) return;
    const name = snapshotForm.name.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }

    const ageRaw = snapshotForm.age.trim();
    const gpaRaw = snapshotForm.gpa.trim();
    const datAaRaw = snapshotForm.dat_aa.trim();
    const datTsRaw = snapshotForm.dat_ts.trim();
    const age = ageRaw === "" ? null : Number(ageRaw);
    const gpa = gpaRaw === "" ? null : Number(gpaRaw);
    const dat_aa = datAaRaw === "" ? null : Number(datAaRaw);
    const dat_ts = datTsRaw === "" ? null : Number(datTsRaw);

    if (ageRaw && (!Number.isFinite(age) || (age as number) < 0 || (age as number) > 120)) {
      toast.error("Enter a valid age");
      return;
    }
    if (gpaRaw && (!Number.isFinite(gpa) || (gpa as number) < 0 || (gpa as number) > 4.5)) {
      toast.error("GPA should be between 0 and 4.5");
      return;
    }
    if (datAaRaw && (!Number.isFinite(dat_aa) || (dat_aa as number) < 0 || (dat_aa as number) > 30)) {
      toast.error("DAT AA should be between 0 and 30");
      return;
    }
    if (datTsRaw && (!Number.isFinite(dat_ts) || (dat_ts as number) < 0 || (dat_ts as number) > 30)) {
      toast.error("DAT TS should be between 0 and 30");
      return;
    }

    setSnapshotSaving(true);
    try {
      // GPA/DAT changes clear verification on the server — no student-facing pending copy.
      await studentsApi.update(student.id, {
        name,
        state: snapshotForm.state.trim() || null,
        country: snapshotForm.country.trim() || null,
        ethnicity: snapshotForm.ethnicity.trim() || null,
        gender: snapshotForm.gender.trim() || null,
        age: age as number | null,
        gpa: gpa as number | null,
        dat_aa: dat_aa as number | null,
        dat_ts: dat_ts as number | null,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(student.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.students.strengthHistory(student.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.students.datHistory(student.id) }),
      ]);
      toast.success("Profile updated");
      setSnapshotEditOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile");
    } finally {
      setSnapshotSaving(false);
    }
  };

  const journeyProgress = Math.max(
    0,
    Math.min(100, Number(student.profile?.progress ?? student.progress ?? 0) || 0),
  );

  const profileCompleteness = useMemo(() => {
    const checks = [
      Boolean(student.name?.trim()),
      Boolean(student.profile?.state || student.state || student.profile?.country || student.country),
      Boolean(
        (student.profile?.ethnicity || student.ethnicity) &&
          (student.profile?.gender || student.gender) &&
          (student.profile?.age != null || student.age != null),
      ),
      (student.profile?.gpa != null || student.gpa != null) &&
        (student.profile?.dat_aa != null || student.datAA != null),
      Boolean(student.profile?.undergrad_institution),
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

  const togglePostBac = () => {
    if (!canEditOwnProfile) return;
    const next = !postBacEnabled;
    setPostBacEnabled(next);
    const existing = student.profile?.post_bac;
    persistProfile({
      post_bac: {
        enabled: next,
        institution: existing?.institution || "",
        strengthScore: existing?.strengthScore || 0,
        degreeType: existing?.degreeType || "",
        year: existing?.year || "",
      },
    });
  };

  const toggleMasters = () => {
    if (!canEditOwnProfile) return;
    const next = !mastersEnabled;
    setMastersEnabled(next);
    const existing = student.profile?.masters;
    persistProfile({
      masters: {
        enabled: next,
        institution: existing?.institution || "",
        strengthScore: existing?.strengthScore || 0,
        degreeType: existing?.degreeType || "",
        year: existing?.year || "",
      },
    });
  };

  const toggleLorExternal = () => {
    if (!canEditOwnProfile) return;
    const next = !lorExternalEnabled;
    setLorExternalEnabled(next);
    persistProfile({ lor_external_service: next });
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
  const [selectedNoteTags, setSelectedNoteTags] = useState<NoteTag[]>([]);
  const [dexActivity, setDexActivity] = useState("");
  const [dexDescription, setDexDescription] = useState("");
  const [dexStartDate, setDexStartDate] = useState("");
  const [dexEndDate, setDexEndDate] = useState("");
  const [dexOngoing, setDexOngoing] = useState(true);

  const sections = [
    { id: "snapshot", label: "Student Snapshot", icon: User },
    { id: "academic", label: "Academic Background", icon: GraduationCap },
    { id: "lor", label: "Letters of Rec", icon: FileText },
    { id: "dexterity", label: "Manual Dexterity", icon: Fingerprint },
    { id: "experience", label: "Experience Summary", icon: Briefcase },
    { id: "notes", label: "Mentor Notes", icon: MessageSquare },
    { id: "documents", label: "Document Center", icon: Upload },
  ] as const;

  const sectionIds = useMemo(() => sections.map((s) => s.id), []);

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

      const headerOffset = 112;
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
      "Employment",
    ] as const;
    return categories.map((cat) => {
      const catExps = (experiences || []).filter((e) => e.category === cat);
      const totalHours = catExps.reduce(
        (sum, e) =>
          sum +
          ((e.sessions || []).reduce((sSum, s) => sSum + s.duration, 0) || 0),
        0
      );
      return {
        category: cat,
        hours: totalHours,
        entries: catExps.map((e) => ({
          id: e.id,
          title: e.title,
          location: e.organization,
          description: e.description,
          startDate: e.startDate || e.start_date,
          endDate: e.endDate || e.end_date,
          hours: (e.sessions || []).reduce((sum, s) => sum + s.duration, 0) || 0,
        })),
      };
    });
  }, [experiences]);

  const lorReceived = useMemo(() => {
    const fromDocs = documents.filter(
      (d) => d.type === "Letter of Recommendation" && d.status === "Reviewed"
    ).length;
    const fromRequests = lorRequests.filter((r) => r.status === "REVIEWED").length;
    return fromDocs + fromRequests;
  }, [documents, lorRequests]);

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
        tags: selectedNoteTags,
      });
      setNewNoteContent("");
      setSelectedNoteTags([]);
      setIsNoteEditorOpen(false);
      toast.success("Note added");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add note");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!canWriteNotes) return;
    try {
      await deleteNoteMutation.mutateAsync(noteId);
      toast.success("Note deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete note");
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
    setDexStartDate("");
    setDexEndDate("");
    setDexOngoing(true);
  };

  const handleAddDexterity = async () => {
    if (!dexActivity.trim() || !dexStartDate) {
      toast.error("Activity name and start date are required");
      return;
    }
    try {
      await createDexterityMutation.mutateAsync({
        activity: dexActivity.trim(),
        description: dexDescription.trim(),
        startDate: dexStartDate,
        endDate: dexOngoing ? null : dexEndDate || null,
        isOngoing: dexOngoing,
      });
      resetDexterityForm();
      setIsAddDexterityOpen(false);
      toast.success("Activity added");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add activity");
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
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400">
              <FileText size={16} />
            </div>
            <span className="font-semibold text-white">{doc.title}</span>
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
            <div className="flex items-center justify-end gap-1">
              {canReviewDocuments && pending && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-8 px-2 text-emerald-300 hover:text-emerald-200"
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
                    className="h-8 px-2 text-rose-300 hover:text-rose-200"
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

  const formatResponseTime = (raw: string | number | undefined | null) => {
    const hours = typeof raw === "string" ? Number.parseFloat(raw) : Number(raw);
    if (!Number.isFinite(hours) || hours <= 0) return "—";
    if (hours < 1) {
      const mins = Math.max(1, Math.round(hours * 60));
      return `${mins}m`;
    }
    const rounded = Math.round(hours * 10) / 10;
    return `${rounded}h`;
  };

  const renderStatBlock = (
    label: string,
    value: string | number | undefined | null,
    icon: any,
    verified?: boolean
  ) => (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4 transition-colors hover:border-indigo-500/35">
      <div className="relative z-10 flex items-center justify-between mb-3">
        <div className="rounded-lg bg-slate-900 p-2 text-slate-400">
          {React.createElement(icon, { size: 16 })}
        </div>
        {verified === true && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
            <ShieldCheck size={10} />
            Verified
          </span>
        )}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-white">{value ?? "—"}</p>
    </div>
  );

  return (
    <div ref={contentRef} className="flex flex-col lg:flex-row gap-8 pb-20">
      {/* Floating Section Navigation — aside itself is sticky (needs stretch room from flex row) */}
      <aside
        aria-label="Records sections"
        className="sticky top-28 z-20 w-full shrink-0 self-start lg:top-24 lg:w-64"
      >
        <nav className="space-y-1 rounded-2xl border border-slate-800 bg-slate-950 p-2">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                activeSection === section.id
                  ? "bg-primary text-primary-foreground"
                  : "text-slate-500 hover:bg-slate-900/60 hover:text-slate-200"
              }`}
            >
              <section.icon size={16} className="shrink-0" />
              <span className="truncate">{section.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 space-y-12">
        {/* Header Section */}
        <header className="overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
          <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="flex items-center gap-5 min-w-0">
              <div className="relative shrink-0">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-2xl font-bold text-white ring-4 ring-slate-950">
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
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-bold tracking-tight text-white md:text-3xl">
                    {student.name}
                  </h1>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
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
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      (student.readiness || student.profile?.readiness) === "GREEN"
                        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                        : (student.readiness || student.profile?.readiness) === "RED"
                          ? "border-rose-500/25 bg-rose-500/10 text-rose-300"
                          : "border-amber-500/25 bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    {(student.readiness || student.profile?.readiness || "YELLOW").toLowerCase()} readiness
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar size={14} /> Cycle {student.profile?.application_cycle || "—"}
                  </span>
                  <span className="hidden h-1 w-1 rounded-full bg-slate-700 sm:inline" />
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={14} />
                    {[student.profile?.state || student.state, student.profile?.country || student.country]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
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
              <div className="hidden sm:block">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Strength</p>
                <p className="text-xs text-slate-400">Competitive score</p>
              </div>
              <div className="ml-2 flex gap-2">
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

        {/* Student Snapshot Section */}
        <section id="snapshot" className="space-y-5 scroll-mt-28">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Student Snapshot</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {canEditOwnProfile
                  ? "Keep your details current. Verified scores keep their badge until staff reconfirm."
                  : canReviewDocuments
                    ? "Read-only here — edit profile fields from the Edit Profile tab. Review documents below."
                    : "Key profile facts. Verified scores show a badge after staff confirmation."}
              </p>
            </div>
            {canEditOwnProfile && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Pencil className="h-3.5 w-3.5" />}
                onClick={openSnapshotEditor}
              >
                Edit details
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {renderStatBlock("Full Name", student.name, User)}
            {renderStatBlock(
              "Location",
              [student.profile?.state || student.state, student.profile?.country || student.country]
                .filter(Boolean)
                .join(", ") || "—",
              MapPin
            )}
            {renderStatBlock("Ethnicity", student.profile?.ethnicity ?? student.ethnicity, Globe)}
            {renderStatBlock("Gender", student.profile?.gender ?? student.gender, Venus)}
            {renderStatBlock("Age", student.profile?.age ?? student.age, Calendar)}
            {renderStatBlock(
              "GPA",
              student.profile?.gpa ?? student.gpa,
              BookOpen,
              student.profile?.gpa_verified ?? student.gpaVerified
            )}
            {renderStatBlock(
              "Strength Score",
              displayStrength,
              GraduationCap
            )}
            {renderStatBlock(
              "Response Time",
              formatResponseTime(
                student.avgResponseTime ?? student.profile?.avg_response_time,
              ),
              Clock
            )}
            {renderStatBlock(
              "DAT AA",
              student.profile?.dat_aa ?? student.datAA,
              Award,
              student.profile?.dat_verified ?? student.datVerified
            )}
            {renderStatBlock(
              "DAT TS",
              student.profile?.dat_ts ?? student.datTS,
              Award,
              student.profile?.dat_verified ?? student.datVerified
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {progressDonut(journeyProgress, "Application Journey", "text-indigo-400")}
            {progressDonut(profileCompleteness, "Profile Completion", "text-emerald-400")}
          </div>
        </section>

        {/* Academic Background Section */}
        <section id="academic" className="space-y-6 scroll-mt-28">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <GraduationCap className="text-indigo-400" size={20} /> Academic Background
          </h2>
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 space-y-8">
            {/* Undergrad */}
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Undergraduate Institution
                </label>
                <p className="text-lg font-bold text-white">
                  {student.profile?.undergrad_institution || "Not specified"}
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Degree Earned
                </label>
                <p className="text-lg font-bold text-white">
                  {student.profile?.undergrad_degree || "Not specified"}
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Graduation Year
                </label>
                <p className="text-lg font-bold text-white">
                  {student.profile?.undergrad_grad_year || "Not specified"}
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
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                  DAT AA
                  {(student.profile?.dat_verified || student.datVerified) && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                      <ShieldCheck size={10} />
                      Verified
                    </span>
                  )}
                </label>
                <p className="text-lg font-bold tabular-nums text-white">
                  {student.profile?.dat_aa ?? student.datAA ?? "Not specified"}
                </p>
              </div>
            </div>

            <div className="h-[1px] bg-slate-800" />

            {/* Toggles for Post-Bac and Masters */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                      <BookOpen size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-white">Post-Bac Program</p>
                      <p className="text-xs text-slate-500">Additional science coursework</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={togglePostBac}
                    disabled={!canEditOwnProfile}
                    title={
                      canEditOwnProfile
                        ? undefined
                        : "Students edit this on their profile; staff use Edit Profile"
                    }
                    className={`w-12 h-6 rounded-full p-1 transition-colors focus:outline-none ${
                      canEditOwnProfile ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                    } ${postBacEnabled ? "bg-indigo-600" : "bg-slate-800"}`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full transition-transform ${
                        postBacEnabled ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                {postBacEnabled && student.profile?.post_bac && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800 space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                          Institution
                        </label>
                        <p className="text-sm font-bold text-white">
                          {student.profile.post_bac.institution}
                        </p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                          Strength Score
                        </label>
                        <p className="text-sm font-bold text-white">
                          {student.profile.post_bac.strengthScore}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                      <Award size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-white">Master's Degree</p>
                      <p className="text-xs text-slate-500">Graduate level education</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleMasters}
                    disabled={!canEditOwnProfile}
                    title={
                      canEditOwnProfile
                        ? undefined
                        : "Students edit this on their profile; staff use Edit Profile"
                    }
                    className={`w-12 h-6 rounded-full p-1 transition-colors focus:outline-none ${
                      canEditOwnProfile ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                    } ${mastersEnabled ? "bg-indigo-600" : "bg-slate-800"}`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full transition-transform ${
                        mastersEnabled ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                {mastersEnabled && student.profile?.masters && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800 space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                          Institution
                        </label>
                        <p className="text-sm font-bold text-white">
                          {student.profile.masters.institution}
                        </p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                          Strength Score
                        </label>
                        <p className="text-sm font-bold text-white">
                          {student.profile.masters.strengthScore}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Letters of Recommendation Tracker */}
        <section id="lor" className="space-y-6 scroll-mt-28">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="text-indigo-400" size={20} /> Letters of Recommendation
            </h2>
            <div className="flex items-center gap-3 bg-slate-900/40 border border-slate-800 px-4 py-2 rounded-xl">
              <span className="text-xs font-bold text-slate-500 uppercase">External Service</span>
              <button
                type="button"
                onClick={toggleLorExternal}
                disabled={!canEditOwnProfile}
                title={
                  canEditOwnProfile
                    ? undefined
                    : "Students edit this on their profile; staff use Edit Profile"
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
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-1">
                <p className="text-4xl font-black text-white">
                  {lorReceived}
                  <span className="text-slate-750 mx-2">/</span>
                  {student.profile?.lor_required || 4}
                </p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Letters Received & Verified
                </p>
              </div>
              <div className="flex gap-2">
                {[...Array(student.profile?.lor_required || 4)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={false}
                    animate={{
                      backgroundColor: i < lorReceived ? "#4f46e5" : "#0f172a",
                      scale: i < lorReceived ? [1, 1.15, 1] : 1,
                    }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-800"
                  >
                    {i < lorReceived ? (
                      <CheckCircle2 size={20} className="text-white" />
                    ) : (
                      <FileText size={18} className="text-slate-700" />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="relative h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${
                    (lorReceived / (student.profile?.lor_required || 4)) * 100
                  }%`,
                }}
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.4)]"
              />
            </div>

            {/* Letter Vault Requests List */}
            <div className="space-y-4 pt-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Letter Vault Requests
              </h3>
              <div className="grid gap-4">
                {lorRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-slate-950/50 border border-slate-800 p-4 rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                        <User size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{req.writerName}</p>
                        <p className="text-[10px] text-slate-500">{req.writerEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="hidden sm:block text-right">
                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-0.5">
                          Due Date
                        </p>
                        <p className="text-xs font-bold text-slate-400">
                          {new Date(req.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${
                          req.status === "REVIEWED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : req.status === "UPLOADED"
                            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                            : req.status === "DECLINED"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {req.status}
                      </div>
                    </div>
                  </div>
                ))}
                {lorRequests.length === 0 && (
                  <p className="text-center py-4 text-xs text-slate-600 italic">
                    No Letter Vault requests sent yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Manual Dexterity Development Section */}
        <section id="dexterity" className="space-y-6 scroll-mt-28">
          <div className="flex items-center justify-between">
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
                className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl group hover:border-indigo-500/30 transition-all flex justify-between items-start"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h4 className="font-bold text-white text-lg">{activity.activity}</h4>
                    {activity.isOngoing && <Badge variant="success">Ongoing</Badge>}
                  </div>
                  <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
                    {activity.description}
                  </p>
                  <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={12} /> Started{" "}
                      {new Date(activity.startDate).toLocaleDateString()}
                    </span>
                    {!activity.isOngoing && activity.endDate && (
                      <span className="flex items-center gap-1.5">
                        <CheckCircle size={12} /> Completed{" "}
                        {new Date(activity.endDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-slate-600 hover:text-rose-400"
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

        {/* Experience Summary Section */}
        <section id="experience" className="space-y-6 scroll-mt-28">
          <div className="flex items-center justify-between">
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
                className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden group transition-all"
              >
                <button
                  onClick={() =>
                    setExpandedCategory(
                      expandedCategory === stat.category ? null : stat.category
                    )
                  }
                  className="w-full p-8 flex items-center justify-between hover:bg-slate-800/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center group-hover:border-indigo-500/30 transition-all">
                      <p className="text-xl font-black text-white">{stat.hours}</p>
                      <p className="text-[8px] font-bold text-slate-500 uppercase">Hours</p>
                    </div>
                    <div className="text-left">
                      <h4 className="text-lg font-bold text-white">{stat.category}</h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {stat.entries.length} Total Entries
                      </p>
                    </div>
                  </div>
                  <div className="p-2 bg-slate-805 rounded-xl text-slate-500 group-hover:text-white transition-all">
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
                            className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-2"
                          >
                            <div className="flex justify-between items-start">
                              <h5 className="font-bold text-white">{entry.title}</h5>
                              <span className="text-xs font-black text-indigo-400">
                                {entry.hours}h
                              </span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                              {entry.location}
                            </p>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {entry.description}
                            </p>
                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">
                              {entry.startDate ? new Date(entry.startDate).toLocaleDateString() : "—"} —{" "}
                              {entry.endDate
                                ? new Date(entry.endDate).toLocaleDateString()
                                : "Present"}
                            </p>
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

        {/* Mentor Notes Section */}
        <section id="notes" className="space-y-6 scroll-mt-28">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="text-indigo-400" size={20} /> Mentor Notes
            </h2>
            {canWriteNotes ? (
              <Button
                type="button"
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={() => setIsNoteEditorOpen(true)}
              >
                New Note
              </Button>
            ) : null}
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="p-8 space-y-8">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="space-y-4 relative pl-8 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-indigo-500/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white border border-slate-700">
                        {(note.authorName || "?")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{note.authorName}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          {new Date(note.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                          aria-label="Delete note"
                        >
                          <Trash2 size={14} />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="p-6 bg-slate-950/50 border border-slate-800 rounded-2xl">
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                </div>
              ))}
              {notes.length === 0 && (
                <EmptyState
                  icon={<MessageSquare className="h-10 w-10" />}
                  title="No notes recorded yet."
                />
              )}
            </div>
          </div>
        </section>

        {/* Documents & File Management Center */}
        <section id="documents" className="space-y-6 scroll-mt-28">
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

          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 bg-slate-900/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full max-w-md">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={16}
                />
                <Input
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder="Search documents..."
                  className="pl-10"
                />
              </div>
              <div className="w-full sm:w-56">
                <SelectMenu
                  value={docTypeFilter}
                  onChange={setDocTypeFilter}
                  options={[
                    { value: "All Types", label: "All Types" },
                    { value: "Transcript", label: "Transcript" },
                    { value: "Letter of Recommendation", label: "Letter of Recommendation" },
                    { value: "Resume", label: "Resume" },
                    { value: "Essay", label: "Essay" },
                    { value: "Other", label: "Other" },
                  ]}
                />
              </div>
            </div>

            <Table
              columns={documentColumns}
              data={filteredDocuments}
              rowKey={(doc) => doc.id}
              emptyMessage="No matching documents found."
              className="rounded-none border-0"
            />
          </div>
        </section>
      </div>

      <Modal
        open={isNoteEditorOpen}
        onClose={() => {
          setIsNoteEditorOpen(false);
          setNewNoteContent("");
          setSelectedNoteTags([]);
        }}
        title="New mentor note"
        description="Notes are visible to staff and the student."
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
              Save Note
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField label="Tags">
            <div className="flex flex-wrap gap-2">
              {(["Risk", "Strength", "Academic", "Interview"] as const).map((tag) => {
                const selected = selectedNoteTags.includes(tag);
                return (
                  <Button
                    key={tag}
                    type="button"
                    size="sm"
                    variant={selected ? "primary" : "secondary"}
                    leftIcon={<Tag size={12} />}
                    onClick={() => {
                      setSelectedNoteTags((prev) =>
                        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
                      );
                    }}
                  >
                    {tag}
                  </Button>
                );
              })}
            </div>
          </FormField>
          <FormField label="Note" htmlFor="note-content" required>
            <Textarea
              id="note-content"
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Start typing your note here..."
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Start Date" required>
              <DatePicker value={dexStartDate} onChange={setDexStartDate} />
            </FormField>
            {!dexOngoing ? (
              <FormField label="End Date">
                <DatePicker value={dexEndDate} onChange={setDexEndDate} />
              </FormField>
            ) : (
              <div />
            )}
          </div>
          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={dexOngoing}
              onChange={(e) => setDexOngoing(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600"
            />
            Ongoing activity
          </label>
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

      <Modal
        open={snapshotEditOpen}
        onClose={() => {
          if (!snapshotSaving) setSnapshotEditOpen(false);
        }}
        title="Edit profile details"
        description="Update your personal info and scores."
        size="lg"
        closeOnBackdrop={!snapshotSaving}
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={snapshotSaving}
              onClick={() => setSnapshotEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              isLoading={snapshotSaving}
              onClick={() => void saveSnapshotEditor()}
            >
              Save changes
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField label="Full name" required>
            <Input
              value={snapshotForm.name}
              onChange={(e) => setSnapshotForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Your name"
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="State / city">
              <Input
                value={snapshotForm.state}
                onChange={(e) => setSnapshotForm((f) => ({ ...f, state: e.target.value }))}
                placeholder="New York City"
              />
            </FormField>
            <FormField label="Country">
              <Input
                value={snapshotForm.country}
                onChange={(e) => setSnapshotForm((f) => ({ ...f, country: e.target.value }))}
                placeholder="USA"
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Ethnicity">
              <Input
                value={snapshotForm.ethnicity}
                onChange={(e) => setSnapshotForm((f) => ({ ...f, ethnicity: e.target.value }))}
                placeholder="Ethnicity"
              />
            </FormField>
            <FormField label="Gender">
              <SelectMenu
                value={snapshotForm.gender || ""}
                onChange={(v) => setSnapshotForm((f) => ({ ...f, gender: v }))}
                options={[
                  { value: "", label: "Select…" },
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" },
                  { value: "Non-binary", label: "Non-binary" },
                  { value: "Prefer not to say", label: "Prefer not to say" },
                ]}
              />
            </FormField>
            <FormField label="Age">
              <Input
                type="number"
                min={0}
                max={120}
                value={snapshotForm.age}
                onChange={(e) => setSnapshotForm((f) => ({ ...f, age: e.target.value }))}
                placeholder="23"
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="GPA">
              <Input
                type="number"
                step="0.01"
                min={0}
                max={4.5}
                value={snapshotForm.gpa}
                onChange={(e) => setSnapshotForm((f) => ({ ...f, gpa: e.target.value }))}
                placeholder="3.50"
              />
            </FormField>
            <FormField label="DAT AA">
              <Input
                type="number"
                step="1"
                min={0}
                max={30}
                value={snapshotForm.dat_aa}
                onChange={(e) => setSnapshotForm((f) => ({ ...f, dat_aa: e.target.value }))}
                placeholder="22"
              />
            </FormField>
            <FormField label="DAT TS">
              <Input
                type="number"
                step="1"
                min={0}
                max={30}
                value={snapshotForm.dat_ts}
                onChange={(e) => setSnapshotForm((f) => ({ ...f, dat_ts: e.target.value }))}
                placeholder="25"
              />
            </FormField>
          </div>
        </div>
      </Modal>
    </div>
  );
}
