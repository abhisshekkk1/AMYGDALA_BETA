"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { MindMap, Document } from "@/types";
import {
  GitFork,
  Sparkles,
  BookOpen,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Plus,
  Loader2,
  Layers,
  ChevronRight,
  ChevronDown
} from "lucide-react";

export default function MindMapsPage() {
  const [mindmaps, setMindmaps] = useState<MindMap[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeMindmap, setActiveMindmap] = useState<MindMap | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<number | undefined>(undefined);
  const [customTopic, setCustomTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadMindMaps() {
      try {
        const [maps, docs] = await Promise.all([
          api.getMindMaps(),
          api.getDocuments()
        ]);
        setMindmaps(maps);
        setDocuments(docs);
        if (maps.length > 0) {
          setActiveMindmap(maps[0]);
        }
        if (docs.length > 0) {
          setSelectedDocId(docs[0].id);
        }
      } catch (err) {
        console.error("Mind map load error:", err);
      }
    }
    loadMindMaps();
  }, []);

  const handleGenerate = async () => {
    if (!selectedDocId) return;
    setIsGenerating(true);
    try {
      const generated = await api.generateMindMap(selectedDocId, customTopic || undefined);
      setMindmaps([generated, ...mindmaps]);
      setActiveMindmap(generated);
      setCustomTopic("");
    } catch (err: any) {
      alert("Failed to generate mind map: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleCollapse = (nodeId: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // Group nodes hierarchically
  const rootNode = activeMindmap?.nodes?.find((n) => n.level === 0) || { id: "root", label: activeMindmap?.central_topic || "Topic", level: 0 };
  const level1Nodes = activeMindmap?.nodes?.filter((n) => n.level === 1) || [];

  const getChildren = (parentId: string) => {
    return activeMindmap?.nodes?.filter((n) => n.parentId === parentId) || [];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
            AI Mind Map Visualizer
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Synthesize documents into hierarchical knowledge trees, concept relationships, and interactive nodes.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#111827] border border-[#1f2937] px-3 py-1.5 rounded-xl">
            <BookOpen className="h-4 w-4 text-indigo-400 shrink-0" />
            <select
              value={selectedDocId || ""}
              onChange={(e) => setSelectedDocId(parseInt(e.target.value))}
              className="bg-transparent text-xs text-gray-200 focus:outline-none cursor-pointer"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id} className="bg-[#111827] text-white">
                  {d.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedDocId}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span>Generate Mind Map</span>
          </button>
        </div>
      </div>

      {/* Mind Maps Selector Tabs */}
      {mindmaps.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {mindmaps.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveMindmap(m)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                activeMindmap?.id === m.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-gray-900 text-gray-400 hover:text-white border border-gray-800"
              }`}
            >
              <GitFork className="h-3.5 w-3.5" />
              <span>{m.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Canvas Viewport */}
      {activeMindmap ? (
        <div className="relative w-full h-[650px] rounded-2xl bg-[#0b0f17] border border-[#1f2937] p-8 overflow-auto shadow-2xl flex flex-col justify-between">
          {/* Canvas Controls */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-[#111827] border border-[#1f2937] p-1.5 rounded-xl shadow-lg">
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.1))}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <span className="text-[11px] font-mono text-gray-400 px-1">
              {(zoomLevel * 100).toFixed(0)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <div className="w-[1px] h-4 bg-gray-800 mx-1" />
            <button
              onClick={() => window.print()}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
              title="Export Mind Map"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>

          {/* Interactive Hierarchical Tree Rendering */}
          <div
            className="my-auto mx-auto transition-transform duration-200 origin-center flex flex-col items-center gap-12"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Central Root Node */}
            <div className="px-6 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-base md:text-lg shadow-xl shadow-indigo-500/25 border border-indigo-400/30 flex items-center gap-3">
              <GitFork className="h-5 w-5" />
              <span>{rootNode.label}</span>
            </div>

            {/* Connecting Line Downward */}
            <div className="w-0.5 h-8 bg-indigo-500/40 -my-6" />

            {/* Level 1 Branches */}
            <div className="flex flex-wrap items-start justify-center gap-8">
              {level1Nodes.map((branch) => {
                const leaves = getChildren(branch.id);
                const isCollapsed = Boolean(collapsedNodes[branch.id]);

                return (
                  <div key={branch.id} className="flex flex-col items-center max-w-xs">
                    {/* Branch Node */}
                    <div
                      onClick={() => toggleCollapse(branch.id)}
                      className="px-4 py-2.5 rounded-xl bg-[#111827] border border-indigo-500/40 hover:border-indigo-400 text-indigo-300 font-semibold text-xs md:text-sm shadow-lg flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
                    >
                      <span>{branch.label}</span>
                      {leaves.length > 0 && (
                        isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                      )}
                    </div>

                    {/* Connector */}
                    {!isCollapsed && leaves.length > 0 && (
                      <div className="w-0.5 h-6 bg-gray-700" />
                    )}

                    {/* Level 2 Sub-leaves */}
                    {!isCollapsed && leaves.length > 0 && (
                      <div className="space-y-2 w-full">
                        {leaves.map((leaf) => (
                          <div
                            key={leaf.id}
                            className="p-3 rounded-xl bg-gray-900/90 border border-gray-800 text-xs text-gray-300 shadow hover:border-gray-700 transition-colors"
                          >
                            {leaf.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-gray-500 text-center border-t border-gray-900 pt-3">
            Click on branch nodes to expand/collapse • Zoom and pan to examine deep topic trees
          </div>
        </div>
      ) : (
        <div className="p-16 text-center rounded-2xl bg-[#111827] border border-[#1f2937]">
          <GitFork className="h-10 w-10 text-indigo-400 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-white">No Mind Maps Generated Yet</h2>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto mb-4">
            Select a study document above and click &ldquo;Generate Mind Map&rdquo; to build an interactive conceptual hierarchy.
          </p>
        </div>
      )}
    </div>
  );
}
