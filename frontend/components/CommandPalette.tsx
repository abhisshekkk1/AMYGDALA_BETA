"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Search,
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
  Upload,
  PlusCircle,
  FileText,
  Sun,
  Moon,
  ArrowRight,
  Command,
  X
} from "lucide-react";

interface CommandItem {
  id: string;
  title: string;
  category: "Navigation" | "Quick Actions" | "Preferences";
  icon: React.ElementType;
  badge?: string;
  action: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { theme, toggleTheme } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commandItems: CommandItem[] = [
    // Navigation
    {
      id: "nav-overview",
      title: "Overview Dashboard",
      category: "Navigation",
      icon: LayoutDashboard,
      action: () => router.push("/dashboard"),
    },
    {
      id: "nav-library",
      title: "My Document Library",
      category: "Navigation",
      icon: BookOpen,
      action: () => router.push("/library"),
    },
    {
      id: "nav-assistant",
      title: "AI Study Assistant (Streaming RAG)",
      category: "Navigation",
      icon: Bot,
      badge: "AI",
      action: () => router.push("/assistant"),
    },
    {
      id: "nav-exam-prep",
      title: "Exam Preparation (MCQs & Question Papers)",
      category: "Navigation",
      icon: GraduationCap,
      action: () => router.push("/exam-prep"),
    },
    {
      id: "nav-flashcards",
      title: "Interactive Flashcards (SuperMemo SM-2)",
      category: "Navigation",
      icon: Sparkles,
      action: () => router.push("/flashcards"),
    },
    {
      id: "nav-mindmaps",
      title: "Mind Maps (Hierarchical Visualizer)",
      category: "Navigation",
      icon: GitFork,
      action: () => router.push("/mind-maps"),
    },
    {
      id: "nav-tests",
      title: "Practice Tests & Diagnostic Assessments",
      category: "Navigation",
      icon: FileCheck2,
      action: () => router.push("/tests"),
    },
    {
      id: "nav-revision",
      title: "Revision Center & Study Notes",
      category: "Navigation",
      icon: RotateCcw,
      action: () => router.push("/revision"),
    },
    {
      id: "nav-analytics",
      title: "My Progress & Learning Trajectory",
      category: "Navigation",
      icon: BarChart3,
      action: () => router.push("/analytics"),
    },
    {
      id: "nav-settings",
      title: "AI Settings & Profile Configuration",
      category: "Navigation",
      icon: Settings,
      action: () => router.push("/settings"),
    },

    // Quick Actions
    {
      id: "action-upload",
      title: "Upload New Study Material (PDF/DOCX/PPTX)",
      category: "Quick Actions",
      icon: Upload,
      action: () => router.push("/library"),
    },
    {
      id: "action-chat",
      title: "Start New AI Study Session",
      category: "Quick Actions",
      icon: PlusCircle,
      action: () => router.push("/assistant"),
    },
    {
      id: "action-generate-exam",
      title: "Generate Full Examination Paper",
      category: "Quick Actions",
      icon: GraduationCap,
      action: () => router.push("/exam-prep"),
    },
    {
      id: "action-due-cards",
      title: "Review Due Spaced-Repetition Cards",
      category: "Quick Actions",
      icon: Sparkles,
      action: () => router.push("/flashcards"),
    },
    {
      id: "action-notes",
      title: "Generate Chapter Summary Notes",
      category: "Quick Actions",
      icon: FileText,
      action: () => router.push("/revision"),
    },

    // Preferences
    {
      id: "pref-theme",
      title: `Toggle Theme (Currently ${theme === "dark" ? "Dark" : "Light"})`,
      category: "Preferences",
      icon: theme === "dark" ? Sun : Moon,
      action: () => toggleTheme(),
    },
  ];

  const filteredItems = commandItems.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation inside command palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        onClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-[#0b0f17] border border-[#1f2937] shadow-2xl overflow-hidden flex flex-col max-h-[70vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#1f2937] bg-[#111827]">
          <Search className="h-4 w-4 text-indigo-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search destination..."
            className="w-full bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded text-gray-500 hover:text-white mr-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-semibold text-gray-400 bg-gray-900 border border-gray-800 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">
              No matching commands or destinations found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600/20 text-white border border-indigo-500/30 font-medium"
                      : "text-gray-300 hover:bg-gray-800/40 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-indigo-500 text-white"
                          : "bg-gray-900 text-gray-400 border border-gray-800"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs truncate">{item.title}</div>
                      <div className="text-[10px] text-gray-500">{item.category}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.badge && (
                      <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {item.badge}
                      </span>
                    )}
                    {isSelected && (
                      <ArrowRight className="h-3.5 w-3.5 text-indigo-400" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Palette Footer */}
        <div className="px-4 py-2 border-t border-[#1f2937] bg-[#111827] flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-900 border border-gray-800 rounded text-[9px] font-mono">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-900 border border-gray-800 rounded text-[9px] font-mono">↵</kbd> Select
            </span>
          </div>
          <span className="flex items-center gap-1 text-indigo-400">
            <Command className="h-3 w-3" /> Quick Switcher
          </span>
        </div>
      </div>
    </div>
  );
}
