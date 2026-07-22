"use client";

import { useParams } from "next/navigation";
import PublicStudentProfileView from "@/components/student/PublicStudentProfileView";

export default function SharedStudentProfilePage() {
  const params = useParams();
  const token = String(params.token || "");
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Invalid share link
      </div>
    );
  }
  return <PublicStudentProfileView token={token} />;
}
