"use client";

import { FileText, Mic, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import type { Meeting, MeetStatus } from "@/lib/types";
import type { MeetArtifactSyncResult } from "@/lib/api/meetings";
import { useProvisionGoogleMeet, useSyncGoogleMeet } from "@/lib/hooks/useMeetings";
import { toastAction } from "@/lib/utils/toastAction";

const STATUS_LABEL: Record<MeetStatus, string> = {
  pending: "Creating Meet link…",
  provisioned: "Google Meet ready",
  failed: "Meet link failed",
  ended: "Waiting for Gemini notes",
  notes_ready: "Gemini notes saved",
  no_artifacts: "No transcript captured",
};

const STATUS_CLASS: Record<MeetStatus, string> = {
  pending: "bg-slate-500/15 text-slate-300 border-slate-500/20",
  provisioned: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  failed: "bg-rose-500/15 text-rose-300 border-rose-500/20",
  ended: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  notes_ready: "bg-indigo-500/15 text-indigo-300 border-indigo-500/20",
  no_artifacts: "bg-slate-500/15 text-slate-400 border-slate-500/20",
};

const SYNC_MESSAGE: Record<MeetArtifactSyncResult, string> = {
  not_started: "Nobody has joined this meeting yet",
  in_progress: "Meeting is still live",
  waiting_for_files: "Google is still generating the notes",
  notes_ready: "Gemini notes imported",
  no_artifacts: "No transcript or notes were produced",
  skipped: "Already synced",
};

interface Props {
  meeting: Meeting;
  canManage: boolean;
  isStudent: boolean;
}

/** Meet automation status + transcript/notes links on a meeting card. */
export function GoogleMeetStatus({ meeting, canManage, isStudent }: Props) {
  const provision = useProvisionGoogleMeet();
  const sync = useSyncGoogleMeet();
  const status = meeting.meet_status;
  if (!status) return null;

  const meetingEnded =
    new Date(meeting.date).getTime() + (meeting.duration || 30) * 60_000 < Date.now();
  const canRetry = canManage && (status === "failed" || status === "pending");
  const canSync =
    canManage && meetingEnded && (status === "provisioned" || status === "ended");

  return (
    <div className="space-y-2 pt-1">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${STATUS_CLASS[status]}`}
        >
          <Mic className="w-3 h-3" />
          {STATUS_LABEL[status]}
        </span>

        {!isStudent && meeting.notes_doc_url && (
          <a
            href={meeting.notes_doc_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-300 hover:text-indigo-200"
          >
            <FileText className="w-3 h-3" /> Gemini notes
          </a>
        )}
        {!isStudent && meeting.transcript_doc_url && (
          <a
            href={meeting.transcript_doc_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-300 hover:text-indigo-200"
          >
            <FileText className="w-3 h-3" /> Transcript
          </a>
        )}

        {canRetry && (
          <button
            type="button"
            disabled={provision.isPending}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 hover:text-amber-200 disabled:opacity-50"
            onClick={() =>
              void toastAction(provision.mutateAsync(meeting.id), {
                loading: "Creating Google Meet link…",
                success: (m) =>
                  m.meet_status === "provisioned" ? "Google Meet link ready" : "Still failing — see details",
                error: "Could not create Google Meet link",
              })
            }
          >
            {provision.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Retry Meet link
          </button>
        )}

        {canSync && (
          <button
            type="button"
            disabled={sync.isPending}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white disabled:opacity-50"
            onClick={() =>
              void toastAction(sync.mutateAsync({ id: meeting.id }), {
                loading: "Checking Google for notes…",
                success: (r) => SYNC_MESSAGE[r.result],
                error: "Could not fetch meeting notes",
              })
            }
          >
            {sync.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Fetch notes now
          </button>
        )}
      </div>

      {!isStudent && meeting.meet_error && (
        <p className="flex items-start gap-1 text-[11px] text-rose-300/90 break-words">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          {meeting.meet_error}
        </p>
      )}
    </div>
  );
}
