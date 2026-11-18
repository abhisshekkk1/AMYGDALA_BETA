"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Document, DashboardAnalytics, SmartRecommendation } from "@/types";
import {
  BookOpen,
  Bot,
  GraduationCap,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Calendar,
  Layers,
  ChevronRight
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line
} from "recharts";

export default function DashboardPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [analyticsData, recsData, docsData] = await Promise.all([
          api.getDashboardAnalytics(),
          api.getRecommendations(),
          api.getDocuments()
        ]);
        setAnalytics(analyticsData);
        setRecommendations(recsData);
        setRecentDocs(docsData.slice(0, 4));
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const stats = analytics?.summary;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-violet-950/50 border border-[#1f2937] p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-400 mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Revision Engine Active</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Welcome back, {user?.full_name?.split(" ")[0] || "Scholar"}
          </h1>
          <p className="mt-2 text-sm text-gray-300 leading-relaxed">
            Your study materials are indexed and verified. Review your scheduled spaced-repetition cards,
            test your understanding with exam questions, or consult your AI tutor.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/library"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Material</span>
            </Link>
            <Link
              href="/assistant"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-xs font-semibold transition-all cursor-pointer"
            >
              <Bot className="h-4 w-4 text-indigo-400" />
              <span>Launch AI Tutor</span>
            </Link>
            <Link
              href="/exam-prep"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-xs font-semibold transition-all cursor-pointer"
            >
              <GraduationCap className="h-4 w-4 text-violet-400" />
              <span>Prepare Exam</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl bg-[#111827] border border-[#1f2937] hover:border-indigo-500/40 transition-all glow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Study Time
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">
              {stats?.total_study_minutes || 0}
            </span>
            <span className="text-xs text-gray-500">minutes logged</span>
          </div>
          <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>Active learning session tracked</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-[#111827] border border-[#1f2937] hover:border-indigo-500/40 transition-all glow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              MCQ Accuracy
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">
              {stats?.mcq_accuracy || 0}%
            </span>
            <span className="text-xs text-gray-500">
              ({stats?.questions_attempted || 0} attempted)
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Avg assessment score: {stats?.average_score || 0}%
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-[#111827] border border-[#1f2937] hover:border-indigo-500/40 transition-all glow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Due Flashcards
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">
              {stats?.cards_due_for_review || 0}
            </span>
            <span className="text-xs text-gray-500">
              of {stats?.total_flashcards || 0} total
            </span>
          </div>
          <div className="mt-2 text-xs text-amber-400">
            SM-2 Spaced repetition due
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl bg-[#111827] border border-[#1f2937] hover:border-indigo-500/40 transition-all glow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Library Indexed
            </span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">
              {stats?.documents_count || 0}
            </span>
            <span className="text-xs text-gray-500">source documents</span>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            100% Page cited & chunked
          </div>
        </div>
      </div>

      {/* Middle Grid: Activity Visualization & Smart Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Activity Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#111827] border border-[#1f2937]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">Study Velocity</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Minutes dedicated per day over the last week
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg">
              <Calendar className="h-3.5 w-3.5" />
              <span>Past 7 Days</span>
            </div>
          </div>

          <div className="h-64 w-full">
            {analytics?.weekly_activity && analytics.weekly_activity.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.weekly_activity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0b0f17",
                      borderColor: "#1f2937",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                      color: "#fff"
                    }}
                  />
                  <Bar dataKey="minutes" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-500">
                Log study sessions to view activity trajectory
              </div>
            )}
          </div>
        </div>

        {/* Smart Recommendations */}
        <div className="p-6 rounded-2xl bg-[#111827] border border-[#1f2937] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <span>Smart Revision</span>
              </h2>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                Algorithmic
              </span>
            </div>

            <div className="space-y-3">
              {recommendations.length > 0 ? (
                recommendations.map((rec, idx) => (
                  <Link
                    key={idx}
                    href={rec.action_link}
                    className="block p-3.5 rounded-xl bg-gray-900/80 border border-gray-800 hover:border-indigo-500/40 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-200 group-hover:text-indigo-300 transition-colors">
                        {rec.title}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-gray-500 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                      {rec.description}
                    </p>
                  </Link>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-gray-900/60 text-xs text-gray-500 text-center">
                  All current revision checkpoints up to date!
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-800">
            <Link
              href="/revision"
              className="w-full py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300 flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>View Full Revision Radar</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Documents & Weak Topics Detection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recently Accessed Documents */}
        <div className="p-6 rounded-2xl bg-[#111827] border border-[#1f2937]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Study Library</h2>
            <Link
              href="/library"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>Explore all</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentDocs.length > 0 ? (
              recentDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-gray-700 transition-all"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="h-9 w-9 min-w-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-sm font-semibold text-gray-200 truncate">
                        {doc.title}
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                        <span className="uppercase">{doc.file_type}</span>
                        <span>•</span>
                        <span>{doc.page_count} Pages</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/assistant?docId=${doc.id}`}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium transition-colors"
                      title="Ask AI about this document"
                    >
                      Ask AI
                    </Link>
                    <Link
                      href={`/exam-prep?docId=${doc.id}`}
                      className="px-2.5 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 text-xs font-medium transition-colors"
                      title="Generate Practice Questions"
                    >
                      Exam
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-gray-500">
                No documents uploaded yet. Upload your syllabus or lecture slides to get started.
              </div>
            )}
          </div>
        </div>

        {/* Identified Weak Topics & Targeted Diagnostics */}
        <div className="p-6 rounded-2xl bg-[#111827] border border-[#1f2937]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span>Targeted Remediation Radar</span>
            </h2>
            <span className="text-xs text-gray-500">Based on diagnostic quizzes</span>
          </div>

          <div className="space-y-3">
            {analytics?.weak_topics && analytics.weak_topics.length > 0 ? (
              analytics.weak_topics.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-gray-900/60 border border-amber-500/20 flex items-start gap-3"
                >
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-gray-200">
                      {item.topic}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {item.error_type} — {item.suggested_action}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-gray-500">
                Complete a practice test in Exam Preparation to reveal weak topics.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
