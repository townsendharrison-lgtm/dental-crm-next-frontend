"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Student, StudentProfile } from "@/lib/types";
import {
  Button,
  Input,
  FormField,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  SelectMenu,
  Badge,
} from "@/components/ui";
import { Save, RotateCcw, ShieldCheck, AlertCircle, FileText, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useDocuments, useUpdateDocument } from "@/lib/hooks/useDocuments";

export type StudentProfileUpdates = Partial<
  StudentProfile & { name?: string; avatar?: string }
>;

interface StudentProfileEditFormProps {
  student: Student;
  onSave: (updates: StudentProfileUpdates) => void | Promise<void>;
  canEditName?: boolean;
  isSaving?: boolean;
  strengthScore?: number;
}

type FormState = {
  name: string;
  zip_code: string;
  state: string;
  country: string;
  timezone: string;
  gpa: string;
  dat_score: string;
  dat_aa: string;
  dat_ts: string;
  dat_verified: boolean;
  gpa_verified: boolean;
  is_reapplicant: boolean;
  application_cycle: string;
  status: "Preparing" | "Applying" | "Interviewing";
  readiness: "GREEN" | "YELLOW" | "RED";
  progress: string;
  ethnicity: string;
  gender: string;
  age: string;
  undergrad_institution: string;
  undergrad_degree: string;
  undergrad_grad_year: string;
  lor_required: string;
  lor_external_service: boolean;
  post_bac_enabled: boolean;
  post_bac_institution: string;
  post_bac_degree: string;
  post_bac_year: string;
  post_bac_strength: string;
  masters_enabled: boolean;
  masters_institution: string;
  masters_degree: string;
  masters_year: string;
  masters_strength: string;
};

type SectionKey = "identity" | "academics" | "application" | "demographics";

const SECTION_FIELDS: Record<SectionKey, (keyof FormState)[]> = {
  identity: ["name", "zip_code", "state", "country", "timezone"],
  academics: [
    "gpa",
    "dat_score",
    "dat_aa",
    "dat_ts",
    "undergrad_institution",
    "undergrad_degree",
    "undergrad_grad_year",
    "post_bac_enabled",
    "post_bac_institution",
    "post_bac_degree",
    "post_bac_year",
    "post_bac_strength",
    "masters_enabled",
    "masters_institution",
    "masters_degree",
    "masters_year",
    "masters_strength",
  ],
  application: [
    "status",
    "readiness",
    "progress",
    "application_cycle",
    "is_reapplicant",
    "lor_required",
    "lor_external_service",
  ],
  demographics: ["ethnicity", "gender", "age"],
};

function buildForm(student: Student): FormState {
  const p = student.profile;
  const postBac =
    typeof student.postBac === "object" && student.postBac
      ? student.postBac
      : p?.post_bac;
  const masters =
    typeof student.masters === "object" && student.masters
      ? student.masters
      : p?.masters;

  return {
    name: student.name || "",
    zip_code: student.zipCode ?? p?.zip_code ?? "",
    state: student.state ?? p?.state ?? "",
    country: student.country ?? p?.country ?? "",
    timezone: student.timezone ?? p?.timezone ?? "",
    gpa: String(student.gpa ?? p?.gpa ?? ""),
    dat_score: String(student.datScore ?? p?.dat_score ?? ""),
    dat_aa: String(student.datAA ?? p?.dat_aa ?? ""),
    dat_ts: String(student.datTS ?? p?.dat_ts ?? ""),
    dat_verified: student.datVerified ?? p?.dat_verified ?? false,
    gpa_verified: student.gpaVerified ?? p?.gpa_verified ?? false,
    is_reapplicant: student.isReapplicant ?? p?.is_reapplicant ?? false,
    application_cycle: student.applicationCycle ?? p?.application_cycle ?? "",
    status: (student.status as FormState["status"]) || p?.status || "Preparing",
    readiness: (student.readiness as FormState["readiness"]) || p?.readiness || "YELLOW",
    progress: String(student.progress ?? p?.progress ?? ""),
    ethnicity: student.ethnicity ?? p?.ethnicity ?? "",
    gender: normalizeGender(student.gender ?? p?.gender),
    age: String(student.age ?? p?.age ?? ""),
    undergrad_institution:
      student.undergradInstitution ?? p?.undergrad_institution ?? "",
    undergrad_degree: student.undergradDegree ?? p?.undergrad_degree ?? "",
    undergrad_grad_year:
      student.undergradGradYear ?? p?.undergrad_grad_year ?? "",
    lor_required: String(student.lorRequired ?? p?.lor_required ?? 4),
    lor_external_service:
      student.lorExternalService ?? p?.lor_external_service ?? false,
    post_bac_enabled: Boolean(postBac?.enabled),
    post_bac_institution: postBac?.institution ?? "",
    post_bac_degree: postBac?.degreeType ?? "",
    post_bac_year: postBac?.year ?? "",
    post_bac_strength: String(postBac?.strengthScore ?? ""),
    masters_enabled: Boolean(masters?.enabled),
    masters_institution: masters?.institution ?? "",
    masters_degree: masters?.degreeType ?? "",
    masters_year: masters?.year ?? "",
    masters_strength: String(masters?.strengthScore ?? ""),
  };
}

function numOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeGender(value?: string | null): string {
  if (!value) return "Prefer not to say";
  const lower = value.trim().toLowerCase();
  if (lower === "male" || lower === "m") return "Male";
  if (lower === "female" || lower === "f") return "Female";
  if (value === "Male" || value === "Female" || value === "Prefer not to say") return value;
  if (lower.includes("prefer")) return "Prefer not to say";
  return "Prefer not to say";
}

function pickSection(form: FormState, section: SectionKey): Partial<FormState> {
  const out: Partial<FormState> = {};
  for (const key of SECTION_FIELDS[section]) {
    (out as any)[key] = form[key];
  }
  return out;
}

const YES_NO = [
  { value: "no", label: "No" },
  { value: "yes", label: "Yes" },
];

const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Phoenix", label: "Mountain Time - AZ" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time" },
  { value: "Pacific/Honolulu", label: "Hawaii Time" },
  { value: "UTC", label: "UTC" },
];

const DONUT_COLORS = ["#818cf8", "#1e293b"];

function SectionActions({
  dirty,
  isSaving,
  onReset,
  onSave,
}: {
  dirty: boolean;
  isSaving: boolean;
  onReset: () => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!dirty || isSaving}
        leftIcon={<RotateCcw className="h-4 w-4" />}
        onClick={onReset}
      >
        Reset
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={!dirty || isSaving}
        isLoading={isSaving}
        leftIcon={<Save className="h-4 w-4" />}
        onClick={onSave}
      >
        Save
      </Button>
    </div>
  );
}

