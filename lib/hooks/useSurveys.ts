"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { surveysApi, type CreateSurveyPayload, type SurveyAnalytics } from "@/lib/api/surveys";
import { queryKeys } from "@/lib/api/queryKeys";
import type { Survey, SurveyResponse } from "@/lib/types";

export function useSurveys() {
  return useQuery<Survey[]>({
    queryKey: queryKeys.surveys.all(),
    queryFn: surveysApi.list,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useSurvey(id: string) {
  return useQuery<Survey>({
    queryKey: ["surveys", id],
    queryFn: () => surveysApi.get(id),
    enabled: !!id,
  });
}

export function useSurveyResponses(surveyId: string) {
  return useQuery<SurveyResponse[]>({
    queryKey: ["surveys", surveyId, "responses"],
    queryFn: () => surveysApi.listResponses(surveyId),
    enabled: !!surveyId,
  });
}

export function useSurveyAnalytics(surveyId: string) {
  return useQuery<SurveyAnalytics>({
    queryKey: ["surveys", surveyId, "analytics"],
    queryFn: () => surveysApi.getAnalytics(surveyId),
    enabled: !!surveyId,
  });
}

export function useCreateSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSurveyPayload) => surveysApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.surveys.all() });
    },
  });
}

export function useUpdateSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateSurveyPayload> }) =>
      surveysApi.update(id, updates),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: queryKeys.surveys.all() });
      qc.invalidateQueries({ queryKey: ["surveys", updated.id] });
    },
  });
}

export function useDeleteSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => surveysApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.surveys.all() });
    },
  });
}

export function useSubmitSurveyResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      surveyId,
      answers,
    }: {
      surveyId: string;
      answers: Array<{ questionId: string; answerText: string }>;
    }) => surveysApi.submitResponse(surveyId, answers),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: queryKeys.surveys.all() });
      qc.invalidateQueries({ queryKey: ["surveys", response.survey_id, "responses"] });
      qc.invalidateQueries({ queryKey: ["surveys", response.survey_id, "analytics"] });
    },
  });
}
