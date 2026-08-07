"use client";

import React from "react";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { DEFAULT_CATEGORIES } from "@/components/student/hub/hubShared";
import type { School as HubSchool, SchoolCategory } from "@/lib/types";

type KpiLevel = "Strong" | "Moderate" | "Developing" | "Weak";
type Impact = "High" | "Moderate" | "Lower";
type Severity = "High" | "Medium" | "Low";

type PlanDraft = {
  snapshot: string;
  overallScore: number;
  improvementLeverageScore: number;
  kpis: {
    academics: KpiLevel;
    experienceDepth: KpiLevel;
    leadership: KpiLevel;
    shadowing: KpiLevel;
  };
  strengths: string[];
  gaps: string[];
  roadmap: {
    phase1: string[];
    phase2: string[];
    phase3: string[];
    phase4: string[];
  };
  leverageActions: { title: string; description: string; impact: Impact }[];
  riskFactors: {
    factor: string;
    severity: Severity;
    description: string;
    mitigation: string;
  }[];
};

/**
 * Width matches the preview modal (max-w-5xl ≈ 1024px minus modal padding).
 * Wider canvas → html2canvas resolves layouts identically to the live preview.
 */
const PDF_WIDTH = 960;

function schoolCategoryKey(school: HubSchool): string {
  return school.type || "Target";
}

function kpiLabel(key: string) {
  const labels: Record<string, string> = {
    academics: "Academics",
    experienceDepth: "Experience",
    leadership: "Leadership",
    shadowing: "Shadowing",
  };
  return labels[key] || key.replace(/([A-Z])/g, " $1").trim();
}

const wrapText: React.CSSProperties = {
  wordBreak: "break-word",
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
};

/**
 * Print-tuned PDF markup (hex colors only — html2canvas-safe).
 * Structure and spacing mirror `PlanPreviewBody` exactly so preview ≡ PDF.
 */
