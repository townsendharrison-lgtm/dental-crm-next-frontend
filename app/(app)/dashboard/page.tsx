"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/lib/hooks/useRole";
import { getInitialRouteForRole } from "@/lib/navigation";
import { FullPageSpinner } from "@/components/ui/Spinner";

export default function DashboardRedirectPage() {
  const router = useRouter();
  const { role } = useRole();

  useEffect(() => {
    if (role) {
      router.replace(getInitialRouteForRole(role));
    }
  }, [role, router]);

  return <FullPageSpinner label="Redirecting to your dashboard..." />;
}
