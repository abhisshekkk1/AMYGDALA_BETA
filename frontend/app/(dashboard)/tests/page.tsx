"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { PracticeTest, TestQuestion, Citation } from "@/types";
import { DocumentPageDrawer } from "@/components/DocumentPageDrawer";
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  ArrowRight,
  Award,
  BookOpen
} from "lucide-react";
import Link from "next/link";

export default function TestsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-500">Loading Practice Test...</div>}>
      <TestsContent />
    </Suspense>
  );
}

function TestsContent() {
  const searchParams = useSearchParams();
  const initialTestId = searchParams.get("testId") ? parseInt(searchParams.get("testId")!) : undefined;

  const [tests, setTests] = useState<PracticeTest[]>([]);
  const [activeTest, setActiveTest] = useState<PracticeTest | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(1200); // 20 mins default
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedTestResult, setCompletedTestResult] = useState<PracticeTest | null>(null);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  const loadTests = async () => {
    try {
      const data = await api.getPracticeTests();
      setTests(data);

      if (initialTestId) {
        const found = data.find((t) => t.id === initialTestId);
        if (found) {
          if (found.status === "completed") {
            setCompletedTestResult(found);
          } else {
            setActiveTest(found);
            setTimeLeftSeconds(found.duration_minutes * 60);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load tests:", err);
    }
  };

  useEffect(() => {
    loadTests();
  }, [initialTestId]);

  // Timer countdown
  useEffect(() => {
    if (!activeTest || activeTest.status === "completed" || completedTestResult) return;
    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTest, completedTestResult]);

  const handleStartTest = (test: PracticeTest) => {
    if (test.status === "completed") {
      setCompletedTestResult(test);
      setActiveTest(null);
    } else {
      setActiveTest(test);
      setCurrentQIndex(0);
      setUserAnswers({});
      setTimeLeftSeconds(test.duration_minutes * 60);
      setCompletedTestResult(null);
    }
  };

  const handleSelectOption = (questionId: number, option: string) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const toggleMarkForReview = (questionId: number) => {
    setMarkedForReview((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleSubmitTest = async () => {
    if (!activeTest) return;
    setIsSubmitting(true);
    try {
      const result = await api.submitPracticeTest(activeTest.id, userAnswers);
      setCompletedTestResult(result);
      setActiveTest(null);
      await loadTests();
    } catch (err: any) {
      alert("Submission error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // 1. If currently taking a test:
  if (activeTest && !completedTestResult) {
    const currentQ = activeTest.questions[currentQIndex];
    const isAnswered = currentQ ? Boolean(userAnswers[currentQ.id]) : false;
    const isMarked = currentQ ? Boolean(markedForReview[currentQ.id]) : false;

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Test Header */}
        <div className="p-4 rounded-2xl bg-[#111827] border border-[#1f2937] flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-white">{activeTest.title}</h1>
            <span className="text-xs text-gray-400">
              Question {currentQIndex + 1} of {activeTest.questions.length}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-900 border border-gray-800 text-xs font-mono font-bold text-amber-400">
              <Clock className="h-4 w-4" />
              <span>{formatTimer(timeLeftSeconds)}</span>
            </div>

            <button
              onClick={handleSubmitTest}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span>Submit Test</span>
            </button>
          </div>
        </div>

        {/* Question Palette Navigation */}
        <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-[#111827] border border-[#1f2937]">
          {activeTest.questions.map((q, idx) => {
            const answered = Boolean(userAnswers[q.id]);
            const marked = Boolean(markedForReview[q.id]);
            return (
              <button
                key={q.id}
                onClick={() => setCurrentQIndex(idx)}
                className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                  idx === currentQIndex
                    ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#111827] bg-indigo-600 text-white"
                    : marked
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : answered
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-gray-900 text-gray-400 hover:text-white"
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Question Card */}
        {currentQ && (
          <div className="p-8 rounded-2xl bg-[#111827] border border-[#1f2937] space-y-6">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-base font-semibold text-white leading-relaxed">
                {currentQ.order_index}. {currentQ.question_text}
              </h2>
              <button
                onClick={() => toggleMarkForReview(currentQ.id)}
                className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  isMarked
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-gray-900 text-gray-400 border-gray-800 hover:text-white"
                }`}
              >
                <Bookmark className="h-4 w-4" />
                <span>{isMarked ? "Marked for Review" : "Mark"}</span>
              </button>
            </div>

            {/* MCQ Options */}
            <div className="space-y-3">
              {currentQ.options?.map((option, optIdx) => {
                const isSelected = userAnswers[currentQ.id] === option;
                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(currentQ.id, option)}
                    className={`w-full text-left p-4 rounded-xl border text-xs md:text-sm transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600/15 border-indigo-500 text-white font-medium shadow-md shadow-indigo-600/10"
                        : "bg-gray-900/60 border-gray-800 text-gray-300 hover:bg-gray-800/80"
                    }`}
                  >
                    <span>{option}</span>
                    <span
                      className={`h-4 w-4 rounded-full border flex items-center justify-center text-[10px] ${
                        isSelected ? "border-indigo-500 bg-indigo-500 text-white" : "border-gray-600"
                      }`}
                    >
                      {isSelected && "✓"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Controls */}
            <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
              <button
                disabled={currentQIndex === 0}
                onClick={() => setCurrentQIndex((p) => Math.max(0, p - 1))}
                className="px-4 py-2 rounded-xl bg-gray-900 text-xs font-medium text-gray-300 disabled:opacity-30 hover:bg-gray-800 flex items-center gap-1.5 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>

              <button
                disabled={currentQIndex >= activeTest.questions.length - 1}
                onClick={() => setCurrentQIndex((p) => Math.min(activeTest.questions.length - 1, p + 1))}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white disabled:opacity-30 flex items-center gap-1.5 transition-colors shadow"
              >
                <span>Next Question</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. If viewing Test Results:
  if (completedTestResult) {
    const isPassing = (completedTestResult.percentage || 0) >= 70;
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Score Card */}
        <div className="p-8 rounded-2xl bg-gradient-to-r from-indigo-950/50 via-[#111827] to-violet-950/50 border border-[#1f2937] text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
            <Award className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">{completedTestResult.title} Results</h1>
          <div className="text-4xl font-extrabold font-mono text-white">
            {completedTestResult.percentage}%
          </div>
          <p className="text-xs text-gray-400">
            Awarded {completedTestResult.score_achieved} of {completedTestResult.total_marks} Marks
          </p>

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setCompletedTestResult(null);
                loadTests();
              }}
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-200 transition-colors"
            >
              Back to Tests
            </button>
            <Link
              href="/revision"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow transition-colors"
            >
              Review Weak Topics
            </Link>
          </div>
        </div>

        {/* Answer Breakdown with Explanations */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-white">Detailed Answer Explanations</h2>
          {completedTestResult.questions.map((q, idx) => (
            <div
              key={q.id}
              className={`p-5 rounded-2xl border ${
                q.is_correct
                  ? "bg-emerald-950/10 border-emerald-500/20"
                  : "bg-red-950/10 border-red-500/20"
              } space-y-3`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-semibold text-white">
                  Q{idx + 1}. {q.question_text}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                    q.is_correct
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {q.is_correct ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  <span>{q.marks_awarded || 0} Marks</span>
                </span>
              </div>

              <div className="text-xs space-y-1">
                <div className="text-gray-400">
                  Your Answer: <span className={q.is_correct ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>{q.user_answer || "Not Answered"}</span>
                </div>
                {!q.is_correct && (
                  <div className="text-gray-400">
                    Correct Answer: <span className="text-emerald-400 font-semibold">{q.correct_answer}</span>
                  </div>
                )}
              </div>

              {q.explanation && (
                <div className="p-3 rounded-xl bg-black/40 text-xs text-gray-300 leading-relaxed">
                  <strong>Explanation:</strong> {q.explanation}
                </div>
              )}

              {q.source_citation && (
                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCitation({
                        document_id: completedTestResult.document_id || 1,
                        document_title: q.source_citation?.doc || q.source_citation?.document_title || "Source Document",
                        page_number: q.source_citation?.page || 1,
                        excerpt: q.explanation || q.question_text,
                        citation: `[${q.source_citation?.doc || "Source"} — Page ${q.source_citation?.page || 1}]`
                      });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-[11px] text-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <BookOpen className="h-3 w-3" />
                    <span>
                      {q.source_citation.doc || q.source_citation.document_title || "Source"} • Page {q.source_citation.page || 1}
                    </span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. Tests List:
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
            Practice Test Engine
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Complete timed examinations, diagnostic evaluations, and analyze your performance history.
          </p>
        </div>

        <Link
          href="/exam-prep"
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow"
        >
          <FileCheck2 className="h-4 w-4" />
          <span>Generate New Test</span>
        </Link>
      </div>

      {/* Tests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tests.map((test) => (
          <div
            key={test.id}
            className="p-5 rounded-2xl bg-[#111827] border border-[#1f2937] hover:border-indigo-500/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {test.difficulty}
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{test.duration_minutes} Mins</span>
                </span>
              </div>

              <h3 className="text-sm font-semibold text-white mt-3 line-clamp-1">
                {test.title}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {test.questions?.length || 0} Questions • Total {test.total_marks} Marks
              </p>

              {test.status === "completed" && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    Score: {test.percentage}%
                  </span>
                  <span className="text-[10px] text-gray-500">Completed</span>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-gray-800">
              <button
                onClick={() => handleStartTest(test)}
                className={`w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  test.status === "completed"
                    ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow"
                }`}
              >
                <span>{test.status === "completed" ? "Review Assessment Answers" : "Start Timed Exam"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Side-panel page viewer drawer */}
      <DocumentPageDrawer citation={activeCitation} onClose={() => setActiveCitation(null)} />
    </div>
  );
}
