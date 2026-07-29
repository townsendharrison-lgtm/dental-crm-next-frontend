"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import { usePreviewSubject } from "@/lib/hooks/usePreviewSubject";
import { useStudent, useStudentStrengthPercentile } from "@/lib/hooks/useStudentProfile";
import { useBadges, useEarnedBadges, useEvaluateBadges } from "@/lib/hooks/useBadges";
import { useActionItems, useUpdateActionItem, useCreateActionItem, useDeleteActionItem } from "@/lib/hooks/useActionItems";
import { useDeleteNotification, useNotifications } from "@/lib/hooks/useNotifications";
import type { SystemNotification } from "@/lib/types";
import { useSurveys, useSubmitSurveyResponse } from "@/lib/hooks/useSurveys";
import { useMeetings } from "@/lib/hooks/useMeetings";
import { useResources } from "@/lib/hooks/useResources";
import StudentDashboard from "@/components/student/StudentDashboardView";
import UserSurveyView from "@/components/student/UserSurveyView";
import { Modal } from "@/components/ui/Modal";
import { usePlatformConfig } from "@/lib/hooks/usePlatformConfig";
import type { Survey } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { withToastLoading } from "@/lib/utils/toastAction";
import { messagesApi } from "@/lib/api/messages";

function meetingStudentId(m: { student_id?: string | null; studentId?: string | null }) {
  return m.student_id ?? m.studentId ?? "";
}

function surveyTarget(s: Survey) {
  return s.targetRole || s.target_role || "BOTH";
}

function surveyIsActive(s: Survey) {
  if (s.status === "INACTIVE") return false;
  if (s.is_active === false) return false;
  const end = s.endDate ?? s.end_date;
  if (end && new Date(end).getTime() < Date.now()) return false;
  return true;
}

