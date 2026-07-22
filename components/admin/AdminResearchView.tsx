"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  Plus,
  FileText,
  School as SchoolIcon,
  Trash2,
  Edit2,
  BarChart3,
} from "lucide-react";
import type { ResearchCase, School } from "@/lib/types";
import type { CreateResearchCasePayload } from "@/lib/api/researchCases";
import { Button } from "@/components/ui/Button";
import { Input, FormField, Textarea } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils/cn";

interface AdminResearchViewProps {
  researchCases: ResearchCase[];
  schools: School[];
  onCreate: (payload: CreateResearchCasePayload) => void;
  onUpdate: (id: string, payload: Partial<CreateResearchCasePayload>) => void;
  onDelete: (id: string) => void;
  isSaving?: boolean;
}

type Tab = "cases" | "trends";

type CaseForm = {
  studentNameAnonymized: string;
  gpa: string;
  datAa: string;
  datTs: string;
  major: string;
  undergradInstitution: string;
  shadowingHours: string;
  volunteeringHours: string;
  researchHours: string;
  cycle: string;
  matriculatedSchool: string;
  specialCircumstances: string;
  acceptedSchools: string[];
};

function emptyForm(): CaseForm {
  return {
    studentNameAnonymized: "",
    gpa: "",
    datAa: "",
    datTs: "",
    major: "",
    undergradInstitution: "",
    shadowingHours: "0",
    volunteeringHours: "0",
    researchHours: "0",
    cycle: "2025-2026",
    matriculatedSchool: "",
    specialCircumstances: "",
    acceptedSchools: [],
  };
}

function caseName(c: ResearchCase) {
  return c.studentName || c.student_name_anonymized || "Applicant";
}

function acceptedList(c: ResearchCase) {
  return c.acceptedSchoolIds || c.accepted_schools || [];
}

function formFromCase(c: ResearchCase): CaseForm {
  return {
    studentNameAnonymized: caseName(c),
    gpa: String(c.gpa ?? ""),
    datAa: String(c.datAA ?? c.dat_aa ?? ""),
    datTs: String(c.datTS ?? c.dat_ts ?? ""),
    major: c.major || "",
    undergradInstitution: c.undergrad_institution || "",
    shadowingHours: String(c.totalShadowingHours ?? c.shadowing_hours ?? 0),
    volunteeringHours: String(c.totalVolunteeringHours ?? c.volunteering_hours ?? 0),
    researchHours: String(
      typeof c.researchExperience === "number"
        ? c.researchExperience
        : c.research_hours ?? 0,
    ),
    cycle: c.cycle || "2025-2026",
    matriculatedSchool: c.matriculated_school || "",
    specialCircumstances: c.special_circumstances || c.notes || "",
    acceptedSchools: acceptedList(c),
  };
}

function toPayload(form: CaseForm): CreateResearchCasePayload {
  return {
    studentNameAnonymized: form.studentNameAnonymized.trim(),
    gpa: parseFloat(form.gpa) || 0,
    datAa: parseInt(form.datAa, 10) || 0,
    datTs: parseInt(form.datTs, 10) || 0,
    major: form.major.trim() || undefined,
    undergradInstitution: form.undergradInstitution.trim() || undefined,
    shadowingHours: parseInt(form.shadowingHours, 10) || 0,
    volunteeringHours: parseInt(form.volunteeringHours, 10) || 0,
    researchHours: parseInt(form.researchHours, 10) || 0,
    acceptedSchools: form.acceptedSchools,
    matriculatedSchool: form.matriculatedSchool.trim() || undefined,
    cycle: form.cycle.trim() || "2025-2026",
    specialCircumstances: form.specialCircumstances.trim() || undefined,
  };
}

