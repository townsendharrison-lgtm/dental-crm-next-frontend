"use client";

import { Eye, X } from "lucide-react";
import { useRole } from "@/lib/hooks/useRole";
import { useUIStore } from "@/lib/stores/uiStore";
import { usePreviewSubject } from "@/lib/hooks/usePreviewSubject";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * Minimal admin-only strip while previewing another role.
 */
export function RolePreviewBanner() {
  const { isAdmin, isPreviewing, previewRole, setPreviewRole, role } = useRole();
  const setPreviewCollapsed = useUIStore((s) => s.setPreviewCollapsed);

  const studentPreview = usePreviewSubject("STUDENT");
  const mentorPreview = usePreviewSubject("MENTOR");

  if (!isAdmin || !isPreviewing || !previewRole) return null;

  const kind =
    role === "STUDENT" ? "STUDENT" : role === "MENTOR" ? "MENTOR" : null;
  const subject = kind === "STUDENT" ? studentPreview : kind === "MENTOR" ? mentorPreview : null;
  const roleLabel = ROLE_LABELS[previewRole as UserRole] || previewRole;

  return (
    <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3">
      <div className="flex items-center gap-2 py-1.5 sm:gap-3">
        <Eye className="h-3.5 w-3.5 shrink-0 text-amber-400" />
        <p className="min-w-0 flex-1 truncate text-xs font-medium text-amber-100">
          Previewing as {roleLabel}
        </p>

        {subject && subject.options.length > 0 && (
          <select
            value={subject.subjectId}
            onChange={(e) => subject.setSubjectId(e.target.value)}
            aria-label={`Select ${kind === "STUDENT" ? "student" : "mentor"}`}
            className={cn(
              "max-w-[10rem] truncate rounded-md border border-amber-500/25 bg-slate-950/50 px-2 py-1",
              "text-[11px] font-medium text-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500/40 sm:max-w-[14rem]",
            )}
          >
            {subject.options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={() => {
            setPreviewRole(null);
            setPreviewCollapsed(false);
          }}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-amber-100/90 transition-colors hover:bg-amber-500/15 hover:text-amber-50"
        >
          <X className="h-3 w-3" />
          Exit
        </button>
      </div>
    </div>
  );
}
