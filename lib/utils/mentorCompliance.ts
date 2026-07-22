import type { ActionItem, Meeting, Mentor, Student } from "@/lib/types";

export type MentorHealthBand = "critical" | "at_risk" | "compliant";

export interface MentorComplianceRow {
  mentor: Mentor;
  name: string;
  studentCount: number;
  studentsWithoutMeeting: number;
  overdueTasks: number;
  studentsWithNoUpcomingTasks: number;
  latencyHours: number;
  latencyLabel: string;
  complianceScore: number;
  band: MentorHealthBand;
  slaBreach: boolean;
  issues: string[];
}

export interface OperationalAlert {
  id: string;
  severity: "urgent" | "warning" | "info";
  title: string;
  message: string;
  mentorId?: string;
  mentorName?: string;
  reason: string;
}

export interface PriorityInsight {
  id: string;
  tag: string;
  tagTone: "amber" | "rose" | "indigo" | "emerald";
  title: string;
  detail: string;
  mentorId?: string;
}

function displayName(mentor: Mentor) {
  const name = mentor.name?.trim();
  if (name && name !== mentor.email) return name;
  return name || mentor.email || "Mentor";
}

function latencyHours(mentor: Mentor): number {
  const raw =
    mentor.avgResponseTimeValue ??
    mentor.profile?.avg_response_time_value ??
    mentor.avgResponseTime ??
    mentor.profile?.avg_response_time;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function latencyLabel(mentor: Mentor, hours: number): string {
  const raw = mentor.avgResponseTime ?? mentor.profile?.avg_response_time;
  if (typeof raw === "string" && raw.trim()) return raw;
  if (hours <= 0) return "—";
  return `${Math.round(hours * 10) / 10}h`;
}

function bandFor(score: number, slaBreach: boolean): MentorHealthBand {
  if (slaBreach || score < 80) return "critical";
  if (score < 90) return "at_risk";
  return "compliant";
}

/** Derive live roster metrics from mentors + their students' meetings/tasks. */
export function buildMentorComplianceRows(input: {
  mentors: Mentor[];
  students: Student[];
  meetings: Meeting[];
  actionItems: ActionItem[];
  now?: Date;
}): MentorComplianceRow[] {
  const now = input.now ?? new Date();
  const fortyFiveDays = new Date(now);
  fortyFiveDays.setDate(now.getDate() + 45);

  const mentors = input.mentors.filter((m) => m.role !== "ADMIN");

  return mentors.map((mentor) => {
    const mentorStudents = input.students.filter(
      (s) => (s.mentorId || s.profile?.mentor_id) === mentor.id,
    );
    const mentorStudentIds = new Set(mentorStudents.map((s) => s.id));
    const hours = latencyHours(mentor);
    const storedScore = Number(
      mentor.complianceScore ?? mentor.profile?.compliance_score ?? 100,
    );

    const studentsWithoutMeeting = mentorStudents.filter((student) => {
      const hasUpcoming = input.meetings.some(
        (m) =>
          (m.studentId || m.student_id) === student.id &&
          !m.completed &&
          new Date(m.date) > now,
      );
      return !hasUpcoming;
    }).length;

    const overdueTasks = input.actionItems.filter((item) => {
      const sid = item.studentId || item.student_id || "";
      return mentorStudentIds.has(sid) && item.status === "OVERDUE";
    }).length;

    const studentsWithNoUpcomingTasks = mentorStudents.filter((student) => {
      const hasTasksSoon = input.actionItems.some((item) => {
        const sid = item.studentId || item.student_id;
        const due = item.dueDate || (item as { due_date?: string }).due_date;
        if (!due || sid !== student.id) return false;
        const dueDate = new Date(due);
        return dueDate <= fortyFiveDays && dueDate >= now && item.status !== "COMPLETED";
      });
      return !hasTasksSoon;
    }).length;

    // Soft-compute compliance from activity signals (blend with stored score)
    let computed = 100;
    if (mentorStudents.length > 0) {
      const meetingGapRatio = studentsWithoutMeeting / mentorStudents.length;
      computed -= Math.round(meetingGapRatio * 25);
      computed -= Math.min(20, overdueTasks * 4);
      computed -= Math.min(15, studentsWithNoUpcomingTasks * 3);
    }
    if (hours > 12) computed -= 20;
    else if (hours > 8) computed -= 10;
    if ((mentor.studentIds || mentorStudents).length > 8) computed -= 5;
    computed = Math.max(0, Math.min(100, computed));

    // Prefer computed when stored looks like an untouched default (100) with issues
    const complianceScore =
      storedScore === 100 && computed < 100
        ? computed
        : Math.round((storedScore * 0.4 + computed * 0.6));

    const slaBreach = hours > 12 || overdueTasks >= 3 || studentsWithoutMeeting >= 3;
    const issues: string[] = [];
    if (hours > 12) issues.push(`Latency ${latencyLabel(mentor, hours)}`);
    if (studentsWithoutMeeting > 0) {
      issues.push(`${studentsWithoutMeeting} student(s) with no upcoming meeting`);
    }
    if (overdueTasks > 0) issues.push(`${overdueTasks} overdue task(s)`);
    if (studentsWithNoUpcomingTasks > 0) {
      issues.push(`${studentsWithNoUpcomingTasks} student(s) with no tasks in 45 days`);
    }
    if ((mentor.studentIds || mentorStudents).length > 8) {
      issues.push("High caseload (>8 students)");
    }

    return {
      mentor,
      name: displayName(mentor),
      studentCount: mentorStudents.length || (mentor.studentIds || []).length,
      studentsWithoutMeeting,
      overdueTasks,
      studentsWithNoUpcomingTasks,
      latencyHours: hours,
      latencyLabel: latencyLabel(mentor, hours),
      complianceScore,
      band: bandFor(complianceScore, slaBreach),
      slaBreach,
      issues,
    };
  });
}

export function buildOperationalAlerts(rows: MentorComplianceRow[]): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];

  for (const row of rows) {
    if (row.slaBreach) {
      alerts.push({
        id: `sla-${row.mentor.id}`,
        severity: "urgent",
        title: `SLA risk: ${row.name}`,
        message: row.issues.slice(0, 2).join(" · ") || "Mentor is outside SLA thresholds.",
        mentorId: row.mentor.id,
        mentorName: row.name,
        reason: "sla_breach",
      });
    } else if (row.band === "at_risk") {
      alerts.push({
        id: `risk-${row.mentor.id}`,
        severity: "warning",
        title: `At risk: ${row.name}`,
        message: row.issues[0] || "Compliance dipping — review caseload and follow-ups.",
        mentorId: row.mentor.id,
        mentorName: row.name,
        reason: "at_risk",
      });
    }

    if (row.studentCount > 8) {
      alerts.push({
        id: `capacity-${row.mentor.id}`,
        severity: "warning",
        title: `Capacity pressure: ${row.name}`,
        message: `${row.studentCount} assigned students — consider redistributing.`,
        mentorId: row.mentor.id,
        mentorName: row.name,
        reason: "capacity",
      });
    }
  }

  // Prefer urgent first, unique by mentor+reason already
  return alerts.sort((a, b) => {
    const rank = { urgent: 0, warning: 1, info: 2 };
    return rank[a.severity] - rank[b.severity];
  });
}

