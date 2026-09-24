"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ApiRequestError } from "@/lib/api/client";

/** Shared client so logout can clear cached data across the app. */
let appQueryClient: QueryClient | null = null;

export function clearAppQueryCache() {
  appQueryClient?.clear();
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiRequestError && [401, 403, 404].includes(error.status)) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => {
    const qc = createQueryClient();
    appQueryClient = qc;
    return qc;
  });

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
