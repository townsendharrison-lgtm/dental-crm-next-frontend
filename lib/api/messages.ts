import { apiGet, apiPost } from "./client";
import type { Conversation, Message } from "@/lib/types";

export interface CreateConversationPayload {
  participantIds: string[];
  isGroup?: boolean;
  name?: string;
}

export interface SendMessagePayload {
  text: string;
}

export const messagesApi = {
  /**
   * List conversations/threads for the current authenticated user.
   */
  list: async (): Promise<Conversation[]> => {
    const response = await apiGet<{ conversations: Conversation[] }>("/api/conversations");
    return response.conversations || [];
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
   * Send a text message inside a conversation thread.
   */
  sendMessage: async (conversationId: string, text: string): Promise<Message> => {
    return await apiPost<Message>(`/api/conversations/${conversationId}/messages`, { text });
  },

  /**
   * Mark all messages in a conversation as read.
   */
  markAsRead: async (conversationId: string): Promise<{ success: boolean }> => {
    return await apiPost<{ success: boolean }>(`/api/conversations/${conversationId}/read`);
  },
};
