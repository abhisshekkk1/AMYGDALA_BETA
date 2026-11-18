"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { FlashcardDeck, Flashcard, Document } from "@/types";
import {
  Sparkles,
  RotateCw,
  Plus,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Trash2,
  ArrowRight,
  Layers,
  ChevronLeft,
  ChevronRight,
  Loader2
} from "lucide-react";

export default function FlashcardsPage() {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);

  // Active Review Session State
  const [reviewIndex, setReviewIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // New Deck Modal
  const [showNewDeckModal, setShowNewDeckModal] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [selectedDocForDeck, setSelectedDocForDeck] = useState<number | undefined>(undefined);

  // Manual Add Card Modal
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");

  const loadData = async () => {
    try {
      const [decksData, docsData] = await Promise.all([
        api.getFlashcardDecks(),
        api.getDocuments()
      ]);
      setDecks(decksData);
      setDocuments(docsData);
      if (decksData.length > 0 && !activeDeck) {
        setActiveDeck(decksData[0]);
      }
    } catch (err) {
      console.error("Failed to load flashcards:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckTitle.trim()) return;
    try {
      const created = await api.createFlashcardDeck(
        newDeckTitle.trim(),
        "Study Deck",
        selectedDocForDeck
      );
      setShowNewDeckModal(false);
      setNewDeckTitle("");
      await loadData();
      setActiveDeck(created);
    } catch (err: any) {
      alert("Failed to create deck: " + err.message);
    }
  };

  const handleGenerateCards = async () => {
    if (!activeDeck || !activeDeck.document_id) {
      alert("Please assign a study document to this deck to generate AI flashcards.");
      return;
    }
    setIsGenerating(true);
    try {
      await api.generateFlashcardsFromDoc(activeDeck.id, activeDeck.document_id, 6);
      const updated = await api.getFlashcardDeck(activeDeck.id);
      setActiveDeck(updated);
      await loadData();
    } catch (err: any) {
      alert("Flashcard generation failed: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDeck || !cardFront.trim() || !cardBack.trim()) return;
    try {
      await api.addFlashcard(activeDeck.id, cardFront.trim(), cardBack.trim());
      setShowAddCardModal(false);
      setCardFront("");
      setCardBack("");
      const updated = await api.getFlashcardDeck(activeDeck.id);
      setActiveDeck(updated);
      await loadData();
    } catch (err: any) {
      alert("Failed to add card: " + err.message);
    }
  };

  const handleReviewRating = async (rating: number) => {
    if (!activeDeck || !activeDeck.cards[reviewIndex]) return;
    const card = activeDeck.cards[reviewIndex];
    try {
      await api.reviewFlashcard(card.id, rating);
      setIsFlipped(false);
      if (reviewIndex < activeDeck.cards.length - 1) {
        setReviewIndex(reviewIndex + 1);
      } else {
        alert("🎉 Spaced repetition review complete! All intervals updated.");
        setReviewIndex(0);
      }
    } catch (err: any) {
      console.error("Failed to submit review:", err);
    }
  };

  const currentCard = activeDeck?.cards[reviewIndex];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
            Interactive Flashcards & Spaced Repetition
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            SuperMemo SM-2 memory retention engine. Automatically prioritizes cards you struggle with.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewDeckModal(true)}
            className="px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 text-xs font-semibold text-gray-200 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4 text-indigo-400" />
            <span>New Deck</span>
          </button>

          {activeDeck && (
            <button
              onClick={handleGenerateCards}
              disabled={isGenerating || !activeDeck.document_id}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>AI Generate Cards</span>
            </button>
          )}
        </div>
      </div>

      {/* Deck Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {decks.map((d) => (
          <button
            key={d.id}
            onClick={() => {
              setActiveDeck(d);
              setReviewIndex(0);
              setIsFlipped(false);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
              activeDeck?.id === d.id
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-gray-900 text-gray-400 hover:text-white border border-gray-800"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>{d.title} ({d.cards?.length || 0})</span>
          </button>
        ))}
      </div>

      {/* Active Review Session */}
      {activeDeck && activeDeck.cards.length > 0 ? (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>
              Card {reviewIndex + 1} of {activeDeck.cards.length}
            </span>
            <button
              onClick={() => setShowAddCardModal(true)}
              className="text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              + Add Manual Card
            </button>
          </div>

          {/* 3D Flip Card Container */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full h-80 rounded-3xl bg-[#111827] border border-[#1f2937] hover:border-indigo-500/40 p-8 flex flex-col justify-between shadow-2xl cursor-pointer transition-all relative overflow-hidden group select-none"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                {isFlipped ? "Answer / Back" : "Prompt / Front"}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1 group-hover:text-gray-300">
                <RotateCw className="h-3.5 w-3.5" />
                <span>Click to Flip</span>
              </span>
            </div>

            <div className="my-auto text-center">
              <h2 className="text-lg md:text-xl font-semibold text-white leading-relaxed">
                {isFlipped ? currentCard?.back : currentCard?.front}
              </h2>
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500 border-t border-gray-800/80 pt-3">
              <span>{currentCard?.source_citation || "Grounded Source"}</span>
              <span>Interval: {currentCard?.interval_days || 0}d</span>
            </div>
          </div>

          {/* Spaced Repetition Rating Buttons */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleReviewRating(1)}
              className="py-3 px-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1"
            >
              <span>Hard (Reset)</span>
              <span className="text-[10px] text-gray-500 font-normal">Review in 1 day</span>
            </button>

            <button
              onClick={() => handleReviewRating(2)}
              className="py-3 px-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1"
            >
              <span>Good (Medium)</span>
              <span className="text-[10px] text-gray-500 font-normal">Normal Interval</span>
            </button>

            <button
              onClick={() => handleReviewRating(3)}
              className="py-3 px-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1"
            >
              <span>Easy (Mastered)</span>
              <span className="text-[10px] text-gray-500 font-normal">Increase Interval</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-[#111827] border border-[#1f2937] max-w-lg mx-auto">
          <Sparkles className="h-8 w-8 text-indigo-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-white">Deck is Empty</h3>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            Generate high-yield flashcards directly from your uploaded document or add them manually.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setShowAddCardModal(true)}
              className="px-4 py-2 rounded-xl bg-gray-800 text-xs font-semibold text-gray-200"
            >
              Add Manual Card
            </button>
            <button
              onClick={handleGenerateCards}
              disabled={!activeDeck?.document_id}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-xs font-semibold text-white shadow"
            >
              AI Extract Flashcards
            </button>
          </div>
        </div>
      )}

      {/* New Deck Modal */}
      {showNewDeckModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#111827] border border-[#1f2937] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-3">Create Flashcard Deck</h3>
            <form onSubmit={handleCreateDeck} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Deck Title</label>
                <input
                  type="text"
                  required
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                  placeholder="e.g. Distributed Systems Midterm"
                  className="w-full bg-[#0b0f17] border border-[#1f2937] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Associate Study Document</label>
                <select
                  value={selectedDocForDeck || ""}
                  onChange={(e) => setSelectedDocForDeck(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full bg-[#0b0f17] border border-[#1f2937] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">No document attached</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewDeckModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
                >
                  Create Deck
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#111827] border border-[#1f2937] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-3">Add Flashcard</h3>
            <form onSubmit={handleAddCard} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Front (Prompt or Concept)</label>
                <textarea
                  required
                  rows={3}
                  value={cardFront}
                  onChange={(e) => setCardFront(e.target.value)}
                  placeholder="e.g. What is the CAP theorem?"
                  className="w-full bg-[#0b0f17] border border-[#1f2937] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Back (Explanation or Answer)</label>
                <textarea
                  required
                  rows={3}
                  value={cardBack}
                  onChange={(e) => setCardBack(e.target.value)}
                  placeholder="e.g. Consistency, Availability, Partition tolerance..."
                  className="w-full bg-[#0b0f17] border border-[#1f2937] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCardModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
                >
                  Add Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