export function buildPriorityInsights(rows: MentorComplianceRow[]): PriorityInsight[] {
  const insights: PriorityInsight[] = [];
  const burnout = rows.filter((r) => r.studentCount > 8);
  const engagement = rows
    .filter((r) => r.studentsWithoutMeeting > 0)
    .sort((a, b) => b.studentsWithoutMeeting - a.studentsWithoutMeeting)[0];
  const surplus = rows
    .filter((r) => r.studentCount <= 3 && r.band === "compliant")
    .sort((a, b) => a.studentCount - b.studentCount)[0];
  const slow = rows
    .filter((r) => r.latencyHours > 8)
    .sort((a, b) => b.latencyHours - a.latencyHours)[0];

  if (burnout[0]) {
    insights.push({
      id: "burnout",
      tag: "Burnout Risk",
      tagTone: "amber",
      title: burnout[0].name,
      detail: `${burnout[0].studentCount} students assigned — redistribute before quality drops.`,
      mentorId: burnout[0].mentor.id,
    });
  }

  if (engagement) {
    insights.push({
      id: "engagement",
      tag: "Engagement Gap",
      tagTone: "rose",
      title: engagement.name,
      detail: `${engagement.studentsWithoutMeeting} student(s) have no upcoming meeting.`,
      mentorId: engagement.mentor.id,
    });
  }

  if (slow) {
    insights.push({
      id: "latency",
      tag: "Latency Spike",
      tagTone: "rose",
      title: slow.name,
      detail: `Avg response ${slow.latencyLabel} — nudge for faster follow-up.`,
      mentorId: slow.mentor.id,
    });
  }

  if (surplus) {
    insights.push({
      id: "surplus",
      tag: "Capacity Surplus",
      tagTone: "emerald",
      title: surplus.name,
      detail: `Only ${surplus.studentCount} student(s) — good candidate for new assignments.`,
      mentorId: surplus.mentor.id,
    });
  }

  return insights.slice(0, 4);
}

export function summarizeCompliance(rows: MentorComplianceRow[]) {
  const critical = rows.filter((r) => r.band === "critical");
  const atRisk = rows.filter((r) => r.band === "at_risk");
  const compliant = rows.filter((r) => r.band === "compliant");
  const slaBreaches = rows.filter((r) => r.slaBreach);
  const avgCompliance =
    rows.length === 0
      ? 0
      : Math.round(rows.reduce((sum, r) => sum + r.complianceScore, 0) / rows.length);

  return {
    critical,
    atRisk,
    compliant,
    slaBreaches,
    avgCompliance,
    totalMentors: rows.length,
  };
}
