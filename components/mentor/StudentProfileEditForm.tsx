"use client";

import React, { useMemo, useState } from "react";
import type { Student, StudentProfile } from "@/lib/types";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@/components/ui";
import { ShieldCheck, AlertCircle, FileText, XCircle } from "lucide-react";
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

function strNum(value: unknown): string {
  if (value == null || value === "") return "";
  return String(value);
}

function numOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const DONUT_COLORS = ["#818cf8", "#1e293b"];

export function StudentProfileEditForm({
  student,
  onSave,
  canEditName = true,
  isSaving = false,
  strengthScore,
}: StudentProfileEditFormProps) {
  const [savingSection, setSavingSection] = useState<"verify" | null>(null);
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
    <div className="w-full min-w-0 space-y-4 overflow-x-hidden">
      <h2 className="text-base font-semibold text-foreground">Student details</h2>

      <Card className="min-w-0 overflow-hidden">
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
          <div className="grid min-w-0 gap-6 lg:grid-cols-2 lg:gap-8">
            <div className="flex min-w-0 flex-col items-center gap-6 sm:flex-row">
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

            <div className="flex min-h-[10rem] min-w-0 flex-col rounded-xl border border-border bg-surface-muted/40 p-4">
              <div className="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                  Pending student changes
                </h4>
                {(pendingGpa || pendingDat) && (
                  <Button
                    type="button"
                    size="sm"
                    className="w-full sm:w-auto"
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
                      <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 sm:flex-row sm:items-start sm:justify-between">
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
                          className="w-full sm:w-auto"
                          disabled={busy}
                          onClick={() => verifyPending("gpa")}
                        >
                          Verify
                        </Button>
                      </div>
                    ) : null}

                    {pendingDat ? (
                      <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-foreground">DAT scores</p>
                            <Badge variant="warning">Needs verify</Badge>
                          </div>
                          <p className="mt-1 break-words text-xs text-muted-foreground">
                            {datType || "DAT"} · AA {datAa || "—"} · TS {datTs || "—"} · PAT{" "}
                            {datPat || "—"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="w-full sm:w-auto"
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
                        className="flex min-w-0 flex-col gap-3 rounded-lg border border-slate-700/80 bg-slate-950/40 p-3 sm:flex-row sm:items-start sm:justify-between"
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
                        <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto sm:shrink-0 sm:justify-end">
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

      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>Personal details</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <ProfileDetailsEditor
            student={student}
            mode="personal"
            canEditName={canEditName}
            embedded
          />
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden">
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
        <CardContent className="min-w-0">
          <ProfileDetailsEditor
            student={student}
            mode="academic"
            staffMode
            embedded
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default StudentProfileEditForm;
