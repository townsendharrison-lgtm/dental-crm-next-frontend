"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import type { ApplicantType, DatType, Student } from "@/lib/types";
import {
  ADDITIONAL_SCHOOLING_OPTIONS,
  AMERICAN_DAT_FIELDS,
  APPLICANT_TYPES,
  CANADIAN_DAT_FIELDS,
  DAT_SCORE_MAX,
  DAT_TYPES,
  PROFILE_COUNTRIES,
  PROFILE_ETHNICITIES,
  PROFILE_GENDERS,
  REAPPLICANT_OUTCOMES,
  US_STATES,
  isUnitedStates,
  parseDatScore,
  type ConsideringSchoolEntry,
  type ReapplicantSchoolEntry,
} from "@/lib/profile/profileOptions";
import { studentsApi } from "@/lib/api/students";
import { documentsApi } from "@/lib/api/documents";
import { queryKeys } from "@/lib/api/queryKeys";
import { SchoolMultiPicker } from "@/components/student/SchoolMultiPicker";
import {
  Button,
  FormField,
  Input,
  Modal,
  SelectMenu,
} from "@/components/ui";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

type DatFieldKey =
  | "dat_aa"
  | "dat_ts"
  | "dat_pat"
  | "dat_bio"
  | "dat_gc"
  | "dat_oc"
  | "dat_rc"
  | "dat_qr"
  | "dat_sns"
  | "dat_mdt";

type FormState = {
  name: string;
  country: string;
  state: string;
  ethnicity: string;
  gender: string;
  age: string;
  gpa: string;
  sgpa: string;
  major: string;
  applicant_type: string;
  took_online_classes: string;
  took_cc_classes: string;
  additional_schooling: string[];
  additional_schooling_other: string;
  post_bac_gpa: string;
  masters_gpa: string;
  dat_type: string;
  dat_scores: Record<DatFieldKey, string>;
  considering_schools: ConsideringSchoolEntry[];
  reapplicant_schools: ReapplicantSchoolEntry[];
  previous_application_doc_id: string | null;
};

function emptyDatScores(): Record<DatFieldKey, string> {
  return {
    dat_aa: "",
    dat_ts: "",
    dat_pat: "",
    dat_bio: "",
    dat_gc: "",
    dat_oc: "",
    dat_rc: "",
    dat_qr: "",
    dat_sns: "",
    dat_mdt: "",
  };
}

function profileNum(v: unknown): string {
  return v != null && v !== "" ? String(v) : "";
}

function buildForm(student: Student): FormState {
  const p = student.profile;
  const additional = Array.isArray(p?.additional_schooling)
    ? [...(p!.additional_schooling as string[])]
    : [
        ...(p?.post_bac?.enabled ? ["POST_BAC"] : []),
        ...(p?.masters?.enabled ? ["MASTERS"] : []),
      ];

  const datScores = emptyDatScores();
  (Object.keys(datScores) as DatFieldKey[]).forEach((key) => {
    const fromProfile = (p as Record<string, unknown> | null | undefined)?.[key];
    if (fromProfile != null) datScores[key] = String(fromProfile);
  });
  if (!datScores.dat_aa) datScores.dat_aa = profileNum(p?.dat_aa ?? student.datAA);
  if (!datScores.dat_ts) datScores.dat_ts = profileNum(p?.dat_ts ?? student.datTS);

  return {
    name: student.name || "",
    country: String(p?.country ?? student.country ?? ""),
    state: String(p?.state ?? student.state ?? ""),
    ethnicity: String(p?.ethnicity ?? student.ethnicity ?? ""),
    gender: String(p?.gender ?? student.gender ?? ""),
    age: profileNum(p?.age ?? student.age),
    gpa: profileNum(p?.gpa ?? student.gpa),
    sgpa: profileNum(p?.sgpa),
    major: String(p?.major ?? ""),
    applicant_type:
      p?.applicant_type ||
      (p?.is_reapplicant || student.isReapplicant ? "REAPPLICANT" : ""),
    took_online_classes:
      p?.took_online_classes == null ? "" : p.took_online_classes ? "yes" : "no",
    took_cc_classes: p?.took_cc_classes == null ? "" : p.took_cc_classes ? "yes" : "no",
    additional_schooling: additional,
    additional_schooling_other: String(p?.additional_schooling_other ?? ""),
    post_bac_gpa: profileNum(p?.post_bac?.gpa),
    masters_gpa: profileNum(p?.masters?.gpa),
    dat_type: String(p?.dat_type ?? ""),
    dat_scores: datScores,
    considering_schools: Array.isArray(p?.considering_schools)
      ? (p!.considering_schools as ConsideringSchoolEntry[])
      : [],
    reapplicant_schools: Array.isArray(p?.reapplicant_schools)
      ? (p!.reapplicant_schools as ReapplicantSchoolEntry[])
      : [],
    previous_application_doc_id: p?.previous_application_doc_id ?? null,
  };
}

