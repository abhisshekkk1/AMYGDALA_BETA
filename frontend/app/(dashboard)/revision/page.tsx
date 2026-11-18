"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { StudyNote, Document, Citation, SmartRecommendation, DashboardAnalytics } from "@/types";
import { DocumentPageDrawer } from "@/components/DocumentPageDrawer";
import {
  FileText,
  Sparkles,
  BookOpen,
  Trash2,
  Printer,
  Copy,
  Check,
  Loader2,
  BookMarked,
  Code2,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  GraduationCap,
} from "lucide-react";

const NOTE_TYPES = [
  { value: "summary", label: "Chapter Summary", desc: "Structured overview with key arguments" },
  { value: "revision", label: "Revision Sheet", desc: "High-density last-minute bullet points" },
  { value: "definitions", label: "Glossary", desc: "Full terminology & definitions extraction" },
  { value: "formulas", label: "Formula Sheet", desc: "All equations, theorems & quantitative rules" },
  { value: "custom", label: "Custom Notes", desc: "Full academic study notes with citations" },
];

export default function RevisionAndNotesPage() {
  const [activeTab, setActiveTab] = useState<"notes" | "remediation">("notes");

  // Study Notes state
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | undefined>();
  const [noteType, setNoteType] = useState("summary");
  const [activeNote, setActiveNote] = useState<StudyNote | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  // Remediation state
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [isLoadingRemediation, setIsLoadingRemediation] = useState(false);

  const loadNotesData = useCallback(async () => {
    try {
      const [notesData, docsData] = await Promise.all([
        api.getNotes(),
        api.getDocuments(),
      ]);
      setNotes(notesData);
      setDocuments(docsData);
      if (docsData.length > 0 && !selectedDocId) {
        setSelectedDocId(docsData[0].id);
      }
      if (notesData.length > 0 && !activeNote) {
        setActiveNote(notesData[0]);
      }
    } catch (err) {
      console.error("Failed to load notes:", err);
    }
  }, [selectedDocId, activeNote]);

  const loadRemediationData = useCallback(async () => {
    setIsLoadingRemediation(true);
    try {
      const [recs, stats] = await Promise.all([
        api.getRecommendations(),
        api.getDashboardAnalytics(),
      ]);
      setRecommendations(recs);
      setAnalytics(stats);
    } catch (err) {
      console.error("Failed to load revision data:", err);
    } finally {
      setIsLoadingRemediation(false);
    }
  }, []);

  useEffect(() => {
    loadNotesData();
    loadRemediationData();
  }, [loadNotesData, loadRemediationData]);

  const handleGenerate = async () => {
    if (!selectedDocId) return;
    setIsGenerating(true);
    try {
      const doc = documents.find((d) => d.id === selectedDocId);
      const title = `${NOTE_TYPES.find((t) => t.value === noteType)?.label} — ${doc?.title || "Document"}`;
      const note = await api.generateNote(selectedDocId, noteType, title);
      setNotes((prev) => [note, ...prev]);
      setActiveNote(note);
    } catch (err: any) {
      alert("Note generation failed: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (noteId: number) => {
    if (!confirm("Delete this note permanently?")) return;
    try {
      await api.deleteNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      if (activeNote?.id === noteId) {
        setActiveNote(notes.find((n) => n.id !== noteId) || null);
      }
    } catch (err: any) {
      alert("Failed to delete: " + err.message);
    }
  };

  // --- Export: Markdown download ---
  const handleExportMarkdown = () => {
    if (!activeNote) return;
    const blob = new Blob([activeNote.content_markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeNote.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Export: Print / PDF ---
  const handlePrint = () => {
    if (!activeNote) return;
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${activeNote.title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&family=JetBrains+Mono:wght@400;600&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Merriweather', Georgia, serif; font-size: 11pt; line-height: 1.8; color: #111; padding: 2.5cm 3cm; max-width: 800px; margin: 0 auto; }
          h1 { font-size: 18pt; font-weight: 700; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 16px; }
          h2 { font-size: 13pt; font-weight: 700; margin-top: 24px; margin-bottom: 8px; color: #1a1a1a; }
          h3 { font-size: 11pt; font-weight: 700; margin-top: 16px; margin-bottom: 6px; }
          p { margin-bottom: 10px; }
          ul, ol { margin: 8px 0 8px 24px; }
          li { margin-bottom: 4px; }
          strong { font-weight: 700; }
          em { font-style: italic; }
          code { font-family: 'JetBrains Mono', monospace; font-size: 9pt; background: #f4f4f4; padding: 1px 4px; border-radius: 3px; }
          pre { font-family: 'JetBrains Mono', monospace; font-size: 9pt; background: #f4f4f4; padding: 12px; border-radius: 6px; margin: 12px 0; overflow-x: auto; }
          blockquote { border-left: 3px solid #666; padding-left: 12px; color: #555; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; font-size: 10pt; }
          th { background: #f0f0f0; font-weight: 700; }
          .meta { font-size: 9pt; color: #666; margin-bottom: 20px; font-family: sans-serif; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>${activeNote.title}</h1>
        <div class="meta">Generated by AMYGDALA AI • ${new Date(activeNote.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}</div>
        <div id="content"></div>
        <script>
          function mdToHtml(md) {
            return md
              .replace(/^### (.+)$/gm, '<h3>$1</h3>')
              .replace(/^## (.+)$/gm, '<h2>$1</h2>')
              .replace(/^# (.+)$/gm, '<h1>$1</h1>')
              .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
              .replace(/\\*(.+?)\\*/g, '<em>$1</em>')
              .replace(/\`(.+?)\`/g, '<code>$1</code>')
              .replace(/^- (.+)$/gm, '<li>$1</li>')
              .replace(/(<li>.*<\\/li>\\n?)+/g, (m) => '<ul>' + m + '</ul>')
              .replace(/\\n\\n/g, '</p><p>')
              .replace(/^(?!<[hul])(.+)$/gm, '<p>$1</p>');
          }
          document.getElementById('content').innerHTML = mdToHtml(${JSON.stringify(activeNote.content_markdown)});
          window.onload = () => { window.print(); window.close(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCopy = () => {
    if (!activeNote) return;
    navigator.clipboard.writeText(activeNote.content_markdown);
    setCopiedId(activeNote.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
            Revision Center & Study Deliverables
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Generate printable study notes, chapter summaries, glossaries, and review targeted knowledge gaps.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-[#111827] border border-[#1f2937] p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("notes")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "notes"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <BookMarked className="h-3.5 w-3.5" />
            <span>Study Notes & Deliverables</span>
          </button>
          <button
            onClick={() => setActiveTab("remediation")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "remediation"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Smart Revision & Knowledge Gaps</span>
          </button>
        </div>
      </div>

      {/* TAB 1: STUDY NOTES & DELIVERABLES */}
      {activeTab === "notes" && (
        <div className="h-[calc(100vh-13rem)] flex gap-6">
          {/* Left Sidebar: Note List + Generator */}
          <div className="w-72 hidden md:flex flex-col rounded-2xl bg-[#111827] border border-[#1f2937] p-4 shrink-0 gap-4">
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Generate New Note</h2>

              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Source Document</label>
                <select
                  value={selectedDocId || ""}
                  onChange={(e) => setSelectedDocId(parseInt(e.target.value))}
                  className="w-full bg-[#0b0f17] border border-[#1f2937] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {documents.map((d) => (
                    <option key={d.id} value={d.id} className="bg-[#111827]">
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Note Type</label>
                <div className="space-y-1.5">
                  {NOTE_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setNoteType(t.value)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                        noteType === t.value
                          ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-medium"
                          : "text-gray-400 hover:bg-gray-800/60 border border-transparent"
                      }`}
                    >
                      <div className="font-medium">{t.label}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !selectedDocId}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 cursor-pointer transition-all"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span>{isGenerating ? "Generating..." : "Generate Note"}</span>
              </button>
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto space-y-1 border-t border-gray-800 pt-3">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Saved Notes ({notes.length})
              </div>
              {notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => setActiveNote(note)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all group cursor-pointer ${
                    activeNote?.id === note.id
                      ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-medium"
                      : "text-gray-400 hover:bg-gray-800/60 border border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="line-clamp-2 leading-snug">{note.title}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-500 hover:text-red-400 transition-all shrink-0 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-[10px] text-gray-600 mt-0.5 block">{note.note_type}</span>
                </button>
              ))}
              {notes.length === 0 && (
                <div className="text-[11px] text-gray-600 text-center py-4">
                  No notes yet. Generate one above.
                </div>
              )}
            </div>
          </div>

          {/* Main Content: Note Viewer */}
          <div className="flex-1 flex flex-col rounded-2xl bg-[#111827] border border-[#1f2937] overflow-hidden">
            {activeNote ? (
              <>
                {/* Note Header with Export Actions */}
                <div className="px-6 py-4 border-b border-[#1f2937] flex items-center justify-between gap-4 bg-[#111827]/80 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                      <BookMarked className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-sm font-semibold text-white truncate">{activeNote.title}</h1>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <span>
                          {new Date(activeNote.created_at).toLocaleDateString("en-GB", {
                            day: "2-digit", month: "short", year: "numeric"
                          })}
                        </span>
                        <span>•</span>
                        <button
                          onClick={() => {
                            setActiveCitation({
                              document_id: activeNote.document_id || 1,
                              document_title: activeNote.title,
                              page_number: 1,
                              excerpt: activeNote.content_markdown.slice(0, 200),
                              citation: `[Source Document]`
                            });
                          }}
                          className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <BookOpen className="h-3 w-3" />
                          <span>View Source Pages</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Export Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 font-medium transition-colors cursor-pointer"
                      title="Copy Markdown"
                    >
                      {copiedId === activeNote.id ? (
                        <><Check className="h-3.5 w-3.5 text-emerald-400" /><span className="text-emerald-400">Copied</span></>
                      ) : (
                        <><Copy className="h-3.5 w-3.5" /><span>Copy</span></>
                      )}
                    </button>

                    <button
                      onClick={handleExportMarkdown}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 font-medium transition-colors cursor-pointer"
                      title="Export as .md file"
                    >
                      <Code2 className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Export .md</span>
                    </button>

                    <button
                      onClick={handlePrint}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium transition-colors shadow cursor-pointer"
                      title="Print or Save as PDF"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Print / PDF</span>
                    </button>
                  </div>
                </div>

                {/* Note Body */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                  <article className="whitespace-pre-wrap font-sans text-xs md:text-sm text-gray-300 leading-relaxed max-w-none">
                    {activeNote.content_markdown}
                  </article>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-white">No Note Selected</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                  Select a document and note type, then click Generate to create AI-powered study notes with page citations.
                </p>
                {isGenerating && (
                  <div className="mt-4 flex items-center gap-2 text-indigo-400 text-xs">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating stratified study notes...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SMART REVISION & REMEDIATION */}
      {activeTab === "remediation" && (
        <div className="space-y-6">
          {/* Priority Recommendations */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span>Algorithmic Spaced Repetition Actions</span>
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
                  Identified Knowledge Gaps & Diagnostic Matrix
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
      )}

      {/* Side-panel page viewer drawer */}
      <DocumentPageDrawer citation={activeCitation} onClose={() => setActiveCitation(null)} />
    </div>
  );
}