export default function StudentMomentumPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { subjectId, isLoadingSubjects } = usePreviewSubject("STUDENT");
  const platformConfig = usePlatformConfig();
  const { data: student, isLoading: isStudentLoading } = useStudent(subjectId);
  const { data: strengthPercentile } = useStudentStrengthPercentile(subjectId);
  const { data: badges = [] } = useBadges();
  const { data: earnedBadgeRows = [] } = useEarnedBadges(subjectId);
  const evaluateBadges = useEvaluateBadges();
  const { data: actionItems = [] } = useActionItems(subjectId);
  const { data: notifications = [] } = useNotifications();
  const deleteNotification = useDeleteNotification();
  const { data: surveys = [] } = useSurveys();
  const { data: meetings = [] } = useMeetings();
  const { data: resources = [] } = useResources(!!user);

  const updateActionItemMutation = useUpdateActionItem();
  const createActionItemMutation = useCreateActionItem();
  const deleteActionItemMutation = useDeleteActionItem();
  const submitSurveyMutation = useSubmitSurveyResponse();

  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  /** Optimistic hide until list refetch marks hasResponded */
  const [justCompletedIds, setJustCompletedIds] = useState<string[]>([]);
  const [focusMeetingId, setFocusMeetingId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setFocusMeetingId(new URLSearchParams(window.location.search).get("meetingId"));
  }, []);

  useEffect(() => {
    if (!subjectId) return;
    evaluateBadges.mutate(subjectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- evaluate once per student session open
  }, [subjectId]);

  const studentWithBadges = useMemo(() => {
    if (!student) return null;
    const fromApi = earnedBadgeRows
      .map((row) => ({
        badgeId: row.badge_id || "",
        earnedAt: row.earned_at || "",
      }))
      .filter((b) => b.badgeId);
    return {
      ...student,
      badges: fromApi.length > 0 ? fromApi : student.badges || [],
    };
  }, [student, earnedBadgeRows]);

  const pendingSurveys = useMemo(
    () =>
      surveys.filter((s) => {
        if (!surveyIsActive(s)) return false;
        const target = surveyTarget(s);
        if (target !== "STUDENT" && target !== "BOTH") return false;
        if (s.hasResponded || s.has_responded) return false;
        if (justCompletedIds.includes(s.id)) return false;
        return true;
      }),
    [surveys, justCompletedIds],
  );

  if (isLoadingSubjects || isStudentLoading || !user) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!studentWithBadges) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-slate-400">
        Student profile not found.
      </div>
    );
  }

  const now = Date.now();
  const isUpcoming = (m: (typeof meetings)[number]) => {
    if (m.completed) return false;
    return new Date(m.date).getTime() >= now - 60 * 60 * 1000;
  };
  const isWebinar = (m: (typeof meetings)[number]) =>
    m.audience === "GLOBAL" || m.isGlobal === true;
  const isMentorMeeting = (m: (typeof meetings)[number]) =>
    !isWebinar(m) && meetingStudentId(m) === studentWithBadges.id;

  const bySoonest = (a: (typeof meetings)[number], b: (typeof meetings)[number]) =>
    new Date(a.date).getTime() - new Date(b.date).getTime();

  const upcoming = meetings.filter(isUpcoming);
  let nextMeeting = [...upcoming].filter(isMentorMeeting).sort(bySoonest)[0];
  let upcomingWebinar = [...upcoming].filter(isWebinar).sort(bySoonest)[0];

  if (focusMeetingId) {
    const focused = meetings.find((m) => m.id === focusMeetingId);
    if (focused && isUpcoming(focused)) {
      if (isWebinar(focused)) upcomingWebinar = focused;
      else if (isMentorMeeting(focused)) nextMeeting = focused;
    }
  }

  const handleToggleActionItem = (itemId: string) => {
    const item = actionItems.find((ai) => ai.id === itemId);
    if (item) {
      const newStatus = item.status === "COMPLETED" ? "PENDING" : "COMPLETED";
      updateActionItemMutation.mutate({
        id: itemId,
        updates: { status: newStatus },
      });
    }
  };

  const handleAddActionItem = (task: string, dueDate: string) => {
    createActionItemMutation.mutate(
      {
        studentId: subjectId,
        task,
        dueDate,
        priority: "MEDIUM",
        category: "Personal",
      },
      {
        onSuccess: () => toast.success("Task added"),
        onError: (err: any) => toast.error(err?.message || "Failed to add task"),
      },
    );
  };

  const handleDeleteActionItem = (itemId: string) => {
    if (!subjectId) return;
    deleteActionItemMutation.mutate(
      { id: itemId, studentId: subjectId },
      {
        onSuccess: () => toast.success("Task deleted"),
        onError: (err: any) => toast.error(err?.message || "Failed to delete task"),
      },
    );
  };

  const handleNavigate = (tab: string) => {
    const map: Record<string, string> = {
      messages: "/student/messages",
      "mentor-assistant": "/student/mentor-assistant",
      resources: "/student/resources",
      hub: "/student/hub",
      profile: "/student/profile",
    };
    const href = map[tab];
    if (href) router.push(href);
  };

  const handleOpenNotification = (notif: SystemNotification) => {
    const category = (notif.category || "").toUpperCase();
    if (!category.includes("MESSAGE")) return;

    // Remove from Momentum / bell once the inbox thread is opened
    deleteNotification.mutate(notif.id);
    router.push(
      notif.related_id
        ? `/student/messages/${notif.related_id}`
        : "/student/messages",
    );
  };

  const handleTakeSurvey = (id: string) => {
    const survey = surveys.find((s) => s.id === id) || null;
    if (!survey) {
      toast.error("Survey not found");
      return;
    }
    setActiveSurvey(survey);
  };

  const markSurveyDone = (id: string) => {
    setJustCompletedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleSubmitSurvey = async (
    answers: Array<{ questionId: string; answerText: string }>,
  ) => {
    if (!activeSurvey) return;
    const surveyId = activeSurvey.id;
    const t = withToastLoading("Submitting survey…");
    try {
      await submitSurveyMutation.mutateAsync({
        surveyId,
        answers,
      });
      markSurveyDone(surveyId);
      setActiveSurvey(null);
      t.success("Survey submitted");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      if (message?.toLowerCase().includes("already")) {
        markSurveyDone(surveyId);
        setActiveSurvey(null);
        t.success("You already completed this survey");
        return;
      }
      t.error(message || "Failed to submit survey");
      throw err;
    }
  };

  return (
    <div className="pt-2">
      <StudentDashboard
        student={studentWithBadges}
        badges={badges}
        actionItems={actionItems}
        resources={resources}
        notifications={notifications}
        surveys={pendingSurveys}
        onSendMessage={async (text, receiverId) => {
          const conv = await messagesApi.create({ participantIds: [receiverId] });
          await messagesApi.sendMessage(conv.id, text);
        }}
        onNavigate={handleNavigate}
        onOpenNotification={handleOpenNotification}
        onToggleActionItem={handleToggleActionItem}
        onAddActionItem={handleAddActionItem}
        onDeleteActionItem={handleDeleteActionItem}
        onTakeSurvey={handleTakeSurvey}
        onUpdateApplications={() => {}}
        nextMeeting={nextMeeting}
        upcomingWebinar={upcomingWebinar}
        platformConfig={platformConfig}
        strengthPercentile={strengthPercentile}
      />

      <Modal
        open={!!activeSurvey}
        onClose={() => {
          if (!submitSurveyMutation.isPending) setActiveSurvey(null);
        }}
        size="lg"
        closeOnBackdrop={!submitSurveyMutation.isPending}
      >
        {activeSurvey && (
          <UserSurveyView
            survey={activeSurvey}
            isSubmitting={submitSurveyMutation.isPending}
            onClose={() => setActiveSurvey(null)}
            onSubmit={handleSubmitSurvey}
          />
        )}
      </Modal>
    </div>
  );
}
