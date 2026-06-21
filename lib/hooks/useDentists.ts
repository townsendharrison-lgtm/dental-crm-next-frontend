import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dentistsApi, type SearchDentistsParams, type SubmitShadowReportInput } from "../api/dentists";
import { queryKeys } from "../api/queryKeys";

/** Hook to search dentists from registry */
export function useDentistsSearch(params: SearchDentistsParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.dentists.search(params as Record<string, unknown>),
    queryFn: () => dentistsApi.searchDentists(params),
    enabled,
  });
}

/** Hook to submit shadow report */
export function useSubmitShadowReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SubmitShadowReportInput) => dentistsApi.submitShadowReport(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dentists"] });
    },
  });
}