export function PlanPdfDocument({
  studentName,
  draft,
  schools,
  categories,
}: {
  studentName: string;
  draft: PlanDraft;
  schools: HubSchool[];
  categories: SchoolCategory[];
}) {
  const cats = (() => {
    const base = categories.length > 0 ? categories : DEFAULT_CATEGORIES;
    const known = new Set(base.map((c) => c.id));
    const extras = Array.from(
      new Set(schools.map(schoolCategoryKey).filter((id) => id && !known.has(id))),
    ).map((id) => ({
      id,
      name: id,
      color: "#94a3b8",
      icon: "SchoolIcon",
    }));
    return [...base, ...extras];
  })();

  const kpiEntries = Object.entries(draft.kpis) as [string, KpiLevel][];
  const strengths = draft.strengths.filter(Boolean);
  const gaps = draft.gaps.filter(Boolean);
  const leverage = draft.leverageActions.filter((a) => a.title.trim());
  const risks = draft.riskFactors.filter((r) => r.factor.trim());
  const roadmapPhases = (["phase1", "phase2", "phase3", "phase4"] as const)
    .map((phase, idx) => ({
      phase,
      idx,
      tasks: draft.roadmap[phase].filter(Boolean),
    }))
    .filter((p) => p.tasks.length > 0);
  const schoolGroups = cats
    .map((cat) => ({
      cat,
      schools: schools.filter((s) => schoolCategoryKey(s) === cat.id),
    }))
    .filter((g) => g.schools.length > 0);

  const dateLabel = new Date().toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const score = Math.max(0, Math.min(100, Number(draft.overallScore) || 0));
  const leverageScore = Math.max(
    0,
    Math.min(100, Number(draft.improvementLeverageScore) || 0),
  );
  const donutTone = score >= 80 ? "#34d399" : score >= 60 ? "#818cf8" : "#f59e0b";
  const initial = (studentName.trim()[0] || "S").toUpperCase();

  /* ── Donut dimensions (match StrengthDonut: h-24 w-24 = 96px) ── */
  const donutSize = 96;
  const donutR = 42;
  const donutViewBox = 112;
  const donutStroke = 8;
  const donutCircumference = 2 * Math.PI * donutR;
  const donutOffset = donutCircumference - (donutCircumference * score) / 100;

  const kpiMeta = (value: KpiLevel) => {
    switch (value) {
      case "Strong":
        return { text: "#34d399", bar: "#10b981", pct: 100 };
      case "Moderate":
        return { text: "#a5b4fc", bar: "#6366f1", pct: 75 };
      case "Developing":
        return { text: "#fcd34d", bar: "#f59e0b", pct: 50 };
      default:
        return { text: "#fb7185", bar: "#f43f5e", pct: 25 };
    }
  };

  /* ── Shared style tokens (mapped from Tailwind computed values) ── */
  const sectionLabel: React.CSSProperties = {
    margin: "0 0 12px",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#64748b",
  };

  const card: React.CSSProperties = {
    border: "1px solid #1e293b",
    background: "#0f172a",
    borderRadius: 12,
    padding: "14px 14px 12px",
    boxSizing: "border-box",
    overflow: "visible",
  };

  /** inline-block + lineHeight centering — html2canvas reliable */
  const pdfBadge = (bg: string, color: string): React.CSSProperties => ({
    display: "inline-block",
    background: bg,
    color,
    borderRadius: 6,
    padding: "0 8px",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    height: 20,
    lineHeight: "20px",
    textAlign: "center",
    verticalAlign: "middle",
    boxSizing: "border-box",
    whiteSpace: "nowrap",
  });

  const pdfCountBadge: React.CSSProperties = {
    display: "inline-block",
    background: "#1e293b",
    color: "#94a3b8",
    borderRadius: 9999,
    padding: "0 8px",
    fontSize: 10,
    fontWeight: 700,
    height: 20,
    lineHeight: "20px",
    textAlign: "center",
    verticalAlign: "middle",
    minWidth: 20,
    boxSizing: "border-box",
  };

  const pdfStepNum: React.CSSProperties = {
    display: "inline-block",
    width: 20,
    height: 20,
    lineHeight: "20px",
    textAlign: "center",
    borderRadius: 6,
    background: "#312e81",
    color: "#a5b4fc",
    fontSize: 10,
    fontWeight: 700,
    boxSizing: "border-box",
  };

  /* ── Grid helpers for school groups (match preview responsive) ── */
  const schoolGridCols =
    schoolGroups.length === 1
      ? "1fr"
      : schoolGroups.length === 2
        ? "1fr 1fr"
        : "1fr 1fr";

  return (
    <div
      id="school-selection-pdf-export"
      style={{
        width: PDF_WIDTH,
        boxSizing: "border-box",
        fontFamily:
          "Inter, Arial, Helvetica, ui-sans-serif, system-ui, -apple-system, sans-serif",
        background: "#020617",
        color: "#e2e8f0",
        overflow: "visible",
      }}
    >
      {/* ═══════ HEADER (matches PlanPreviewBody header) ═══════ */}
      <header
        style={{
          borderBottom: "1px solid #1e293b",
          background: "#0f172a",
          padding: "24px 24px 24px",
          overflow: "visible",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          {/* Left: avatar + name block */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, minWidth: 0, flex: "1 1 auto" }}>
            <div
              style={{
                display: "inline-block",
                width: 48,
                height: 48,
                lineHeight: "48px",
                textAlign: "center",
                flexShrink: 0,
                borderRadius: 12,
                background: "#4f46e5",
                boxSizing: "border-box",
                fontSize: 18,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              {initial}
            </div>
            <div style={{ minWidth: 0, ...wrapText }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#818cf8",
                }}
              >
                Strategic Selection Plan
              </p>
              <h3
                style={{
                  margin: "4px 0 0",
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#fff",
                  lineHeight: 1.25,
                  letterSpacing: "-0.025em",
                  ...wrapText,
                }}
              >
                {studentName}
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>
                Prepared by Dental School Guide · {dateLabel}
              </p>
            </div>
          </div>

          {/* Right: strength donut card */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              border: "1px solid #1e293b",
              background: "#020617",
              borderRadius: 12,
              padding: "12px 16px",
              flex: "0 0 auto",
              overflow: "visible",
              boxSizing: "border-box",
            }}
          >
            {/* Donut (matches StrengthDonut h-24 w-24) */}
            <div
              style={{
                position: "relative",
                width: donutSize,
                height: donutSize,
                flexShrink: 0,
                overflow: "visible",
              }}
            >
              <svg
                viewBox={`0 0 ${donutViewBox} ${donutViewBox}`}
                width={donutSize}
                height={donutSize}
                style={{ display: "block", overflow: "visible" }}
              >
                <g transform={`rotate(-90 ${donutViewBox / 2} ${donutViewBox / 2})`}>
                  <circle
                    cx={donutViewBox / 2}
                    cy={donutViewBox / 2}
                    r={donutR}
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth={donutStroke}
                  />
                  <circle
                    cx={donutViewBox / 2}
                    cy={donutViewBox / 2}
                    r={donutR}
                    fill="none"
                    stroke={donutTone}
                    strokeWidth={donutStroke}
                    strokeLinecap="round"
                    strokeDasharray={donutCircumference}
                    strokeDashoffset={donutOffset}
                  />
                </g>
              </svg>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: donutSize,
                  height: donutSize,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: "#fff",
                    lineHeight: 1,
                    fontFamily: "Arial, Helvetica, sans-serif",
                  }}
                >
                  {score}
                </span>
                <span style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>/ 100</span>
              </div>
            </div>
            <div style={{ paddingRight: 4 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: "#64748b",
                }}
              >
                Overall strength
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 14, color: "#94a3b8" }}>
                Leverage{" "}
                <span style={{ fontWeight: 700, color: "#a5b4fc" }}>{leverageScore}%</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════ BODY (space-y-8 = 32px gap, px-6 py-7) ═══════ */}
      <div style={{ padding: "28px 24px 32px", display: "flex", flexDirection: "column", gap: 32 }}>

        {/* ── Strategic snapshot ── */}
        <section>
          <h4 style={sectionLabel}>Strategic snapshot</h4>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.625, color: "#cbd5e1", ...wrapText }}>
            {draft.snapshot.trim() || "No strategic snapshot has been written yet."}
          </p>
        </section>

        {/* ── Profile KPIs (4-column grid, matches lg:grid-cols-4) ── */}
        <section>
          <h4 style={sectionLabel}>Profile KPIs</h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 12,
            }}
          >
            {kpiEntries.map(([key, value]) => {
              const meta = kpiMeta(value);
              return (
                <div key={key} style={card}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: "#64748b",
                    }}
                  >
                    {kpiLabel(key)}
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: 14, fontWeight: 700, color: meta.text }}>
                    {value}
                  </p>
                  <div
                    style={{
                      marginTop: 10,
                      height: 6,
                      borderRadius: 9999,
                      background: "#1e293b",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${meta.pct}%`,
                        borderRadius: 9999,
                        background: meta.bar,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Strengths & Gaps (side-by-side 2-col grid, matches md:grid-cols-2) ── */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          {/* Strengths */}
          <div
            style={{
              ...card,
              border: "1px solid #065f46",
              background: "#022c22",
              padding: 16,
            }}
          >
            <h4 style={{ ...sectionLabel, color: "#34d399", marginBottom: 12 }}>
              Strengths to leverage
            </h4>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {strengths.length === 0 ? (
                <li style={{ fontSize: 14, fontStyle: "italic", color: "#475569" }}>None listed</li>
              ) : (
                strengths.map((s, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      gap: 10,
                      fontSize: 14,
                      lineHeight: 1.625,
                      color: "#cbd5e1",
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ color: "#34d399", fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span style={wrapText}>{s}</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Gaps */}
          <div
            style={{
              ...card,
              border: "1px solid #9f1239",
              background: "#4c0519",
              padding: 16,
            }}
          >
            <h4 style={{ ...sectionLabel, color: "#fb7185", marginBottom: 12 }}>Critical gaps</h4>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {gaps.length === 0 ? (
                <li style={{ fontSize: 14, fontStyle: "italic", color: "#475569" }}>None listed</li>
              ) : (
                gaps.map((g, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      gap: 10,
                      fontSize: 14,
                      lineHeight: 1.625,
                      color: "#cbd5e1",
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ color: "#fb7185", fontWeight: 700, flexShrink: 0 }}>!</span>
                    <span style={wrapText}>{g}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>

        {/* ── School selection ── */}
        <section>
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ ...sectionLabel, marginBottom: 4 }}>School selection</h4>
            <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
              {schools.length > 0
                ? `${schools.length} school${schools.length === 1 ? "" : "s"} across ${schoolGroups.length} categor${schoolGroups.length === 1 ? "y" : "ies"}`
                : "No schools linked yet"}
            </p>
          </div>
          {schoolGroups.length === 0 ? (
            <p
              style={{
                margin: 0,
                border: "1px dashed #1e293b",
                borderRadius: 12,
                padding: "40px 14px",
                textAlign: "center",
                fontSize: 14,
                color: "#475569",
              }}
            >
              No schools on this list yet.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: schoolGridCols,
                gap: 12,
              }}
            >
              {schoolGroups.map(({ cat, schools: inCat }) => (
                <div
                  key={cat.id}
                  style={{
                    border: "1px solid #1e293b",
                    background: "#0f172a",
                    borderRadius: 12,
                    overflow: "hidden",
                    boxSizing: "border-box",
                  }}
                >
                  {/* Category header — table layout (html2canvas reliable) */}
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      background: "#111827",
                      borderBottom: "1px solid #1e293b",
                    }}
                  >
                    <tbody>
                      <tr>
                        <td
                          style={{
                            padding: "10px 14px",
                            fontSize: 12,
                            fontWeight: 700,
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                            color: cat.color || "#818cf8",
                            verticalAlign: "middle",
                            ...wrapText,
                          }}
                        >
                          {cat.name}
                        </td>
                        <td
                          style={{
                            padding: "10px 14px",
                            textAlign: "right",
                            width: 48,
                            verticalAlign: "middle",
                          }}
                        >
                          <span style={pdfCountBadge}>{inCat.length}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {inCat.map((s) => (
                      <li
                        key={s.selectionId || s.id}
                        style={{
                          padding: "12px 14px",
                          borderTop: "1px solid #1e293b",
                          boxSizing: "border-box",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#fff",
                            ...wrapText,
                          }}
                        >
                          {s.name}
                        </p>
                        {s.notes ? (
                          <p
                            style={{
                              margin: "4px 0 0",
                              fontSize: 12,
                              lineHeight: 1.625,
                              color: "#64748b",
                              ...wrapText,
                            }}
                          >
                            {s.notes}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Strategic roadmap ── */}
        {roadmapPhases.length > 0 && (
          <section>
            <h4 style={{ ...sectionLabel, marginBottom: 16 }}>Strategic roadmap</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {roadmapPhases.map(({ phase, idx, tasks }) => (
                <div key={phase} style={{ ...card, padding: 16 }}>
                  <p
                    style={{
                      margin: "0 0 10px",
                      padding: 0,
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: "#818cf8",
                      lineHeight: "16px",
                    }}
                  >
                    Phase {idx + 1}
                  </p>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      {tasks.map((t, i) => (
                        <tr key={i}>
                          <td
                            style={{
                              width: 28,
                              padding: "0 12px 8px 0",
                              verticalAlign: "top",
                            }}
                          >
                            <span style={pdfStepNum}>{i + 1}</span>
                          </td>
                          <td
                            style={{
                              padding: "0 0 8px",
                              fontSize: 14,
                              lineHeight: 1.625,
                              color: "#cbd5e1",
                              verticalAlign: "top",
                              ...wrapText,
                            }}
                          >
                            {t}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Leverage actions (2-col grid, matches sm:grid-cols-2) ── */}
        {leverage.length > 0 && (
          <section>
            <h4 style={{ ...sectionLabel, marginBottom: 16 }}>Leverage actions</h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: leverage.length === 1 ? "1fr" : "1fr 1fr",
                gap: 12,
              }}
            >
              {leverage.map((action, idx) => {
                const badge =
                  action.impact === "High"
                    ? { bg: "#064e3b", color: "#34d399" }
                    : action.impact === "Moderate"
                      ? { bg: "#312e81", color: "#a5b4fc" }
                      : { bg: "#1e293b", color: "#94a3b8" };
                return (
                  <div
                    key={idx}
                    style={{
                      ...card,
                      padding: 16,
                      boxSizing: "border-box",
                      width: "100%",
                    }}
                  >
                    <div style={{ marginBottom: 8, lineHeight: "20px" }}>
                      <span style={pdfBadge(badge.bg, badge.color)}>{action.impact} impact</span>
                    </div>
                    <h5
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#fff",
                        lineHeight: 1.35,
                        ...wrapText,
                      }}
                    >
                      {action.title}
                    </h5>
                    {action.description ? (
                      <p
                        style={{
                          margin: "6px 0 0",
                          fontSize: 14,
                          lineHeight: 1.625,
                          color: "#94a3b8",
                          ...wrapText,
                        }}
                      >
                        {action.description}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Risk factors ── */}
        {risks.length > 0 && (
          <section>
            <h4 style={{ ...sectionLabel, marginBottom: 16 }}>Risk factors</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {risks.map((risk, idx) => {
                const badge =
                  risk.severity === "High"
                    ? { bg: "#4c0519", color: "#fb7185" }
                    : risk.severity === "Medium"
                      ? { bg: "#78350f", color: "#fcd34d" }
                      : { bg: "#1e293b", color: "#94a3b8" };
                return (
                  <div key={idx} style={card}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        marginBottom: 6,
                        alignItems: "flex-start",
                      }}
                    >
                      <h5
                        style={{
                          margin: 0,
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#fff",
                          ...wrapText,
                        }}
                      >
                        {risk.factor}
                      </h5>
                      <span style={pdfBadge(badge.bg, badge.color)}>{risk.severity}</span>
                    </div>
                    {risk.description ? (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 14,
                          lineHeight: 1.625,
                          color: "#94a3b8",
                          ...wrapText,
                        }}
                      >
                        {risk.description}
                      </p>
                    ) : null}
                    {risk.mitigation ? (
                      <p
                        style={{
                          margin: "8px 0 0",
                          paddingTop: 8,
                          borderTop: "1px solid #1e293b",
                          fontSize: 14,
                          color: "#94a3b8",
                          ...wrapText,
                        }}
                      >
                        <span style={{ fontWeight: 600, color: "#34d399" }}>Mitigation: </span>
                        {risk.mitigation}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export async function exportPlanPdf(opts: {
  studentName: string;
  draft: PlanDraft;
  schools: HubSchool[];
  categories: SchoolCategory[];
}) {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = [
    "position:fixed",
    "left:-14000px",
    "top:0",
    `width:${PDF_WIDTH}px`,
    "background:#020617",
    "pointer-events:none",
    "z-index:-1",
    "overflow:visible",
  ].join(";");
  document.body.appendChild(host);

  const root = createRoot(host);
  try {
    root.render(
      <PlanPdfDocument
        studentName={opts.studentName}
        draft={opts.draft}
        schools={opts.schools}
        categories={opts.categories}
      />,
    );
    await new Promise((r) => setTimeout(r, 250));

    const target = host.querySelector("#school-selection-pdf-export") as HTMLElement | null;
    if (!target) throw new Error("PDF export root missing");

    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#020617",
      width: PDF_WIDTH,
      windowWidth: PDF_WIDTH,
      scrollX: 0,
      scrollY: 0,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginX = 8;
    const marginY = 8;
    const usableWidth = pageWidth - marginX * 2;
    const usableHeight = pageHeight - marginY * 2;

    const pxPerMm = canvas.width / usableWidth;
    const pageHeightPx = Math.floor(usableHeight * pxPerMm);

    let y = 0;
    let pageIndex = 0;
    while (y < canvas.height) {
      if (pageIndex > 0) pdf.addPage();

      // Fill page so gaps/cut edges stay dark
      pdf.setFillColor(2, 6, 23);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");

      const sliceHeight = Math.min(pageHeightPx, canvas.height - y);
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = Math.max(1, sliceHeight);
      const ctx = sliceCanvas.getContext("2d");
      if (!ctx) throw new Error("Could not create PDF page canvas");
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(
        canvas,
        0,
        y,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight,
      );

      const sliceData = sliceCanvas.toDataURL("image/png");
      const sliceHeightMm = sliceHeight / pxPerMm;
      pdf.addImage(sliceData, "PNG", marginX, marginY, usableWidth, sliceHeightMm);

      y += pageHeightPx;
      pageIndex += 1;
    }

    const safeName = (opts.studentName || "School_Selection").replace(/[^\w\-]+/g, "_");
    pdf.save(`${safeName}_School_Selection.pdf`);
  } finally {
    root.unmount();
    host.remove();
  }
}
