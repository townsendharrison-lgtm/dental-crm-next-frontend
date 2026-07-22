"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueries } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useMentor, useMentorStudents } from "@/lib/hooks/useMentors";
import { useMeetings } from "@/lib/hooks/useMeetings";
import { useActionItems } from "@/lib/hooks/useActionItems";
import { studentsApi } from "@/lib/api/students";
import { queryKeys } from "@/lib/api/queryKeys";
import MentorAnalyticsView from "@/components/mentor/MentorAnalyticsView";
import { normalizeStudents } from "@/lib/utils/normalizeStudent";

export default function MentorAnalyticsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const mentorId = user?.id || "";

  const { data: mentor, isLoading: mentorLoading } = useMentor(mentorId);
  const { data: studentsRaw = [], isLoading: studentsLoading } = useMentorStudents(mentorId);
  const { data: meetingsRaw = [], isLoading: meetingsLoading } = useMeetings();
  const { data: actionItemsRaw = [], isLoading: actionsLoading } = useActionItems();

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
  const actionItems = useMemo(
    () =>
      actionItemsRaw.map((item) => ({
        ...item,
        studentId: item.studentId || item.student_id || undefined,
      })),
    [actionItemsRaw],
  );

  const strengthQueries = useQueries({
    queries: students.map((s) => ({
      queryKey: queryKeys.students.strengthHistory(s.id),
      queryFn: () => studentsApi.strengthHistory(s.id),
      enabled: !!s.id,
      staleTime: 60_000,
    })),
  });

  const strengthHistories = useMemo(
    () =>
      students.map((s, i) => ({
        studentId: s.id,
        name: s.name,
        history: (strengthQueries[i]?.data || []).map((row) => ({
          strength_score: Number(row.strength_score) || 0,
          recorded_at: row.recorded_at,
        })),
      })),
    [students, strengthQueries],
  );

  const historiesLoading = strengthQueries.some((q) => q.isLoading);

  if (mentorLoading || studentsLoading || meetingsLoading || actionsLoading || !user) {
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

  return (
    <MentorAnalyticsView
      students={students}
      meetings={meetings}
      actionItems={actionItems}
      mentorId={mentorId}
      mentors={[mentor]}
      strengthHistories={strengthHistories}
      historiesLoading={historiesLoading}
      onNavigateSchedule={() => router.push("/mentor/schedule")}
      onNavigateStudents={() => router.push("/mentor/students")}
    />
  );
}