const AdminResearchView: React.FC<AdminResearchViewProps> = ({
  researchCases,
  schools,
  onCreate,
  onUpdate,
  onDelete,
  isSaving = false,
}) => {
  const [tab, setTab] = useState<Tab>("cases");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ResearchCase | null>(null);
  const [detail, setDetail] = useState<ResearchCase | null>(null);
  const [form, setForm] = useState<CaseForm>(emptyForm);

  const filteredCases = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return researchCases;
    return researchCases.filter(
      (c) =>
        caseName(c).toLowerCase().includes(q) ||
        c.cycle?.toLowerCase().includes(q) ||
        c.major?.toLowerCase().includes(q) ||
        c.special_circumstances?.toLowerCase().includes(q) ||
        c.notes?.toLowerCase().includes(q),
    );
  }, [researchCases, search]);

  const schoolTrends = useMemo(() => {
    const trends: Record<
      string,
      {
        schoolName: string;
        count: number;
        avgGPA: number;
        avgDAT: number;
        avgShadowing: number;
        avgVolunteering: number;
        researchRate: number;
      }
    > = {};

    researchCases.forEach((c) => {
      acceptedList(c).forEach((schoolKey) => {
        const school = schools.find((s) => s.id === schoolKey || s.name === schoolKey);
        const key = school?.id || schoolKey;
        const schoolName = school?.name || schoolKey;
        if (!trends[key]) {
          trends[key] = {
            schoolName,
            count: 0,
            avgGPA: 0,
            avgDAT: 0,
            avgShadowing: 0,
            avgVolunteering: 0,
            researchRate: 0,
          };
        }
        const t = trends[key];
        t.count++;
        t.avgGPA += c.gpa || 0;
        t.avgDAT += c.datAA ?? c.dat_aa ?? 0;
        t.avgShadowing += c.totalShadowingHours ?? c.shadowing_hours ?? 0;
        t.avgVolunteering += c.totalVolunteeringHours ?? c.volunteering_hours ?? 0;
        if ((c.research_hours ?? 0) > 0 || Number(c.researchExperience) > 0) {
          t.researchRate++;
        }
      });
    });

    return Object.values(trends)
      .map((t) => ({
        ...t,
        avgGPA: t.count ? t.avgGPA / t.count : 0,
        avgDAT: t.count ? t.avgDAT / t.count : 0,
        avgShadowing: t.count ? t.avgShadowing / t.count : 0,
        avgVolunteering: t.count ? t.avgVolunteering / t.count : 0,
        researchRate: t.count ? (t.researchRate / t.count) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [researchCases, schools]);

  const avgGpa =
    researchCases.length === 0
      ? 0
      : researchCases.reduce((s, c) => s + (c.gpa || 0), 0) / researchCases.length;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (c: ResearchCase) => {
    setEditing(c);
    setForm(formFromCase(c));
    setDetail(null);
    setModalOpen(true);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentNameAnonymized.trim()) return;
    const payload = toPayload(form);
    if (editing) onUpdate(editing.id, payload);
    else onCreate(payload);
    setModalOpen(false);
  };

  const schoolOptions = useMemo(() => {
    const names = new Set<string>();
    schools.forEach((s) => names.add(s.name));
    researchCases.forEach((c) => acceptedList(c).forEach((n) => names.add(n)));
    return [...names].sort();
  }, [schools, researchCases]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-1">
        <button
          type="button"
          onClick={() => setTab("cases")}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all",
            tab === "cases"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
              : "text-slate-400 hover:bg-slate-800 hover:text-white",
          )}
        >
          <FileText className="h-4 w-4" />
          Cases
        </button>
        <button
          type="button"
          onClick={() => setTab("trends")}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all",
            tab === "trends"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
              : "text-slate-400 hover:bg-slate-800 hover:text-white",
          )}
        >
          <BarChart3 className="h-4 w-4" />
          School Trends
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewStat label="Cases" value={researchCases.length} hint="Historical applicants" tone="indigo" />
        <OverviewStat label="Avg GPA" value={avgGpa.toFixed(2)} hint="Across all cases" tone="emerald" />
        <OverviewStat label="Schools" value={schoolTrends.length} hint="With acceptances" tone="amber" />
        <OverviewStat
          label="Cycles"
          value={new Set(researchCases.map((c) => c.cycle).filter(Boolean)).size}
          hint="Application years covered"
          tone="rose"
        />
      </div>

      {tab === "cases" && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, cycle, major…"
                className="pl-9"
              />
            </div>
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Add Case
            </Button>
          </div>

          {filteredCases.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title="No research cases"
              description="Add anonymized past-applicant profiles to build school trends."
            />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCases.map((c) => {
                const accepted = acceptedList(c);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setDetail(c)}
                    className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-left transition-colors hover:border-indigo-500/30"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="truncate font-semibold text-white">{caseName(c)}</h4>
                        <p className="text-xs text-slate-500">
                          {c.cycle || "—"} · {c.major || "Major N/A"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md border border-indigo-500/20 bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-400">
                        {accepted.length} accept
                      </span>
                    </div>
                    <div className="mb-3 grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">GPA</p>
                        <p className="text-sm font-bold tabular-nums text-white">
                          {(c.gpa ?? 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">DAT AA</p>
                        <p className="text-sm font-bold tabular-nums text-indigo-400">
                          {c.datAA ?? c.dat_aa ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {accepted.slice(0, 2).map((name) => (
                        <span
                          key={name}
                          className="rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300"
                        >
                          {name.split(" ")[0]}
                        </span>
                      ))}
                      {accepted.length > 2 && (
                        <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500">
                          +{accepted.length - 2}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "trends" && (
        schoolTrends.length === 0 ? (
          <EmptyState
            icon={<SchoolIcon className="h-8 w-8" />}
            title="No school trends yet"
            description="Trends appear once cases include accepted schools."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {schoolTrends.map((trend) => (
              <div
                key={trend.schoolName}
                className="rounded-xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="truncate font-semibold text-white">{trend.schoolName}</h4>
                    <p className="text-xs text-slate-500">{trend.count} successful cases</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Avg</p>
                    <p className="text-sm font-bold tabular-nums text-white">
                      {trend.avgGPA.toFixed(2)} / {Math.round(trend.avgDAT)} AA
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Metric label="Shadowing" value={Math.round(trend.avgShadowing)} />
                  <Metric label="Volunteer" value={Math.round(trend.avgVolunteering)} />
                  <Metric label="Research %" value={`${Math.round(trend.researchRate)}%`} />
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? caseName(detail) : "Case"}
        description={detail ? `${detail.cycle || "—"} · ${detail.major || "Major N/A"}` : undefined}
        size="lg"
        footer={
          detail ? (
            <div className="flex flex-wrap justify-between gap-2">
              <Button
                variant="danger"
                leftIcon={<Trash2 className="h-4 w-4" />}
                onClick={() => {
                  if (window.confirm("Delete this research case?")) {
                    onDelete(detail.id);
                    setDetail(null);
                  }
                }}
              >
                Delete
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setDetail(null)}>
                  Close
                </Button>
                <Button leftIcon={<Edit2 className="h-4 w-4" />} onClick={() => openEdit(detail)}>
                  Edit
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {detail && (
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="GPA" value={(detail.gpa ?? 0).toFixed(2)} />
              <Metric label="DAT AA" value={detail.datAA ?? detail.dat_aa ?? "—"} />
              <Metric label="DAT TS" value={detail.datTS ?? detail.dat_ts ?? "—"} />
              <Metric
                label="Research hrs"
                value={detail.research_hours ?? detail.researchExperience ?? 0}
              />
            </div>
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Accepted schools
              </p>
              <div className="flex flex-wrap gap-1.5">
                {acceptedList(detail).length === 0 ? (
                  <span className="text-sm text-slate-500">None listed</span>
                ) : (
                  acceptedList(detail).map((name) => (
                    <span
                      key={name}
                      className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300"
                    >
                      {name}
                    </span>
                  ))
                )}
              </div>
            </div>
            {(detail.special_circumstances || detail.notes) && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Notes
                </p>
                <p className="text-sm text-slate-300">
                  {detail.special_circumstances || detail.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Research Case" : "Add Research Case"}
        description="Anonymized past-applicant profile for school benchmarking."
        size="xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save as any} isLoading={isSaving}>
              {editing ? "Save changes" : "Create case"}
            </Button>
          </div>
        }
      >
        <form onSubmit={save} className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Anonymized name" required>
              <Input
                value={form.studentNameAnonymized}
                onChange={(e) =>
                  setForm((f) => ({ ...f, studentNameAnonymized: e.target.value }))
                }
                placeholder="Applicant A"
                required
              />
            </FormField>
            <FormField label="Cycle" required>
              <Input
                value={form.cycle}
                onChange={(e) => setForm((f) => ({ ...f, cycle: e.target.value }))}
                placeholder="2025-2026"
                required
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="GPA" required>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="4"
                value={form.gpa}
                onChange={(e) => setForm((f) => ({ ...f, gpa: e.target.value }))}
                required
              />
            </FormField>
            <FormField label="DAT AA" required>
              <Input
                type="number"
                value={form.datAa}
                onChange={(e) => setForm((f) => ({ ...f, datAa: e.target.value }))}
                required
              />
            </FormField>
            <FormField label="DAT TS" required>
              <Input
                type="number"
                value={form.datTs}
                onChange={(e) => setForm((f) => ({ ...f, datTs: e.target.value }))}
                required
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Major">
              <Input
                value={form.major}
                onChange={(e) => setForm((f) => ({ ...f, major: e.target.value }))}
              />
            </FormField>
            <FormField label="Undergrad institution">
              <Input
                value={form.undergradInstitution}
                onChange={(e) =>
                  setForm((f) => ({ ...f, undergradInstitution: e.target.value }))
                }
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Shadowing hrs">
              <Input
                type="number"
                value={form.shadowingHours}
                onChange={(e) => setForm((f) => ({ ...f, shadowingHours: e.target.value }))}
              />
            </FormField>
            <FormField label="Volunteering hrs">
              <Input
                type="number"
                value={form.volunteeringHours}
                onChange={(e) =>
                  setForm((f) => ({ ...f, volunteeringHours: e.target.value }))
                }
              />
            </FormField>
            <FormField label="Research hrs">
              <Input
                type="number"
                value={form.researchHours}
                onChange={(e) => setForm((f) => ({ ...f, researchHours: e.target.value }))}
              />
            </FormField>
          </div>
          <FormField label="Matriculated school">
            <Input
              value={form.matriculatedSchool}
              onChange={(e) =>
                setForm((f) => ({ ...f, matriculatedSchool: e.target.value }))
              }
              placeholder="School name"
            />
          </FormField>
          <FormField label="Accepted schools">
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/40 p-2">
              {schoolOptions.length === 0 ? (
                <p className="p-2 text-sm text-slate-500">No schools available.</p>
              ) : (
                schoolOptions.map((name) => {
                  const checked = form.acceptedSchools.includes(name);
                  return (
                    <label
                      key={name}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setForm((f) => ({
                            ...f,
                            acceptedSchools: e.target.checked
                              ? [...f.acceptedSchools, name]
                              : f.acceptedSchools.filter((s) => s !== name),
                          }));
                        }}
                      />
                      <span className="truncate">{name}</span>
                    </label>
                  );
                })
              )}
            </div>
          </FormField>
          <FormField label="Special circumstances / notes">
            <Textarea
              value={form.specialCircumstances}
              onChange={(e) =>
                setForm((f) => ({ ...f, specialCircumstances: e.target.value }))
              }
              rows={3}
            />
          </FormField>
        </form>
      </Modal>
    </div>
  );
};

function OverviewStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint: string;
  tone: "indigo" | "emerald" | "amber" | "rose";
}) {
  const tones = {
    indigo: "text-indigo-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    rose: "text-rose-400",
  };
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <span className={cn("text-[10px] font-bold uppercase tracking-wider", tones[tone])}>
        {label}
      </span>
      <p className="mt-2 text-3xl font-black tabular-nums text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-center">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm font-bold tabular-nums text-white">{value}</p>
    </div>
  );
}

export default AdminResearchView;
