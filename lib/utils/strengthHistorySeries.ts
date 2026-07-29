/** Build month-end strength scores for the last `monthCount` months (carry-forward). */

export type StrengthHistoryRow = {
  strength_score?: number | null;
  recorded_at?: string | null;
};

export type StrengthMonthPoint = {
  month: string;
  score: number;
  fullDate: string;
};

export function buildStrengthMonthlySeries(
  history: StrengthHistoryRow[],
  currentScore: number,
  monthCount = 12,
  now: Date = new Date(),
): StrengthMonthPoint[] {
  const months: { date: Date; month: string; endMs: number }[] = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    months.push({
      date: d,
      month: d.toLocaleString(undefined, { month: "short" }),
      endMs: end.getTime(),
    });
  }

  const points = [...history]
    .map((row) => ({
      at: new Date(row.recorded_at || "").getTime(),
      score: Math.round(Number(row.strength_score) || 0),
    }))
    .filter((p) => Number.isFinite(p.at))
    .sort((a, b) => a.at - b.at);

  const live = Math.max(0, Math.min(100, Math.round(Number(currentScore) || 0)));

  return months.map((m, idx) => {
    let score = 0;
    for (const p of points) {
      if (p.at <= m.endMs) score = p.score;
      else break;
    }
    if (idx === months.length - 1) score = live;
    return {
      month: m.month,
      score: Math.max(0, Math.min(100, score)),
      fullDate: m.date.toLocaleString(undefined, { month: "long", year: "numeric" }),
    };
  });
}
