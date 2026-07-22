"use client";

import MentorStudentsSubpage from "@/components/mentor/pages/MentorStudentsSubpage";

export default function Page() {
  return (
    <MentorStudentsSubpage basePath="/admin/mentors" messagesHref="/admin/messages" />
  );
}
