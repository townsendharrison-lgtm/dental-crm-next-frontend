"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import { useStudents } from "@/lib/hooks/useStudentProfile";
import {
  useMentors,
  useMentorAssignments,
  useAssignMentor,
  useTransferMentor,
  useUnassignMentor,
  useUpdateMentor,
} from "@/lib/hooks/useMentors";
import { useMeetings, useCreateMeeting, useUpdateMeeting } from "@/lib/hooks/useMeetings";
import { useActionItems } from "@/lib/hooks/useActionItems";
import { normalizeStudents } from "@/lib/utils/normalizeStudent";
import { normalizeMentors } from "@/lib/utils/normalizeMentor";
import type { Mentor, Meeting, ActionItem } from "@/lib/types";
import {
  buildMentorComplianceRows,
  buildOperationalAlerts,
  buildPriorityInsights,
  summarizeCompliance,
} from "@/lib/utils/mentorCompliance";
import { notificationsApi } from "@/lib/api/notifications";

function normalizeMeetingsForUi(meetings: Meeting[]): Meeting[] {
  return meetings.map((m) => ({
    ...m,
    studentId: m.studentId || m.student_id || undefined,
    mentorId: m.mentorId || m.mentor_id || undefined,
  }));
}

function normalizeActionItemsForUi(items: ActionItem[]): ActionItem[] {
  return items.map((item) => ({
    ...item,
    studentId: item.studentId || item.student_id || undefined,
  }));
}

