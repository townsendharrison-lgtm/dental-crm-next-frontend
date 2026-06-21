import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { Invitation, ManagedUser, UserRole } from "@/lib/types";

export const adminApi = {
  /** List all users (admin only). */
  listUsers: async (): Promise<ManagedUser[]> => {
    return apiGet<ManagedUser[]>("/api/admin/users");
  },

  /** Invite a new user. */
  invite: async (payload: { email: string; role: UserRole }): Promise<{
    message: string;
    invitationLink?: string;
  }> => {
    return apiPost("/api/admin/invite", payload);
  },

  /** List all invitations (admin only). */
  listInvitations: async (): Promise<Invitation[]> => {
    return apiGet<Invitation[]>("/api/admin/invitations");
  },

  /** Delete an invitation. */
  deleteInvitation: async (id: string): Promise<{ message: string }> => {
    return apiDelete<{ message: string }>(`/api/admin/invitations/${id}`);
  },

  /** Resend an invitation. */
  resendInvitation: async (id: string): Promise<{ message: string }> => {
    return apiPost<{ message: string }>(`/api/admin/invitations/${id}/resend`);
  },

  /** Delete a user (admin only). */
  deleteUser: async (id: string): Promise<{ message: string }> => {
    return apiDelete<{ message: string }>(`/api/admin/users/${id}`);
  },

  /** Update a user's role (admin only). */
  updateRole: async (id: string, role: string): Promise<{ message: string }> => {
    return apiPut<{ message: string }>(`/api/admin/users/${id}/role`, { role });
  },
};
