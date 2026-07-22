"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useMemo } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useStudents, useStudent, useUpdateStudent } from "@/lib/hooks/useStudentProfile";
import {
  useMentor,
  useMentorStudents,
  useMyPendingAssignments,
  useAcceptAssignment,
  useDeclineAssignment,
} from "@/lib/hooks/useMentors";
import { useMeetings } from "@/lib/hooks/useMeetings";
import { useExperiences } from "@/lib/hooks/useExperiences";
import { useOptimizationPlan, useUpsertOptimizationPlan, useDeleteOptimizationPlan } from "@/lib/hooks/useOptimizationPlans";
import { useLorRequests } from "@/lib/hooks/useLor";
import { useTasks, useUpdateTask, useCreateTask, useDeleteTask } from "@/lib/hooks/useTasks";
import { useActionItems, useCreateActionItem, useUpdateActionItem, useDeleteActionItem } from "@/lib/hooks/useActionItems";
import { useDocuments } from "@/lib/hooks/useDocuments";
import MentorStudentsView from "@/components/mentor/MentorStudentsView";
import StudentProfileView from "@/components/mentor/StudentProfileView";
import { usePlatformConfig } from "@/lib/hooks/usePlatformConfig";
import { normalizeStudents } from "@/lib/utils/normalizeStudent";
import { persistMeetingCompletion } from "@/lib/utils/completeMeeting";
import { queryKeys } from "@/lib/api/queryKeys";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_WELCOME = `Hi [Mentee Name],

I'm excited to work with you as your mentor! Looking forward to supporting you on your dental school journey.

Best,
[Mentor Name]`;

function MentorStudentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams.get("studentId") || "";
  const platformConfig = usePlatformConfig();
  const queryClient = useQueryClient();

  const { user } = useAuth();
  const { data: mentor } = useMentor(user?.id || "");
  const { data: allStudentsRaw = [], isLoading: isAllStudentsLoading } = useStudents();
  const allStudents = useMemo(() => normalizeStudents(allStudentsRaw), [allStudentsRaw]);
  const { data: mentorStudents = [], isLoading: isMentorStudentsLoading } = useMentorStudents(user?.id || "");
  const { data: pendingAssignments = [], isLoading: isPendingLoading } = useMyPendingAssignments(!!user?.id);
  const { data: meetings = [], isLoading: isMeetingsLoading } = useMeetings();
  const { data: staffTasks = [], isLoading: isTasksLoading } = useTasks();

  const acceptAssignmentMutation = useAcceptAssignment();
  const declineAssignmentMutation = useDeclineAssignment();

  // Queries for selected student
  const { data: selectedStudent, isLoading: isStudentLoading } = useStudent(studentId);
  const { data: experiences = [] } = useExperiences(studentId);
  const { data: optimizationPlan } = useOptimizationPlan(studentId);
  const { data: lorRequests = [] } = useLorRequests(selectedStudent?.name || "");
  const { data: actionItems = [] } = useActionItems(studentId);
  const { data: documents = [] } = useDocuments(studentId);

  // Mutations
  const updateStudentMutation = useUpdateStudent();
  const upsertPlanMutation = useUpsertOptimizationPlan();
  const deletePlanMutation = useDeleteOptimizationPlan();
  const createActionItemMutation = useCreateActionItem();
  const updateActionItemMutation = useUpdateActionItem();
  const deleteActionItemMutation = useDeleteActionItem();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  if (isAllStudentsLoading || isMentorStudentsLoading || isMeetingsLoading || isTasksLoading || isPendingLoading || !user) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // If a student is selected, render the profile view
  if (studentId) {
    if (isStudentLoading) {
      return (
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      );
    }

    if (!selectedStudent) {
      return (
        <div className="flex h-[50vh] items-center justify-center text-slate-400">
          Student not found.
        </div>
      );
    }

    const filteredActionItems = actionItems.filter((ai) => ai.student_id === studentId);
    const filteredMeetings = meetings.filter((m) => m.student_id === studentId);
    const filteredTasks = staffTasks.filter((t) => t.student_id === studentId);

    const handleAddActionItem = (
      studId: string,
      task: string,
      dueDate: string,
      priority: "HIGH" | "MEDIUM" | "LOW",
      description?: string,
      resourceLink?: string
    ) => {
      createActionItemMutation.mutate({
        studentId: studId,
        task,
        dueDate,
        priority,
        description,
        resourceLink,
      });
    };

    const handleCompleteMeeting = async (meetingId: string | undefined, data: any) => {
      try {
        await persistMeetingCompletion(studentId, meetingId, data);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all() }),
          queryClient.invalidateQueries({ queryKey: queryKeys.actionItems.all(studentId) }),
          queryClient.invalidateQueries({ queryKey: ["meetings", "calendar"] }),
        ]);
        toast.success(meetingId ? "Meeting completed" : "Meeting logged");
      } catch (err: any) {
        toast.error(err?.message || "Failed to complete meeting");
        throw err;
      }
    };

    return (
      <div>
        <StudentProfileView
          student={selectedStudent}
          onBack={() => router.push("/mentor/students")}
          messages={[]}
          onSendMessage={() => {}}
          currentUserId={user.id}
          actionItems={filteredActionItems}
          meetings={filteredMeetings}
          experiences={experiences}
          improvementGoals={[]}
          optimizationPlan={optimizationPlan ?? undefined}
          lorRequests={lorRequests}
          onAddActionItem={handleAddActionItem}
          onUpdateActionItem={(item) => updateActionItemMutation.mutate({ id: item.id, updates: item as any })}
          onDeleteActionItem={(id) => deleteActionItemMutation.mutate({ id, studentId })}
          onToggleActionItem={(id) => {
            const item = actionItems.find((ai) => ai.id === id);
            if (item) {
              const newStatus = item.status === "COMPLETED" ? "PENDING" : "COMPLETED";
              updateActionItemMutation.mutate({ id, updates: { status: newStatus } });
            }
          }}
          onCompleteMeeting={handleCompleteMeeting}
          onMessageStudent={async (id) => {
            try {
              const { openDmWithUser } = await import("@/lib/messages/openDm");
              await openDmWithUser(id, "/mentor/messages", router.push.bind(router));
            } catch (err: any) {
              toast.error(err?.message || "Could not open conversation");
            }
          }}
          onUpdateImprovementGoal={() => {}}
          onDeleteImprovementGoal={() => {}}
          onUpdateOptimizationPlan={(plan) => upsertPlanMutation.mutate({ studentId, ...plan })}
          onDeleteOptimizationPlan={(planId) => {
            deletePlanMutation.mutate(
              { id: planId, studentId },
              {
                onSuccess: () => toast.success("Strategy plan deleted"),
                onError: (err: any) => toast.error(err?.message || "Failed to delete plan"),
              },
            );
          }}
          onUpdateExperiences={() => {}}
          onUpdateSchools={() => {}}
          onUpdateStudent={(studId, updates) => updateStudentMutation.mutate({ id: studId, updates })}
          onAddStaffTask={(payload) => createTaskMutation.mutate({ ...payload, studentId })}
          onUpdateStaffTask={(task) => updateTaskMutation.mutate({ id: task.id, updates: task as any })}
          onDeleteStaffTask={(id) => deleteTaskMutation.mutate(id)}
          staffTasks={filteredTasks}
          documents={documents}
          onUpdateDocuments={() => {}}
          platformConfig={platformConfig}
        />
      </div>
    );
  }

  return (
    <div>
      <MentorStudentsView
        students={mentorStudents}
        allStudents={allStudents}
        pendingAssignments={pendingAssignments}
        meetings={meetings}
        hideTitle
        defaultAvailability={mentor?.defaultAvailability || mentor?.profile?.default_availability || []}
        welcomeMessageTemplate={DEFAULT_WELCOME}
        acceptBusy={acceptAssignmentMutation.isPending}
        onSelectStudent={(id) => router.push(`/mentor/students?studentId=${id}`)}
        onMessageStudent={async (id) => {
          try {
            const { openDmWithUser } = await import("@/lib/messages/openDm");
            await openDmWithUser(id, "/mentor/messages", router.push.bind(router));
          } catch (err: any) {
            toast.error(err?.message || "Could not open conversation");
          }
        }}
        onAcceptAssignment={(assignmentId, availableTimes, _timezone, welcomeMessage) => {
          acceptAssignmentMutation.mutate(
            { assignmentId, availableTimes, welcomeMessage },
            {
              onSuccess: () => toast.success("Assignment accepted"),
              onError: (err: any) => toast.error(err?.message || "Failed to accept assignment"),
            },
          );
        }}
        onDeclineAssignment={(assignmentId) => {
          declineAssignmentMutation.mutate(assignmentId, {
            onSuccess: () => toast.success("Assignment declined"),
            onError: (err: any) => toast.error(err?.message || "Failed to decline assignment"),
          });
        }}
      />
    </div>
  );
}

export default function MentorStudentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <MentorStudentsContent />
    </Suspense>
  );
}
