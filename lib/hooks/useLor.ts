import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lorApi, type CreateLorRequestInput } from "../api/lor";
import { queryKeys } from "../api/queryKeys";
import type { LetterOfRecommendationRequest, LOREmailConfig } from "@/lib/types";

/** Hook to list LOR requests. */
export function useLorRequests(status?: string, search?: string) {
  return useQuery<LetterOfRecommendationRequest[]>({
    queryKey: queryKeys.lor.requests(status, search),
    queryFn: () => lorApi.listRequests(status, search),
  });
}

/** Hook to create LOR requests. */
export function useCreateLorRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLorRequestInput) => lorApi.createRequest(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lor"] });
    },
  });
}

/** Hook to approve or decline LOR requests. */
export function useUpdateLorStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      declineReason,
    }: {
      id: string;
      status: "REVIEWED" | "DECLINED";
      declineReason?: string;
    }) => lorApi.updateStatus(id, status, declineReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lor"] });
    },
  });
}

/** Hook to delete LOR request. */
export function useDeleteLorRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => lorApi.deleteRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lor"] });
    },
  });
}

/** Hook to retrieve LOR global config. */
export function useLorConfig() {
  return useQuery<LOREmailConfig>({
    queryKey: queryKeys.lor.config(),
    queryFn: lorApi.getConfig,
  });
}

/** Hook to update LOR config. */
export function useUpdateLorConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<LOREmailConfig>) => lorApi.updateConfig(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.lor.config() });
    },
  });
}

/** Hook to send test LOR emails. */
export function useSendLorTestEmail() {
  return useMutation({
    mutationFn: (testEmail: string) => lorApi.sendTestEmail(testEmail),
  });
}
