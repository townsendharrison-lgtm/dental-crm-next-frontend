"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useStudent, useUpdateStudent } from "@/lib/hooks/useStudentProfile";
import { StudentProfileDocumentsView } from "@/components/student/StudentProfileDocumentsView";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function StudentProfilePage() {
  const { user } = useAuth();
  const { data: student, isLoading } = useStudent(user?.id || "");
  const updateStudentMutation = useUpdateStudent();

  if (isLoading || !user) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-slate-400">
        Student profile not found.
      </div>
    );
  }

  return (
    <div className="pt-6">
      <StudentProfileDocumentsView
        student={student}
        currentUserId={user.id}
        onUpdateStudent={(updates) => {
          updateStudentMutation.mutate(
            { id: student.id, updates: updates as any },
            {
              onError: (err: any) => toast.error(err?.message || "Failed to update profile"),
            },
          );
        }}
      />
    </div>
  );
}
