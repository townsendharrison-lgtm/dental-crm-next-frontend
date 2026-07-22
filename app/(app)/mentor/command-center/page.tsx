"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  useMentor,
  useMentorStudents,
  useMyPendingAssignments,
  useAcceptAssignment,
  useDeclineAssignment,
} from "@/lib/hooks/useMentors";
import { useStudents } from "@/lib/hooks/useStudentProfile";
import { useTasks, useUpdateTask, useCreateTask } from "@/lib/hooks/useTasks";
import { useMeetings } from "@/lib/hooks/useMeetings";
import { useActionItems } from "@/lib/hooks/useActionItems";
import {
  useNotifications,
  useMarkNotificationAsRead,
} from "@/lib/hooks/useNotifications";
import { useSurveys, useSubmitSurveyResponse } from "@/lib/hooks/useSurveys";
import MentorDashboard from "@/components/mentor/MentorDashboardView";
import UserSurveyView from "@/components/student/UserSurveyView";
import { Modal } from "@/components/ui/Modal";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { normalizeStudents } from "@/lib/utils/normalizeStudent";
import type { Survey } from "@/lib/types";

const DEFAULT_WELCOME = `Hi [Mentee Name],

I'm excited to work with you as your mentor! Looking forward to supporting you on your dental school journey.

Best,
[Mentor Name]`;

export default function MentorCommandCenterPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: mentor, isLoading: isMentorLoading } = useMentor(user?.id || "");
  const { data: mentorStudentsRaw = [], isLoading: isMentorStudentsLoading } = useMentorStudents(
    user?.id || "",
  );
  const { data: allStudentsRaw = [] } = useStudents();
  const { data: staffTasks = [] } = useTasks();
  const { data: meetingsRaw = [] } = useMeetings();
  const { data: actionItems = [] } = useActionItems();
  const { data: notifications = [] } = useNotifications();
  const { data: surveys = [] } = useSurveys();
  const { data: pendingAssignments = [], isLoading: isPendingLoading } =
    useMyPendingAssignments(!!user?.id);

  const updateTaskMutation = useUpdateTask();
  const createTaskMutation = useCreateTask();
  const acceptAssignmentMutation = useAcceptAssignment();
  const declineAssignmentMutation = useDeclineAssignment();
  const markReadMutation = useMarkNotificationAsRead();
  const submitSurveyMutation = useSubmitSurveyResponse();

  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);

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

  if (isMentorLoading || isMentorStudentsLoading || isPendingLoading || !user) {
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
        welcomeMessageTemplate={DEFAULT_WELCOME}
        defaultAvailability={
          mentor.defaultAvailability || mentor.profile?.default_availability || []
        }
        acceptBusy={acceptAssignmentMutation.isPending}
        onSelectStudent={(id) => {
          router.push(`/mentor/students?studentId=${id}`);
        }}
        onMessageStudent={async (id) => {
          try {
            const { openDmWithUser } = await import("@/lib/messages/openDm");
            await openDmWithUser(id, "/mentor/messages", router.push.bind(router));
          } catch (err: any) {
            toast.error(err?.message || "Could not open conversation");
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
        onTakeSurvey={(id) => {
          const survey = surveys.find((s) => s.id === id) || null;
          if (!survey) {
            toast.error("Survey not found");
            return;
          }
          setActiveSurvey(survey);
        }}
        onMarkNotificationRead={(id) => {
          markReadMutation.mutate(id);
        }}
        onAcceptAssignment={(assignmentId, availableTimes, _timezone, customMessage) => {
          acceptAssignmentMutation.mutate(
            {
              assignmentId,
              availableTimes,
              welcomeMessage: customMessage,
            },
            {
              onSuccess: () => toast.success("Assignment accepted"),
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
