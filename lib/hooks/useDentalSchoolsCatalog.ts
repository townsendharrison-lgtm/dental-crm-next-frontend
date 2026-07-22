"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DentalSchool,
  fetchDentalSchoolsCatalog,
} from "@/lib/schools/sheetCatalog";

/**
 * Loads the dental school catalog from the public Google Sheet on every mount.
 * No long-lived cache — each page visit / component remount refetches.
 */
export function useDentalSchoolsCatalog() {
  const [schools, setSchools] = useState<DentalSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDentalSchoolsCatalog();
      setSchools(data);
      setError(null);
    } catch (err) {
      console.error("Dental schools sheet fetch error:", err);
      setError(
        "Could not connect to Google Sheets. Please ensure the sheet is shared as Anyone with the link can view.",
      );
      setSchools([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { schools, loading, error, refetch };
}
