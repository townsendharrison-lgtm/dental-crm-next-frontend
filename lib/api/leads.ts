import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { Lead } from "@/lib/types";

/** Raw lead shape returned by the backend (snake_case). */
interface RawLead {
  id: string;
  setter_id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  contacted: boolean;
  showed_up: boolean | null;
  is_paid: boolean;
  created_at: string;
  notes?: string;
  admin_notes?: string;
  purchased_items?: string[];
  purchase_total?: number;
}

function mapLead(l: RawLead): Lead {
  return {
    id: l.id,
    setterId: l.setter_id,
    name: l.name,
    phone: l.phone ?? "",
    email: l.email ?? "",
    source: l.source,
    contacted: l.contacted,
    showedUp: l.showed_up,
    isPaid: l.is_paid,
    createdAt: l.created_at,
    notes: l.notes,
    adminNotes: l.admin_notes,
    purchasedItems: l.purchased_items ?? [],
    purchaseTotal: l.purchase_total ?? 0,
    meetings: [],
  };
}

/** Payload accepted when creating/updating leads (camelCase; backend maps it). */
export type LeadInput = Partial<
  Pick<
    Lead,
    | "name"
    | "phone"
    | "email"
    | "source"
    | "notes"
    | "adminNotes"
    | "contacted"
    | "isPaid"
    | "showedUp"
    | "purchasedItems"
    | "purchaseTotal"
    | "setterId"
  >
>;

export const leadsApi = {
  list: async (): Promise<Lead[]> => {
    const { leads } = await apiGet<{ leads: RawLead[] }>("/api/leads");
    return (leads ?? []).map(mapLead);
  },

  create: async (input: LeadInput): Promise<Lead> => {
    const { lead } = await apiPost<{ lead: RawLead }>("/api/leads", input);
    return mapLead(lead);
  },

  update: async (id: string, updates: LeadInput): Promise<Lead> => {
    const { lead } = await apiPut<{ lead: RawLead }>(`/api/leads/${id}`, updates);
    return mapLead(lead);
  },

  remove: (id: string): Promise<{ message: string }> =>
    apiDelete<{ message: string }>(`/api/leads/${id}`),
};
