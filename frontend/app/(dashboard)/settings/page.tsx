"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { AISettings } from "@/types";
import {
  Settings,
  Bot,
  Key,
  ShieldCheck,
  Cpu,
  Moon,
  Sun,
  Check,
  Save,
  Loader2,
  Server,
  Sliders,
  AlertCircle
} from "lucide-react";

export default function SettingsPage() {
  const { user, theme, toggleTheme } = useAuth();

  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [provider, setProvider] = useState<string>("openai");
  const [apiKey, setApiKey] = useState<string>("");
  const [modelName, setModelName] = useState<string>("gpt-4o-mini");
  const [baseUrl, setBaseUrl] = useState<string>("");
  const [temperature, setTemperature] = useState<string>("0.3");

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    api.getAISettings()
      .then((data) => {
        setAiSettings(data);
        setProvider(data.provider);
        setModelName(data.model_name);
        setBaseUrl(data.base_url || "");
        setTemperature(data.temperature || "0.3");
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSaveAISettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const updated = await api.updateAISettings({
        provider,
        api_key: apiKey || undefined,
        model_name: modelName,
        base_url: baseUrl || undefined,
        temperature,
      });
      setAiSettings(updated);
      setSaveSuccess(true);
      setApiKey(""); // clear plain text input
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert("Failed to save settings: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
          System & AI Configuration
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Configure AI provider endpoints, API keys, model parameters, and workspace appearance.
        </p>
      </div>

      {/* AI Provider Settings Card */}
      <div className="p-6 rounded-2xl bg-[#111827] border border-[#1f2937] space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">AI Provider & LLM Engine</h2>
              <p className="text-xs text-gray-400">Provider-independent abstraction layer</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                aiSettings?.has_api_key
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}
            >
              {aiSettings?.has_api_key ? "Key Configured" : "Offline / Simulated Mode"}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveAISettings} className="space-y-5">
          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2">
              Select AI LLM Provider
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: "openai", name: "OpenAI", desc: "GPT-4o, GPT-4o-mini" },
                { id: "gemini", name: "Google Gemini", desc: "Gemini 1.5 Flash / Pro" },
                { id: "ollama", name: "Local Ollama", desc: "Offline Llama 3, Mistral" },
                { id: "custom", name: "Custom API", desc: "OpenAI-compatible" },
              ].map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => {
                    setProvider(p.id);
                    if (p.id === "openai") setModelName("gpt-4o-mini");
                    if (p.id === "gemini") setModelName("gemini-1.5-flash");
                    if (p.id === "ollama") {
                      setModelName("llama3:latest");
                      setBaseUrl("http://localhost:11434");
                    }
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    provider === p.id
                      ? "bg-indigo-600/15 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
                      : "bg-[#0b0f17] border-[#1f2937] text-gray-400 hover:border-gray-700 hover:text-gray-200"
                  }`}
                >
                  <div className="text-xs font-bold text-white">{p.name}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          {provider !== "ollama" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{provider === "gemini" ? "Google Gemini API Key" : "API Key"}</span>
                </label>
                {aiSettings?.has_api_key && (
                  <span className="text-[10px] text-emerald-400">✓ Key securely saved on server</span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={aiSettings?.has_api_key ? "••••••••••••••••••••••••••••••••" : "Paste your API key here"}
                  className="w-full bg-[#0b0f17] border border-[#1f2937] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 hover:text-white"
                >
                  {showKey ? "Hide" : "Show"}
                </button>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Keys are never exposed on the frontend. Saved directly to your isolated user environment.
              </p>
            </div>
          )}

          {/* Model Name & Base URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-violet-400" />
                <span>Model Identifier</span>
              </label>
              <input
                type="text"
                required
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="gpt-4o-mini or gemini-1.5-flash or llama3:latest"
                className="w-full bg-[#0b0f17] border border-[#1f2937] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {(provider === "ollama" || provider === "custom") && (
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Base URL Endpoint</span>
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="w-full bg-[#0b0f17] border border-[#1f2937] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Temperature Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                <span>Temperature (Creativity vs Determinism)</span>
              </label>
              <span className="text-xs font-mono text-indigo-400">{temperature}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>0.0 (Strict Source Grounding)</span>
              <span>1.0 (Creative Explorations)</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            {saveSuccess ? (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <Check className="h-4 w-4" />
                <span>AI Configuration updated successfully!</span>
              </span>
            ) : <span />}

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>Save AI Configuration</span>
            </button>
          </div>
        </form>
      </div>

      {/* Appearance & Account Preferences */}
      <div className="p-6 rounded-2xl bg-[#111827] border border-[#1f2937] space-y-4">
        <h2 className="text-sm font-semibold text-white">Appearance & Workspace</h2>

        <div className="flex items-center justify-between p-4 rounded-xl bg-[#0b0f17] border border-[#1f2937]">
          <div>
            <div className="text-xs font-semibold text-white">Color Theme</div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              Toggle between refined dark mode (default) and crisp high-contrast light mode
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="px-4 py-2 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 text-xs font-semibold text-gray-200 flex items-center gap-2 transition-colors cursor-pointer"
          >
            {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-400" />}
            <span>{theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
          </button>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-[#0b0f17] border border-[#1f2937]">
          <div>
            <div className="text-xs font-semibold text-white">Signed in Profile</div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              {user?.full_name} ({user?.email})
            </div>
          </div>
          <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
            Student Tier
          </span>
        </div>
      </div>
    </div>
  );
}
