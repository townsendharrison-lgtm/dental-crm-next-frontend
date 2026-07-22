"use client";

import MentorOpsPage from "@/components/mentor/MentorOpsPage";

export default function MentorManagerMentorsPage() {
  return (
    <MentorOpsPage
      title="Mentor List"
      subtitle="Manage mentor roster, workloads, and student assignments."
      messagesHref="/mentor-manager/messages"
      basePath="/mentor-manager/mentors"
    />
  );
}
