"use client";

import MentorOpsPage from "@/components/mentor/MentorOpsPage";

export default function AdminMentorsPage() {
  return (
    <MentorOpsPage
      title="Mentor Ops"
      subtitle="Comprehensive management of mentors and student assignments."
      messagesHref="/admin/messages"
      basePath="/admin/mentors"
    />
  );
}
