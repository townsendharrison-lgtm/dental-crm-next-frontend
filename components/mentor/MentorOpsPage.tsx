"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
import MentorManagerDashboard from "@/components/mentor/MentorManagerDashboard";
import { normalizeStudents } from "@/lib/utils/normalizeStudent";
import type { Mentor, Meeting, ActionItem } from "@/lib/types";

interface MentorOpsPageProps {
  title?: string;
  subtitle?: string;
  messagesHref?: string;
  /** e.g. /admin/mentors or /mentor-manager/mentors */
  basePath?: string;
}

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

export default function MentorOpsPage({
  title = "Mentor Ops",
  subtitle = "Comprehensive management of mentors and student assignments.",
  messagesHref = "/admin/messages",
  basePath = "/admin/mentors",
}: MentorOpsPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [openingChat, setOpeningChat] = useState(false);

  const { data: studentsRaw = [], isLoading: isStudentsLoading } = useStudents();
  const { data: mentors = [], isLoading: isMentorsLoading } = useMentors();
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
  const meetings = useMemo(() => normalizeMeetingsForUi(meetingsRaw), [meetingsRaw]);
  const actionItems = useMemo(() => normalizeActionItemsForUi(actionItemsRaw), [actionItemsRaw]);

  if (
    isStudentsLoading ||
    isMentorsLoading ||
    isAssignmentsLoading ||
    isMeetingsLoading ||
    isActionItemsLoading ||
    !user
  ) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const openChatWithMentor = async (mentorId: string) => {
    if (openingChat) return;
    setOpeningChat(true);
    try {
      const { openDmWithUser } = await import("@/lib/messages/openDm");
      await openDmWithUser(mentorId, messagesHref, router.push.bind(router));
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Could not open chat");
      router.push(messagesHref);
    } finally {
      setOpeningChat(false);
    }
  };

  return (
    <MentorManagerDashboard
      title={title}
      subtitle={subtitle}
      students={students}
      mentors={mentors}
      meetings={meetings}
      actionItems={actionItems}
      studentAssignments={assignments}
      onSelectMentor={(id) => router.push(`${basePath}/${id}/students`)}
      onOpenChat={(id) => {
        void openChatWithMentor(id);
      }}
      onAuditMentor={(id) => router.push(`${basePath}/${id}/audit`)}
      onOpenProfile={(id) => router.push(`${basePath}/${id}/profile`)}
      onUpdateMentorProfile={(mentorId, data) => {
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
      }}
      onAddMeeting={(m) => {
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
      }}
      onUpdateMeeting={(id, data) => {
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
      }}
      onAssignStudent={(studentId, mentorId) => {
        assignMentorMutation.mutate(
          { studentId, mentorId },
          {
            onSuccess: () => toast.success("Assignment sent — waiting for mentor to accept"),
            onError: (err: any) => toast.error(err?.message || "Failed to assign student"),
          },
        );
      }}
      onTransferStudent={(studentId, mentorId) => {
        transferMentorMutation.mutate(
          { studentId, newMentorId: mentorId },
          {
            onSuccess: () => toast.success("Transfer sent — waiting for mentor to accept"),
            onError: (err: any) => toast.error(err?.message || "Failed to transfer student"),
          },
        );
      }}
      onUnassignStudent={(studentId) => {
        unassignMentorMutation.mutate(studentId, {
          onSuccess: () => toast.success("Student unassigned"),
          onError: (err: any) => toast.error(err?.message || "Failed to unassign student"),
        });
      }}
    />
  );
}
