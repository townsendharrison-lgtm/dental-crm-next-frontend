import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { Survey, SurveyQuestion, SurveyResponse } from "@/lib/types";

export interface CreateSurveyPayload {
  title: string;
  description?: string;
  questions: SurveyQuestion[];
  targetRole?: "STUDENT" | "MENTOR" | "BOTH";
  isActive?: boolean;
}

export interface QuestionAnalyticsItem {
  questionId: string;
  questionText: string;
  type: "TEXT" | "MULTIPLE_CHOICE" | "RATING";
  totalCount: number;
  stats: {
    average?: number; // for RATING
    distribution?: Record<number, number>; // for RATING count of [1..5]
    breakdown?: Array<{ option: string; count: number; percentage: number }>; // for MULTIPLE_CHOICE
    recentSubmissions?: string[]; // for TEXT
  };
}

export interface SurveyAnalytics {
  surveyId: string;
  title: string;
  totalResponses: number;
  questions: QuestionAnalyticsItem[];
}

export const surveysApi = {
  /**
   * List surveys targeted at the user's role.
   * Admins and Managers will receive all surveys.
   */
  list: async (): Promise<Survey[]> => {
    const response = await apiGet<{ surveys: Survey[] }>("/api/surveys");
    return (response.surveys || []).map((s) => ({
      ...s,
      response_count: s.response_count ?? s.responseCount ?? 0,
      responseCount: s.responseCount ?? s.response_count ?? 0,
      last_response_at: s.last_response_at ?? s.lastResponseAt ?? null,
      lastResponseAt: s.lastResponseAt ?? s.last_response_at ?? null,
      has_responded: s.has_responded ?? s.hasResponded ?? false,
      hasResponded: s.hasResponded ?? s.has_responded ?? false,
    }));
  },

  /**
   * Fetch single survey details by ID.
   */
  get: async (id: string): Promise<Survey> => {
    return await apiGet<Survey>(`/api/surveys/${id}`);
  },

  /**
   * Create a new survey template (Admin only).
   */
  create: async (payload: CreateSurveyPayload): Promise<Survey> => {
    return await apiPost<Survey>("/api/surveys", payload);
  },

  /**
   * Update survey templates (Admin only).
   */
  update: async (id: string, updates: Partial<CreateSurveyPayload>): Promise<Survey> => {
    return await apiPut<Survey>(`/api/surveys/${id}`, updates);
  },

  /**
   * Delete survey template (Admin only).
   */
  remove: async (id: string): Promise<{ message: string }> => {
    return await apiDelete<{ message: string }>(`/api/surveys/${id}`);
  },

  /**
   * Submit answers to a survey.
   */
  submitResponse: async (
    id: string,
    answers: Array<{ questionId: string; answerText: string }>
  ): Promise<SurveyResponse> => {
    return await apiPost<SurveyResponse>(`/api/surveys/${id}/responses`, { answers });
  },

  /**
   * Fetch all individual response objects for a survey (Admin & Mentor Manager only).
   */
  listResponses: async (id: string): Promise<SurveyResponse[]> => {
    const response = await apiGet<{ responses: SurveyResponse[] }>(`/api/surveys/${id}/responses`);
    return response.responses || [];
  },

  /**
   * Fetch aggregate survey response analytics (Admin & Mentor Manager only).
   */
  getAnalytics: async (id: string): Promise<SurveyAnalytics> => {
    return await apiGet<SurveyAnalytics>(`/api/surveys/${id}/analytics`);
  },
};
