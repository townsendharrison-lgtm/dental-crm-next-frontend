"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AdminSchoolIntelligenceRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/research");
  }, [router]);

  return (
    <div className="flex h-96 items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  );
}
