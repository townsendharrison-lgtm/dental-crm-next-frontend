"use client";

import { useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SetterDashboard } from "@/components/setters/SetterDashboard";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { useRole } from "@/lib/hooks/useRole";
import {
  useLeads,
  useSetters,
  useUpdateLead,
} from "@/lib/hooks/useLeads";
import type { Lead } from "@/lib/types";

/**
 * Lead Management / Setter Dashboard landing page for Admin.
 * Setter role auto-redirects to their specific detail page.
 */
export default function SetterManagementPage() {
  const router = useRouter();
  const { role } = useRole();

  const { data: leads = [], isLoading: leadsLoading } = useLeads();
  const { data: setters = [], isLoading: settersLoading } = useSetters();

  const updateLead = useUpdateLead();

  // Redirect setter role to their own detail view
  useEffect(() => {
    if (role === "SETTER" && setters.length > 0) {
      router.replace(`/setter/setter-management/${setters[0].id}`);
    }
  }, [role, setters, router]);

  if (!role) return null;
  if (leadsLoading || settersLoading) {
    return <FullPageSpinner label="Loading leads…" />;
  }

  // If role is setter, we are redirecting in useEffect, return a loader
  if (role === "SETTER") {
    return <FullPageSpinner label="Redirecting to your dashboard…" />;
  }

  return (
    <SetterDashboard
      leads={leads}
      setters={setters}
      userRole={role}
      onUpdateLeadStatus={(leadId, updates) => updateLead.mutate({ id: leadId, updates })}
    />
  );
}
