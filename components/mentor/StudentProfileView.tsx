
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Student, ActionItem, StaffTask, Message, Meeting, Experience, ImprovementGoal, LetterOfRecommendationRequest, OptimizationPlan, School, StudentDocument, Application, PlatformConfig } from '@/lib/types';
import CompleteMeetingForm, { CompleteMeetingData } from './CompleteMeetingForm';
import { StudentProfileDocumentsView } from '../student/StudentProfileDocumentsView';
import { StudentProfileEditForm } from './StudentProfileEditForm';
import { MentorStudentPlanTab } from './MentorStudentPlanTab';
import { 
  ArrowLeft, 
  Calendar, 
  CheckCircle2, 
  MapPin, 
  Clock, 
  Plus,
  X,
  CheckSquare,
  StickyNote,
  Edit2,
  Target,
  TrendingUp,
  Trash2,
  Briefcase,
  ExternalLink,
  LayoutDashboard,
  UserRound,
  ClipboardList,
  Activity,
  MessageSquare,
  FolderOpen,
  Award,
} from 'lucide-react';
import { formatInTimezone, parseLocalDate, resolveStudentTimezone } from '@/lib/utils/dateUtils';
import {
  calculateStrengthScore,
  hoursByCategoryFromExperiences,
} from '@/lib/utils/strengthScore';
import { useStudentStrengthHistory } from '@/lib/hooks/useStudentProfile';
import { useApplications } from '@/lib/hooks/useApplications';
import { useStudentSchools } from '@/lib/hooks/useStudentSchools';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import {
  Button,
  Badge,
  Modal,
  FormField,
  Input,
  Textarea,
  SelectMenu,
  DatePicker,
} from '@/components/ui';
import { useCreateActionItem } from '@/lib/hooks/useActionItems';
import { useCreateTask } from '@/lib/hooks/useTasks';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'sonner';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type PrimaryTab = "overview" | "profile" | "records" | "plan" | "activity";

function StrengthProgressTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { month?: string; score?: number; fullDate?: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 shadow-2xl shadow-black/50">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {row.fullDate || row.month || "Point"}
      </p>
      <p className="mt-1 text-sm font-bold text-indigo-300">
        Score: <span className="tabular-nums text-white">{row.score ?? "—"}</span>
      </p>
    </div>
  );
}

function mapInitialTab(initialTab?: string): PrimaryTab {
  if (!initialTab) return "overview";
  switch (initialTab) {
    case "docs":
    case "records":
      return "records";
    case "profile":
      return "profile";
    case "plan":
    case "hub":
    case "applications":
    case "path":
      return "plan";
    case "meetings":
    case "tasks":
    case "messages":
    case "history":
    case "coaching":
    case "activity":
      return "activity";
    case "overview":
    default:
      return "overview";
  }
}

interface StudentProfileViewProps {
  student: Student;
  onBack: () => void;
  messages: Message[];
  onSendMessage: (text: string, receiverId: string, receiverIds?: string[], groupName?: string, threadId?: string) => void;
  initialTab?: string;
  currentUserId: string;
  actionItems: ActionItem[];
  meetings: Meeting[];
  experiences: Experience[];
  improvementGoals: ImprovementGoal[];
  optimizationPlan?: OptimizationPlan;
  lorRequests: LetterOfRecommendationRequest[];
  onAddActionItem: (studentId: string, task: string, dueDate: string, priority: 'HIGH' | 'MEDIUM' | 'LOW', description?: string, resourceLink?: string) => void;
  onUpdateActionItem?: (item: ActionItem) => void;
  onDeleteActionItem?: (itemId: string) => void;
  onToggleActionItem?: (itemId: string) => void;
  onCompleteMeeting: (meetingId: string | undefined, data: CompleteMeetingData) => void | Promise<void>;
  onMessageStudent?: (studentId: string) => void;
  onUpdateImprovementGoal: (goal: ImprovementGoal) => void;
  onDeleteImprovementGoal: (id: string) => void;
  onUpdateOptimizationPlan?: (plan: OptimizationPlan) => void;
  onDeleteOptimizationPlan?: (planId: string) => void;
  onUpdateExperiences: (experiences: Experience[]) => void;
  onUpdateSchools: (studentId: string, schools: School[]) => void;
  onUpdateStudent?: (studentId: string, updates: Partial<Student>) => void;
  onAddStaffTask?: (task: any) => void;
  onUpdateStaffTask?: (task: StaffTask) => void;
  onDeleteStaffTask?: (taskId: string) => void;
  staffTasks: StaffTask[];
  documents: StudentDocument[];
  onUpdateDocuments: (documents: StudentDocument[]) => void;
  onUpdateApplications?: (studentId: string, applications: Application[]) => void;
  platformConfig: PlatformConfig;
}