export function StudentProfileEditForm({
  student,
  onSave,
  canEditName = true,
  isSaving = false,
  strengthScore,
}: StudentProfileEditFormProps) {
  const [form, setForm] = useState<FormState>(() => buildForm(student));
  const [baseline, setBaseline] = useState<FormState>(() => buildForm(student));
  const [savingSection, setSavingSection] = useState<SectionKey | "verify" | null>(null);
  const [reviewingDocId, setReviewingDocId] = useState<string | null>(null);
  const { data: documents = [] } = useDocuments(student.id);
  const updateDocument = useUpdateDocument();

  const displayStrength = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        strengthScore ?? student.strengthScore ?? student.profile?.strength_score ?? 0,
      ),
    ),
  );

  const donutData = useMemo(
    () => [
      { name: "score", value: displayStrength },
      { name: "rest", value: Math.max(0, 100 - displayStrength) },
    ],
    [displayStrength],
  );

  const pendingGpa =
    form.gpa.trim() !== "" && numOrNull(form.gpa) != null && !form.gpa_verified;
  const pendingDat =
    (form.dat_score.trim() !== "" || form.dat_aa.trim() !== "" || form.dat_ts.trim() !== "") &&
    !form.dat_verified;
  const pendingDocuments = useMemo(
    () => documents.filter((d) => d.status === "Pending Review"),
    [documents],
  );
  const pendingCount =
    (pendingGpa ? 1 : 0) + (pendingDat ? 1 : 0) + pendingDocuments.length;

  useEffect(() => {
    const next = buildForm(student);
    setForm(next);
    setBaseline(next);
  }, [student]);

  const isDirty = (section: SectionKey) => {
    const fields = SECTION_FIELDS[section];
    return fields.some((key) => form[key] !== baseline[key]);
  };

  const set =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    };

  const resetSection = (section: SectionKey) => {
    const patch = pickSection(baseline, section);
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const buildAcademicsUpdates = (verify: boolean): StudentProfileUpdates => {
    const gpaChanged = form.gpa !== baseline.gpa;
    const datChanged =
      form.dat_score !== baseline.dat_score ||
      form.dat_aa !== baseline.dat_aa ||
      form.dat_ts !== baseline.dat_ts;

    return {
      gpa: numOrNull(form.gpa),
      dat_score: numOrNull(form.dat_score),
      dat_aa: numOrNull(form.dat_aa),
      dat_ts: numOrNull(form.dat_ts),
      undergrad_institution: form.undergrad_institution || null,
      undergrad_degree: form.undergrad_degree || null,
      undergrad_grad_year: form.undergrad_grad_year || null,
      post_bac: {
        enabled: form.post_bac_enabled,
        institution: form.post_bac_institution,
        degreeType: form.post_bac_degree,
        year: form.post_bac_year,
        strengthScore: numOrNull(form.post_bac_strength) ?? 0,
      },
      masters: {
        enabled: form.masters_enabled,
        institution: form.masters_institution,
        degreeType: form.masters_degree,
        year: form.masters_year,
        strengthScore: numOrNull(form.masters_strength) ?? 0,
      },
      ...(verify
        ? { gpa_verified: true, dat_verified: true }
        : {
            ...(gpaChanged ? { gpa_verified: false } : {}),
            ...(datChanged ? { dat_verified: false } : {}),
          }),
    };
  };

  const buildSectionUpdates = (section: SectionKey): StudentProfileUpdates => {
    switch (section) {
      case "identity": {
        const updates: StudentProfileUpdates = {
          zip_code: form.zip_code || null,
          state: form.state || null,
          country: form.country || null,
          timezone: form.timezone || null,
        };
        if (canEditName && form.name.trim()) {
          updates.name = form.name.trim();
        }
        return updates;
      }
      case "academics":
        return buildAcademicsUpdates(false);
      case "application":
        return {
          status: form.status,
          readiness: form.readiness,
          progress: numOrNull(form.progress) ?? 0,
          application_cycle: form.application_cycle || null,
          is_reapplicant: form.is_reapplicant,
          lor_required: numOrNull(form.lor_required) ?? 4,
          lor_external_service: form.lor_external_service,
        };
      case "demographics":
        return {
          ethnicity: form.ethnicity || null,
          gender: form.gender || null,
          age: numOrNull(form.age),
        };
      default:
        return {};
    }
  };

  const saveSection = async (section: SectionKey, verify = false) => {
    const updates =
      section === "academics" && verify
        ? buildAcademicsUpdates(true)
        : buildSectionUpdates(section);

    setSavingSection(section);
    try {
      await onSave(updates);
      const nextBaseline = { ...form };
      if (verify) {
        nextBaseline.gpa_verified = true;
        nextBaseline.dat_verified = true;
        setForm((prev) => ({ ...prev, gpa_verified: true, dat_verified: true }));
      } else if (section === "academics") {
        const gpaChanged = form.gpa !== baseline.gpa;
        const datChanged =
          form.dat_score !== baseline.dat_score ||
          form.dat_aa !== baseline.dat_aa ||
          form.dat_ts !== baseline.dat_ts;
        if (gpaChanged) nextBaseline.gpa_verified = false;
        if (datChanged) nextBaseline.dat_verified = false;
        setForm((prev) => ({
          ...prev,
          ...(gpaChanged ? { gpa_verified: false } : {}),
          ...(datChanged ? { dat_verified: false } : {}),
        }));
      }
      setBaseline((prev) => {
        const patch = pickSection(nextBaseline, section);
        return {
          ...prev,
          ...patch,
          ...(verify
            ? { gpa_verified: true, dat_verified: true }
            : section === "academics"
              ? {
                  gpa_verified: nextBaseline.gpa_verified,
                  dat_verified: nextBaseline.dat_verified,
                }
              : {}),
        };
      });
      toast.success(verify ? "Academics verified & saved" : "Section saved");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save section");
    } finally {
      setSavingSection(null);
    }
  };

  const verifyPending = async (scope: "gpa" | "dat" | "all") => {
    setSavingSection("verify");
    try {
      const updates: StudentProfileUpdates = {
        gpa: numOrNull(form.gpa),
        dat_score: numOrNull(form.dat_score),
        dat_aa: numOrNull(form.dat_aa),
        dat_ts: numOrNull(form.dat_ts),
      };
      if (scope === "gpa" || scope === "all") updates.gpa_verified = true;
      if (scope === "dat" || scope === "all") updates.dat_verified = true;

      await onSave(updates);
      setForm((prev) => ({
        ...prev,
        ...(scope === "gpa" || scope === "all" ? { gpa_verified: true } : {}),
        ...(scope === "dat" || scope === "all" ? { dat_verified: true } : {}),
      }));
      setBaseline((prev) => ({
        ...prev,
        gpa: form.gpa,
        dat_score: form.dat_score,
        dat_aa: form.dat_aa,
        dat_ts: form.dat_ts,
        ...(scope === "gpa" || scope === "all" ? { gpa_verified: true } : {}),
        ...(scope === "dat" || scope === "all" ? { dat_verified: true } : {}),
      }));
      toast.success(
        scope === "all"
          ? "GPA & DAT verified"
          : scope === "gpa"
            ? "GPA verified"
            : "DAT verified",
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to verify");
    } finally {
      setSavingSection(null);
    }
  };

  const reviewDocument = async (docId: string, status: "Reviewed" | "Cancelled") => {
    setReviewingDocId(docId);
    try {
      await updateDocument.mutateAsync({ id: docId, updates: { status } });
      toast.success(status === "Reviewed" ? "Document verified" : "Document cancelled");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update document");
    } finally {
      setReviewingDocId(null);
    }
  };

  const busy = isSaving || savingSection !== null || reviewingDocId !== null;

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-foreground">Student details</h2>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Strength score</CardTitle>
            {pendingCount > 0 ? (
              <Badge variant="warning">{pendingCount} pending review</Badge>
            ) : (
              <Badge variant="success">
                <ShieldCheck className="h-3 w-3" /> All clear
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative h-36 w-36 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={64}
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={entry.name} fill={DONUT_COLORS[index]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold tabular-nums text-foreground">
                    {displayStrength}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    / 100
                  </span>
                </div>
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <p className="text-sm font-medium text-foreground">Current competitiveness</p>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  Auto-calculated from verified GPA &amp; DAT, experience hours, documents, and
                  application readiness. Unverified score changes do not affect this total until you
                  use Verify &amp; Save.
                </p>
              </div>
            </div>

            <div className="flex min-h-[10rem] flex-col rounded-xl border border-border bg-surface-muted/40 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                  Pending student changes
                </h4>
                {(pendingGpa || pendingDat) && (
                  <Button
                    type="button"
                    size="sm"
                    leftIcon={<ShieldCheck className="h-3.5 w-3.5" />}
                    disabled={busy}
                    isLoading={busy && savingSection === "verify"}
                    onClick={() =>
                      verifyPending(pendingGpa && pendingDat ? "all" : pendingGpa ? "gpa" : "dat")
                    }
                  >
                    {pendingGpa && pendingDat ? "Verify all scores" : "Verify scores"}
                  </Button>
                )}
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                {pendingCount === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No unverified GPA/DAT or documents awaiting review.
                  </p>
                ) : (
                  <>
                    {pendingGpa ? (
                      <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-foreground">GPA update</p>
                            <Badge variant="warning">Needs verify</Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Reported GPA:{" "}
                            <span className="font-semibold tabular-nums text-foreground">
                              {form.gpa}
                            </span>
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => verifyPending("gpa")}
                        >
                          Verify
                        </Button>
                      </div>
                    ) : null}

                    {pendingDat ? (
                      <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-foreground">DAT scores</p>
                            <Badge variant="warning">Needs verify</Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Overall {form.dat_score || "—"} · AA {form.dat_aa || "—"} · TS{" "}
                            {form.dat_ts || "—"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => verifyPending("dat")}
                        >
                          Verify
                        </Button>
                      </div>
                    ) : null}

                    {pendingDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-slate-700/80 bg-slate-950/40 p-3"
                      >
                        <div className="flex min-w-0 items-start gap-2">
                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-medium text-foreground">
                                {doc.title}
                              </p>
                              <Badge variant="warning">Pending review</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{doc.type}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={busy}
                            isLoading={reviewingDocId === doc.id}
                            leftIcon={
                              reviewingDocId !== doc.id ? (
                                <ShieldCheck className="h-3.5 w-3.5" />
                              ) : undefined
                            }
                            onClick={() => void reviewDocument(doc.id, "Reviewed")}
                          >
                            Verify
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-rose-300 hover:text-rose-200"
                            disabled={busy}
                            leftIcon={<XCircle className="h-3.5 w-3.5" />}
                            onClick={() => void reviewDocument(doc.id, "Cancelled")}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identity & contact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Full name" className="sm:col-span-2 lg:col-span-1">
              <Input
                value={form.name}
                disabled={!canEditName}
                onChange={(e) => set("name")(e.target.value)}
              />
            </FormField>
            <FormField label="Email">
              <Input value={student.email} disabled />
            </FormField>
            <FormField label="State">
              <Input value={form.state} onChange={(e) => set("state")(e.target.value)} />
            </FormField>
            <FormField label="ZIP">
              <Input value={form.zip_code} onChange={(e) => set("zip_code")(e.target.value)} />
            </FormField>
            <FormField label="Country">
              <Input value={form.country} onChange={(e) => set("country")(e.target.value)} />
            </FormField>
            <FormField label="Timezone">
              <SelectMenu
                value={form.timezone || "America/New_York"}
                onChange={(timezone) => set("timezone")(timezone)}
                options={
                  form.timezone && !TIMEZONE_OPTIONS.some((o) => o.value === form.timezone)
                    ? [{ value: form.timezone, label: form.timezone }, ...TIMEZONE_OPTIONS]
                    : TIMEZONE_OPTIONS
                }
                placeholder="Select timezone…"
              />
            </FormField>
          </div>
          <SectionActions
            dirty={isDirty("identity")}
            isSaving={busy && savingSection === "identity"}
            onReset={() => resetSection("identity")}
            onSave={() => saveSection("identity")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Academics & DAT</CardTitle>
            {(form.gpa_verified || form.dat_verified) && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                <ShieldCheck className="h-3 w-3" />
                {form.gpa_verified && form.dat_verified
                  ? "GPA & DAT verified"
                  : form.gpa_verified
                    ? "GPA verified"
                    : "DAT verified"}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="GPA">
              <Input
                type="number"
                step="0.01"
                value={form.gpa}
                onChange={(e) => set("gpa")(e.target.value)}
              />
            </FormField>
            <FormField label="DAT overall">
              <Input
                type="number"
                step="0.1"
                value={form.dat_score}
                onChange={(e) => set("dat_score")(e.target.value)}
              />
            </FormField>
            <FormField label="DAT AA">
              <Input
                type="number"
                step="0.1"
                value={form.dat_aa}
                onChange={(e) => set("dat_aa")(e.target.value)}
              />
            </FormField>
            <FormField label="DAT TS">
              <Input
                type="number"
                step="0.1"
                value={form.dat_ts}
                onChange={(e) => set("dat_ts")(e.target.value)}
              />
            </FormField>
            <FormField label="Undergrad school" className="sm:col-span-2">
              <Input
                value={form.undergrad_institution}
                onChange={(e) => set("undergrad_institution")(e.target.value)}
              />
            </FormField>
            <FormField label="Degree">
              <Input
                value={form.undergrad_degree}
                onChange={(e) => set("undergrad_degree")(e.target.value)}
              />
            </FormField>
            <FormField label="Grad year">
              <Input
                value={form.undergrad_grad_year}
                onChange={(e) => set("undergrad_grad_year")(e.target.value)}
              />
            </FormField>
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Post-baccalaureate
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="Enabled">
                <SelectMenu
                  value={form.post_bac_enabled ? "yes" : "no"}
                  onChange={(v) => set("post_bac_enabled")(v === "yes")}
                  options={YES_NO}
                />
              </FormField>
              <FormField label="Institution">
                <Input
                  value={form.post_bac_institution}
                  disabled={!form.post_bac_enabled}
                  onChange={(e) => set("post_bac_institution")(e.target.value)}
                />
              </FormField>
              <FormField label="Degree type">
                <Input
                  value={form.post_bac_degree}
                  disabled={!form.post_bac_enabled}
                  onChange={(e) => set("post_bac_degree")(e.target.value)}
                />
              </FormField>
              <FormField label="Year">
                <Input
                  value={form.post_bac_year}
                  disabled={!form.post_bac_enabled}
                  onChange={(e) => set("post_bac_year")(e.target.value)}
                />
              </FormField>
              <FormField label="GPA">
                <Input
                  type="number"
                  step="0.01"
                  value={form.post_bac_strength}
                  disabled={!form.post_bac_enabled}
                  onChange={(e) => set("post_bac_strength")(e.target.value)}
                />
              </FormField>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Master&apos;s
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="Enabled">
                <SelectMenu
                  value={form.masters_enabled ? "yes" : "no"}
                  onChange={(v) => set("masters_enabled")(v === "yes")}
                  options={YES_NO}
                />
              </FormField>
              <FormField label="Institution">
                <Input
                  value={form.masters_institution}
                  disabled={!form.masters_enabled}
                  onChange={(e) => set("masters_institution")(e.target.value)}
                />
              </FormField>
              <FormField label="Degree type">
                <Input
                  value={form.masters_degree}
                  disabled={!form.masters_enabled}
                  onChange={(e) => set("masters_degree")(e.target.value)}
                />
              </FormField>
              <FormField label="Year">
                <Input
                  value={form.masters_year}
                  disabled={!form.masters_enabled}
                  onChange={(e) => set("masters_year")(e.target.value)}
                />
              </FormField>
              <FormField label="GPA">
                <Input
                  type="number"
                  step="0.01"
                  value={form.masters_strength}
                  disabled={!form.masters_enabled}
                  onChange={(e) => set("masters_strength")(e.target.value)}
                />
              </FormField>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!isDirty("academics") || busy}
              leftIcon={<RotateCcw className="h-4 w-4" />}
              onClick={() => resetSection("academics")}
            >
              Reset
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!isDirty("academics") || busy}
              isLoading={busy && savingSection === "academics"}
              leftIcon={<Save className="h-4 w-4" />}
              onClick={() => saveSection("academics", false)}
            >
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={busy}
              isLoading={busy && savingSection === "academics"}
              leftIcon={<ShieldCheck className="h-4 w-4" />}
              onClick={() => saveSection("academics", true)}
            >
              Verify & Save
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Application status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Status">
              <SelectMenu
                value={form.status}
                onChange={(v) => set("status")(v as FormState["status"])}
                options={[
                  { value: "Preparing", label: "Preparing" },
                  { value: "Applying", label: "Applying" },
                  { value: "Interviewing", label: "Interviewing" },
                ]}
              />
            </FormField>
            <FormField label="Readiness">
              <SelectMenu
                value={form.readiness}
                onChange={(v) => set("readiness")(v as FormState["readiness"])}
                options={[
                  { value: "GREEN", label: "Green" },
                  { value: "YELLOW", label: "Yellow" },
                  { value: "RED", label: "Red" },
                ]}
              />
            </FormField>
            <FormField label="Progress %">
              <Input
                type="number"
                value={form.progress}
                onChange={(e) => set("progress")(e.target.value)}
              />
            </FormField>
            <FormField label="Application cycle">
              <Input
                value={form.application_cycle}
                onChange={(e) => set("application_cycle")(e.target.value)}
              />
            </FormField>
            <FormField label="Applicant type">
              <SelectMenu
                value={form.is_reapplicant ? "re" : "first"}
                onChange={(v) => set("is_reapplicant")(v === "re")}
                options={[
                  { value: "first", label: "First-time" },
                  { value: "re", label: "Re-applicant" },
                ]}
              />
            </FormField>
            <FormField label="LORs required">
              <Input
                type="number"
                value={form.lor_required}
                onChange={(e) => set("lor_required")(e.target.value)}
              />
            </FormField>
            <FormField label="External LOR">
              <SelectMenu
                value={form.lor_external_service ? "yes" : "no"}
                onChange={(v) => set("lor_external_service")(v === "yes")}
                options={YES_NO}
              />
            </FormField>
          </div>
          <SectionActions
            dirty={isDirty("application")}
            isSaving={busy && savingSection === "application"}
            onReset={() => resetSection("application")}
            onSave={() => saveSection("application")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Demographics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Ethnicity">
              <Input value={form.ethnicity} onChange={(e) => set("ethnicity")(e.target.value)} />
            </FormField>
            <FormField label="Gender">
              <SelectMenu
                value={form.gender || "Prefer not to say"}
                onChange={(gender) => set("gender")(gender)}
                options={[
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" },
                  { value: "Prefer not to say", label: "Prefer not to say" },
                ]}
                placeholder="Select gender…"
              />
            </FormField>
            <FormField label="Age">
              <Input type="number" value={form.age} onChange={(e) => set("age")(e.target.value)} />
            </FormField>
          </div>
          <SectionActions
            dirty={isDirty("demographics")}
            isSaving={busy && savingSection === "demographics"}
            onReset={() => resetSection("demographics")}
            onSave={() => saveSection("demographics")}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default StudentProfileEditForm;
