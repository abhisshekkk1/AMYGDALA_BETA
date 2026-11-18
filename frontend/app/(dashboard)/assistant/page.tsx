"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Document, ChatSession, ChatMessage, Citation } from "@/types";
import {
  Bot,
  Send,
  BookOpen,
  Sparkles,
  Copy,
  Check,
  BookmarkPlus,
  RefreshCw,
  PlusCircle,
  Trash2,
  FileText,
  HelpCircle,
  ExternalLink,
  Loader2,
  ChevronRight
} from "lucide-react";

export default function AssistantPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-500">Loading Assistant...</div>}>
      <AssistantContent />
    </Suspense>
  );
}

function AssistantContent() {
  const searchParams = useSearchParams();
  const initialDocId = searchParams.get("docId") ? parseInt(searchParams.get("docId")!) : undefined;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>(initialDocId ? [initialDocId] : []);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [tone, setTone] = useState<"academic" | "simplified" | "bullet_points">("academic");
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [savedNoteId, setSavedNoteId] = useState<number | null>(null);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadAssistant() {
      try {
        const [docs, chatSessions] = await Promise.all([
          api.getDocuments(),
          api.getChatSessions(),
        ]);
        setDocuments(docs);
        setSessions(chatSessions);

        if (chatSessions.length > 0) {
          const first = chatSessions[0];
          setActiveSessionId(first.id);
          setMessages(first.messages || []);
          if (first.selected_document_ids && first.selected_document_ids.length > 0) {
            setSelectedDocIds(first.selected_document_ids);
          }
        }
      } catch (err) {
        console.error("Assistant init error:", err);
      }
    }
    loadAssistant();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectSession = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setMessages(session.messages || []);
    if (session.selected_document_ids && session.selected_document_ids.length > 0) {
      setSelectedDocIds(session.selected_document_ids);
    }
  };

  const handleNewSession = () => {
    setActiveSessionId(undefined);
    setMessages([]);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText.trim();
    if (!text || isSending) return;

    setInputText("");
    setIsSending(true);

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: text,
      citations: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await api.sendChatMessage(
        text,
        selectedDocIds,
        activeSessionId,
        tone
      );

      setMessages((prev) => [...prev, response]);

      // Refresh sessions list
      const updatedSessions = await api.getChatSessions();
      setSessions(updatedSessions);
      if (!activeSessionId && updatedSessions.length > 0) {
        setActiveSessionId(updatedSessions[0].id);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: `⚠️ Error: ${err.message || "Failed to generate AI response. Please ensure backend is running."}`,
        citations: [],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveToNotes = async (msg: ChatMessage) => {
    try {
      await api.generateNote(
        selectedDocIds[0] || documents[0]?.id || 1,
        "custom",
        `Tutor Note: ${msg.content.slice(0, 30)}...`
      );
      setSavedNoteId(msg.id);
      setTimeout(() => setSavedNoteId(null), 2500);
    } catch (err: any) {
      alert("Failed to save note: " + err.message);
    }
  };

  const toggleDocSelection = (id: number) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const suggestedPrompts = [
    "Explain the core mechanism in simple language with an analogy.",
    "What are the 3 most frequent exam questions on this document?",
    "Summarize the key trade-offs and formulas covered in this chapter.",
    "Compare and contrast the primary concepts mentioned across my notes."
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Left Chat Sessions Sidebar */}
      <div className="w-64 hidden md:flex flex-col rounded-2xl bg-[#111827] border border-[#1f2937] p-4 shrink-0">
        <button
          onClick={handleNewSession}
          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer mb-4"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Study Session</span>
        </button>

        {/* Selected Documents Section */}
        <div className="mb-4 pb-4 border-b border-gray-800">
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Context Scope</span>
            <span className="text-indigo-400">{selectedDocIds.length} Selected</span>
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1">
            {documents.map((doc) => {
              const isSelected = selectedDocIds.includes(doc.id);
              return (
                <button
                  key={doc.id}
                  onClick={() => toggleDocSelection(doc.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs truncate transition-colors flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-medium"
                      : "text-gray-400 hover:bg-gray-800/60"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                  <span className="truncate">{doc.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto space-y-1">
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            History
          </div>
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSelectSession(s)}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs truncate transition-all cursor-pointer ${
                activeSessionId === s.id
                  ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-medium"
                  : "text-gray-400 hover:bg-gray-800/60"
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col rounded-2xl bg-[#111827] border border-[#1f2937] overflow-hidden">
        {/* Chat Header */}
        <div className="h-14 px-6 border-b border-[#1f2937] flex items-center justify-between bg-[#111827]/80">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                MENTORA AI Study Tutor
              </h2>
              <span className="text-[10px] text-gray-400">
                Grounded in {selectedDocIds.length} document{selectedDocIds.length === 1 ? "" : "s"} with exact page citations
              </span>
            </div>
          </div>

          {/* Tone Selector */}
          <div className="flex items-center gap-1.5 bg-gray-900 p-1 rounded-xl border border-gray-800 text-xs">
            <button
              onClick={() => setTone("academic")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                tone === "academic" ? "bg-indigo-600 text-white font-medium" : "text-gray-400 hover:text-white"
              }`}
            >
              Academic
            </button>
            <button
              onClick={() => setTone("simplified")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                tone === "simplified" ? "bg-indigo-600 text-white font-medium" : "text-gray-400 hover:text-white"
              }`}
            >
              Simplified
            </button>
            <button
              onClick={() => setTone("bullet_points")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                tone === "bullet_points" ? "bg-indigo-600 text-white font-medium" : "text-gray-400 hover:text-white"
              }`}
            >
              Bullets
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-white">
                What would you like to master today?
              </h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                Ask about complex definitions, formulas, comparative mechanisms, or examination tips.
                Every response provides verifiable page excerpts.
              </p>

              {/* Prompt Suggestions */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                {suggestedPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(p)}
                    className="p-3 text-left rounded-xl bg-gray-900 border border-gray-800 hover:border-indigo-500/40 text-xs text-gray-300 hover:text-white transition-all cursor-pointer group"
                  >
                    <span className="line-clamp-2">{p}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="h-8 w-8 min-w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shrink-0 mt-1">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-2xl p-4 text-xs md:text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-[#0b0f17] border border-[#1f2937] text-gray-200 rounded-tl-none"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Grounded Citations Drawer */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-800">
                      <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Check className="h-3 w-3" />
                        <span>Source Citations ({msg.citations.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {msg.citations.map((c, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveCitation(c)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-[11px] text-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <BookOpen className="h-3 w-3" />
                            <span>
                              {c.document_title} • Page {c.page_number}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions for Assistant messages */}
                  {msg.role === "assistant" && (
                    <div className="mt-3 pt-2 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="flex items-center gap-1 hover:text-gray-300 transition-colors"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleSaveToNotes(msg)}
                          className="flex items-center gap-1 hover:text-gray-300 transition-colors"
                        >
                          {savedNoteId === msg.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400">Saved to Notes</span>
                            </>
                          ) : (
                            <>
                              <BookmarkPlus className="h-3 w-3" />
                              <span>Save to Notes</span>
                            </>
                          )}
                        </button>
                      </div>
                      <span className="text-[10px] text-gray-600">Source Grounded</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {isSending && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 min-w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl p-4 bg-[#0b0f17] border border-[#1f2937] text-xs text-indigo-400 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Searching documents & generating grounded response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-[#1f2937] bg-[#111827]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask a question about your study documents..."
              className="flex-1 bg-[#0b0f17] border border-[#1f2937] rounded-xl px-4 py-2.5 text-xs md:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="h-10 w-10 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 disabled:opacity-40 transition-all cursor-pointer shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Citation Inspector Modal */}
      {activeCitation && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#111827] border border-[#1f2937] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">
                  Source Grounding Excerpt
                </h3>
              </div>
              <button
                onClick={() => setActiveCitation(null)}
                className="text-xs text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="text-xs text-gray-400 flex items-center justify-between">
                <span>Document: <strong>{activeCitation.document_title}</strong></span>
                <span className="font-mono text-indigo-400">Page {activeCitation.page_number}</span>
              </div>
              <div className="p-4 rounded-xl bg-[#0b0f17] border border-gray-800 text-xs text-gray-300 leading-relaxed font-mono whitespace-pre-wrap">
                &ldquo;{activeCitation.excerpt}&rdquo;
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
