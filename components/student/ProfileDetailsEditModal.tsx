"use client";

import type { Student } from "@/lib/types";
import {
  ProfileDetailsEditor,
  type ProfileEditMode,
} from "@/components/student/ProfileDetailsEditor";

export type { ProfileEditMode };

interface ProfileDetailsEditModalProps {
  open: boolean;
  mode: ProfileEditMode;
  student: Student;
  onClose: () => void;
}

/** Student Profile & Docs modal — same fields as mentor embedded editors. */
export function ProfileDetailsEditModal({
  open,
  mode,
  student,
  onClose,
}: ProfileDetailsEditModalProps) {
  return (
    <ProfileDetailsEditor
      open={open}
      mode={mode}
      student={student}
      onClose={onClose}
    />
  );
}
