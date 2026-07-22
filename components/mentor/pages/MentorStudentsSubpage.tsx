"use client";

import { Suspense, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useMentor,
  useMentorAssignments,
  useUnassignMentor,
} from "@/lib/hooks/useMentors";
import {
  useStudents,
  useStudent,
  useUpdateStudent,
} from "@/lib/hooks/useStudentProfile";
import { useMeetings } from "@/lib/hooks/useMeetings";
import { useExperiences } from "@/lib/hooks/useExperiences";
import { useOptimizationPlan, useUpsertOptimizationPlan, useDeleteOptimizationPlan } from "@/lib/hooks/useOptimizationPlans";
import { useLorRequests } from "@/lib/hooks/useLor";
import { useTasks, useUpdateTask, useCreateTask, useDeleteTask } from "@/lib/hooks/useTasks";
import {
  useActionItems,
  useCreateActionItem,
  useUpdateActionItem,
  useDeleteActionItem,
} from "@/lib/hooks/useActionItems";
import { useDocuments } from "@/lib/hooks/useDocuments";
import { useAuth } from "@/lib/hooks/useAuth";
import MentorStudentsView from "@/components/mentor/MentorStudentsView";
import StudentProfileView from "@/components/mentor/StudentProfileView";
import MentorSubpageShell, {
  mentorDisplayName,
} from "@/components/mentor/pages/MentorSubpageShell";
import { normalizeStudents } from "@/lib/utils/normalizeStudent";
import { usePlatformConfig } from "@/lib/hooks/usePlatformConfig";
import { persistMeetingCompletion } from "@/lib/utils/completeMeeting";
import { queryKeys } from "@/lib/api/queryKeys";
import { useQueryClient } from "@tanstack/react-query";

interface MentorStudentsSubpageProps {
  basePath: string;
  messagesHref: string;
}

