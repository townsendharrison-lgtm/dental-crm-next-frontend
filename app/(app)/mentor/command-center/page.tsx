"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { usePreviewSubject } from "@/lib/hooks/usePreviewSubject";
import {
  useMentor,
  useMentorStudents,
  useMyPendingAssignments,
  useAcceptAssignment,
  useDeclineAssignment,
} from "@/lib/hooks/useMentors";
import { useStudents } from "@/lib/hooks/useStudentProfile";
import { useTasks, useUpdateTask, useCreateTask, useDeleteTask } from "@/lib/hooks/useTasks";
import { useMeetings, useCreateMeeting } from "@/lib/hooks/useMeetings";
import { useActionItems } from "@/lib/hooks/useActionItems";
import {
  useNotifications,
  useDeleteNotification,
} from "@/lib/hooks/useNotifications";
import { useSurveys, useSubmitSurveyResponse } from "@/lib/hooks/useSurveys";
import MentorDashboard from "@/components/mentor/MentorDashboardView";
import UserSurveyView from "@/components/student/UserSurveyView";
import { Modal } from "@/components/ui/Modal";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { normalizeStudents } from "@/lib/utils/normalizeStudent";
import { usePlatformConfig } from "@/lib/hooks/usePlatformConfig";
import { DEFAULT_ASSIGNMENT_WELCOME } from "@/lib/api/adminSettings";
import { messagesApi } from "@/lib/api/messages";
import type { Survey } from "@/lib/types";

