"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useMentor } from "@/lib/hooks/useMentors";
import { useStudents } from "@/lib/hooks/useStudentProfile";
import { useMeetings } from "@/lib/hooks/useMeetings";
import { useActionItems } from "@/lib/hooks/useActionItems";
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

  const roster = students.filter((s) => s.mentorId === mentorId);
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
      />
    </MentorSubpageShell>
  );
}