function MentorStudentsSubpageInner({
  basePath,
  messagesHref,
}: MentorStudentsSubpageProps) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const platformConfig = usePlatformConfig();
  const queryClient = useQueryClient();
  const mentorId = String(params.id || "");
  const studentId = searchParams.get("studentId") || "";

  const { data: mentor, isLoading: mentorLoading } = useMentor(mentorId);
  const { data: studentsRaw = [], isLoading: studentsLoading } = useStudents();
  const { data: assignments = [] } = useMentorAssignments();
  const { data: meetingsRaw = [] } = useMeetings();
  const { data: staffTasks = [] } = useTasks();
  const unassignMutation = useUnassignMentor();

  const { data: selectedStudent, isLoading: isStudentLoading } = useStudent(studentId);
  const { data: experiences = [] } = useExperiences(studentId);
  const { data: optimizationPlan } = useOptimizationPlan(studentId);
  const { data: lorRequests = [] } = useLorRequests(selectedStudent?.name || "");
  const { data: actionItems = [] } = useActionItems(studentId);
  const { data: documents = [] } = useDocuments(studentId);

  const updateStudentMutation = useUpdateStudent();
  const upsertPlanMutation = useUpsertOptimizationPlan();
  const deletePlanMutation = useDeleteOptimizationPlan();
  const createActionItemMutation = useCreateActionItem();
  const updateActionItemMutation = useUpdateActionItem();
  const deleteActionItemMutation = useDeleteActionItem();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  const students = useMemo(() => normalizeStudents(studentsRaw), [studentsRaw]);
  const meetings = useMemo(
    () =>
      meetingsRaw.map((m) => ({
        ...m,
        studentId: m.studentId || m.student_id || undefined,
        mentorId: m.mentorId || m.mentor_id || undefined,
      })),
    [meetingsRaw],
  );

  if (mentorLoading || studentsLoading || !user) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!mentor) {
    return <div className="py-16 text-center text-slate-500">Mentor not found.</div>;
  }

  const mentorStudents = students.filter((s) => s.mentorId === mentorId);
  const pendingForMentor = assignments.filter(
    (a) => a.mentorId === mentorId && a.status === "PENDING",
  );
  const name = mentorDisplayName(mentor);
  const listHref = `${basePath}/${mentorId}/students`;

  if (studentId) {
    if (isStudentLoading) {
      return (
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      );
    }
    if (!selectedStudent) {
      return <div className="py-16 text-center text-slate-500">Student not found.</div>;
    }

    const filteredActionItems = actionItems.filter(
      (ai) => (ai.student_id || (ai as any).studentId) === studentId,
    );
    const filteredMeetings = meetings.filter(
      (m) => (m.studentId || m.student_id) === studentId,
    );
    const filteredTasks = staffTasks.filter(
      (t) => (t.student_id || (t as any).studentId) === studentId,
    );

    return (
      <StudentProfileView
        student={selectedStudent}
        onBack={() => router.push(listHref)}
        messages={[]}
        onSendMessage={() => {}}
        currentUserId={user.id}
        actionItems={filteredActionItems}
        meetings={filteredMeetings}
        experiences={experiences}
        improvementGoals={[]}
        optimizationPlan={optimizationPlan ?? undefined}
        lorRequests={lorRequests}
        onAddActionItem={(studId, task, dueDate, priority, description, resourceLink) => {
          createActionItemMutation.mutate({
            studentId: studId,
            task,
            dueDate,
            priority,
            description,
            resourceLink,
          });
        }}
        onUpdateActionItem={(item) =>
          updateActionItemMutation.mutate({ id: item.id, updates: item as any })
        }
        onDeleteActionItem={(id) => deleteActionItemMutation.mutate({ id, studentId })}
        onToggleActionItem={(id) => {
          const item = actionItems.find((ai) => ai.id === id);
          if (item) {
            const newStatus = item.status === "COMPLETED" ? "PENDING" : "COMPLETED";
            updateActionItemMutation.mutate({ id, updates: { status: newStatus } });
          }
        }}
        onCompleteMeeting={async (meetingId, data) => {
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
        }}
        onMessageStudent={async (id) => {
          try {
            const { openDmWithUser } = await import("@/lib/messages/openDm");
            await openDmWithUser(id, messagesHref, router.push.bind(router));
          } catch (err: any) {
            toast.error(err?.message || "Could not open conversation");
          }
        }}
        onUpdateImprovementGoal={() => {}}
        onDeleteImprovementGoal={() => {}}
        onUpdateOptimizationPlan={(plan) =>
          upsertPlanMutation.mutate({ studentId, ...plan } as any)
        }
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
        onUpdateStudent={(studId, updates) =>
          updateStudentMutation.mutate({ id: studId, updates: updates as any })
        }
        onAddStaffTask={(payload) => createTaskMutation.mutate({ ...payload, studentId })}
        onUpdateStaffTask={(task) =>
          updateTaskMutation.mutate({ id: task.id, updates: task as any })
        }
        onDeleteStaffTask={(id) => deleteTaskMutation.mutate(id)}
        staffTasks={filteredTasks}
        documents={documents}
        onUpdateDocuments={() => {}}
        platformConfig={platformConfig}
      />
    );
  }

  return (
    <MentorSubpageShell
      basePath={basePath}
      mentorId={mentorId}
      mentorName={name}
      mentorEmail={mentor.email}
      mentorAvatar={mentor.avatar}
      meta={`${mentorStudents.length} active · ${pendingForMentor.length} pending`}
      activeTab="students"
    >
      <MentorStudentsView
        hideTitle
        students={mentorStudents}
        pendingAssignments={pendingForMentor}
        allStudents={students}
        meetings={meetings}
        onSelectStudent={(id) => router.push(`${listHref}?studentId=${id}`)}
        onMessageStudent={async (id) => {
          try {
            const { openDmWithUser } = await import("@/lib/messages/openDm");
            await openDmWithUser(id, messagesHref, router.push.bind(router));
          } catch (err: any) {
            toast.error(err?.message || "Could not open conversation");
          }
        }}
        onUnassignStudent={(id) => {
          unassignMutation.mutate(id, {
            onSuccess: () => toast.success("Student unassigned"),
            onError: (err: any) => toast.error(err?.message || "Failed to unassign"),
          });
        }}
      />
    </MentorSubpageShell>
  );
}

export default function MentorStudentsSubpage(props: MentorStudentsSubpageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <MentorStudentsSubpageInner {...props} />
    </Suspense>
  );
}
