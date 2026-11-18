"use client";

import React, { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { Document, FolderOut, DocumentPage } from "@/types";
import {
  Upload,
  BookOpen,
  FolderPlus,
  Search,
  Trash2,
  Edit2,
  FileText,
  FileCheck,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X,
  Loader2,
  Sparkles,
  Bot,
  GraduationCap
} from "lucide-react";
import Link from "next/link";

export default function LibraryPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [showFolderModal, setShowFolderModal] = useState(false);

  // Document Viewer Preview Modal
  const [activePreviewDoc, setActivePreviewDoc] = useState<Document | null>(null);
  const [previewPages, setPreviewPages] = useState<DocumentPage[]>([]);
  const [previewPageIdx, setPreviewPageIdx] = useState(0);
  const [isLoadingPages, setIsLoadingPages] = useState(false);

  // Rename Modal
  const [renamingDoc, setRenamingDoc] = useState<Document | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      const [docs, fldrs] = await Promise.all([
        api.getDocuments(selectedFolderId),
        api.getFolders()
      ]);
      setDocuments(docs);
      setFolders(fldrs);
    } catch (err: any) {
      console.error("Failed to load documents:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedFolderId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        await api.uploadDocument(files[i], selectedFolderId);
      }
      await loadData();
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this document from your library?")) return;
    try {
      await api.deleteDocument(id);
      setDocuments(documents.filter((d) => d.id !== id));
      if (activePreviewDoc?.id === id) setActivePreviewDoc(null);
    } catch (err: any) {
      alert("Failed to delete document: " + err.message);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await api.createFolder(newFolderName.trim());
      setNewFolderName("");
      setShowFolderModal(false);
      const fldrs = await api.getFolders();
      setFolders(fldrs);
    } catch (err: any) {
      alert("Failed to create folder: " + err.message);
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingDoc || !newTitle.trim()) return;
    try {
      await api.renameDocument(renamingDoc.id, newTitle.trim());
      setRenamingDoc(null);
      await loadData();
    } catch (err: any) {
      alert("Failed to rename document: " + err.message);
    }
  };

  const openViewer = async (doc: Document) => {
    setActivePreviewDoc(doc);
    setIsLoadingPages(true);
    setPreviewPageIdx(0);
    try {
      const data = await api.getDocumentPages(doc.id);
      setPreviewPages(data.pages || []);
    } catch (err: any) {
      console.error("Failed to load document pages:", err);
      setPreviewPages([]);
    } finally {
      setIsLoadingPages(false);
    }
  };

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
            Document Library
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Upload PDFs, textbooks, lecture slides, and notes for verified AI citations & exam preparation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFolderModal(true)}
            className="px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 text-xs font-semibold text-gray-300 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <FolderPlus className="h-4 w-4 text-indigo-400" />
            <span>New Folder</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.md,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            <span>{isUploading ? "Processing..." : "Upload Material"}</span>
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Folders and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Folder pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
          <button
            onClick={() => setSelectedFolderId(undefined)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              selectedFolderId === undefined
                ? "bg-indigo-600 text-white"
                : "bg-gray-900 text-gray-400 hover:text-white border border-gray-800"
            }`}
          >
            All Documents ({documents.length})
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFolderId(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                selectedFolderId === f.id
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-900 text-gray-400 hover:text-white border border-gray-800"
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: f.color }} />
              <span>{f.name}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="w-full bg-[#111827] border border-[#1f2937] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="p-8 rounded-2xl border-2 border-dashed border-[#1f2937] hover:border-indigo-500/50 bg-[#111827]/40 hover:bg-[#111827]/80 text-center cursor-pointer transition-all group"
      >
        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
          <Upload className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-semibold text-white">
          Click or Drag & Drop Documents Here
        </h3>
        <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
          Supports PDF, Word (.docx), PowerPoint (.pptx), Markdown, Plain Text (.txt), and CSV.
          Documents are automatically chunked and indexed page-by-page.
        </p>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="p-5 rounded-2xl bg-[#111827] border border-[#1f2937] hover:border-indigo-500/40 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase">
                    {doc.file_type}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
                      {doc.title}
                    </h3>
                    <span className="text-[11px] text-gray-500">
                      {doc.page_count} {doc.page_count === 1 ? "Page" : "Pages"} • {(doc.file_size_bytes / 1024).toFixed(0)} KB
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setRenamingDoc(doc);
                      setNewTitle(doc.title);
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    title="Rename"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {doc.summary && (
                <p className="text-xs text-gray-400 mt-3 line-clamp-2 leading-relaxed">
                  {doc.summary}
                </p>
              )}

              <div className="mt-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  <FileCheck className="h-3 w-3" />
                  <span>Ready for AI RAG</span>
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-800/80 flex items-center justify-between gap-2">
              <button
                onClick={() => openViewer(doc)}
                className="text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
                <span>Read & Inspect</span>
              </button>

              <div className="flex items-center gap-2">
                <Link
                  href={`/assistant?docId=${doc.id}`}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-medium transition-colors flex items-center gap-1"
                >
                  <Bot className="h-3.5 w-3.5" />
                  <span>Ask AI</span>
                </Link>
                <Link
                  href={`/exam-prep?docId=${doc.id}`}
                  className="px-2.5 py-1 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 text-xs font-medium transition-colors flex items-center gap-1"
                >
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>Exams</span>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredDocs.length === 0 && (
        <div className="p-12 text-center rounded-2xl bg-[#111827] border border-[#1f2937]">
          <BookOpen className="h-8 w-8 text-gray-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-gray-300">No documents found</h3>
          <p className="text-xs text-gray-500 mt-1">
            {searchQuery ? "Try a different search query." : "Upload a PDF, DOCX, or presentation to start learning."}
          </p>
        </div>
      )}

      {/* Integrated Document Viewer Modal */}
      {activePreviewDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl h-[85vh] bg-[#111827] border border-[#1f2937] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="h-14 px-6 border-b border-[#1f2937] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {activePreviewDoc.title}
                  </h3>
                  <span className="text-[10px] text-gray-400">
                    Page {previewPageIdx + 1} of {Math.max(1, previewPages.length)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/assistant?docId=${activePreviewDoc.id}`}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium flex items-center gap-1.5 shadow"
                >
                  <Bot className="h-3.5 w-3.5" />
                  <span>Chat With This Document</span>
                </Link>
                <button
                  onClick={() => setActivePreviewDoc(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#0b0f17]/60 text-sm font-serif leading-relaxed text-gray-200">
              {isLoadingPages ? (
                <div className="h-full flex items-center justify-center gap-2 text-xs text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                  <span>Extracting document pages...</span>
                </div>
              ) : previewPages.length > 0 ? (
                <div className="max-w-2xl mx-auto space-y-4">
                  <div className="text-xs uppercase tracking-wider font-sans font-semibold text-indigo-400 pb-2 border-b border-gray-800">
                    {previewPages[previewPageIdx]?.heading || `Page ${previewPageIdx + 1}`}
                  </div>
                  <div className="whitespace-pre-wrap font-sans text-xs md:text-sm text-gray-300 leading-relaxed">
                    {previewPages[previewPageIdx]?.text}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-500">
                  No text extracted for this document.
                </div>
              )}
            </div>

            {/* Modal Footer / Page Pagination */}
            <div className="h-14 px-6 border-t border-[#1f2937] flex items-center justify-between bg-[#111827]">
              <button
                disabled={previewPageIdx === 0}
                onClick={() => setPreviewPageIdx((p) => Math.max(0, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-gray-800 text-xs font-medium text-gray-300 disabled:opacity-30 hover:bg-gray-700 flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous Page</span>
              </button>

              <span className="text-xs font-mono text-gray-400">
                Page {previewPageIdx + 1} / {Math.max(1, previewPages.length)}
              </span>

              <button
                disabled={previewPageIdx >= previewPages.length - 1}
                onClick={() => setPreviewPageIdx((p) => Math.min(previewPages.length - 1, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-gray-800 text-xs font-medium text-gray-300 disabled:opacity-30 hover:bg-gray-700 flex items-center gap-1 transition-colors"
              >
                <span>Next Page</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#111827] border border-[#1f2937] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-3">Create New Folder</h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <input
                type="text"
                required
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Computer Science, Law, Biology"
                className="w-full bg-[#0b0f17] border border-[#1f2937] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renamingDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#111827] border border-[#1f2937] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-3">Rename Document</h3>
            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-[#0b0f17] border border-[#1f2937] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenamingDoc(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
                >
                  Save Title
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
