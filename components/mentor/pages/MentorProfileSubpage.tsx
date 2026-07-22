"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMentor, useUpdateMentor } from "@/lib/hooks/useMentors";
import { useMeetings, useCreateMeeting, useUpdateMeeting } from "@/lib/hooks/useMeetings";
import { useAuth } from "@/lib/hooks/useAuth";
import MentorProfileModal from "@/components/mentor/MentorProfileModal";
import MentorSubpageShell, {
  mentorDisplayName,
} from "@/components/mentor/pages/MentorSubpageShell";
import type { Mentor } from "@/lib/types";

interface MentorProfileSubpageProps {
  basePath: string;
}

export default function MentorProfileSubpage({ basePath }: MentorProfileSubpageProps) {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const mentorId = String(params.id || "");

  const { data: mentor, isLoading: mentorLoading } = useMentor(mentorId);
  const { data: meetingsRaw = [], isLoading: meetingsLoading } = useMeetings();
  const updateMentorMutation = useUpdateMentor();
  const createMeetingMutation = useCreateMeeting();
  const updateMeetingMutation = useUpdateMeeting();

  const meetings = useMemo(
    () =>
      meetingsRaw.map((m) => ({
        ...m,
        studentId: m.studentId || m.student_id || undefined,
        mentorId: m.mentorId || m.mentor_id || undefined,
      })),
    [meetingsRaw],
  );

  if (mentorLoading || meetingsLoading) {
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
      meta={
        mentor.email && mentor.email !== name
          ? `${mentor.email} · Compliance ${mentor.complianceScore ?? 0}%`
          : `Compliance ${mentor.complianceScore ?? 0}%`
      }
      activeTab="profile"
    >
      <MentorProfileModal
        isOpen
        embedded
        onClose={() => router.push(basePath)}
        mentor={mentor}
        meetings={meetings}
        onUpdateProfile={(id, data) => {
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
          updateMentorMutation.mutate(
            { id, updates: profileFields },
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
              mentorId: m.mentor_id || m.mentorId || user?.id || mentorId,
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
      />
    </MentorSubpageShell>
  );
}
