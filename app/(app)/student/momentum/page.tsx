"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import { useStudent, useStudentStrengthPercentile } from "@/lib/hooks/useStudentProfile";
import { useBadges, useEarnedBadges, useEvaluateBadges } from "@/lib/hooks/useBadges";
import { useActionItems, useUpdateActionItem } from "@/lib/hooks/useActionItems";
import { useNotifications } from "@/lib/hooks/useNotifications";
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

function meetingStudentId(m: { student_id?: string | null; studentId?: string | null }) {
  return m.student_id ?? m.studentId ?? "";
}

function surveyTarget(s: Survey) {
  return s.targetRole || s.target_role || "BOTH";
}

function surveyIsActive(s: Survey) {
  if (s.status === "INACTIVE") return false;
  return s.is_active !== false;
}

export default function StudentMomentumPage() {
  const router = useRouter();
  const { user } = useAuth();
  const platformConfig = usePlatformConfig();
  const { data: student, isLoading: isStudentLoading } = useStudent(user?.id || "");
  const { data: strengthPercentile } = useStudentStrengthPercentile(user?.id || "");
  const { data: badges = [] } = useBadges();
  const { data: earnedBadgeRows = [] } = useEarnedBadges(user?.id || "");
  const evaluateBadges = useEvaluateBadges();
  const { data: actionItems = [] } = useActionItems(user?.id || "");
  const { data: notifications = [] } = useNotifications();
  const { data: surveys = [] } = useSurveys();
  const { data: meetings = [] } = useMeetings();
  const { data: resources = [] } = useResources(!!user);

  const updateActionItemMutation = useUpdateActionItem();
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
    if (!user?.id) return;
    evaluateBadges.mutate(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- evaluate once per student session open
  }, [user?.id]);

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

  if (isStudentLoading || !user) {
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
  const nextMeeting =
    (focusMeetingId && meetings.find((m) => m.id === focusMeetingId)) ||
    meetings
      .filter((m) => {
        if (m.completed) return false;
        const due = new Date(m.date).getTime() >= now - 60 * 60 * 1000;
        if (!due) return false;
        const sid = meetingStudentId(m);
        if (sid === studentWithBadges.id) return true;
        // Global webinars visible to all students
        if (m.audience === "GLOBAL") return true;
        return false;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

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
        onSendMessage={() => {}}
        onNavigate={handleNavigate}
        onToggleActionItem={handleToggleActionItem}
        onTakeSurvey={handleTakeSurvey}
        onUpdateApplications={() => {}}
        nextMeeting={nextMeeting}
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
