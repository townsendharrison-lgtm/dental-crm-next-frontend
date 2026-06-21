"use client";

import { useRole } from "@/lib/hooks/useRole";
import { useAdminUsers } from "@/lib/hooks/useAdmin";
import { AdminLetterReview } from "@/components/letters/AdminLetterReview";
import { LetterUploadView } from "@/components/letters/LetterUploadView";
import { FullPageSpinner } from "@/components/ui/Spinner";

export default function LetterPortalPage() {
  const { role } = useRole();
  const { data: users = [], isLoading: usersLoading } = useAdminUsers();

  if (usersLoading) {
    return <FullPageSpinner label="Loading letters portal..." />;
  }

  const students = users
    .filter((u) => u.role === "STUDENT")
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
    }));

  if (role === "LETTER_WRITER") {
    return <LetterUploadView students={students} hideHeaderOnDesktop={true} />;
  }

  if (role === "ADMIN" || role === "MENTOR_MANAGER") {
    return <AdminLetterReview students={students} />;
  }

  return (
    <div className="p-8 text-slate-400 bg-slate-900 border border-slate-800 rounded-3xl text-center">
      You do not have permission to view this page.
    </div>
  );
}
