"use client";

import { Suspense } from "react";
import AdminRulesEngineView from "@/components/admin/AdminRulesEngineView";
import { Loader2 } from "lucide-react";

function RulesEngineFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      <p className="text-sm text-slate-400">Loading rules…</p>
    </div>
  );
}

export default function AdminRulesEnginePage() {
  return (
    <Suspense fallback={<RulesEngineFallback />}>
      <AdminRulesEngineView />
    </Suspense>
  );
}