export default function MentorCommandCenterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const platformConfig = usePlatformConfig();
  const { subjectId: mentorId, isLoadingSubjects } = usePreviewSubject("MENTOR");
  const { data: mentor, isLoading: isMentorLoading } = useMentor(mentorId);
  const pushActionHandled = useRef<string | null>(null);
  const welcomeMessageTemplate =
    platformConfig.welcomeTemplateAssignment || DEFAULT_ASSIGNMENT_WELCOME;
  const { data: mentorStudentsRaw = [], isLoading: isMentorStudentsLoading } = useMentorStudents(
    mentorId,
  );
  const { data: allStudentsRaw = [] } = useStudents();
  const { data: staffTasks = [] } = useTasks();
  const { data: meetingsRaw = [] } = useMeetings();
  const { data: actionItems = [] } = useActionItems();
  const { data: notifications = [] } = useNotifications();
  const { data: surveys = [] } = useSurveys();
  const { data: pendingAssignments = [], isLoading: isPendingLoading } =
    useMyPendingAssignments(!!user?.id && mentorId === user.id);

  const updateTaskMutation = useUpdateTask();
  const createTaskMutation = useCreateTask();
  const deleteTaskMutation = useDeleteTask();
  const createMeetingMutation = useCreateMeeting();
  const acceptAssignmentMutation = useAcceptAssignment();
  const declineAssignmentMutation = useDeclineAssignment();
  const deleteNotificationMutation = useDeleteNotification();
  const submitSurveyMutation = useSubmitSurveyResponse();

  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [pushAcceptAssignmentId, setPushAcceptAssignmentId] = useState<string | null>(null);

  // Handle Accept / Decline CTAs from push notifications (and bare assignment deep links)
  useEffect(() => {
    const assignmentId = searchParams.get("assignmentId");
    if (!assignmentId || !user) return;

    const action = (searchParams.get("assignmentAction") || "accept").toLowerCase();
    if (action !== "accept" && action !== "decline") return;

    const key = `${action}:${assignmentId}`;
    if (pushActionHandled.current === key) return;
    pushActionHandled.current = key;

    const clearParams = () => {
      router.replace("/mentor/command-center", { scroll: false });
    };

    if (action === "accept") {
      // Open the same Accept modal flow (availability + welcome message)
      setPushAcceptAssignmentId(assignmentId);
      clearParams();
      return;
    }

    declineAssignmentMutation.mutate(assignmentId, {
      onSuccess: () => {
        toast.success("Assignment declined");
        clearParams();
      },
      onError: (err: any) => {
        toast.error(err?.message || "Failed to decline assignment");
        clearParams();
      },
    });
  }, [searchParams, user, router, declineAssignmentMutation]);

  // If push Accept targeted an assignment that is no longer pending, drop the request
  useEffect(() => {
    if (!pushAcceptAssignmentId || isPendingLoading) return;
    const stillPending = pendingAssignments.some((a) => a.id === pushAcceptAssignmentId);
    if (!stillPending) {
      toast.error("That assignment is no longer pending");
      setPushAcceptAssignmentId(null);
    }
  }, [pushAcceptAssignmentId, pendingAssignments, isPendingLoading]);

  const mentorStudents = useMemo(
    () => normalizeStudents(mentorStudentsRaw),
    [mentorStudentsRaw],
  );
  const allStudents = useMemo(() => normalizeStudents(allStudentsRaw), [allStudentsRaw]);
  const meetings = useMemo(
    () =>
      meetingsRaw.map((m) => ({
        ...m,
        studentId: m.studentId || m.student_id || undefined,
        mentorId: m.mentorId || m.mentor_id || undefined,
      })),
    [meetingsRaw],
  );

  const pendingSurveys = useMemo(
    () => surveys.filter((s) => !(s.hasResponded ?? s.has_responded)),
    [surveys],
  );

  if (isLoadingSubjects || isMentorLoading || isMentorStudentsLoading || isPendingLoading || !user) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-slate-400">
        Mentor profile not found.
      </div>
    );
  }

  const handleNavigate = (tab: string) => {
    const map: Record<string, string> = {
      students: "/mentor/students",
      schedule: "/mentor/schedule",
      tasks: "/mentor/tasks",
      messages: "/mentor/messages",
      analytics: "/mentor/analytics",
    };
    const href = map[tab];
    if (href) router.push(href);
  };

  return (
    <div>
      <MentorDashboard
        mentor={mentor}
        students={mentorStudents}
        allStudents={allStudents}
        meetings={meetings}
        staffTasks={staffTasks}
        actionItems={actionItems}
        notifications={notifications}
        surveys={pendingSurveys}
        pendingAssignments={pendingAssignments}
        welcomeMessageTemplate={welcomeMessageTemplate}
        defaultAvailability={
          mentor.defaultAvailability || mentor.profile?.default_availability || []
        }
        autoOpenAcceptAssignmentId={pushAcceptAssignmentId}
        onAutoOpenAcceptConsumed={() => setPushAcceptAssignmentId(null)}
        acceptBusy={acceptAssignmentMutation.isPending}
        onSelectStudent={(id, tab) => {
          const params = new URLSearchParams({ studentId: id });
          if (tab) params.set("tab", tab);
          router.push(`/mentor/students?${params.toString()}`);
        }}
        onMessageStudent={async (id) => {
          try {
            const { openDmWithUser } = await import("@/lib/messages/openDm");
            await openDmWithUser(id, "/mentor/messages", router.push.bind(router));
          } catch (err: any) {
            toast.error(err?.message || "Could not open conversation");
          }
        }}
        onQuickCreateMeeting={async (payload) => {
          try {
            await createMeetingMutation.mutateAsync(payload);
            toast.success("Meeting scheduled");
          } catch (err: any) {
            toast.error(err?.message || "Failed to schedule meeting");
            throw err;
          }
        }}
        onSendScheduleSuggestMessage={async (studentId, message) => {
          try {
            const conv = await messagesApi.create({ participantIds: [studentId] });
            await messagesApi.sendMessage(conv.id, message);
            toast.success("Scheduling message sent");
            router.push(`/mentor/messages/${conv.id}`);
          } catch (err: any) {
            toast.error(err?.message || "Failed to send message");
            throw err;
          }
        }}
        onNavigate={handleNavigate}
        onUpdateTaskStatus={(id, status) => {
          updateTaskMutation.mutate({ id, updates: { status } });
        }}
        onUpdateTask={(task) => {
          updateTaskMutation.mutate(
            {
              id: task.id,
              updates: {
                task: task.task,
                dueDate: task.dueDate || task.due_date || "",
                priority: task.priority,
                studentId: task.studentId || task.student_id || undefined,
              },
            },
            {
              onSuccess: () => toast.success("Task updated"),
              onError: (err: any) => toast.error(err?.message || "Failed to update task"),
            },
          );
        }}
        onAddTask={(payload) => {
          createTaskMutation.mutate(
            {
              assignedTo: user.id,
              task: payload.task,
              dueDate: payload.dueDate || payload.due_date || "",
              priority: payload.priority,
              studentId: payload.studentId || payload.student_id || undefined,
            },
            {
              onSuccess: () => toast.success("Task added"),
              onError: (err: any) => toast.error(err?.message || "Failed to add task"),
            },
          );
        }}
        onDeleteTask={(id) => {
          deleteTaskMutation.mutate(id, {
            onSuccess: () => toast.success("Task deleted"),
            onError: (err: any) => toast.error(err?.message || "Failed to delete task"),
          });
        }}
        onTakeSurvey={(id) => {
          const survey = surveys.find((s) => s.id === id) || null;
          if (!survey) {
            toast.error("Survey not found");
            return;
          }
          setActiveSurvey(survey);
        }}
        onMarkNotificationRead={(id) => {
          deleteNotificationMutation.mutate(id);
        }}
        onAcceptAssignment={(assignmentId, availableTimes, timezone, customMessage) => {
          acceptAssignmentMutation.mutate(
            {
              assignmentId,
              availableTimes,
              welcomeMessage: customMessage,
              timezone,
            },
            {
              onSuccess: () => toast.success("Assignment accepted — welcome message sent"),
              onError: (err: any) => toast.error(err?.message || "Failed to accept"),
            },
          );
        }}
        onDeclineAssignment={(assignmentId) => {
          declineAssignmentMutation.mutate(assignmentId, {
            onSuccess: () => toast.success("Assignment declined"),
            onError: (err: any) => toast.error(err?.message || "Failed to decline"),
          });
        }}
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
            onSubmit={async (answers) => {
              try {
                await submitSurveyMutation.mutateAsync({
                  surveyId: activeSurvey.id,
                  answers,
                });
                toast.success("Survey submitted");
                setActiveSurvey(null);
              } catch (err: any) {
                const message = err?.response?.data?.error || err?.message;
                if (typeof message === "string" && message.toLowerCase().includes("already")) {
                  toast.success("You already completed this survey");
                  setActiveSurvey(null);
                  return;
                }
                toast.error(message || "Failed to submit survey");
              }
            }}
          />
        )}
      </Modal>
    </div>
  );
}
