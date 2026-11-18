"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { SmartRecommendation, DashboardAnalytics } from "@/types";
import {
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  TrendingDown,
  Layers,
  GraduationCap
} from "lucide-react";

export default function RevisionCenterPage() {
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRevision() {
      try {
        const [recs, stats] = await Promise.all([
          api.getRecommendations(),
          api.getDashboardAnalytics(),
        ]);
        setRecommendations(recs);
        setAnalytics(stats);
      } catch (err) {
        console.error("Failed to load revision center:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadRevision();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-400 mb-2">
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Algorithmic Spaced Repetition & Error Remediation</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
          Smart Revision Center
        </h1>
        <p className="text-xs text-gray-400 mt-1 max-w-2xl">
          Based on your actual assessment history, SuperMemo retention decay curves, and diagnostic question errors.
        </p>
      </div>

      {/* Priority Recommendations */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          <span>High-Yield Revision Actions</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-[#111827] border border-[#1f2937] hover:border-indigo-500/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      rec.priority === "high"
                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                        : rec.priority === "medium"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                    }`}
                  >
                    {rec.priority} Priority
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white mt-2">
                  {rec.title}
                </h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  {rec.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-800">
                <Link
                  href={rec.action_link}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow"
                >
                  <span>Launch Targeted Session</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weak Topics Diagnostic Matrix */}
      <div className="p-6 rounded-2xl bg-[#111827] border border-[#1f2937] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">
              Identified Knowledge Gaps & Remediation Plan
            </h2>
          </div>
          <span className="text-xs text-gray-500">
            {analytics?.weak_topics?.length || 0} Topics Flagged
          </span>
        </div>

        <div className="space-y-3">
          {analytics?.weak_topics && analytics.weak_topics.length > 0 ? (
            analytics.weak_topics.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#0b0f17] border border-[#1f2937] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="text-xs font-semibold text-white">
                    {item.topic}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    Trigger: <span className="text-amber-400 font-medium">{item.error_type}</span> • Recommendation: {item.suggested_action}
                  </div>
                </div>

                <Link
                  href="/exam-prep"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>Generate Practice Quiz</span>
                </Link>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-gray-500">
              No knowledge gaps identified yet. Complete tests in Exam Preparation to populate this matrix.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
