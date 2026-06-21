"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FullPageSpinner } from "@/components/ui/Spinner";

export default function LettersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/letter-writer/letter-portal");
  }, [router]);

  return <FullPageSpinner label="Redirecting..." />;
}
