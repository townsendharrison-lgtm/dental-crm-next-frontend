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
import { ProfileDetailsEditor } from "@/components/student/ProfileDetailsEditor";

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

type AppFormState = {
  zip_code: string;
  timezone: string;
  application_cycle: string;
  status: "Preparing" | "Applying" | "Interviewing";
  readiness: "GREEN" | "YELLOW" | "RED";
  progress: string;
  lor_required: string;
  lor_external_service: boolean;
  lor_external_collected: string;
};

type SectionKey = "staff_location" | "application";

const SECTION_FIELDS: Record<SectionKey, (keyof AppFormState)[]> = {
  staff_location: ["zip_code", "timezone"],
  application: [
    "status",
    "readiness",
    "progress",
    "application_cycle",
    "lor_required",
    "lor_external_service",
    "lor_external_collected",
  ],
};

function strNum(value: unknown): string {
  if (value == null || value === "") return "";
  return String(value);
}

function buildAppForm(student: Student): AppFormState {
  const p = student.profile;
  return {
    zip_code: student.zipCode ?? p?.zip_code ?? "",
    timezone: student.timezone ?? p?.timezone ?? "",
    application_cycle: student.applicationCycle ?? p?.application_cycle ?? "",
    status: (student.status as AppFormState["status"]) || p?.status || "Preparing",
    readiness: (student.readiness as AppFormState["readiness"]) || p?.readiness || "YELLOW",
    progress: strNum(student.progress ?? p?.progress),
    lor_required: strNum(student.lorRequired ?? p?.lor_required ?? 4),
    lor_external_service:
      student.lorExternalService ?? p?.lor_external_service ?? false,
    lor_external_collected: strNum(p?.lor_external_collected),
  };
}

function numOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickSection(form: AppFormState, section: SectionKey): Partial<AppFormState> {
  const out: Partial<AppFormState> = {};
  for (const key of SECTION_FIELDS[section]) {
    out[key] = form[key] as never;
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
  const [form, setForm] = useState<AppFormState>(() => buildAppForm(student));
  const [baseline, setBaseline] = useState<AppFormState>(() => buildAppForm(student));
  const [savingSection, setSavingSection] = useState<SectionKey | "verify" | null>(null);
  const [reviewingDocId, setReviewingDocId] = useState<string | null>(null);
  const { data: documents = [] } = useDocuments(student.id);
  const updateDocument = useUpdateDocument();

  const gpa = strNum(student.gpa ?? student.profile?.gpa);
  const datType = String(student.profile?.dat_type ?? "");
  const datAa = strNum(student.datAA ?? student.profile?.dat_aa);
  const datTs = strNum(student.datTS ?? student.profile?.dat_ts);
  const datPat = strNum(student.profile?.dat_pat);
  const datScore = strNum(student.datScore ?? student.profile?.dat_score);
  const gpaVerified = student.gpaVerified ?? student.profile?.gpa_verified ?? false;
  const datVerified = student.datVerified ?? student.profile?.dat_verified ?? false;

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

  const pendingGpa = gpa.trim() !== "" && numOrNull(gpa) != null && !gpaVerified;
  const pendingDat =
    (datScore.trim() !== "" || datAa.trim() !== "" || datTs.trim() !== "") && !datVerified;
  const pendingDocuments = useMemo(
    () => documents.filter((d) => d.status === "Pending Review"),
    [documents],
  );
  const pendingCount =
    (pendingGpa ? 1 : 0) + (pendingDat ? 1 : 0) + pendingDocuments.length;

  useEffect(() => {
    const next = buildAppForm(student);
    setForm(next);
    setBaseline(next);
  }, [student]);

  const isDirty = (section: SectionKey) => {
    const fields = SECTION_FIELDS[section];
    return fields.some((key) => form[key] !== baseline[key]);
  };

  const set =
    <K extends keyof AppFormState>(key: K) =>
    (value: AppFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    };

  const resetSection = (section: SectionKey) => {
    const patch = pickSection(baseline, section);
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const saveSection = async (section: SectionKey) => {
    const updates: StudentProfileUpdates =
      section === "staff_location"
        ? {
            zip_code: form.zip_code || null,
            timezone: form.timezone || null,
          }
        : {
            status: form.status,
            readiness: form.readiness,
            progress: numOrNull(form.progress) ?? 0,
            application_cycle: form.application_cycle || null,
            lor_required: numOrNull(form.lor_required) ?? 4,
            lor_external_service: form.lor_external_service,
            lor_external_collected: numOrNull(form.lor_external_collected),
          };

    setSavingSection(section);
    try {
      await onSave(updates);
      setBaseline((prev) => ({ ...prev, ...pickSection(form, section) }));
      toast.success("Section saved");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Failed to save section";
      toast.error(message);
    } finally {
      setSavingSection(null);
    }
  };

  const verifyPending = async (scope: "gpa" | "dat" | "all") => {
    setSavingSection("verify");
    try {
      const updates: StudentProfileUpdates = {
        gpa: numOrNull(gpa),
        dat_score: numOrNull(datScore),
        dat_aa: numOrNull(datAa),
        dat_ts: numOrNull(datTs),
      };
      if (scope === "gpa" || scope === "all") updates.gpa_verified = true;
      if (scope === "dat" || scope === "all") updates.dat_verified = true;

      await onSave(updates);
      toast.success(
        scope === "all"
          ? "GPA & DAT verified"
          : scope === "gpa"
            ? "GPA verified"
            : "DAT verified",
      );
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Failed to verify";
      toast.error(message);
    } finally {
      setSavingSection(null);
    }
  };

  const reviewDocument = async (docId: string, status: "Reviewed" | "Cancelled") => {
    setReviewingDocId(docId);
    try {
      await updateDocument.mutateAsync({ id: docId, updates: { status } });
      toast.success(status === "Reviewed" ? "Document verified" : "Document cancelled");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Failed to update document";
      toast.error(message);
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
                              {gpa}
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
                            {datType || "DAT"} · AA {datAa || "—"} · TS {datTs || "—"} · PAT{" "}
                            {datPat || "—"}
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
          <CardTitle>Personal details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileDetailsEditor
            student={student}
            mode="personal"
            canEditName={canEditName}
            embedded
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Academics & DAT</CardTitle>
            {(gpaVerified || datVerified) && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                <ShieldCheck className="h-3 w-3" />
                {gpaVerified && datVerified
                  ? "GPA & DAT verified"
                  : gpaVerified
                    ? "GPA verified"
                    : "DAT verified"}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ProfileDetailsEditor
            student={student}
            mode="academic"
            staffMode
            embedded
          />
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
                onChange={(v) => set("status")(v as AppFormState["status"])}
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
                onChange={(v) => set("readiness")(v as AppFormState["readiness"])}
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
            {form.lor_external_service && (
              <FormField label="External LORs collected">
                <Input
                  type="number"
                  min={0}
                  value={form.lor_external_collected}
                  onChange={(e) => set("lor_external_collected")(e.target.value)}
                />
              </FormField>
            )}
          </div>
          <SectionActions
            dirty={isDirty("application")}
            isSaving={busy && savingSection === "application"}
            onReset={() => resetSection("application")}
            onSave={() => void saveSection("application")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staff location</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="ZIP">
              <Input value={form.zip_code} onChange={(e) => set("zip_code")(e.target.value)} />
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
            <FormField label="Email" className="sm:col-span-2">
              <Input value={student.email} disabled />
            </FormField>
          </div>
          <SectionActions
            dirty={isDirty("staff_location")}
            isSaving={busy && savingSection === "staff_location"}
            onReset={() => resetSection("staff_location")}
            onSave={() => void saveSection("staff_location")}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default StudentProfileEditForm;
