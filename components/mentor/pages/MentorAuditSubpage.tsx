"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQueries } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useMentor } from "@/lib/hooks/useMentors";
import { useStudents } from "@/lib/hooks/useStudentProfile";
import { useMeetings } from "@/lib/hooks/useMeetings";
import { useActionItems } from "@/lib/hooks/useActionItems";
import { studentsApi } from "@/lib/api/students";
import { queryKeys } from "@/lib/api/queryKeys";
import MentorAnalyticsView from "@/components/mentor/MentorAnalyticsView";
import MentorSubpageShell, {
  mentorDisplayName,
} from "@/components/mentor/pages/MentorSubpageShell";
import { normalizeStudents } from "@/lib/utils/normalizeStudent";

interface MentorAuditSubpageProps {
  basePath: string;
}

export default function MentorAuditSubpage({ basePath }: MentorAuditSubpageProps) {
  const params = useParams();
  const mentorId = String(params.id || "");

  const { data: mentor, isLoading: mentorLoading } = useMentor(mentorId);
  const { data: studentsRaw = [], isLoading: studentsLoading } = useStudents();
  const { data: meetingsRaw = [] } = useMeetings();
  const { data: actionItemsRaw = [] } = useActionItems();

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

  const roster = useMemo(
    () => students.filter((s) => s.mentorId === mentorId),
    [students, mentorId],
  );

  const strengthQueries = useQueries({
    queries: roster.map((s) => ({
      queryKey: queryKeys.students.strengthHistory(s.id),
      queryFn: () => studentsApi.strengthHistory(s.id),
      enabled: !!s.id,
      staleTime: 60_000,
    })),
  });

  const strengthHistories = useMemo(
    () =>
      roster.map((s, i) => ({
        studentId: s.id,
        name: s.name,
        history: (strengthQueries[i]?.data || []).map((row) => ({
          strength_score: Number(row.strength_score) || 0,
          recorded_at: row.recorded_at,
        })),
      })),
    [roster, strengthQueries],
  );

  if (mentorLoading || studentsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!mentor) {
    return <div className="py-16 text-center text-slate-500">Mentor not found.</div>;
  }

  const name = mentorDisplayName(mentor);

  return (
    <MentorSubpageShell
      basePath={basePath}
      mentorId={mentorId}
      mentorName={name}
      mentorEmail={mentor.email}
      mentorAvatar={mentor.avatar}
      meta={`Compliance ${mentor.complianceScore ?? 0}% · ${roster.length} students`}
      activeTab="audit"
    >
      <MentorAnalyticsView
        compact
        students={roster}
        meetings={meetings}
        actionItems={actionItems}
        mentorId={mentorId}
        mentors={[mentor]}
        strengthHistories={strengthHistories}
        historiesLoading={strengthQueries.some((q) => q.isLoading)}
      />
    </MentorSubpageShell>
  );
}
