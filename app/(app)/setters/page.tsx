"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FullPageSpinner } from "@/components/ui/Spinner";

export default function SettersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/setter/setter-management");
  }, [router]);

  return <FullPageSpinner label="Redirecting..." />;
}
