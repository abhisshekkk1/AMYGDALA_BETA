"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { CommandPalette } from "@/components/CommandPalette";
import {
  Search,
  Bell,
  Sun,
  Moon,
  Sparkles,
  User,
  LogOut,
  FolderGit2,
  ChevronDown,
  Menu,
} from "lucide-react";

interface TopbarProps {
  onToggleMobileSidebar?: () => void;
}

export function Topbar({ onToggleMobileSidebar }: TopbarProps) {
  const { user, logout, theme, toggleTheme } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="h-16 border-b border-[#1f2937] bg-[#0b0f17]/80 backdrop-blur-md px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
        {/* Left: Mobile hamburger & Search Bar */}
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="md:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Open Navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-xs text-gray-400 shrink-0">
            <FolderGit2 className="h-3.5 w-3.5 text-indigo-400" />
            <span className="font-medium text-gray-200">Main Library</span>
          </div>

          {/* Quick-Search trigger for Command Palette */}
          <button
            onClick={() => setIsCommandOpen(true)}
            className="flex-1 flex items-center justify-between bg-[#111827] border border-[#1f2937] hover:border-indigo-500/50 rounded-xl px-3 py-1.5 text-xs text-gray-400 transition-all cursor-pointer group text-left"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="h-3.5 w-3.5 text-gray-500 group-hover:text-indigo-400 transition-colors" />
              <span className="truncate">Search documents, topics, tests...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-gray-400 bg-gray-900 border border-gray-800 rounded group-hover:border-indigo-500/40">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* AI Status Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
            <span className="font-medium">AI RAG Grounded</span>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Notifications */}
          <button
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors relative"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-500" />
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1.5 pl-2 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors text-left cursor-pointer"
            >
              <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-xs font-bold text-white shadow">
                {user?.full_name ? user.full_name[0].toUpperCase() : "U"}
              </div>
              <div className="hidden md:flex flex-col">
                <span className="text-xs font-semibold text-gray-200 line-clamp-1">
                  {user?.full_name || "Alex Chen"}
                </span>
                <span className="text-[10px] text-gray-500">Student</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl bg-[#111827] border border-[#1f2937] shadow-2xl py-2 z-50">
                <div className="px-3 py-2 border-b border-gray-800 text-xs text-gray-400">
                  Signed in as <span className="font-semibold text-gray-200">{user?.email || "student@amygdala.ai"}</span>
                </div>
                <a
                  href="/settings"
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800/80 transition-colors"
                  onClick={() => setShowProfileMenu(false)}
                >
                  <User className="h-3.5 w-3.5 text-indigo-400" />
                  Profile & Settings
                </a>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-gray-800/80 transition-colors text-left"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Command Palette */}
      <CommandPalette isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />
    </>
  );
}