function yesNo(v: string): boolean | null {
  if (v === "yes") return true;
  if (v === "no") return false;
  return null;
}

interface ProfileDetailsEditModalProps {
  open: boolean;
  student: Student;
  onClose: () => void;
}

export function ProfileDetailsEditModal({
  open,
  student,
  onClose,
}: ProfileDetailsEditModalProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => buildForm(student));
  const [saving, setSaving] = useState(false);
  const [prevAppFile, setPrevAppFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      setForm(buildForm(student));
      setPrevAppFile(null);
    }
  }, [open, student]);

  const showState = isUnitedStates(form.country);
  const isReapplicant = form.applicant_type === "REAPPLICANT";
  const datFields = useMemo(() => {
    if (form.dat_type === "AMERICAN") return AMERICAN_DAT_FIELDS;
    if (form.dat_type === "CANADIAN") return CANADIAN_DAT_FIELDS;
    return [];
  }, [form.dat_type]);

  const toggleAdditional = (value: string) => {
    setForm((f) => {
      const has = f.additional_schooling.includes(value);
      return {
        ...f,
        additional_schooling: has
          ? f.additional_schooling.filter((v) => v !== value)
          : [...f.additional_schooling, value],
      };
    });
  };

  const setDatScore = (key: DatFieldKey, value: string) => {
    setForm((f) => ({
      ...f,
      dat_scores: { ...f.dat_scores, [key]: value },
    }));
  };

  const syncReapplicantFromPicker = (schools: ConsideringSchoolEntry[]) => {
    setForm((f) => {
      const byId = new Map(f.reapplicant_schools.map((s) => [s.schoolId, s]));
      return {
        ...f,
        reapplicant_schools: schools.map((s) => ({
          schoolId: s.id,
          schoolName: s.name,
          outcomes: byId.get(s.id)?.outcomes || [],
        })),
      };
    });
  };

  const toggleOutcome = (schoolId: string, outcome: string) => {
    setForm((f) => ({
      ...f,
      reapplicant_schools: f.reapplicant_schools.map((s) => {
        if (s.schoolId !== schoolId) return s;
        const has = s.outcomes.includes(outcome);
        return {
          ...s,
          outcomes: has
            ? s.outcomes.filter((o) => o !== outcome)
            : [...s.outcomes, outcome],
        };
      }),
    }));
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return "Name is required";

    const ageRaw = form.age.trim();
    if (ageRaw) {
      const age = Number(ageRaw);
      if (!Number.isFinite(age) || age < 0 || age > 120) return "Enter a valid age";
    }

    for (const [label, raw] of [
      ["GPA", form.gpa],
      ["sGPA", form.sgpa],
      ["Post-Bac GPA", form.post_bac_gpa],
      ["Masters GPA", form.masters_gpa],
    ] as const) {
      if (!raw.trim()) continue;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 4.5) {
        return `${label} should be between 0 and 4.5`;
      }
    }

    if (showState && !form.state) {
      return "Select your state";
    }

    if (form.additional_schooling.includes("OTHER") && !form.additional_schooling_other.trim()) {
      return "Please describe your additional schooling";
    }

    if (form.additional_schooling.includes("POST_BAC") && !form.post_bac_gpa.trim()) {
      return "Enter your Post-Bac Program GPA";
    }
    if (form.additional_schooling.includes("MASTERS") && !form.masters_gpa.trim()) {
      return "Enter your Masters GPA";
    }

    if (isReapplicant) {
      if (form.reapplicant_schools.length === 0) {
        return "Select the schools you previously applied to";
      }
      for (const s of form.reapplicant_schools) {
        if (s.outcomes.length === 0) {
          return `Select at least one outcome for ${s.schoolName}`;
        }
      }
      if (!form.previous_application_doc_id && !prevAppFile) {
        return "Upload your previous application";
      }
    }

    if (form.dat_type === "AMERICAN" || form.dat_type === "CANADIAN") {
      for (const field of datFields) {
        const optional = field.key === "dat_mdt";
        const raw = form.dat_scores[field.key as DatFieldKey]?.trim() || "";
        if (!raw) {
          if (optional) continue;
          return `Enter ${field.label}`;
        }
        const n = parseDatScore(raw);
        if (!Number.isFinite(n) || (n as number) < 0 || (n as number) > DAT_SCORE_MAX) {
          return `${field.label} must be between 0 and ${DAT_SCORE_MAX}`;
        }
      }
    }

    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    try {
      let previousDocId = form.previous_application_doc_id;

      if (prevAppFile) {
        const uploaded = await documentsApi.upload(
          prevAppFile,
          "Previous Application",
          "Previous Application",
          student.id,
        );
        previousDocId = uploaded.id;
      }

      const hasPostBac = form.additional_schooling.includes("POST_BAC");
      const hasMasters = form.additional_schooling.includes("MASTERS");
      const existingPost = student.profile?.post_bac;
      const existingMasters = student.profile?.masters;

      const datPayload: Record<string, number | null> = {
        dat_aa: null,
        dat_ts: null,
        dat_pat: null,
        dat_bio: null,
        dat_gc: null,
        dat_oc: null,
        dat_rc: null,
        dat_qr: null,
        dat_sns: null,
        dat_mdt: null,
      };

      if (form.dat_type === "AMERICAN" || form.dat_type === "CANADIAN") {
        for (const field of datFields) {
          const key = field.key as DatFieldKey;
          const raw = form.dat_scores[key]?.trim() || "";
          datPayload[key] = raw === "" ? null : Number(raw);
        }
      }

      const ageRaw = form.age.trim();
      const gpaRaw = form.gpa.trim();
      const sgpaRaw = form.sgpa.trim();

      await studentsApi.update(student.id, {
        name: form.name.trim(),
        country: form.country || null,
        state: showState ? form.state || null : null,
        ethnicity: form.ethnicity || null,
        gender: form.gender || null,
        age: ageRaw === "" ? null : Number(ageRaw),
        gpa: gpaRaw === "" ? null : Number(gpaRaw),
        sgpa: sgpaRaw === "" ? null : Number(sgpaRaw),
        major: form.major.trim() || null,
        applicant_type: (form.applicant_type || null) as ApplicantType | null,
        is_reapplicant: form.applicant_type === "REAPPLICANT",
        took_online_classes: yesNo(form.took_online_classes),
        took_cc_classes: yesNo(form.took_cc_classes),
        additional_schooling: form.additional_schooling,
        additional_schooling_other: form.additional_schooling.includes("OTHER")
          ? form.additional_schooling_other.trim()
          : null,
        post_bac: {
          enabled: hasPostBac,
          institution: existingPost?.institution || "",
          strengthScore: existingPost?.strengthScore || 0,
          degreeType: existingPost?.degreeType || "",
          year: existingPost?.year || "",
          gpa: hasPostBac && form.post_bac_gpa.trim() ? Number(form.post_bac_gpa) : null,
        },
        masters: {
          enabled: hasMasters,
          institution: existingMasters?.institution || "",
          strengthScore: existingMasters?.strengthScore || 0,
          degreeType: existingMasters?.degreeType || "",
          year: existingMasters?.year || "",
          gpa: hasMasters && form.masters_gpa.trim() ? Number(form.masters_gpa) : null,
        },
        dat_type: (form.dat_type || null) as DatType | null,
        ...datPayload,
        considering_schools: form.considering_schools,
        reapplicant_schools: isReapplicant ? form.reapplicant_schools : [],
        previous_application_doc_id: isReapplicant ? previousDocId : null,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(student.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.students.strengthHistory(student.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.students.datHistory(student.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.documents.all(student.id) }),
      ]);

      toast.success("Profile updated");
      onClose();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Failed to update profile";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const reapplicantPickerValue: ConsideringSchoolEntry[] = form.reapplicant_schools.map(
    (s) => ({
      id: s.schoolId,
      name: s.schoolName,
    }),
  );

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!saving) onClose();
      }}
      title="Edit profile details"
      description="Identity, academics, DAT, and application background."
      size="2xl"
      fullHeight
      closeOnBackdrop={!saving}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" isLoading={saving} onClick={() => void handleSave()}>
            Save changes
          </Button>
        </div>
      }
    >
      <div className="space-y-8 pb-2">
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-white">Personal</h3>
          <FormField label="Full name" required>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Country">
              <SelectMenu
                value={form.country}
                onChange={(country) =>
                  setForm((f) => ({
                    ...f,
                    country,
                    state: isUnitedStates(country) ? f.state : "",
                  }))
                }
                options={[
                  { value: "", label: "Select country…" },
                  ...PROFILE_COUNTRIES.map((c) => ({ value: c, label: c })),
                ]}
              />
            </FormField>
            {showState ? (
              <FormField label="State" required>
                <SelectMenu
                  value={form.state}
                  onChange={(state) => setForm((f) => ({ ...f, state }))}
                  options={[
                    { value: "", label: "Select state…" },
                    ...US_STATES.map((s) => ({ value: s, label: s })),
                  ]}
                />
              </FormField>
            ) : (
              <div />
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Ethnicity">
              <SelectMenu
                value={form.ethnicity}
                onChange={(ethnicity) => setForm((f) => ({ ...f, ethnicity }))}
                options={[
                  { value: "", label: "Select…" },
                  ...PROFILE_ETHNICITIES.map((e) => ({ value: e, label: e })),
                ]}
              />
            </FormField>
            <FormField label="Gender">
              <SelectMenu
                value={form.gender}
                onChange={(gender) => setForm((f) => ({ ...f, gender }))}
                options={[
                  { value: "", label: "Select…" },
                  ...PROFILE_GENDERS.map((g) => ({ value: g, label: g })),
                ]}
              />
            </FormField>
            <FormField label="Age">
              <Input
                type="number"
                min={0}
                max={120}
                value={form.age}
                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
              />
            </FormField>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-white">Academics</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="GPA">
              <Input
                type="number"
                step="0.01"
                min={0}
                max={4.5}
                value={form.gpa}
                onChange={(e) => setForm((f) => ({ ...f, gpa: e.target.value }))}
              />
            </FormField>
            <FormField label="sGPA">
              <Input
                type="number"
                step="0.01"
                min={0}
                max={4.5}
                value={form.sgpa}
                onChange={(e) => setForm((f) => ({ ...f, sgpa: e.target.value }))}
              />
            </FormField>
          </div>
          <FormField label="What is/was your major?">
            <Input
              value={form.major}
              onChange={(e) => setForm((f) => ({ ...f, major: e.target.value }))}
              placeholder="e.g. Biology"
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Did you take any online classes?">
              <SelectMenu
                value={form.took_online_classes}
                onChange={(took_online_classes) =>
                  setForm((f) => ({ ...f, took_online_classes }))
                }
                options={[
                  { value: "", label: "Select…" },
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
              />
            </FormField>
            <FormField label="Did you take any Community College classes?">
              <SelectMenu
                value={form.took_cc_classes}
                onChange={(took_cc_classes) => setForm((f) => ({ ...f, took_cc_classes }))}
                options={[
                  { value: "", label: "Select…" },
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
              />
            </FormField>
          </div>

          <FormField label="Did you do additional schooling?">
            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              {ADDITIONAL_SCHOOLING_OPTIONS.map((opt) => {
                const checked = form.additional_schooling.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-900"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAdditional(opt.value)}
                      className="h-4 w-4 rounded border-slate-600"
                    />
                    <span className="text-sm text-slate-200">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </FormField>

          {form.additional_schooling.includes("POST_BAC") && (
            <FormField label="Post-Bac Program GPA" required>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={4.5}
                value={form.post_bac_gpa}
                onChange={(e) => setForm((f) => ({ ...f, post_bac_gpa: e.target.value }))}
              />
            </FormField>
          )}
          {form.additional_schooling.includes("MASTERS") && (
            <FormField label="Masters GPA" required>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={4.5}
                value={form.masters_gpa}
                onChange={(e) => setForm((f) => ({ ...f, masters_gpa: e.target.value }))}
              />
            </FormField>
          )}
          {form.additional_schooling.includes("OTHER") && (
            <FormField label="Other schooling (describe)" required>
              <Input
                value={form.additional_schooling_other}
                onChange={(e) =>
                  setForm((f) => ({ ...f, additional_schooling_other: e.target.value }))
                }
                placeholder="Describe your additional schooling"
              />
            </FormField>
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-white">DAT</h3>
          <FormField label="Which DAT did you take?">
            <SelectMenu
              value={form.dat_type}
              onChange={(dat_type) => setForm((f) => ({ ...f, dat_type }))}
              options={[
                { value: "", label: "Select…" },
                ...DAT_TYPES.map((d) => ({ value: d.value, label: d.label })),
              ]}
            />
          </FormField>
          {datFields.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {datFields.map((field) => (
                <FormField
                  key={field.key}
                  label={field.label}
                  hint={`0 – ${DAT_SCORE_MAX}`}
                  required={field.key !== "dat_mdt"}
                >
                  <Input
                    type="number"
                    step="1"
                    min={0}
                    max={DAT_SCORE_MAX}
                    value={form.dat_scores[field.key as DatFieldKey]}
                    onChange={(e) => setDatScore(field.key as DatFieldKey, e.target.value)}
                  />
                </FormField>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-white">Application background</h3>
          <FormField label="Are you a first-time applicant or reapplicant?">
            <SelectMenu
              value={form.applicant_type}
              onChange={(applicant_type) => setForm((f) => ({ ...f, applicant_type }))}
              options={[
                { value: "", label: "Select…" },
                ...APPLICANT_TYPES.map((a) => ({ value: a.value, label: a.label })),
              ]}
            />
          </FormField>

          {isReapplicant && (
            <div className="space-y-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <FormField
                label="Upload your previous application"
                required
                hint={
                  form.previous_application_doc_id && !prevAppFile
                    ? "A previous application is already on file. Upload again to replace it."
                    : undefined
                }
              >
                <div className="relative rounded-xl border-2 border-dashed border-slate-700 p-6 text-center hover:border-indigo-500/40">
                  <input
                    type="file"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    onChange={(e) => setPrevAppFile(e.target.files?.[0] || null)}
                  />
                  <Upload className="mx-auto mb-2 h-7 w-7 text-slate-500" />
                  <p className="text-sm text-slate-400">
                    {prevAppFile
                      ? prevAppFile.name
                      : "Click to upload previous application"}
                  </p>
                </div>
              </FormField>

              <FormField
                label="Schools you applied to previously"
                hint="Select each school, then choose one or more outcomes."
                required
              >
                <SchoolMultiPicker
                  value={reapplicantPickerValue}
                  onChange={syncReapplicantFromPicker}
                />
              </FormField>

              {form.reapplicant_schools.map((school) => (
                <div
                  key={school.schoolId}
                  className="rounded-lg border border-slate-800 bg-slate-950/50 p-3"
                >
                  <p className="mb-2 text-sm font-medium text-white">{school.schoolName}</p>
                  <div className="flex flex-wrap gap-2">
                    {REAPPLICANT_OUTCOMES.map((outcome) => {
                      const active = school.outcomes.includes(outcome);
                      return (
                        <button
                          key={outcome}
                          type="button"
                          onClick={() => toggleOutcome(school.schoolId, outcome)}
                          className={cn(
                            "rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors",
                            active
                              ? "border-indigo-400/50 bg-indigo-500/20 text-indigo-100"
                              : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600",
                          )}
                        >
                          {outcome}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <FormField label="Schools you are currently considering applying to">
            <SchoolMultiPicker
              value={form.considering_schools}
              onChange={(considering_schools) =>
                setForm((f) => ({ ...f, considering_schools }))
              }
            />
          </FormField>
        </section>
      </div>
    </Modal>
  );
}
