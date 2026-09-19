"use client";

import { useState } from "react";
import type { VerifiedCriterion } from "@/lib/api/aiServer";

export function evidenceValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Unknown";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export function VerifiedCriteriaPanel({ criteria }: {
  criteria: VerifiedCriterion[];
}) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All categories");
  const [pendingOnly, setPendingOnly] = useState(false);
  const selected = criteria.filter(row => selectedCategory === "All categories" || row.category === selectedCategory);
  const rows = selected.filter(row => (!pendingOnly || row.status !== "VERIFIED") &&
    `${row.label} ${row.category}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
    <div className="flex flex-wrap justify-between gap-3">
      <p className="text-sm text-slate-300">{selected.filter(r => r.status === "VERIFIED").length} / {selected.length} fields verified. Unpublished criteria and weights remain unknown.</p>
      <input aria-label="Search criteria" placeholder="Search criteria" value={query} onChange={e => setQuery(e.target.value)} className="rounded border border-slate-700 bg-slate-950 p-2 text-sm text-white" />
      <select aria-label="Filter category" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="rounded border border-slate-700 bg-slate-950 p-2 text-sm text-white">
        {["All categories", ...new Set(criteria.map(row => row.category))].map(name => <option key={name}>{name}</option>)}
      </select>
      <label className="text-sm text-slate-300"><input type="checkbox" checked={pendingOnly} onChange={e => setPendingOnly(e.target.checked)} /> Show gaps and conflicts</label>
    </div>
    <p className="text-xs text-slate-400">A minimum cutoff differs from a 5th percentile. Peer-school statistics do not prove this school&apos;s admissions weights. Each fact needs its own supporting source.</p>
    {!criteria.length && <p className="text-amber-300">No field-level evidence is available.</p>}
    {rows.map(row => <article key={row.field} className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
      <p className="text-xs text-indigo-300">{row.category}</p>
      <div className="flex justify-between gap-4"><h4 className="text-sm font-semibold text-white capitalize">{row.label}</h4><span className={row.status === "VERIFIED" ? "text-xs text-emerald-300" : "text-xs text-amber-300"}>{row.status.replaceAll("_", " ")}</span></div>
      <p className="text-sm text-slate-200 whitespace-pre-wrap break-words">{evidenceValue(row.value)}</p>
      {row.comparison_status && <div className="border-t border-slate-800 pt-2 text-sm text-slate-300">
        <p className="font-semibold">CRM: <span className="whitespace-pre-wrap font-normal">{evidenceValue(row.student_value)}</span></p>
        <p>{row.comparison_status.replaceAll("_", " ")}: {row.explanation}</p>
      </div>}
      {row.evidence.length > 0 && <details className="text-xs text-slate-400"><summary className="cursor-pointer">Evidence ({row.evidence.length})</summary>
        {row.evidence.map(item => <div key={item.id} className="mt-3 space-y-2 border-t border-slate-800 pt-3">
          <p>{item.source_url && /^https?:\/\//i.test(item.source_url) ? <a className="text-indigo-300 underline" href={item.source_url} target="_blank" rel="noreferrer">{item.source_name}</a> : item.source_name} {item.page_number ? `· page ${item.page_number}` : ""} · Cycle {item.cycle}</p>
          <blockquote className="border-l-2 border-indigo-500 pl-3 whitespace-pre-wrap">{item.quote}</blockquote>
          <p>Candidate value: {evidenceValue(item.value)} · {item.status}</p>
          <p>{item.reason} · Retrieved {item.retrieved_at ? new Date(item.retrieved_at).toLocaleString() : "Unknown"}</p>
        </div>)}
      </details>}
    </article>)}
  </section>;
}
