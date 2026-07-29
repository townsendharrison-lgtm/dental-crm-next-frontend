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

const PDF_WIDTH = 720;

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
 * Single-column-friendly layout so content fits A4 without clipping.
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

  const kpiMeta = (value: KpiLevel) => {
    switch (value) {
      case "Strong":
        return { text: "#34d399", bar: "#10b981", width: "100%" };
      case "Moderate":
        return { text: "#a5b4fc", bar: "#6366f1", width: "75%" };
      case "Developing":
        return { text: "#fcd34d", bar: "#f59e0b", width: "50%" };
      default:
        return { text: "#fb7185", bar: "#f43f5e", width: "25%" };
    }
  };

  const sectionLabel: React.CSSProperties = {
    margin: "0 0 10px",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#64748b",
  };

  const card: React.CSSProperties = {
    border: "1px solid #1e293b",
    background: "#0f172a",
    borderRadius: 10,
    padding: 14,
    boxSizing: "border-box",
  };

  return (
    <div
      id="school-selection-pdf-export"
      style={{
        width: PDF_WIDTH,
        boxSizing: "border-box",
        fontFamily:
          "Arial, Helvetica, ui-sans-serif, system-ui, -apple-system, sans-serif",
        background: "#020617",
        color: "#e2e8f0",
        overflow: "visible",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid #1e293b",
          background: "#0f172a",
          padding: "22px 22px 24px",
          overflow: "visible",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ minWidth: 0, flex: "1 1 280px", ...wrapText }}>
            <p
              style={{
                margin: 0,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#818cf8",
              }}
            >
              Strategic Selection Plan
            </p>
            <h3
              style={{
                margin: "4px 0 0",
                fontSize: 22,
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1.25,
                ...wrapText,
              }}
            >
              {studentName}
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
              Prepared by Dental School Guide · {dateLabel}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              border: "1px solid #1e293b",
              background: "#020617",
              borderRadius: 10,
              padding: "12px 16px",
              flex: "0 0 auto",
              overflow: "visible",
              boxSizing: "border-box",
            }}
          >
            {/* Fixed box + inset SVG so stroke isn't clipped by html2canvas */}
            <div
              style={{
                position: "relative",
                width: 84,
                height: 84,
                flexShrink: 0,
                overflow: "visible",
              }}
            >
              <svg
                viewBox="0 0 100 100"
                width="84"
                height="84"
                style={{ display: "block", overflow: "visible" }}
              >
                <g transform="rotate(-90 50 50)">
                  <circle
                    cx="50"
                    cy="50"
                    r={38}
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="7"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={38}
                    fill="none"
                    stroke={donutTone}
                    strokeWidth="7"
                    strokeLinecap="butt"
                    strokeDasharray={2 * Math.PI * 38}
                    strokeDashoffset={2 * Math.PI * 38 * (1 - score / 100)}
                  />
                </g>
              </svg>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: 84,
                  height: 84,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#fff",
                    lineHeight: 1,
                    fontFamily: "Arial, Helvetica, sans-serif",
                  }}
                >
                  {score}
                </span>
                <span style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>/ 100</span>
              </div>
            </div>
            <div style={{ paddingRight: 4 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#64748b",
                }}
              >
                Overall strength
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
                Leverage{" "}
                <span style={{ fontWeight: 700, color: "#a5b4fc" }}>{leverageScore}%</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      <div style={{ padding: "20px 22px 28px", display: "flex", flexDirection: "column", gap: 22 }}>
        <section>
          <h4 style={sectionLabel}>Strategic snapshot</h4>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#cbd5e1", ...wrapText }}>
            {draft.snapshot.trim() || "No strategic snapshot has been written yet."}
          </p>
        </section>

        <section>
          <h4 style={sectionLabel}>Profile KPIs</h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            {kpiEntries.map(([key, value]) => {
              const meta = kpiMeta(value);
              return (
                <div key={key} style={card}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#64748b",
                    }}
                  >
                    {kpiLabel(key)}
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: 13, fontWeight: 700, color: meta.text }}>
                    {value}
                  </p>
                  <div
                    style={{
                      marginTop: 8,
                      height: 5,
                      borderRadius: 999,
                      background: "#1e293b",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: meta.width,
                        borderRadius: 999,
                        background: meta.bar,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              ...card,
              border: "1px solid #065f46",
              background: "#022c22",
            }}
          >
            <h4 style={{ ...sectionLabel, color: "#34d399", marginBottom: 8 }}>
              Strengths to leverage
            </h4>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {strengths.length === 0 ? (
                <li style={{ fontSize: 12, fontStyle: "italic", color: "#475569" }}>None listed</li>
              ) : (
                strengths.map((s, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      gap: 8,
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: "#cbd5e1",
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ color: "#34d399", fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span style={wrapText}>{s}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div
            style={{
              ...card,
              border: "1px solid #9f1239",
              background: "#4c0519",
            }}
          >
            <h4 style={{ ...sectionLabel, color: "#fb7185", marginBottom: 8 }}>Critical gaps</h4>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {gaps.length === 0 ? (
                <li style={{ fontSize: 12, fontStyle: "italic", color: "#475569" }}>None listed</li>
              ) : (
                gaps.map((g, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      gap: 8,
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: "#cbd5e1",
                      marginBottom: 6,
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

        <section>
          <h4 style={sectionLabel}>School selection</h4>
          <p style={{ margin: "-2px 0 10px", fontSize: 12, color: "#64748b" }}>
            {schools.length > 0
              ? `${schools.length} school${schools.length === 1 ? "" : "s"} across ${schoolGroups.length} categor${schoolGroups.length === 1 ? "y" : "ies"}`
              : "No schools linked yet"}
          </p>
          {schoolGroups.length === 0 ? (
            <p
              style={{
                margin: 0,
                border: "1px dashed #1e293b",
                borderRadius: 10,
                padding: "24px 14px",
                textAlign: "center",
                fontSize: 12,
                color: "#475569",
              }}
            >
              No schools on this list yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {schoolGroups.map(({ cat, schools: inCat }) => (
                <div
                  key={cat.id}
                  style={{
                    border: "1px solid #1e293b",
                    background: "#0f172a",
                    borderRadius: 10,
                    overflow: "hidden",
                    boxSizing: "border-box",
                  }}
                >
                  {/* table layout is more reliable than flex in html2canvas */}
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
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: cat.color || "#818cf8",
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
                          <span
                            style={{
                              display: "inline-block",
                              background: "#1e293b",
                              color: "#94a3b8",
                              borderRadius: 8,
                              padding: "3px 9px",
                              fontSize: 10,
                              fontWeight: 700,
                              lineHeight: 1.2,
                              minWidth: 18,
                              textAlign: "center",
                            }}
                          >
                            {inCat.length}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {inCat.map((s) => (
                      <li
                        key={s.selectionId || s.id}
                        style={{
                          padding: "10px 14px",
                          borderTop: "1px solid #1e293b",
                          boxSizing: "border-box",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
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
                              fontSize: 11,
                              lineHeight: 1.45,
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

        {roadmapPhases.length > 0 && (
          <section>
            <h4 style={sectionLabel}>Strategic roadmap</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {roadmapPhases.map(({ phase, idx, tasks }) => (
                <div key={phase} style={card}>
                  <p
                    style={{
                      margin: "0 0 8px",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#818cf8",
                    }}
                  >
                    Phase {idx + 1}
                  </p>
                  <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {tasks.map((t, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          gap: 10,
                          fontSize: 12,
                          lineHeight: 1.5,
                          color: "#cbd5e1",
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 999,
                            background: "#312e81",
                            color: "#a5b4fc",
                            fontSize: 9,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: 1,
                          }}
                        >
                          {i + 1}
                        </span>
                        <span style={wrapText}>{t}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </section>
        )}

        {leverage.length > 0 && (
          <section>
            <h4 style={sectionLabel}>Leverage actions</h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: leverage.length === 1 ? "1fr" : "1fr 1fr",
                gap: 10,
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
                  <div key={idx} style={{ ...card, boxSizing: "border-box", width: "100%" }}>
                    <span
                      style={{
                        display: "inline-block",
                        borderRadius: 6,
                        padding: "3px 8px",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        background: badge.bg,
                        color: badge.color,
                        lineHeight: 1.2,
                      }}
                    >
                      {action.impact} impact
                    </span>
                    <h5
                      style={{
                        margin: "10px 0 0",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#fff",
                        ...wrapText,
                      }}
                    >
                      {action.title}
                    </h5>
                    {action.description ? (
                      <p
                        style={{
                          margin: "6px 0 0",
                          fontSize: 12,
                          lineHeight: 1.5,
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

        {risks.length > 0 && (
          <section>
            <h4 style={sectionLabel}>Risk factors</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                        gap: 10,
                        marginBottom: 4,
                        alignItems: "flex-start",
                      }}
                    >
                      <h5
                        style={{
                          margin: 0,
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#fff",
                          ...wrapText,
                        }}
                      >
                        {risk.factor}
                      </h5>
                      <span
                        style={{
                          flexShrink: 0,
                          borderRadius: 6,
                          padding: "2px 8px",
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          background: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {risk.severity}
                      </span>
                    </div>
                    {risk.description ? (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          lineHeight: 1.5,
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
                          fontSize: 12,
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
    await new Promise((r) => setTimeout(r, 180));

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
    const marginX = 10;
    const marginY = 10;
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
