"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Citation, DocumentPage } from "@/types";
import { BookOpen, X, ChevronLeft, ChevronRight, Loader2, ExternalLink } from "lucide-react";

interface DocumentPageDrawerProps {
  citation: Citation | null;
  onClose: () => void;
}

/**
 * Reusable slide-in drawer that shows the source page text for any citation.
 * Open by passing a Citation object; close by clicking X or the backdrop.
 * Used in: Chat, Flashcards, Exam Explanations, Mind Maps, Notes.
 */
export function DocumentPageDrawer({ citation, onClose }: DocumentPageDrawerProps) {
  const [pages, setPages] = useState<DocumentPage[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [docTitle, setDocTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPages = useCallback(async (documentId: number, targetPage: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getDocumentPages(documentId);
      setPages(data.pages || []);
      setPageCount(data.page_count || 1);
      setDocTitle(data.title || "");
      setCurrentPage(targetPage);
    } catch (err: any) {
      setError("Could not load document pages. The document may still be processing.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (citation?.document_id) {
      loadPages(citation.document_id, citation.page_number || 1);
    }
  }, [citation, loadPages]);

  if (!citation) return null;

  const activePage = pages.find((p) => p.page_number === currentPage);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close drawer"
      />

      {/* Drawer Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-[#0b0f17] border-l border-[#1f2937] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f2937] bg-[#111827]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <BookOpen className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-semibold text-white truncate">
                {docTitle || citation.document_title}
              </h2>
              <span className="text-[10px] text-gray-500">
                Page {currentPage} of {pageCount}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Page Navigation */}
            <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-[11px] font-mono text-gray-300 px-1 min-w-[2rem] text-center">
                {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                disabled={currentPage >= pageCount}
                className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Citation Highlight Strip */}
        <div className="px-5 py-3 bg-emerald-500/5 border-b border-emerald-500/15">
          <div className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
            Cited Source — Page {citation.page_number}
          </div>
          <blockquote className="text-xs text-gray-300 leading-relaxed italic border-l-2 border-emerald-500/40 pl-3 line-clamp-3">
            &ldquo;{citation.excerpt}&rdquo;
          </blockquote>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-indigo-400 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs">Loading page content...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-xs text-red-400">
              {error}
            </div>
          ) : activePage ? (
            <div>
              {activePage.heading && (
                <h3 className="text-sm font-semibold text-white mb-3 pb-2 border-b border-gray-800">
                  {activePage.heading}
                </h3>
              )}
              <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-mono">
                {activePage.text}
              </p>
            </div>
          ) : (
            <div className="text-center text-xs text-gray-500 py-8">
              Page {currentPage} content not available.
              <br />
              <span className="text-gray-600">
                Only chunked text is indexed — full page rendering requires PDF viewer integration.
              </span>
            </div>
          )}
        </div>

        {/* Footer — Page Jump */}
        <div className="px-5 py-3 border-t border-[#1f2937] bg-[#111827] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Jump to page:</span>
            <input
              type="number"
              min={1}
              max={pageCount}
              value={currentPage}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                if (v >= 1 && v <= pageCount) setCurrentPage(v);
              }}
              className="w-16 bg-gray-900 border border-gray-800 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-indigo-500"
            />
            <span className="text-xs text-gray-600">of {pageCount}</span>
          </div>

          <button
            onClick={() => setCurrentPage(citation.page_number)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 text-xs font-semibold transition-colors cursor-pointer"
          >
            Go to Citation
          </button>
        </div>
      </div>
    </>
  );
}
