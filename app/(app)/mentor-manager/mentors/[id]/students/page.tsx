"use client";

import MentorStudentsSubpage from "@/components/mentor/pages/MentorStudentsSubpage";

export default function Page() {
  return (
    <MentorStudentsSubpage
      basePath="/mentor-manager/mentors"
      messagesHref="/mentor-manager/messages"
    />
  );
}
