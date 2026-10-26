"use client";

import { FlaskConical } from "lucide-react";

/** School AI research is paused until the client funds the service again. */
export default function AdmissionResearchView() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/70 p-10 text-center shadow-xl shadow-black/20">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
          <FlaskConical className="h-7 w-7" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">Admission Research</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">Coming soon</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          School admissions research, rubrics, and fit scoring are not available yet. This page will
          light up when the school AI service is turned back on.
        </p>
      </div>
    </div>
  );
}