const StudentProfileView: React.FC<StudentProfileViewProps> = ({ 
  student, 
  onBack, 
  messages: _messages, 
  onSendMessage: _onSendMessage, 
  initialTab, 
  currentUserId,
  actionItems: studentActions,
  meetings: allMeetings,
  experiences,
  improvementGoals,
  optimizationPlan,
  lorRequests,
  onAddActionItem,
  onUpdateActionItem,
  onDeleteActionItem,
  onToggleActionItem,
  onCompleteMeeting,
  onMessageStudent,
  onUpdateImprovementGoal,
  onDeleteImprovementGoal,
  onUpdateOptimizationPlan,
  onDeleteOptimizationPlan,
  onUpdateExperiences,
  onUpdateSchools,
  onUpdateStudent,
  onAddStaffTask,
  onUpdateStaffTask,
  onDeleteStaffTask,
  staffTasks,
  documents,
  onUpdateDocuments,
  onUpdateApplications,
  platformConfig
}) => {


  const [activeTab, setActiveTab] = useState<PrimaryTab>(() => mapInitialTab(initialTab));
  const [activitySubTab, setActivitySubTab] = useState<"meetings" | "tasks" | "history">("meetings");
  const [meetingFilter, setMeetingFilter] = useState<"all" | "upcoming" | "completed">("all");
  const [taskFilter, setTaskFilter] = useState<"all" | "upcoming" | "completed">("all");
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [isCompletingMeeting, setIsCompletingMeeting] = useState(false);
  const [selectedMeetingToComplete, setSelectedMeetingToComplete] = useState<Meeting | null>(null);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState<Partial<ImprovementGoal>>({
    category: 'Volunteering',
    status: 'In Progress',
    currentValue: 0,
    unit: 'Hours'
  });
  const [newAction, setNewAction] = useState({
    task: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'MEDIUM' as 'HIGH' | 'MEDIUM' | 'LOW',
    description: '',
    resourceLink: '',
    assignee: 'STUDENT' as 'STUDENT' | 'MENTOR'
  });
  const [editingAction, setEditingAction] = useState<ActionItem | null>(null);
  const [editingStaffTask, setEditingStaffTask] = useState<StaffTask | null>(null);
  const [editAssignee, setEditAssignee] = useState<'STUDENT' | 'MENTOR'>('STUDENT');

  const createActionItemMutation = useCreateActionItem();
  const createStaffTaskMutation = useCreateTask();
  const { user: authUser } = useAuth();
  const relatedMentorId =
    student.profile?.mentor_id ||
    (student as any).mentorId ||
    (student as any).mentor_id ||
    null;
  const staffSelfLabel =
    authUser?.role === "ADMIN" || authUser?.role === "MENTOR_MANAGER"
      ? relatedMentorId
        ? "Mentor"
        : "Mentor (unassigned)"
      : "Me (Mentor)";

  const goToProfile = () => setActiveTab("profile");
  const studentTimezone = resolveStudentTimezone(student);

  const studentStaffTasks = React.useMemo(
    () =>
      staffTasks.filter(
        (t) => (t.studentId || t.student_id) === student.id,
      ),
    [staffTasks, student.id],
  );

  const currentActionItems = React.useMemo(() => {
    const studentItems = studentActions
      .filter((a) => a.status !== "COMPLETED")
      .map((item) => ({
        id: item.id,
        task: item.task,
        due: item.dueDate || item.due_date,
        priority: item.priority,
        assignee: "STUDENT" as const,
        hasResource: !!(
          item.resourceId ||
          item.resource_id ||
          item.resourceLink ||
          item.resource_link
        ),
      }));

    const mentorItems = studentStaffTasks
      .filter((t) => t.status !== "COMPLETED")
      .map((task) => ({
        id: task.id,
        task: task.task,
        due: task.dueDate || task.due_date,
        priority: task.priority,
        assignee: "MENTOR" as const,
        hasResource: false,
      }));

    return [...studentItems, ...mentorItems].sort((a, b) => {
      const aTime = a.due ? new Date(a.due).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.due ? new Date(b.due).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
  }, [studentActions, studentStaffTasks]);

  const studentMeetings = React.useMemo(
    () =>
      allMeetings
        .filter((m) => (m.studentId || m.student_id) === student.id)
        .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()),
    [allMeetings, student.id],
  );

  const filteredMeetings = React.useMemo(() => {
    if (meetingFilter === "upcoming") return studentMeetings.filter((m) => !m.completed);
    if (meetingFilter === "completed") return studentMeetings.filter((m) => m.completed);
    return studentMeetings;
  }, [studentMeetings, meetingFilter]);

  const filteredStudentActions = React.useMemo(() => {
    if (taskFilter === "upcoming") return studentActions.filter((a) => a.status !== "COMPLETED");
    if (taskFilter === "completed") return studentActions.filter((a) => a.status === "COMPLETED");
    return studentActions;
  }, [studentActions, taskFilter]);

  const filteredStaffTasks = React.useMemo(() => {
    if (taskFilter === "upcoming") return studentStaffTasks.filter((t) => t.status !== "COMPLETED");
    if (taskFilter === "completed") return studentStaffTasks.filter((t) => t.status === "COMPLETED");
    return studentStaffTasks;
  }, [studentStaffTasks, taskFilter]);

  const { data: strengthHistory = [] } = useStudentStrengthHistory(student.id);
  const { data: applicationsForStrength = [] } = useApplications(student.id);
  const { data: schoolsForStrength = [] } = useStudentSchools(student.id);

  const computedStrength = React.useMemo(() => {
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

  // Prefer latest persisted history / profile score (backend source of truth) over a partial client calc
  const latestHistoryScore = React.useMemo(() => {
    if (!strengthHistory.length) return null;
    const last = strengthHistory[strengthHistory.length - 1];
    const score = Math.round(Number(last.strength_score) || 0);
    return Number.isFinite(score) ? score : null;
  }, [strengthHistory]);

  const storedStrength = Math.round(
    Number(student.strengthScore ?? student.profile?.strength_score ?? NaN),
  );

  const displayStrength =
    latestHistoryScore ??
    (Number.isFinite(storedStrength) ? storedStrength : computedStrength);

  const progressionData = React.useMemo(() => {
    const rows =
      strengthHistory.length > 0
        ? strengthHistory
        : [
            {
              id: "current",
              student_id: student.id,
              strength_score: displayStrength,
              recorded_at:
                student.profile?.updated_at ||
                student.updatedAt ||
                student.createdAt ||
                new Date().toISOString(),
            },
          ];

    // Chronological points — keep every score change (including same-day changes)
    type Point = { month: string; score: number; sortKey: number; fullDate: string; dayKey: string };
    const changePoints: Point[] = [];
    let prevScore: number | null = null;

    const sortedRows = [...rows].sort((a, b) => {
      const ta = new Date(a.recorded_at).getTime();
      const tb = new Date(b.recorded_at).getTime();
      return (Number.isNaN(ta) ? 0 : ta) - (Number.isNaN(tb) ? 0 : tb);
    });

    for (const row of sortedRows) {
      const at = new Date(row.recorded_at);
      if (Number.isNaN(at.getTime())) continue;
      const score = Math.round(Number(row.strength_score) || 0);
      // Skip only when the score is unchanged (even across different dates)
      if (prevScore === score) continue;

      const dayKey = `${at.getFullYear()}-${at.getMonth()}-${at.getDate()}`;
      changePoints.push({
        month: at.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        score,
        sortKey: at.getTime(),
        fullDate: at.toLocaleString(),
        dayKey,
      });
      prevScore = score;
    }

    // If multiple points share a day, include time so axis labels stay unique
    const dayCounts = new Map<string, number>();
    for (const point of changePoints) {
      dayCounts.set(point.dayKey, (dayCounts.get(point.dayKey) || 0) + 1);
    }

    let points = changePoints.map((point) => {
      if ((dayCounts.get(point.dayKey) || 0) <= 1) {
        return { month: point.month, score: point.score, sortKey: point.sortKey, fullDate: point.fullDate };
      }
      const at = new Date(point.sortKey);
      const time = at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      return {
        month: `${point.month} ${time}`,
        score: point.score,
        sortKey: point.sortKey,
        fullDate: point.fullDate,
      };
    });

    if (points.length === 0) {
      return [{ month: "Now", score: displayStrength, fullDate: "Current" }];
    }

    const last = points[points.length - 1];
    if (last.score !== displayStrength) {
      points = [
        ...points,
        { month: "Now", score: displayStrength, sortKey: last.sortKey + 1, fullDate: "Current" },
      ];
    }

    return points.map(({ month, score, fullDate }) => ({ month, score, fullDate }));
  }, [strengthHistory, displayStrength, student]);

  const resetNewAction = () => {
    setNewAction({
      task: '',
      dueDate: new Date().toISOString().split('T')[0],
      priority: 'MEDIUM',
      description: '',
      resourceLink: '',
      assignee: 'STUDENT',
    });
  };

  const handleAddAction = async () => {
    if (!newAction.task.trim()) {
      toast.error('Task title is required');
      return;
    }
    if (!newAction.dueDate) {
      toast.error('Due date is required');
      return;
    }

    try {
      if (newAction.assignee === 'STUDENT') {
        await createActionItemMutation.mutateAsync({
          studentId: student.id,
          task: newAction.task.trim(),
          dueDate: newAction.dueDate,
          priority: newAction.priority,
          description: newAction.description.trim() || undefined,
          resourceLink: newAction.resourceLink.trim() || undefined,
        });
      } else {
        const mentorId =
          relatedMentorId ||
          (authUser?.role === "MENTOR" ? currentUserId : null);
        if (!mentorId) {
          toast.error("This student has no assigned mentor to receive the task");
          return;
        }
        await createStaffTaskMutation.mutateAsync({
          assignedTo: mentorId,
          task: newAction.task.trim(),
          dueDate: newAction.dueDate,
          priority: newAction.priority,
          description: newAction.resourceLink.trim()
            ? `${newAction.description.trim()}\n\nResource: ${newAction.resourceLink.trim()}`.trim()
            : newAction.description.trim() || undefined,
          studentId: student.id,
        });
      }

      toast.success(
        newAction.assignee === 'STUDENT'
          ? 'Action item assigned to student'
          : 'Task assigned to mentor',
      );
      resetNewAction();
      setIsAddingAction(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create task');
    }
  };

  const handleUpdateAction = () => {
    if (editingAction && editingAction.task.trim()) {
      if (editAssignee === 'MENTOR') {
        // Convert ActionItem to StaffTask
        onAddStaffTask?.({
          task: editingAction.task,
          description: editingAction.resourceLink ? `${editingAction.description}\n\nResource: ${editingAction.resourceLink}` : editingAction.description,
          dueDate: new Date(editingAction.dueDate || "").toISOString(),
          priority: editingAction.priority,
          assignedTo: relatedMentorId || currentUserId,
          assignedBy: currentUserId,
          status: editingAction.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
          studentId: student.id,
          studentName: student.name,
          createdAt: new Date().toISOString()
        });
        onDeleteActionItem?.(editingAction.id);
      } else {
        onUpdateActionItem?.(editingAction);
      }
      setEditingAction(null);
    }
  };

  const handleUpdateStaffTask = () => {
    if (editingStaffTask && editingStaffTask.task.trim()) {
      if (editAssignee === 'STUDENT') {
        // Convert StaffTask to ActionItem
        onAddActionItem(
          student.id,
          editingStaffTask.task,
          (editingStaffTask.dueDate || '').split('T')[0],
          editingStaffTask.priority,
          editingStaffTask.description || undefined,
          undefined // resourceLink is lost or would need regex to extract
        );
        onDeleteStaffTask?.(editingStaffTask.id);
      } else {
        onUpdateStaffTask?.(editingStaffTask);
      }
      setEditingStaffTask(null);
    }
  };

  const nextMeeting = React.useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return allMeetings
      .filter((m) => {
        if ((m.studentId || m.student_id) !== student.id) return false;
        if (m.completed) return false;
        const when = parseLocalDate(m.date);
        if (Number.isNaN(when.getTime())) return false;
        return when.getTime() >= startOfToday.getTime();
      })
      .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime())[0];
  }, [allMeetings, student.id]);

  const memberSince = React.useMemo(() => {
    const raw = student.createdAt || student.profile?.created_at;
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  }, [student.createdAt, student.profile?.created_at]);

  const timelineEvents = React.useMemo(() => {
    type TimelineEvent = {
      id: string;
      title: string;
      detail: string;
      at: string;
      tone: "emerald" | "indigo" | "slate";
    };
    const events: TimelineEvent[] = [];

    allMeetings
      .filter((m) => (m.studentId || m.student_id) === student.id)
      .forEach((m) => {
        events.push({
          id: `meeting-${m.id}`,
          title: m.completed ? "Meeting completed" : "Meeting scheduled",
          detail: m.title || "Mentorship meeting",
          at: m.date,
          tone: m.completed ? "emerald" : "indigo",
        });
      });

    documents.forEach((doc) => {
      const at = doc.uploadedAt || doc.uploaded_at || doc.updated_at;
      if (!at) return;
      events.push({
        id: `doc-${doc.id}`,
        title: "Document uploaded",
        detail: doc.title || "Document",
        at,
        tone: "slate",
      });
    });

    studentActions.forEach((item) => {
      const at =
        (item as any).createdAt ||
        (item as any).created_at ||
        item.dueDate ||
        "";
      if (!at) return;
      events.push({
        id: `action-${item.id}`,
        title: item.status === "COMPLETED" ? "Action completed" : "Action item",
        detail: item.task,
        at,
        tone: item.status === "COMPLETED" ? "emerald" : "indigo",
      });
    });

    return events
      .filter((e) => e.at && !Number.isNaN(new Date(e.at).getTime()))
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 8);
  }, [allMeetings, documents, studentActions, student.id]);

  const strengthRecommendation = React.useMemo(() => {
    const score = displayStrength;
    if (score < 60) {
      return "Focus heavily on completing volunteer hours and improving the DAT score. Review their DAT Accelerator plan to ensure they are on track.";
    } else if (score < 80) {
      return "The student is showing solid progress. Emphasize shadowing hours and securing strong Letters of Recommendation to push them into the competitive range.";
    } else {
      return "Excellent standing. Focus on interview prep and refining their personal statement to ensure a flawless application.";
    }
  }, [displayStrength]);


  return (
    <div className="space-y-6">
      {/* Compact Hero */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-slate-800/80">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          {nextMeeting && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 border border-indigo-500/20 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                Next:{" "}
                {formatInTimezone(
                  nextMeeting.date,
                  nextMeeting.timezone || studentTimezone,
                  { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
                )}
              </span>
            </div>
          )}
        </div>

        <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-6">
          <div className="flex w-full shrink-0 flex-col gap-4 lg:w-[280px]">
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative shrink-0">
                <Avatar
                  name={student.name}
                  src={student.avatar}
                  size="lg"
                  className="h-16 w-16 rounded-2xl text-lg ring-4 ring-slate-800"
                />
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-4 border-slate-900 ${
                    student.readiness === "GREEN"
                      ? "bg-emerald-500"
                      : student.readiness === "YELLOW"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                  }`}
                />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold text-white">{student.name}</h2>
                <p className="truncate text-sm text-slate-500">{student.email}</p>
                {memberSince && (
                  <p className="mt-0.5 text-xs text-slate-600">Joined {memberSince}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToProfile}
                leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                className="flex-1 sm:flex-none"
              >
                Edit profile
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onMessageStudent?.(student.id)}
                leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                className="flex-1 sm:flex-none"
                disabled={!onMessageStudent}
              >
                Inbox
              </Button>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            {(() => {
              const datValue =
                student.datScore ?? student.datAA ?? student.profile?.dat_aa ?? null;
              const locationValue = student.state || student.profile?.state || null;
              const isReapp =
                student.isReapplicant ?? student.profile?.is_reapplicant ?? false;
              const strength = Number(displayStrength) || 0;
              const strengthPct = Math.max(0, Math.min(100, strength));
              const strengthTone =
                strength >= 80
                  ? { ring: "#34d399", soft: "from-emerald-500/15 via-slate-950/80 to-slate-950", chip: "text-emerald-300" }
                  : strength >= 60
                    ? { ring: "#818cf8", soft: "from-indigo-500/15 via-slate-950/80 to-slate-950", chip: "text-indigo-300" }
                    : { ring: "#f59e0b", soft: "from-amber-500/15 via-slate-950/80 to-slate-950", chip: "text-amber-300" };

              const metrics = [
                {
                  key: "strength",
                  label: "Strength",
                  hint: "Competitiveness",
                  value: strength || "—",
                  icon: TrendingUp,
                  accent: strengthTone,
                  visual: "ring" as const,
                },
                {
                  key: "dat",
                  label: "DAT",
                  hint: "Score snapshot",
                  value: datValue ?? "—",
                  icon: Award,
                  accent: {
                    ring: "#818cf8",
                    soft: "from-sky-500/10 via-slate-950/80 to-slate-950",
                    chip: "text-sky-300",
                  },
                  visual: "plain" as const,
                },
                {
                  key: "status",
                  label: "Status",
                  hint: "Applicant type",
                  value: isReapp ? "Re-applicant" : "First-time",
                  icon: UserRound,
                  accent: {
                    ring: "#a78bfa",
                    soft: "from-violet-500/10 via-slate-950/80 to-slate-950",
                    chip: "text-violet-300",
                  },
                  visual: "plain" as const,
                },
                {
                  key: "location",
                  label: "Location",
                  hint: "Primary region",
                  value: locationValue ?? "—",
                  icon: MapPin,
                  accent: {
                    ring: "#94a3b8",
                    soft: "from-slate-500/10 via-slate-950/80 to-slate-950",
                    chip: "text-slate-300",
                  },
                  visual: "plain" as const,
                },
              ];

              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {metrics.map((metric) => {
                    const Icon = metric.icon;
                    return (
                      <button
                        key={metric.key}
                        type="button"
                        onClick={goToProfile}
                        className={`group relative overflow-hidden rounded-2xl border border-slate-800/90 bg-gradient-to-br ${metric.accent.soft} p-3.5 text-left transition-all hover:border-indigo-500/45 hover:shadow-[0_0_0_1px_rgba(99,102,241,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50`}
                      >
                        <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/[0.03] blur-2xl transition-opacity group-hover:opacity-100" />
                        <div className="relative flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                              {metric.label}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-600">{metric.hint}</p>
                          </div>
                          <span
                            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-slate-900/70 ${metric.accent.chip}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                        </div>

                        {metric.visual === "ring" ? (
                          <div className="relative mt-3 flex items-center gap-3">
                            <div className="relative h-11 w-11 shrink-0">
                              <svg viewBox="0 0 36 36" className="h-11 w-11 -rotate-90">
                                <circle
                                  cx="18"
                                  cy="18"
                                  r="14"
                                  fill="none"
                                  stroke="#1e293b"
                                  strokeWidth="3"
                                />
                                <circle
                                  cx="18"
                                  cy="18"
                                  r="14"
                                  fill="none"
                                  stroke={metric.accent.ring}
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeDasharray={`${strengthPct * 0.88} 100`}
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-bold tabular-nums text-white">
                                  {metric.value}
                                </span>
                              </div>
                            </div>
                            <div className="min-w-0">
                              <p className={`text-lg font-bold tabular-nums leading-none ${metric.accent.chip}`}>
                                {metric.value}
                                <span className="ml-0.5 text-[10px] font-semibold text-slate-500">
                                  /100
                                </span>
                              </p>
                              <p className="mt-1 text-[10px] text-slate-500">Profile strength</p>
                            </div>
                          </div>
                        ) : (
                          <p
                            className={`relative mt-3 truncate text-lg font-bold leading-tight ${
                              metric.key === "status"
                                ? metric.accent.chip
                                : "tabular-nums text-white"
                            }`}
                          >
                            {metric.value}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Primary Tabs */}
      <Tabs
        defaultValue={activeTab}
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as PrimaryTab)}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="overview">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="profile">
            <UserRound className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="records">
            <FolderOpen className="h-4 w-4" />
            Records
          </TabsTrigger>
          <TabsTrigger value="plan">
            <ClipboardList className="h-4 w-4" />
            Plan
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex h-[340px] flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-4 flex shrink-0 items-center justify-between">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-white">
                    <CheckCircle2 className="h-4 w-4 text-indigo-400" /> Current Action Items
                  </h3>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsAddingAction(true)}
                    aria-label="Add action item"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                  {currentActionItems.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">No action items yet.</p>
                  ) : (
                    currentActionItems.map((item) => (
                      <div
                        key={`${item.assignee}-${item.id}`}
                        className="group flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 p-3 transition-all hover:border-slate-600"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              item.priority === "HIGH"
                                ? "bg-rose-500"
                                : item.priority === "LOW"
                                  ? "bg-slate-500"
                                  : item.assignee === "MENTOR"
                                    ? "bg-emerald-500"
                                    : "bg-indigo-500"
                            }`}
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-medium text-white">{item.task}</p>
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                  item.assignee === "MENTOR"
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-indigo-500/10 text-indigo-400"
                                }`}
                              >
                                {item.assignee === "MENTOR" ? "Mentor" : "Student"}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500">
                              Due {item.due ? new Date(item.due).toLocaleDateString() : "—"}
                            </p>
                          </div>
                        </div>
                        {item.hasResource && (
                          <span className="shrink-0 rounded-lg bg-slate-800 px-2 py-1 text-[10px] text-slate-400">
                            Resource
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex h-[340px] flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-5">
                <h3 className="mb-4 flex shrink-0 items-center gap-2 text-base font-semibold text-white">
                  <Clock className="h-4 w-4 text-indigo-400" /> Recent Timeline
                </h3>
                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  {timelineEvents.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">
                      No activity yet. Meetings, documents, and action items will show up here.
                    </p>
                  ) : (
                    <div className="relative space-y-4 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-[1px] before:bg-slate-800">
                      {timelineEvents.map((event) => (
                        <div key={event.id} className="relative pl-8">
                          <div
                            className={`absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border ${
                              event.tone === "emerald"
                                ? "border-emerald-500/40 bg-emerald-500/20"
                                : event.tone === "indigo"
                                  ? "border-indigo-500/40 bg-indigo-500/20"
                                  : "border-slate-700 bg-slate-800"
                            }`}
                          >
                            <div
                              className={`h-2 w-2 rounded-full ${
                                event.tone === "emerald"
                                  ? "bg-emerald-500"
                                  : event.tone === "indigo"
                                    ? "bg-indigo-500"
                                    : "bg-slate-500"
                              }`}
                            />
                          </div>
                          <p className="text-sm font-medium text-white">{event.title}</p>
                          <p className="text-xs text-slate-500">{event.detail}</p>
                          <p className="mt-1 text-[10px] text-slate-500">
                            {new Date(event.at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" /> Strength Score Progression
                </h3>
                <div className="px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                  <span className="text-xs font-bold text-indigo-400">
                    Current Score: {displayStrength || "—"}
                  </span>
                </div>
              </div>

              <div className="h-[260px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={progressionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorStrengthScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                      </linearGradient>
                      <filter id="strengthGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.4} />
                    <XAxis
                      dataKey="month"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                      dx={-10}
                    />
                    <Tooltip
                      content={<StrengthProgressTooltip />}
                      cursor={{
                        stroke: "#818cf8",
                        strokeWidth: 1,
                        strokeDasharray: "4 4",
                        opacity: 0.45,
                      }}
                      wrapperStyle={{ outline: "none", zIndex: 20 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#818cf8"
                      strokeWidth={4}
                      fillOpacity={1}
                      fill="url(#colorStrengthScore)"
                      filter="url(#strengthGlow)"
                      dot={{ fill: "#1e1b4b", stroke: "#818cf8", strokeWidth: 2, r: 4 }}
                      activeDot={{
                        r: 7,
                        strokeWidth: 2,
                        stroke: "#c7d2fe",
                        fill: "#818cf8",
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {displayStrength > 0 && (
                <div className="mt-4 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">
                    Mentor Recommendation
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed">{strengthRecommendation}</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="profile" className="mt-4">
          <StudentProfileEditForm
            student={student}
            strengthScore={displayStrength}
            onSave={(updates) => onUpdateStudent?.(student.id, updates as any)}
          />
        </TabsContent>

        <TabsContent value="records" className="mt-4">
          <StudentProfileDocumentsView
            student={student}
            currentUserId={currentUserId}
            strengthScore={displayStrength}
            onUpdateStudent={(updates) => onUpdateStudent?.(student.id, updates)}
          />
        </TabsContent>

        <TabsContent value="plan" className="mt-4">
          <MentorStudentPlanTab
            student={student}
            experiences={experiences}
            optimizationPlan={optimizationPlan}
            platformConfig={platformConfig}
            onUpdatePlan={(plan) => onUpdateOptimizationPlan?.(plan)}
            onCreatePlan={(payload) =>
              onUpdateOptimizationPlan?.({
                ...payload,
                studentId: student.id,
                student_id: student.id,
              } as OptimizationPlan)
            }
            onDeletePlan={() => {
              if (!optimizationPlan?.id) return;
              onDeleteOptimizationPlan?.(optimizationPlan.id);
            }}
            onUpdateSchools={(schools) => onUpdateSchools(student.id, schools)}
            onUpdateStudent={(updates) => onUpdateStudent?.(student.id, updates)}
            onUpdateApplications={(apps) => onUpdateApplications?.(student.id, apps)}
          />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Tabs
            defaultValue={activitySubTab}
            value={activitySubTab}
            onValueChange={(v) => setActivitySubTab(v as "meetings" | "tasks" | "history")}
            className="space-y-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList>
                <TabsTrigger value="meetings">
                  <Calendar className="h-4 w-4" />
                  Meetings
                </TabsTrigger>
                <TabsTrigger value="tasks">
                  <CheckSquare className="h-4 w-4" />
                  Tasks
                </TabsTrigger>
                <TabsTrigger value="history">
                  <StickyNote className="h-4 w-4" />
                  History
                </TabsTrigger>
              </TabsList>

              {activitySubTab === "meetings" && (
                <SelectMenu
                  value={meetingFilter}
                  onChange={(v) => setMeetingFilter(v as "all" | "upcoming" | "completed")}
                  options={[
                    { value: "all", label: "All meetings" },
                    { value: "upcoming", label: "Upcoming" },
                    { value: "completed", label: "Completed" },
                  ]}
                  className="w-full sm:w-48"
                />
              )}

              {activitySubTab === "tasks" && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <SelectMenu
                    value={taskFilter}
                    onChange={(v) => setTaskFilter(v as "all" | "upcoming" | "completed")}
                    options={[
                      { value: "all", label: "All tasks" },
                      { value: "upcoming", label: "Upcoming" },
                      { value: "completed", label: "Completed" },
                    ]}
                    className="w-full sm:w-48"
                  />
                  <Button
                    size="sm"
                    onClick={() => setIsAddingAction(true)}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Create Task
                  </Button>
                </div>
              )}
            </div>

            <TabsContent value="meetings" className="mt-0 space-y-3">
              {filteredMeetings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center">
                  <Calendar className="mx-auto mb-3 h-8 w-8 text-slate-800" />
                  <p className="text-sm text-slate-500">
                    {meetingFilter === "all"
                      ? "No meetings found for this student."
                      : meetingFilter === "upcoming"
                        ? "No upcoming meetings."
                        : "No completed meetings."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredMeetings.map((meeting) => {
                    const displayDate = formatInTimezone(
                      meeting.date,
                      meeting.timezone || studentTimezone,
                      {
                        weekday: "short",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        timeZoneName: "short",
                      },
                    );
                    const snippet = meeting.summary || meeting.notes;
                    return (
                      <div
                        key={meeting.id}
                        className="rounded-xl border border-slate-800 bg-slate-900 p-4 transition-all hover:border-indigo-500/30"
                      >
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                                {displayDate}
                              </p>
                              {meeting.completed ? (
                                <Badge variant="success">Completed</Badge>
                              ) : (
                                <Badge variant="warning">Upcoming</Badge>
                              )}
                            </div>
                            <h5 className="font-semibold text-white">
                              {meeting.title || meeting.meetingType || "General Mentorship Session"}
                            </h5>
                            {snippet ? (
                              <p className="line-clamp-2 text-sm text-slate-400">{snippet}</p>
                            ) : (
                              <p className="text-sm italic text-slate-600">No summary yet.</p>
                            )}
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {meeting.link && (
                              <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
                                onClick={() => window.open(meeting.link!, "_blank", "noopener,noreferrer")}
                              >
                                Join video
                              </Button>
                            )}
                            <Button
                              variant={meeting.completed ? "ghost" : "primary"}
                              size="sm"
                              leftIcon={
                                meeting.completed ? (
                                  <Edit2 className="h-3.5 w-3.5" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                )
                              }
                              onClick={() => {
                                setSelectedMeetingToComplete(meeting);
                                setIsCompletingMeeting(true);
                              }}
                            >
                              {meeting.completed ? "Edit" : "Complete"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="tasks" className="mt-0 space-y-4">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-400">
                      <Target className="h-4 w-4" /> Student Action Items
                    </h4>
                    <span className="rounded-lg bg-indigo-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                      {filteredStudentActions.filter((a) => a.status !== "COMPLETED").length} Active
                    </span>
                  </div>

                  <div className="space-y-3">
                    {filteredStudentActions
                      .filter((a) => a.status !== "COMPLETED")
                      .map((task) => (
                        <div
                          key={task.id}
                          className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-4 transition-all hover:border-indigo-500/30"
                        >
                          <div className="absolute left-0 top-0 h-full w-1 bg-indigo-500" />
                          <div className="mb-3 flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                                  task.priority === "HIGH"
                                    ? "border border-rose-500/20 bg-rose-500/20 text-rose-400"
                                    : task.priority === "MEDIUM"
                                      ? "border border-amber-500/20 bg-amber-500/20 text-amber-400"
                                      : "border border-emerald-500/20 bg-emerald-500/20 text-emerald-400"
                                }`}
                              >
                                {task.priority}
                              </div>
                              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                <Calendar size={12} /> Due {task.dueDate}
                              </span>
                            </div>
                            <button
                              onClick={() => onToggleActionItem?.(task.id)}
                              className="flex h-6 w-6 items-center justify-center rounded-lg border-2 border-slate-700 transition-all hover:border-indigo-500"
                            >
                              <div className="h-2 w-2 rounded-sm bg-transparent transition-all group-hover:bg-indigo-500/50" />
                            </button>
                          </div>
                          <h5 className="mb-1 text-base font-semibold text-white">{task.task}</h5>
                          {task.description && (
                            <p className="mb-3 line-clamp-2 text-sm text-slate-400">{task.description}</p>
                          )}
                          <div className="mt-3 flex items-center justify-between border-t border-slate-800/50 pt-3">
                            <div className="flex items-center gap-2">
                              {task.resourceLink && (
                                <a
                                  href={task.resourceLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300"
                                >
                                  <ArrowLeft className="h-3 w-3 rotate-135" /> View Resource
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                onClick={() => {
                                  setEditingAction(task);
                                  setEditAssignee("STUDENT");
                                }}
                                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => onDeleteActionItem?.(task.id)}
                                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                    {(taskFilter === "all" || taskFilter === "completed") &&
                      filteredStudentActions.filter((a) => a.status === "COMPLETED").length > 0 && (
                        <div className="mt-2 space-y-3">
                          {taskFilter === "all" && (
                            <h5 className="px-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                              Completed Tasks
                            </h5>
                          )}
                          {filteredStudentActions
                            .filter((a) => a.status === "COMPLETED")
                            .map((task) => (
                              <div
                                key={task.id}
                                className="group rounded-xl border border-slate-800/50 bg-slate-900/40 p-3 opacity-60"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => onToggleActionItem?.(task.id)}
                                      className="flex h-5 w-5 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/20 transition-all hover:bg-emerald-500/40"
                                    >
                                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                    </button>
                                    <div>
                                      <h6 className="text-sm font-medium text-slate-400 line-through">
                                        {task.task}
                                      </h6>
                                      <p className="text-[9px] text-slate-600">Completed {task.dueDate}</p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => onDeleteActionItem?.(task.id)}
                                    className="rounded-lg p-2 text-slate-600 opacity-0 transition-all hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}

                    {filteredStudentActions.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/20 p-8 text-center">
                        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-slate-800 opacity-20" />
                        <p className="text-sm text-slate-500">No student tasks for this filter.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-400">
                      <Briefcase className="h-4 w-4" /> My Tasks (Mentor)
                    </h4>
                    <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                      {filteredStaffTasks.filter((t) => t.status !== "COMPLETED").length} Active
                    </span>
                  </div>

                  <div className="space-y-3">
                    {filteredStaffTasks
                      .filter((t) => t.status !== "COMPLETED")
                      .map((task) => (
                        <div
                          key={task.id}
                          className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-4 transition-all hover:border-emerald-500/30"
                        >
                          <div className="absolute left-0 top-0 h-full w-1 bg-emerald-500" />
                          <div className="mb-3 flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                                  task.priority === "HIGH"
                                    ? "border border-rose-500/20 bg-rose-500/20 text-rose-400"
                                    : task.priority === "MEDIUM"
                                      ? "border border-amber-500/20 bg-amber-500/20 text-amber-400"
                                      : "border border-emerald-500/20 bg-emerald-500/20 text-emerald-400"
                                }`}
                              >
                                {task.priority}
                              </div>
                              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                <Calendar size={12} /> Due{" "}
                                {(task.dueDate || task.due_date)
                                  ? parseLocalDate(String(task.dueDate || task.due_date)).toLocaleDateString()
                                  : "N/A"}
                              </span>
                            </div>
                            <button
                              onClick={() => onUpdateStaffTask?.({ ...task, status: "COMPLETED" })}
                              className="flex h-6 w-6 items-center justify-center rounded-lg border-2 border-slate-700 transition-all hover:border-emerald-500"
                            >
                              <div className="h-2 w-2 rounded-sm bg-transparent transition-all group-hover:bg-emerald-500/50" />
                            </button>
                          </div>
                          <h5 className="mb-1 text-base font-semibold text-white">{task.task}</h5>
                          {task.description && (
                            <p className="mb-3 line-clamp-2 text-sm text-slate-400">{task.description}</p>
                          )}
                          <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-800/50 pt-3 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={() => {
                                setEditingStaffTask(task);
                                setEditAssignee("MENTOR");
                              }}
                              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => onDeleteStaffTask?.(task.id)}
                              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}

                    {(taskFilter === "all" || taskFilter === "completed") &&
                      filteredStaffTasks.filter((t) => t.status === "COMPLETED").length > 0 && (
                        <div className="mt-2 space-y-3">
                          {taskFilter === "all" && (
                            <h5 className="px-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                              Completed Tasks
                            </h5>
                          )}
                          {filteredStaffTasks
                            .filter((t) => t.status === "COMPLETED")
                            .map((task) => (
                              <div
                                key={task.id}
                                className="group rounded-xl border border-slate-800/50 bg-slate-900/40 p-3 opacity-60"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => onUpdateStaffTask?.({ ...task, status: "PENDING" })}
                                      className="flex h-5 w-5 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/20 transition-all hover:bg-emerald-500/40"
                                    >
                                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                    </button>
                                    <div>
                                      <h6 className="text-sm font-medium text-slate-400 line-through">
                                        {task.task}
                                      </h6>
                                      <p className="text-[9px] text-slate-600">
                                        Completed{" "}
                                        {task.dueDate
                                          ? parseLocalDate(task.dueDate).toLocaleDateString()
                                          : "N/A"}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => onDeleteStaffTask?.(task.id)}
                                    className="rounded-lg p-2 text-slate-600 opacity-0 transition-all hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}

                    {filteredStaffTasks.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/20 p-8 text-center">
                        <Briefcase className="mx-auto mb-3 h-10 w-10 text-slate-800 opacity-20" />
                        <p className="text-sm text-slate-500">No mentor tasks for this filter.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-400">
                    <Calendar className="h-4 w-4" /> Past Meetings & Notes
                  </h4>
                  <div className="space-y-3">
                    {studentMeetings
                      .filter((m) => m.completed)
                      .map((meeting) => {
                        const displayDate = formatInTimezone(
                          meeting.date,
                          meeting.timezone || studentTimezone,
                          {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            timeZoneName: "short",
                          },
                        );

                        return (
                          <div
                            key={meeting.id}
                            className="group relative rounded-xl border border-slate-800 bg-slate-900 p-4 transition-all hover:border-indigo-500/30"
                          >
                            <Button
                              type="button"
                              size="icon"
                              variant="secondary"
                              className="absolute right-4 top-4 h-8 w-8 opacity-0 group-hover:opacity-100"
                              aria-label="Edit meeting notes"
                              onClick={() => {
                                setSelectedMeetingToComplete(meeting);
                                setIsCompletingMeeting(true);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <div className="mb-3 flex items-start justify-between pr-10">
                              <div>
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                                  {displayDate}
                                </p>
                                <h5 className="font-semibold text-white">
                                  {meeting.title || meeting.meetingType || "General Mentorship Session"}
                                </h5>
                              </div>
                              <Badge variant="success">Completed</Badge>
                            </div>
                            {meeting.summary || meeting.notes ? (
                              <div className="rounded-xl border border-slate-800/50 bg-slate-950/50 p-3">
                                <p className="text-sm italic leading-relaxed text-slate-400">
                                  <StickyNote className="mr-2 inline-block h-4 w-4 text-slate-600" />
                                  {meeting.summary || meeting.notes}
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm italic text-slate-600">
                                No summary notes recorded for this meeting.
                              </p>
                            )}

                            {meeting.actionItemsCreated && meeting.actionItemsCreated.length > 0 && (
                              <div className="mt-3 space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                  Action Items Assigned:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {meeting.actionItemsCreated.map((actionId) => {
                                    const action = studentActions.find((a) => a.id === actionId);
                                    if (!action) return null;
                                    return (
                                      <div
                                        key={actionId}
                                        className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] text-slate-300"
                                      >
                                        <CheckSquare className="h-3 w-3 text-emerald-500" />
                                        {action.task}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    {studentMeetings.filter((m) => m.completed).length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center">
                        <Calendar className="mx-auto mb-3 h-8 w-8 text-slate-800" />
                        <p className="text-sm text-slate-500">No completed meetings found in history.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-400">
                    <CheckSquare className="h-4 w-4" /> Accomplishments
                  </h4>
                  <div className="space-y-3">
                    {studentActions
                      .filter((a) => a.status === "COMPLETED")
                      .sort(
                        (a, b) =>
                          new Date(b.dueDate || "").getTime() - new Date(a.dueDate || "").getTime(),
                      )
                      .map((action) => (
                        <div
                          key={action.id}
                          className="group flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 transition-all hover:border-emerald-500/30"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                          <div>
                            <h5 className="font-semibold text-white">{action.task}</h5>
                            <p className="mt-1 text-sm text-slate-500">
                              {action.description || "Task completed successfully."}
                            </p>
                            <div className="mt-2 flex items-center gap-3">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                                Completed {action.dueDate}
                              </span>
                              {action.category && (
                                <span className="rounded bg-slate-800 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-400">
                                  {action.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    {studentActions.filter((a) => a.status === "COMPLETED").length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center">
                        <CheckSquare className="mx-auto mb-3 h-8 w-8 text-slate-800" />
                        <p className="text-sm text-slate-500">No completed tasks recorded yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      <Modal
        open={isAddingAction}
        onClose={() => {
          if (createActionItemMutation.isPending || createStaffTaskMutation.isPending) return;
          setIsAddingAction(false);
          resetNewAction();
        }}
        title="Create New Task"
        description={
          newAction.assignee === "STUDENT"
            ? "Assign a checklist item to this student."
            : relatedMentorId
              ? "Assign a task to this student’s mentor."
              : "This student needs an assigned mentor before creating mentor tasks."
        }
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsAddingAction(false);
                resetNewAction();
              }}
              disabled={createActionItemMutation.isPending || createStaffTaskMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddAction}
              isLoading={createActionItemMutation.isPending || createStaffTaskMutation.isPending}
              disabled={newAction.assignee === "MENTOR" && !relatedMentorId && authUser?.role !== "MENTOR"}
            >
              {newAction.assignee === "STUDENT" ? "Assign to Student" : "Assign to Mentor"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField label="Assign to">
            <div className="flex rounded-xl border border-slate-800 bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setNewAction({ ...newAction, assignee: "STUDENT" })}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold uppercase tracking-wide transition-all ${
                  newAction.assignee === "STUDENT"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Target size={14} /> Student
              </button>
              <button
                type="button"
                onClick={() => setNewAction({ ...newAction, assignee: "MENTOR" })}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold uppercase tracking-wide transition-all ${
                  newAction.assignee === "MENTOR"
                    ? "bg-emerald-600 text-white shadow"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Briefcase size={14} /> {staffSelfLabel}
              </button>
            </div>
          </FormField>

          <FormField label="Task title" htmlFor="action-task" required>
            <Input
              id="action-task"
              value={newAction.task}
              onChange={(e) => setNewAction({ ...newAction, task: e.target.value })}
              placeholder={
                newAction.assignee === "STUDENT"
                  ? "e.g. Register for DAT"
                  : "e.g. Review personal statement draft"
              }
            />
          </FormField>

          <FormField label="Details" htmlFor="action-details" hint="Optional">
            <Textarea
              id="action-details"
              value={newAction.description}
              onChange={(e) => setNewAction({ ...newAction, description: e.target.value })}
              placeholder="Break down the task into smaller steps..."
            />
          </FormField>

          <FormField label="Resource link" htmlFor="action-resource" hint="Optional">
            <Input
              id="action-resource"
              type="url"
              value={newAction.resourceLink}
              onChange={(e) => setNewAction({ ...newAction, resourceLink: e.target.value })}
              placeholder="https://example.com/resource"
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Due date" required>
              <DatePicker
                value={newAction.dueDate}
                onChange={(dueDate) => setNewAction({ ...newAction, dueDate })}
              />
            </FormField>
            <FormField label="Priority" required>
              <SelectMenu
                value={newAction.priority}
                onChange={(priority) =>
                  setNewAction({
                    ...newAction,
                    priority: priority as "HIGH" | "MEDIUM" | "LOW",
                  })
                }
                options={[
                  { value: "HIGH", label: "High" },
                  { value: "MEDIUM", label: "Medium" },
                  { value: "LOW", label: "Low" },
                ]}
              />
            </FormField>
          </div>
        </div>
      </Modal>

      {/* Edit Student Action Item Modal */}
      <AnimatePresence>
        {editingAction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl my-auto"
            >
              <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Edit2 size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-white">Edit Student Task</h3>
                </div>
                <button onClick={() => setEditingAction(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Assign To</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setEditAssignee('STUDENT')}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                          editAssignee === 'STUDENT' 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                        }`}
                      >
                        Student
                      </button>
                      <button 
                        onClick={() => setEditAssignee('MENTOR')}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                          editAssignee === 'MENTOR' 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                        }`}
                      >
                        Mentor
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Task Title</label>
                    <input 
                      type="text" 
                      value={editingAction.task}
                      onChange={e => setEditingAction({...editingAction, task: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Details (Optional)</label>
                    <textarea 
                      value={editingAction.description || ''}
                      onChange={e => setEditingAction({...editingAction, description: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 h-24 resize-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Resource Link (Optional)</label>
                    <div className="relative">
                      <input 
                        type="url" 
                        value={editingAction.resourceLink || ''}
                        onChange={e => setEditingAction({...editingAction, resourceLink: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all"
                      />
                      <ExternalLink className="w-4 h-4 text-slate-600 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Due Date</label>
                      <div className="relative">
                        <input 
                          type="date" 
                          value={editingAction.dueDate}
                          onChange={e => setEditingAction({...editingAction, dueDate: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all"
                        />
                        <Calendar className="w-4 h-4 text-slate-600 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Priority</label>
                      <select 
                        value={editingAction.priority}
                        onChange={e => setEditingAction({...editingAction, priority: e.target.value as any})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                      >
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                      </select>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleUpdateAction}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Mentor Task Modal */}
      <AnimatePresence>
        {editingStaffTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl my-auto"
            >
              <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Edit2 size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-white">Edit Mentor Task</h3>
                </div>
                <button onClick={() => setEditingStaffTask(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Assign To</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setEditAssignee('STUDENT')}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                          editAssignee === 'STUDENT' 
                            ? 'bg-emerald-600 border-emerald-600 text-white' 
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                        }`}
                      >
                        Student
                      </button>
                      <button 
                        onClick={() => setEditAssignee('MENTOR')}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                          editAssignee === 'MENTOR' 
                            ? 'bg-emerald-600 border-emerald-600 text-white' 
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                        }`}
                      >
                        Mentor
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Task Title</label>
                    <input 
                      type="text" 
                      value={editingStaffTask.task}
                      onChange={e => setEditingStaffTask({...editingStaffTask, task: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Details (Optional)</label>
                    <textarea 
                      value={editingStaffTask.description || ''}
                      onChange={e => setEditingStaffTask({...editingStaffTask, description: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 h-24 resize-none transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Due Date</label>
                      <div className="relative">
                        <input 
                          type="date" 
                          value={(editingStaffTask.dueDate || '').split('T')[0]}
                          onChange={e => setEditingStaffTask({...editingStaffTask, dueDate: new Date(e.target.value).toISOString()})}
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-all"
                        />
                        <Calendar className="w-4 h-4 text-slate-600 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Priority</label>
                      <select 
                        value={editingStaffTask.priority}
                        onChange={e => setEditingStaffTask({...editingStaffTask, priority: e.target.value as any})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-all appearance-none"
                      >
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                      </select>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleUpdateStaffTask}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Complete Meeting Modal */}
      <Modal
        open={isCompletingMeeting}
        onClose={() => {
          setIsCompletingMeeting(false);
          setSelectedMeetingToComplete(null);
        }}
        title={selectedMeetingToComplete?.completed ? "Edit Meeting" : "Complete Meeting"}
        description={
          selectedMeetingToComplete
            ? `Session with ${student.name} • ${formatInTimezone(
                selectedMeetingToComplete.date,
                selectedMeetingToComplete.timezone || studentTimezone,
                {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZoneName: "short",
                },
              )}`
            : `Session with ${student.name}`
        }
        size="2xl"
        fullHeight
      >
        <CompleteMeetingForm
          student={student}
          meeting={selectedMeetingToComplete || undefined}
          embedded
          onClose={() => {
            setIsCompletingMeeting(false);
            setSelectedMeetingToComplete(null);
          }}
          onSubmit={async (data) => {
            await onCompleteMeeting(selectedMeetingToComplete?.id, data);
            setIsCompletingMeeting(false);
            setSelectedMeetingToComplete(null);
          }}
        />
      </Modal>
      {/* Add Strategic Goal Modal */}
      <AnimatePresence>
        {isAddingGoal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <h3 className="text-xl font-bold text-white">New Strategic Goal</h3>
                <button onClick={() => setIsAddingGoal(false)} className="text-slate-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              <form className="p-8 space-y-6" onSubmit={(e) => {
                e.preventDefault();
                const goal: ImprovementGoal = {
                  id: `goal-${Date.now()}`,
                  studentId: student.id,
                  category: newGoal.category as any,
                  goal: newGoal.goal || '',
                  targetValue: Number(newGoal.targetValue) || 0,
                  currentValue: Number(newGoal.currentValue) || 0,
                  unit: newGoal.unit || 'Hours',
                  status: (Number(newGoal.currentValue) >= Number(newGoal.targetValue)) ? 'Achieved' : 'In Progress'
                };
                onUpdateImprovementGoal(goal);
                setIsAddingGoal(false);
                setNewGoal({
                  category: 'Volunteering',
                  status: 'In Progress',
                  currentValue: 0,
                  unit: 'Hours'
                });
              }}>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Category</label>
                  <select 
                    value={newGoal.category}
                    onChange={(e) => setNewGoal({...newGoal, category: e.target.value as any})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value="Volunteering">Volunteering</option>
                    <option value="Shadowing">Shadowing</option>
                    <option value="Research">Research</option>
                    <option value="Dental Experience">Dental Experience</option>
                    <option value="Employment">Employment</option>
                    <option value="Manual Dexterity">Manual Dexterity</option>
                    <option value="Academic Enrichment">Academic Enrichment</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Goal Description</label>
                  <input 
                    type="text"
                    required
                    value={newGoal.goal}
                    onChange={(e) => setNewGoal({...newGoal, goal: e.target.value})}
                    placeholder="e.g. Complete 100 hours of community service"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target Value</label>
                    <input 
                      type="number"
                      required
                      value={newGoal.targetValue}
                      onChange={(e) => setNewGoal({...newGoal, targetValue: Number(e.target.value)})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Unit</label>
                    <input 
                      type="text"
                      required
                      value={newGoal.unit}
                      onChange={(e) => setNewGoal({...newGoal, unit: e.target.value})}
                      placeholder="Hours, Projects, etc."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
                <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-600/20">
                  Set Strategic Goal
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentProfileView;
