"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Bot,
  GraduationCap,
  Sparkles,
  GitFork,
  FileCheck2,
  RotateCcw,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  BrainCircuit,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Library", href: "/library", icon: BookOpen },
  { name: "AI Study Assistant", href: "/assistant", icon: Bot, badge: "RAG" },
  { name: "Exam Preparation", href: "/exam-prep", icon: GraduationCap },
  { name: "Flashcards", href: "/flashcards", icon: Sparkles },
  { name: "Mind Maps", href: "/mind-maps", icon: GitFork },
  { name: "Practice Tests", href: "/tests", icon: FileCheck2 },
  { name: "Revision Center", href: "/revision", icon: RotateCcw },
  { name: "My Progress", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`h-screen sticky top-0 border-r border-[#1f2937] bg-[#0b0f17] flex flex-col transition-all duration-300 z-40 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#1f2937]">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="h-10 w-10 min-w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BrainCircuit className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-lg text-white font-mono">
                MENTORA
              </span>
              <span className="text-[10px] text-indigo-400 font-medium tracking-wider uppercase">
                AI Learning Platform
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                isActive
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/60"
              }`}
            >
              <Icon
                className={`h-5 w-5 min-w-5 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? "text-indigo-400" : "text-gray-400 group-hover:text-gray-200"
                }`}
              />
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1 overflow-hidden">
                  <span className="truncate">{item.name}</span>
                  {item.badge && (
                    <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2.5 py-1 bg-gray-900 border border-gray-700 rounded-md text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      {!isCollapsed && (
        <div className="p-4 border-t border-[#1f2937] text-xs text-gray-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AI Core Active</span>
          </div>
          <span className="font-mono text-[10px] text-gray-600">v1.0.0</span>
        </div>
      )}
    </aside>
  );
}
