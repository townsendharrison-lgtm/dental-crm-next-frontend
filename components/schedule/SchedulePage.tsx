"use client";

import { Suspense, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRole } from "@/lib/hooks/useRole";
import { useStudents } from "@/lib/hooks/useStudentProfile";
import { useMentors } from "@/lib/hooks/useMentors";
import {
  useMeetings,
  useCreateMeeting,
  useUpdateMeeting,
  useDeleteMeeting,
  useAttendMeeting,
  useMeetingInviteDirectory,
} from "@/lib/hooks/useMeetings";
import { useActionItems } from "@/lib/hooks/useActionItems";
import { useTasks } from "@/lib/hooks/useTasks";
import ScheduleView from "@/components/schedule/ScheduleView";
import { normalizeStudents } from "@/lib/utils/normalizeStudent";
import { toastAction } from "@/lib/utils/toastAction";
import type { Meeting, MeetingAudience, Mentor } from "@/lib/types";
import type { CreateMeetingPayload } from "@/lib/api/meetings";

function SchedulePageContent() {
  const { user } = useAuth();
  const { role } = useRole();
  const canListMentors = role === "ADMIN" || role === "MENTOR_MANAGER";

  const { data: studentsRaw = [], isLoading: isStudentsLoading } = useStudents();
  const { data: mentorsRaw = [], isLoading: isMentorsLoading } = useMentors(canListMentors);
  const { data: meetings = [], isLoading: isMeetingsLoading } = useMeetings();
  const { data: actionItems = [], isLoading: isActionItemsLoading } = useActionItems();
  const { data: staffTasks = [], isLoading: isTasksLoading } = useTasks();
  const { data: inviteDirectory = [] } = useMeetingInviteDirectory(
    role === "ADMIN" || role === "MENTOR_MANAGER" || role === "MENTOR",
  );

  const createMeetingMutation = useCreateMeeting();
  const updateMeetingMutation = useUpdateMeeting();
  const deleteMeetingMutation = useDeleteMeeting();
  const attendMeetingMutation = useAttendMeeting();

  const students = useMemo(() => normalizeStudents(studentsRaw), [studentsRaw]);

  const mentors: Mentor[] = useMemo(() => {
    if (canListMentors) return mentorsRaw;
    if (!user) return [];
    return [
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: "MENTOR",
        studentIds: students.map((s) => s.id),
      },
    ];
  }, [canListMentors, mentorsRaw, user, students]);

  if (
    !user ||
    !role ||
    isStudentsLoading ||
    (canListMentors && isMentorsLoading) ||
    isMeetingsLoading ||
    isActionItemsLoading ||
    isTasksLoading
  ) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const handleAddMeeting = (
    meeting: Partial<Meeting> & {
      attendees?: string[];
      audience?: MeetingAudience;
      counterpartyType?: "student" | "mentor";
    },
  ) => {
    void toastAction(
      createMeetingMutation.mutateAsync({
        title: meeting.title || "Meeting",
        date: meeting.date || new Date().toISOString(),
        timezone: meeting.timezone,
        duration: meeting.duration || 30,
        type: meeting.type || "STUDENT_MEETING",
        audience: meeting.audience,
        attendees: meeting.attendees || [],
        counterpartyType: meeting.counterpartyType,
        mentorId: meeting.mentor_id || meeting.mentorId || user.id,
        studentId: meeting.student_id || meeting.studentId || undefined,
        notes: meeting.notes || undefined,
        link: meeting.link || undefined,
      }),
      {
        loading: "Scheduling event…",
        success: "Event created",
        error: "Failed to create event",
      },
    );
  };

  const handleUpdateMeeting = (
    id: string,
    updates: Partial<CreateMeetingPayload & { completed?: boolean }>,
  ) => {
    void toastAction(updateMeetingMutation.mutateAsync({ id, updates }), {
      loading: "Updating event…",
      success: "Event updated",
      error: "Failed to update event",
    });
  };

  const handleDeleteMeeting = (id: string) => {
    void toastAction(deleteMeetingMutation.mutateAsync(id), {
      loading: "Deleting event…",
      success: "Event deleted",
      error: "Failed to delete event",
    });
  };

  const handleAttendMeeting = (meetingId: string) => {
    void toastAction(attendMeetingMutation.mutateAsync(meetingId), {
      loading: "Joining meeting…",
      success: "You joined this meeting",
      error: "Failed to join meeting",
    });
  };

  return (
    <ScheduleView
      role={role}
      currentUserId={user.id}
      meetings={meetings}
      actionItems={actionItems}
      staffTasks={staffTasks}
      students={students}
      mentors={mentors}
      inviteDirectory={inviteDirectory}
      onAddMeeting={handleAddMeeting}
      onUpdateMeeting={handleUpdateMeeting}
      onDeleteMeeting={handleDeleteMeeting}
      onAttendMeeting={handleAttendMeeting}
    />
  );
}

export default function SchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <SchedulePageContent />
    </Suspense>
  );
}
