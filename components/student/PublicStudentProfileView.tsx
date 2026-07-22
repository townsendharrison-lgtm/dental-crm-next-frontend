"use client";

import React, { useEffect, useState } from "react";
import {
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  FileText,
  Fingerprint,
  GraduationCap,
  Loader2,
  Lock,
  MapPin,
  User,
} from "lucide-react";
import {
  fetchPublicStudentProfile,
  type PublicStudentSnapshot,
} from "@/lib/api/publicStudentProfile";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-slate-200">{value ?? "—"}</p>
    </div>
  );
}

export default function PublicStudentProfileView({ token }: { token: string }) {
  const [data, setData] = useState<PublicStudentSnapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const snapshot = await fetchPublicStudentProfile(token);
        if (!cancelled) setData(snapshot);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load profile");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading shared profile…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 px-4 text-center">
        <Lock className="h-10 w-10 text-slate-600" />
        <h1 className="text-lg font-semibold text-white">Link unavailable</h1>
        <p className="max-w-md text-sm text-slate-400">
          {error || "This share link is invalid or has been revoked."}
        </p>
      </div>
    );
  }

  const s = data.student;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-800 ring-1 ring-slate-700">
              {s.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-6 w-6 text-slate-400" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {s.name || "Student"}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
                {s.status && (
                  <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                    {s.status}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} />
                  {[s.state, s.country].filter(Boolean).join(", ") || "—"}
                </span>
                {s.application_cycle && <span>Cycle {s.application_cycle}</span>}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Strength
            </p>
            <p className="text-2xl font-bold tabular-nums text-indigo-300">
              {s.strength_score ?? "—"}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <GraduationCap size={16} className="text-indigo-400" />
            Academics &amp; demographics
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="GPA" value={s.gpa ?? "—"} />
            <Field label="DAT" value={s.dat_score ?? "—"} />
            <Field label="DAT AA" value={s.dat_aa ?? "—"} />
            <Field label="DAT TS" value={s.dat_ts ?? "—"} />
            <Field label="Gender" value={s.gender ?? "—"} />
            <Field label="Age" value={s.age ?? "—"} />
            <Field label="Ethnicity" value={s.ethnicity ?? "—"} />
            <Field label="Undergrad" value={s.undergrad_institution ?? "—"} />
            <Field label="Degree" value={s.undergrad_degree ?? "—"} />
            <Field label="Grad year" value={s.undergrad_grad_year ?? "—"} />
            <Field label="Reapplicant" value={s.is_reapplicant ? "Yes" : "No"} />
            <Field label="Timezone" value={s.timezone ?? "—"} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <Briefcase size={16} className="text-indigo-400" />
            Experiences
          </h2>
          {data.experiences.length === 0 ? (
            <p className="text-sm text-slate-500">No experiences listed.</p>
          ) : (
            <ul className="space-y-3">
              {data.experiences.map((e) => (
                <li
                  key={e.id}
                  className="rounded-lg border border-slate-800/80 bg-slate-950/40 px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-100">{e.title || "Untitled"}</p>
                      <p className="text-xs text-slate-500">
                        {[e.category, e.organization].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">
                      {formatDate(e.start_date)} – {e.end_date ? formatDate(e.end_date) : "Present"}
                    </p>
                  </div>
                  {e.description && (
                    <p className="mt-2 text-sm text-slate-400">{e.description}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <Fingerprint size={16} className="text-indigo-400" />
            Manual dexterity
          </h2>
          {data.dexterity.length === 0 ? (
            <p className="text-sm text-slate-500">No dexterity activities listed.</p>
          ) : (
            <ul className="space-y-3">
              {data.dexterity.map((d) => (
                <li
                  key={d.id}
                  className="rounded-lg border border-slate-800/80 bg-slate-950/40 px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-100">{d.activity || "Activity"}</p>
                      {d.description && (
                        <p className="mt-1 text-sm text-slate-400">{d.description}</p>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {formatDate(d.start_date)} –{" "}
                      {d.is_ongoing ? "Ongoing" : formatDate(d.end_date)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <FileText size={16} className="text-indigo-400" />
            Documents
          </h2>
          {data.documents.length === 0 ? (
            <p className="text-sm text-slate-500">No documents listed.</p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {data.documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-slate-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {doc.title || "Document"}
                      </p>
                      <p className="text-xs text-slate-500">{doc.type || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {doc.status && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-slate-300">
                        <CheckCircle2 size={12} />
                        {doc.status}
                      </span>
                    )}
                    <span>{formatDate(doc.uploaded_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="flex items-center justify-center gap-2 pb-8 text-xs text-slate-600">
          <Award size={12} />
          Dental School Guide · Shared snapshot
          {data.sharedAt ? ` · ${formatDate(data.sharedAt)}` : ""}
        </footer>
      </main>
    </div>
  );
}
