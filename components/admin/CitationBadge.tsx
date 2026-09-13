"use client";

import React from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import { EvidenceCitation } from "@/lib/api/aiServer";
import { ExternalLink, ShieldAlert, ShieldCheck } from "lucide-react";

interface CitationBadgeProps {
  citations?: EvidenceCitation[];
}

export default function CitationBadge({ citations }: CitationBadgeProps) {
  if (!citations || citations.length === 0) return null;

  const citation = citations[0];

  let statusColor = "text-slate-400";
  let StatusIcon = ShieldCheck;
  
  if (citation.verification_status === "VERIFIED") {
    statusColor = "text-emerald-400";
  } else if (citation.verification_status === "FOUND_UNVERIFIED") {
    statusColor = "text-indigo-400";
  } else if (citation.verification_status === "CONFLICTING") {
    statusColor = "text-rose-400";
    StatusIcon = ShieldAlert;
  }

  const tooltipContent = (
    <div className="w-64 space-y-2 p-1 text-left">
      <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
        <span className={`flex items-center gap-1.5 text-xs font-bold ${statusColor}`}>
          <StatusIcon className="h-3 w-3" />
          {citation.verification_status}
        </span>
        <span className="text-[10px] font-mono text-slate-500">
          {(citation.confidence_score * 100).toFixed(0)}% Conf
        </span>
      </div>
      
      <p className="text-xs text-slate-200 leading-snug italic line-clamp-4">
        "{citation.verbatim_quote || "No exact snippet captured."}"
      </p>

      {citation.source_url && (
        <a 
          href={citation.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded bg-indigo-500/20 px-2 py-1.5 text-[10px] font-semibold text-indigo-300 transition-colors hover:bg-indigo-500/30"
        >
          View Original Source
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );

  return (
    <Tooltip content={tooltipContent} side="top" className="z-50">
      <span className="inline-flex cursor-pointer items-center justify-center rounded-sm bg-slate-800 px-1 py-0.5 ml-1.5 text-[9px] font-mono font-bold text-slate-400 transition-colors hover:bg-indigo-500 hover:text-white">
        [1]
      </span>
    </Tooltip>
  );
}
