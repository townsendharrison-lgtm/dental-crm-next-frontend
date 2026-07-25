import { apiGet, apiPost, apiPut, apiDelete, apiClient } from "./client";
import type { Conversation, Message } from "@/lib/types";

export interface CreateConversationPayload {
  participantIds: string[];
  isGroup?: boolean;
  name?: string;
}

export interface SendMessagePayload {
  text?: string;
  file?: File;
}

export type SentMonthlyPoint = { month: string; count: number };

export const messagesApi = {
  /**
   * List conversations/threads for the current authenticated user.
   */
  list: async (): Promise<Conversation[]> => {
    const response = await apiGet<{ conversations: Conversation[] }>("/api/conversations");
    return response.conversations || [];
  },

  /** Messages sent by month for the current user (or staff preview of another user). */
  sentMonthly: async (
    months = 12,
    userId?: string,
  ): Promise<{ userId: string; months: SentMonthlyPoint[] }> => {
    const query = new URLSearchParams();
    query.set("months", String(months));
    if (userId) query.set("userId", userId);
    return await apiGet<{ userId: string; months: SentMonthlyPoint[] }>(
      `/api/conversations/analytics/sent-monthly?${query.toString()}`,
    );
  },

  /**
   * Fetch thread metadata.
   */
  get: async (id: string): Promise<Conversation> => {
    return await apiGet<Conversation>(`/api/conversations/${id}`);
  },

  /**
   * Start a new chat thread (DM or Group).
   * If a DM already exists, the server returns the existing conversation.
   */
  create: async (payload: CreateConversationPayload): Promise<Conversation & { isExisting?: boolean }> => {
    return await apiPost<Conversation & { isExisting?: boolean }>("/api/conversations", payload);
  },

  /**
   * Fetch messages within a conversation thread.
   * Supports pagination using limit and before (timestamp).
   */
  listMessages: async (
    conversationId: string,
    limit?: number,
    before?: string,
  ): Promise<Message[]> => {
    const query = new URLSearchParams();
    if (limit) query.append("limit", limit.toString());
    if (before) query.append("before", before);

    const queryString = query.toString();
    const endpoint = `/api/conversations/${conversationId}/messages${queryString ? `?${queryString}` : ""}`;
    const response = await apiGet<{ messages: Message[] }>(endpoint);
    return response.messages || [];
  },

  /**
   * Send a text and/or image message inside a conversation thread.
   */
  sendMessage: async (
    conversationId: string,
    textOrPayload: string | SendMessagePayload,
    file?: File,
  ): Promise<Message> => {
    const payload: SendMessagePayload =
      typeof textOrPayload === "string"
        ? { text: textOrPayload, file }
        : textOrPayload;

    if (payload.file) {
      const formData = new FormData();
      if (payload.text?.trim()) formData.append("text", payload.text.trim());
      formData.append("file", payload.file);
      const { data } = await apiClient.post<Message>(
        `/api/conversations/${conversationId}/messages`,
        formData,
      );
      return data;
    }

    return await apiPost<Message>(`/api/conversations/${conversationId}/messages`, {
      text: payload.text ?? "",
    });
  },

  /**
   * Mark all messages in a conversation as read.
   */
  markAsRead: async (conversationId: string): Promise<{ success: boolean }> => {
    return await apiPost<{ success: boolean }>(`/api/conversations/${conversationId}/read`);
  },

  /**
   * Pin a conversation.
   */
  pin: async (conversationId: string): Promise<{ success: boolean }> => {
    return await apiPost<{ success: boolean }>(`/api/conversations/${conversationId}/pin`);
  },

  /**
   * Unpin a conversation.
   */
  unpin: async (conversationId: string): Promise<{ success: boolean }> => {
    return await apiPost<{ success: boolean }>(`/api/conversations/${conversationId}/unpin`);
  },

  /**
   * Delete / hide a conversation for the current user.
   */
  delete: async (conversationId: string): Promise<{ success: boolean }> => {
    return await apiDelete<{ success: boolean }>(`/api/conversations/${conversationId}`);
  },

  /**
   * Rename a group conversation.
   */
  rename: async (conversationId: string, name: string): Promise<{ success: boolean }> => {
    return await apiPut<{ success: boolean }>(`/api/conversations/${conversationId}/rename`, { name });
  },

  /**
   * Add members to a group conversation.
   */
  addMembers: async (conversationId: string, userIds: string[]): Promise<Conversation> => {
    return await apiPost<Conversation>(`/api/conversations/${conversationId}/members`, { userIds });
  },

  /**
   * Remove a member from a group conversation.
   */
  removeMember: async (conversationId: string, memberId: string): Promise<Conversation> => {
    return await apiDelete<Conversation>(`/api/conversations/${conversationId}/members/${memberId}`);
  },
};
