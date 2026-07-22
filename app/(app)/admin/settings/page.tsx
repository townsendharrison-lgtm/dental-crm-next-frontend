"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** Legacy URL — redirects to Rules Engine. */
export default function AdminSettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/rules-engine");
  }, [router]);

  return (
    <div className="flex h-[40vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
    </div>
  );
}
