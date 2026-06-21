"use client";

import { useLorConfig } from "@/lib/hooks/useLor";
import AdminLetterVaultConfig from "@/components/letters/AdminLetterVaultConfig";
import { FullPageSpinner } from "@/components/ui/Spinner";

export default function LorConfigPage() {
  const { data: config, isLoading } = useLorConfig();

  if (isLoading) {
    return <FullPageSpinner label="Loading Letter Vault Configuration..." />;
  }

  if (!config) {
    return (
      <div className="p-8 text-slate-400 bg-slate-900 border border-slate-800 rounded-3xl text-center">
        Failed to load configuration.
      </div>
    );
  }

  return <AdminLetterVaultConfig config={config} />;
}
