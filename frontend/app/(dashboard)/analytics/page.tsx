"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { DashboardAnalytics } from "@/types";
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  BookOpen,
  Sparkles,
  Calendar,
  Layers,
  Award
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.getDashboardAnalytics()
      .then((data) => setAnalytics(data))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const stats = analytics?.summary;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
          Learning Analytics & Mastery Metrics
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Grounded metrics computed strictly from your document uploads, assessment evaluations, and spaced repetition logs.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#111827] border border-[#1f2937]">
          <span className="text-xs text-gray-400 font-semibold uppercase">Total Time Invested</span>
          <div className="mt-2 text-3xl font-bold font-mono text-white">
            {stats?.total_study_minutes || 0}
            <span className="text-xs text-gray-500 font-normal ml-1">mins</span>
          </div>
          <div className="mt-1 text-xs text-indigo-400">Total active learning</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#111827] border border-[#1f2937]">
          <span className="text-xs text-gray-400 font-semibold uppercase">Assessment Accuracy</span>
          <div className="mt-2 text-3xl font-bold font-mono text-emerald-400">
            {stats?.mcq_accuracy || 0}%
          </div>
          <div className="mt-1 text-xs text-gray-400">{stats?.questions_attempted || 0} total questions attempted</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#111827] border border-[#1f2937]">
          <span className="text-xs text-gray-400 font-semibold uppercase">Spaced Repetition</span>
          <div className="mt-2 text-3xl font-bold font-mono text-white">
            {stats?.cards_mastered || 0}
            <span className="text-xs text-gray-500 font-normal ml-1">/ {stats?.total_flashcards || 0} cards</span>
          </div>
          <div className="mt-1 text-xs text-amber-400">{stats?.cards_due_for_review || 0} due for review</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#111827] border border-[#1f2937]">
          <span className="text-xs text-gray-400 font-semibold uppercase">Average Test Score</span>
          <div className="mt-2 text-3xl font-bold font-mono text-violet-400">
            {stats?.average_score || 0}%
          </div>
          <div className="mt-1 text-xs text-gray-400">Across {stats?.total_tests_taken || 0} completed tests</div>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Performance Over Time */}
        <div className="p-6 rounded-2xl bg-[#111827] border border-[#1f2937]">
          <h2 className="text-sm font-semibold text-white mb-1">Assessment Performance History</h2>
          <p className="text-xs text-gray-400 mb-4">Trajectory of test scores across recent assessments</p>

          <div className="h-64 w-full">
            {analytics?.test_trend && analytics.test_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.test_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0b0f17",
                      borderColor: "#1f2937",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                      color: "#fff"
                    }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: "#6366f1" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-500">
                Complete assessments in Exam Preparation to render score curves
              </div>
            )}
          </div>
        </div>

        {/* Weekly Study Minutes Bar Chart */}
        <div className="p-6 rounded-2xl bg-[#111827] border border-[#1f2937]">
          <h2 className="text-sm font-semibold text-white mb-1">Weekly Active Engagement</h2>
          <p className="text-xs text-gray-400 mb-4">Daily minutes of tutoring, test evaluation, and flashcards</p>

          <div className="h-64 w-full">
            {analytics?.weekly_activity && analytics.weekly_activity.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.weekly_activity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
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
                  <Bar dataKey="minutes" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-500">
                Log study sessions to visualize daily engagement
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
