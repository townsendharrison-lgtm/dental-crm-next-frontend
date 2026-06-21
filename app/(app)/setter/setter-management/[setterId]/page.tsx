"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { SetterDetailView } from "@/components/setters/SetterDetailView";
import { DEFAULT_EMAIL_TEMPLATES } from "@/components/setters/emailTemplates";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { useRole } from "@/lib/hooks/useRole";
import {
  useLeads,
  useSetters,
  useCreateLead,
  useUpdateLead,
  useDeleteLead,
  useDeleteSetter,
  useUpdateSetterGoal,
} from "@/lib/hooks/useLeads";
import type {
  EmailSettings,
  Lead,
  LeadEmailTemplate,
  LeadMeeting,
} from "@/lib/types";

export default function SetterDetailPage() {
  const params = useParams();
  const setterId = params.setterId as string;
  const { role } = useRole();

  const { data: leads = [], isLoading: leadsLoading } = useLeads();
  const { data: setters = [], isLoading: settersLoading } = useSetters();

  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const deleteSetter = useDeleteSetter();
  const updateGoal = useUpdateSetterGoal();

  // Client-only meetings + email templates (no backend endpoint yet).
  const [meetingsByLead, setMeetingsByLead] = useState<Record<string, LeadMeeting[]>>({});
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    templates: DEFAULT_EMAIL_TEMPLATES,
    gmailConnected: false,
  });

  // Merge client-side meetings into the fetched leads.
  const leadsWithMeetings = useMemo<Lead[]>(
    () => leads.map((l) => ({ ...l, meetings: meetingsByLead[l.id] ?? [] })),
    [leads, meetingsByLead],
  );

  const activeSetter = useMemo(() => {
    return setters.find((s) => s.id === setterId);
  }, [setters, setterId]);

  if (!role) return null;
  if (leadsLoading || settersLoading) {
    return <FullPageSpinner label="Loading details…" />;
  }

  if (!activeSetter) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <h2 className="text-xl font-bold text-white mb-2">Setter Not Found</h2>
        <p className="text-slate-400">The setter with ID &quot;{setterId}&quot; could not be found.</p>
      </div>
    );
  }

  return (
    <SetterDetailView
      setterId={setterId}
      setter={activeSetter}
      leads={leadsWithMeetings}
      setters={setters}
      userRole={role}
      onAddLead={(lead) => createLead.mutate({ ...lead, setterId })}
      onUpdateLeadStatus={(leadId, updates) => updateLead.mutate({ id: leadId, updates })}
      onDeleteLead={(leadId) => deleteLead.mutate(leadId)}
      onDeleteSetter={(sId) => deleteSetter.mutate(sId)}
      onUpdateSetterGoal={(sId, updates) => updateGoal.mutate({ setterId: sId, updates })}
      onScheduleMeeting={(leadId, meeting) => {
        const newMeeting: LeadMeeting = {
          ...meeting,
          id: `meeting-${Date.now()}`,
          status: "Scheduled",
          emailsSent: [],
        };
        setMeetingsByLead((prev) => ({
          ...prev,
          [leadId]: [...(prev[leadId] ?? []), newMeeting],
        }));
      }}
      emailSettings={emailSettings}
      onUpdateEmailTemplate={(templateId, updates) =>
        setEmailSettings((prev) => ({
          ...prev,
          templates: prev.templates.map((t: LeadEmailTemplate) =>
            t.id === templateId ? { ...t, ...updates } : t,
          ),
        }))
      }
    />
  );
}
