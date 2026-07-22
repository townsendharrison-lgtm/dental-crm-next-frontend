"use client";

import React, { useState } from "react";
import {
  ClipboardList,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Send,
  Star,
  X,
} from "lucide-react";
import type { Survey } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Form";
import { cn } from "@/lib/utils/cn";

interface UserSurveyViewProps {
  survey: Survey;
  onSubmit: (answers: Array<{ questionId: string; answerText: string }>) => void | Promise<void>;
  onClose: () => void;
  isSubmitting?: boolean;
}

export default function UserSurveyView({
  survey,
  onSubmit,
  onClose,
  isSubmitting = false,
}: UserSurveyViewProps) {
  const questions = survey.questions || [];
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const currentQuestion = questions[currentQuestionIdx];
  const isLastQuestion = currentQuestionIdx === questions.length - 1;
  const questionText =
    currentQuestion?.question || currentQuestion?.questionText || "Question";

  const handleAnswer = (val: string | number) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: val }));
  };

  const handleNext = async () => {
    if (!currentQuestion) return;
    if (!isLastQuestion) {
      setCurrentQuestionIdx((prev) => prev + 1);
      return;
    }

    const payload = questions.map((q) => ({
      questionId: q.id,
      answerText: String(answers[q.id] ?? ""),
    }));

    await onSubmit(payload);
    setIsSubmitted(true);
  };

  if (questions.length === 0) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-slate-400 text-sm">This survey has no questions.</p>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="p-8 text-center space-y-5">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
          <CheckCircle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Thank you!</h3>
          <p className="text-slate-400 text-sm">Your feedback was submitted successfully.</p>
        </div>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 shrink-0 bg-indigo-600/20 text-indigo-400 rounded-lg flex items-center justify-center border border-indigo-500/20">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-white truncate">{survey.title}</h3>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              Question {currentQuestionIdx + 1} of {questions.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex gap-1">
            {questions.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  idx === currentQuestionIdx
                    ? "w-6 bg-indigo-500"
                    : idx < currentQuestionIdx
                      ? "w-3 bg-emerald-500/50"
                      : "w-3 bg-slate-800",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40"
            aria-label="Close survey"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="min-h-[180px] flex flex-col justify-center space-y-4">
        <h4 className="text-lg font-semibold text-white leading-snug">{questionText}</h4>

        {currentQuestion.type === "RATING" && (
          <div className="flex justify-between gap-2">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleAnswer(val)}
                className={cn(
                  "flex-1 py-4 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 cursor-pointer",
                  answers[currentQuestion.id] === val
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700",
                )}
              >
                <Star
                  className={cn(
                    "w-5 h-5",
                    answers[currentQuestion.id] === val && "fill-current",
                  )}
                />
                <span className="text-sm font-bold">{val}</span>
              </button>
            ))}
          </div>
        )}

        {currentQuestion.type === "TEXT" && (
          <Textarea
            value={(answers[currentQuestion.id] as string) || ""}
            onChange={(e) => handleAnswer(e.target.value)}
            className="min-h-[120px]"
            placeholder="Type your answer here..."
          />
        )}

        {currentQuestion.type === "MULTIPLE_CHOICE" && (
          <div className="grid gap-2">
            {(currentQuestion.options || []).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleAnswer(opt)}
                className={cn(
                  "w-full p-3.5 rounded-xl border-2 text-left text-sm font-semibold transition-all flex items-center justify-between cursor-pointer",
                  answers[currentQuestion.id] === opt
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700",
                )}
              >
                {opt}
                {answers[currentQuestion.id] === opt && <CheckCircle className="w-4 h-4" />}
              </button>
            ))}
            {(currentQuestion.options || []).length === 0 && (
              <p className="text-sm text-slate-500 italic">No options configured for this question.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-1">
        <Button
          variant="outline"
          className="flex-1"
          disabled={currentQuestionIdx === 0 || isSubmitting}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
          onClick={() => setCurrentQuestionIdx((prev) => prev - 1)}
        >
          Back
        </Button>
        <Button
          className="flex-[2]"
          disabled={answers[currentQuestion.id] === undefined || answers[currentQuestion.id] === "" || isSubmitting}
          isLoading={isSubmitting}
          rightIcon={
            isLastQuestion ? <Send className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          }
          onClick={handleNext}
        >
          {isLastQuestion ? "Submit Feedback" : "Next Question"}
        </Button>
      </div>
    </div>
  );
}