export function useMentorManagerOps(options?: {
  messagesHref?: string;
  basePath?: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const messagesHref = options?.messagesHref || "/mentor-manager/messages";
  const basePath = options?.basePath || "/mentor-manager/mentors";

  const { data: studentsRaw = [], isLoading: isStudentsLoading } = useStudents();
  const { data: mentorsRaw = [], isLoading: isMentorsLoading } = useMentors();
  const { data: assignments = [], isLoading: isAssignmentsLoading } = useMentorAssignments();
  const { data: meetingsRaw = [], isLoading: isMeetingsLoading } = useMeetings();
  const { data: actionItemsRaw = [], isLoading: isActionItemsLoading } = useActionItems();

  const assignMentorMutation = useAssignMentor();
  const transferMentorMutation = useTransferMentor();
  const unassignMentorMutation = useUnassignMentor();
  const updateMentorMutation = useUpdateMentor();
  const createMeetingMutation = useCreateMeeting();
  const updateMeetingMutation = useUpdateMeeting();

  const students = useMemo(() => normalizeStudents(studentsRaw), [studentsRaw]);
  const mentors = useMemo(() => normalizeMentors(mentorsRaw), [mentorsRaw]);
  const meetings = useMemo(() => normalizeMeetingsForUi(meetingsRaw), [meetingsRaw]);
  const actionItems = useMemo(() => normalizeActionItemsForUi(actionItemsRaw), [actionItemsRaw]);

  const complianceRows = useMemo(
    () =>
      buildMentorComplianceRows({
        mentors,
        students,
        meetings,
        actionItems,
      }),
    [mentors, students, meetings, actionItems],
  );

  const alerts = useMemo(() => buildOperationalAlerts(complianceRows), [complianceRows]);
  const insights = useMemo(() => buildPriorityInsights(complianceRows), [complianceRows]);
  const summary = useMemo(() => summarizeCompliance(complianceRows), [complianceRows]);

  const isLoading =
    isStudentsLoading ||
    isMentorsLoading ||
    isAssignmentsLoading ||
    isMeetingsLoading ||
    isActionItemsLoading ||
    !user;

  const openChatWithMentor = async (mentorId: string) => {
    try {
      const { openDmWithUser } = await import("@/lib/messages/openDm");
      await openDmWithUser(mentorId, messagesHref, router.push.bind(router));
    } catch (err: any) {
      toast.error(err?.message || "Could not open chat");
      router.push(messagesHref);
    }
  };

  const sendNudge = async (mentorId: string, mentorName: string, reason?: string) => {
    try {
      await notificationsApi.nudge({
        userId: mentorId,
        title: "Compliance nudge",
        message:
          reason ||
          `Hi ${mentorName} — please review your open SLAs (meetings, overdue tasks, or response time) and update your students today.`,
        type: "WARNING",
      });
      toast.success(`Nudge sent to ${mentorName}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to send nudge");
    }
  };

  const handlers = {
    onSelectMentor: (id: string) => router.push(`${basePath}/${id}/students`),
    onOpenChat: (id: string) => {
      void openChatWithMentor(id);
    },
    onAuditMentor: (id: string) => router.push(`${basePath}/${id}/audit`),
    onOpenProfile: (id: string) => router.push(`${basePath}/${id}/profile`),
    onSendNudge: (id: string, name: string, reason?: string) => sendNudge(id, name, reason),
    onUpdateMentorProfile: (mentorId: string, data: Partial<Mentor>) => {
      const profileFields: Partial<Mentor["profile"] & { name?: string; avatar?: string }> = {};
      if (data.name !== undefined) profileFields.name = data.name;
      if (data.avatar !== undefined) profileFields.avatar = data.avatar;
      if (data.phone !== undefined) profileFields.phone = data.phone;
      if (data.school !== undefined) profileFields.school = data.school;
      if (data.notes !== undefined) profileFields.notes = data.notes;
      if (data.graduationYear !== undefined) {
        (profileFields as any).graduation_year = data.graduationYear;
      }
      if (data.complianceScore !== undefined) {
        (profileFields as any).compliance_score = data.complianceScore;
      }
      if (data.managerScore !== undefined) {
        (profileFields as any).manager_score = data.managerScore;
      }
      if (data.avgResponseTime !== undefined) {
        (profileFields as any).avg_response_time = data.avgResponseTime;
      }
      if (data.defaultAvailability !== undefined) {
        (profileFields as any).default_availability = data.defaultAvailability;
      }
      updateMentorMutation.mutate(
        { id: mentorId, updates: profileFields },
        {
          onSuccess: () => toast.success("Mentor profile updated"),
          onError: (err: any) => toast.error(err?.message || "Failed to update mentor"),
        },
      );
    },
    onAddMeeting: (m: Partial<Meeting>) => {
      if (!user) return;
      createMeetingMutation.mutate(
        {
          studentId: m.student_id || m.studentId || undefined,
          mentorId: m.mentor_id || m.mentorId || user.id,
          title: m.title || "Follow-up Meeting",
          date: m.date || new Date().toISOString(),
          timezone: m.timezone,
          duration: m.duration,
          notes: m.notes || undefined,
          type: m.type,
          link: m.link || undefined,
        },
        {
          onSuccess: () => toast.success("Meeting scheduled"),
          onError: (err: any) => toast.error(err?.message || "Failed to schedule meeting"),
        },
      );
    },
    onUpdateMeeting: (id: string, data: Partial<Meeting>) => {
      updateMeetingMutation.mutate(
        {
          id,
          updates: {
            title: data.title,
            date: data.date,
            timezone: data.timezone,
            duration: data.duration,
            notes: data.notes || undefined,
            completed: data.completed,
            link: data.link || undefined,
            type: data.type,
          },
        },
        {
          onSuccess: () => toast.success("Meeting updated"),
          onError: (err: any) => toast.error(err?.message || "Failed to update meeting"),
        },
      );
    },
    onAssignStudent: (studentId: string, mentorId: string) => {
      assignMentorMutation.mutate(
        { studentId, mentorId },
        {
          onSuccess: () => toast.success("Assignment requested"),
          onError: (err: any) => toast.error(err?.message || "Failed to assign"),
        },
      );
    },
    onTransferStudent: (studentId: string, mentorId: string) => {
      transferMentorMutation.mutate(
        { studentId, newMentorId: mentorId },
        {
          onSuccess: () => toast.success("Transfer requested"),
          onError: (err: any) => toast.error(err?.message || "Failed to transfer"),
        },
      );
    },
    onUnassignStudent: (studentId: string) => {
      unassignMentorMutation.mutate(studentId, {
        onSuccess: () => toast.success("Student unassigned"),
        onError: (err: any) => toast.error(err?.message || "Failed to unassign"),
      });
    },
  };

  return {
    user,
    isLoading,
    students,
    mentors,
    meetings,
    actionItems,
    assignments,
    complianceRows,
    alerts,
    insights,
    summary,
    messagesHref,
    basePath,
    ...handlers,
  };
}
