"use client";
import type { PredictionResult } from "@/lib/api/aiServer";
import { VerifiedCriteriaPanel, evidenceValue } from "./VerifiedCriteriaPanel";

const percent = (value: number | null | undefined) => value == null ? "Unavailable" : `${value}%`;

export function EvidenceComparisonResult({ prediction }: { prediction: PredictionResult }) {
  const coverage = prediction.evidenceCoverage;
  return <div className="space-y-5">
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
      <h3 className="font-bold text-white">{prediction.schoolName}: evidence-based comparison</h3>
      <p className="text-3xl text-white font-bold">{prediction.matchScore == null ? "Insufficient data" : `${prediction.matchScore}/100 descriptive fit`}</p>
      <p className="text-sm text-slate-300">{prediction.scoreMethod}</p>
      <p className="text-sm text-slate-400">{coverage?.verifiedSchoolFields ?? 0}/{coverage?.totalSchoolFields ?? 0} school fields verified · {coverage?.numericalComparisons ?? 0} numerical comparisons · {coverage?.scoredCategories ?? 0}/14 categories scored · Cycle {coverage?.cycle ?? "Unknown"}</p>
      <p className="text-sm text-amber-300">Requirements: {prediction.requirementsStatus.replaceAll("_", " ")}. Passing available checks does not establish that every requirement is met.</p>
    </section>
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
      <h3 className="font-bold text-white">Outcome estimates</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[
        ["Interview", prediction.probabilities.interviewProbability], ["Acceptance", prediction.probabilities.acceptedProbability],
        ["Terminal waitlist", prediction.probabilities.waitlistProbability], ["Rejection", prediction.probabilities.rejectionProbability],
      ].map(([label, value]) => <div key={String(label)} className="rounded border border-slate-700 p-4"><p className="text-xs text-slate-400">{label}</p><p className="text-xl font-bold text-white">{percent(value as number | null)}</p></div>)}</div>
      <p className="text-sm text-slate-300">{prediction.probabilityExplanation}</p>
      <p className="text-xs text-slate-400">Interview is a stage event, not a fourth mutually exclusive final outcome. School-wide published rates are not personalized probabilities.</p>
    </section>
    {prediction.requirements.length > 0 && <section className="rounded-xl border border-slate-800 p-5 text-sm text-slate-300"><h3 className="font-bold text-white mb-3">Verified numerical requirement checks</h3>{prediction.requirements.map(r => <p key={r.id}>{r.name}: {evidenceValue(r.studentValue)} / {evidenceValue(r.schoolRequirement)} · {r.status}</p>)}</section>}
    <VerifiedCriteriaPanel criteria={prediction.criteria_comparison ?? []} />
  </div>;
}
