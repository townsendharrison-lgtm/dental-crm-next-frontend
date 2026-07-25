"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Benchmarks moved into Rules Engine → Benchmarks tab. */
export default function AdminBenchmarksRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/rules-engine?tab=benchmarks");
  }, [router]);
  return null;
}
