"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  MessageSquare,
  Star,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import type { Survey, SurveyResponse } from "@/lib/types";
import { useSurveyAnalytics, useSurveyResponses } from "@/lib/hooks/useSurveys";
import type { QuestionAnalyticsItem } from "@/lib/api/surveys";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface SurveyInsightsModalProps {
  survey: Survey | null;
  open: boolean;
  onClose: () => void;
}

function getAnswerValue(response: SurveyResponse, questionId: string): string {
  const answers = response.answers;
  if (Array.isArray(answers)) {
    const found = answers.find((a) => a.questionId === questionId);
    return found?.answerText != null ? String(found.answerText) : "";
  }
  if (answers && typeof answers === "object") {
    const val = (answers as Record<string, unknown>)[questionId];
    return val != null ? String(val) : "";
  }
  return "";
}

function respondentName(r: SurveyResponse & { user?: { name?: string; email?: string; role?: string } }) {
  return r.user?.name || r.user?.email || "Anonymous";
}

function respondentMeta(r: SurveyResponse & { user?: { role?: string } }) {
  return r.user?.role || "";
}

function submittedAt(r: SurveyResponse) {
  return r.submitted_at || r.submittedAt || "";
}

function QuestionInsight({ item }: { item: QuestionAnalyticsItem }) {
  const label = item.questionText || "Question";

  if (item.type === "RATING") {
    const dist = item.stats.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const max = Math.max(...Object.values(dist), 1);
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">{label}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">
              Rating · {item.totalCount} answers
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-indigo-400 flex items-center gap-1 justify-end">
              <Star className="w-4 h-4 fill-current" />
              {item.stats.average?.toFixed(1) ?? "—"}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">avg / 5</p>
          </div>
        </div>
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((val) => {
            const count = dist[val] || 0;
            const pct = item.totalCount > 0 ? (count / item.totalCount) * 100 : 0;
            return (
              <div key={val} className="flex items-center gap-2 text-xs">
                <span className="w-4 text-slate-500 font-bold">{val}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </div>
                <span className="w-16 text-right text-slate-400">
                  {count} · {pct.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (item.type === "MULTIPLE_CHOICE") {
    const breakdown = item.stats.breakdown || [];
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">
            Multiple choice · {item.totalCount} answers
          </p>
        </div>
        <div className="space-y-2">
          {breakdown.map((row) => (
            <div key={row.option} className="space-y-1">
              <div className="flex justify-between text-xs gap-2">
                <span className="text-slate-300 font-medium truncate">{row.option}</span>
                <span className="text-slate-500 shrink-0">
                  {row.count} · {row.percentage}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${row.percentage}%` }}
                />
              </div>
            </div>
          ))}
          {breakdown.length === 0 && (
            <p className="text-xs text-slate-600 italic">No answers yet</p>
          )}
        </div>
      </div>
    );
  }

  const texts = item.stats.recentSubmissions || [];
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">
          Text · {item.totalCount} answers
        </p>
      </div>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {texts.map((t, i) => (
          <div
            key={i}
            className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed"
          >
            &quot;{t}&quot;
          </div>
        ))}
        {texts.length === 0 && (
          <p className="text-xs text-slate-600 italic">No answers yet</p>
        )}
      </div>
    </div>
  );
}

function ResponseCard({
  response,
  survey,
}: {
  response: SurveyResponse & { user?: { name?: string; email?: string; role?: string } };
  survey: Survey;
}) {
  const [open, setOpen] = useState(false);
  const when = submittedAt(response);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-slate-900/50 transition-colors cursor-pointer"
      >
        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
          <User className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{respondentName(response)}</p>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            {respondentMeta(response) && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {respondentMeta(response)}
              </span>
            )}
            {when && (
              <span className="text-[10px] text-slate-600 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(when).toLocaleString()}
              </span>
            )}
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-slate-800 p-3.5 space-y-3">
          {(survey.questions || []).map((q, idx) => {
            const answer = getAnswerValue(response, q.id);
            const qText = q.question || q.questionText || `Question ${idx + 1}`;
            return (
              <div key={q.id} className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {qText}
                </p>
                <p className="text-sm text-slate-200">
                  {answer || <span className="text-slate-600 italic">No answer</span>}
                  {q.type === "RATING" && answer ? " / 5" : ""}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SurveyInsightsModal({ survey, open, onClose }: SurveyInsightsModalProps) {
  const [tab, setTab] = useState<"overview" | "responses">("overview");
  const surveyId = survey?.id || "";

  const { data: analytics, isLoading: analyticsLoading } = useSurveyAnalytics(surveyId);
  const { data: responses = [], isLoading: responsesLoading } = useSurveyResponses(surveyId);

  const avgRating = useMemo(() => {
    const ratingQs = analytics?.questions.filter((q) => q.type === "RATING" && q.stats.average != null) || [];
    if (ratingQs.length === 0) return null;
    const sum = ratingQs.reduce((acc, q) => acc + (q.stats.average || 0), 0);
    return Number((sum / ratingQs.length).toFixed(1));
  }, [analytics]);

  if (!survey) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Feedback Insights"
      description={survey.title}
      size="2xl"
      fullHeight
    >
      <div className="flex h-full min-h-0 flex-col items-stretch space-y-4">
        <div className="grid grid-cols-3 gap-3 shrink-0">
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Responses
            </p>
            <p className="text-xl font-bold text-white flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              {analytics?.totalResponses ?? responses.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Questions
            </p>
            <p className="text-xl font-bold text-white">{survey.questions?.length || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Avg Rating
            </p>
            <p className="text-xl font-bold text-white flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-400" />
              {avgRating ?? "—"}
            </p>
          </div>
        </div>

        <div className="inline-flex w-fit self-start items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setTab("overview")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer",
              tab === "overview"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "text-slate-400 hover:text-white",
            )}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Overview
          </button>
          <button
            type="button"
            onClick={() => setTab("responses")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer",
              tab === "responses"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "text-slate-400 hover:text-white",
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Individual ({responses.length})
          </button>
        </div>

        {tab === "overview" ? (
          <div className="space-y-3 min-h-0 flex-1 overflow-y-auto pr-1">
            {analyticsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            ) : analytics && analytics.questions.length > 0 ? (
              analytics.questions.map((item) => (
                <QuestionInsight key={item.questionId} item={item} />
              ))
            ) : (
              <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl">
                <BarChart3 className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No responses yet to analyze.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2 min-h-0 flex-1 overflow-y-auto pr-1">
            {responsesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            ) : responses.length > 0 ? (
              responses.map((r) => (
                <ResponseCard key={r.id} response={r as any} survey={survey} />
              ))
            ) : (
              <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl">
                <MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No individual responses yet.</p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-1 shrink-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
