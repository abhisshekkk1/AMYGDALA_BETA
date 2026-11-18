"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Document, Citation } from "@/types";
import { DocumentPageDrawer } from "@/components/DocumentPageDrawer";
import {
  GraduationCap,
  Sparkles,
  FileCheck2,
  FileText,
  Printer,
  CheckCircle2,
  HelpCircle,
  Loader2,
  BookOpen,
  ArrowRight,
  Code2,
  Download,
  Copy,
  Check
} from "lucide-react";

export default function ExamPrepPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-500">Loading Exam Engine...</div>}>
      <ExamPrepContent />
    </Suspense>
  );
}

function ExamPrepContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialDocId = searchParams.get("docId") ? parseInt(searchParams.get("docId")!) : undefined;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | undefined>(initialDocId);
  const [activeTab, setActiveTab] = useState<"mcq" | "short_long" | "paper">("mcq");

  // MCQ Form
  const [mcqCount, setMcqCount] = useState(5);
  const [mcqDifficulty, setMcqDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [mcqTopic, setMcqTopic] = useState("");
  const [generatedMCQs, setGeneratedMCQs] = useState<any[]>([]);

  // Marks-based Form (2, 3, 5, 10, 15 marks)
  const [marksValue, setMarksValue] = useState<number>(5);
  const [marksTopic, setMarksTopic] = useState("");
  const [generatedMarksQuestion, setGeneratedMarksQuestion] = useState<any | null>(null);

  // Question Paper Generator Form
  const [paperTitle, setPaperTitle] = useState("Midterm Examination");
  const [paperSubject, setPaperSubject] = useState("Computer Science & Engineering");
  const [paperMarks, setPaperMarks] = useState(50);
  const [paperDuration, setPaperDuration] = useState(60);
  const [generatedPaper, setGeneratedPaper] = useState<any | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [includeAnswersInExport, setIncludeAnswersInExport] = useState(false);

  // Export Exam Paper to Markdown
  const handleExportPaperMarkdown = () => {
    if (!generatedPaper) return;
    let md = `# ${generatedPaper.title}\n\n`;
    md += `**Subject:** ${generatedPaper.subject}  \n`;
    md += `**Duration:** ${generatedPaper.duration_minutes} Minutes | **Total Marks:** ${generatedPaper.total_marks} Marks\n`;
    md += `**Mode:** ${includeAnswersInExport ? "Complete with Solutions & Marking Rubrics" : "Student Practice Question Paper"}\n\n`;
    md += `## Instructions\n`;
    generatedPaper.instructions?.forEach((ins: string) => {
      md += `- ${ins}\n`;
    });
    md += `\n---\n\n`;

    generatedPaper.sections?.forEach((sec: any) => {
      md += `## ${sec.section_name} [${sec.total_marks} Marks]\n\n`;
      sec.questions?.forEach((q: any, qi: number) => {
        md += `### ${qi + 1}. ${q.question || q.question_text} ${q.marks ? `(${q.marks} Marks)` : ""}\n`;
        if (q.options) {
          q.options.forEach((opt: string) => {
            md += `- ${opt}\n`;
          });
        }
        if (includeAnswersInExport) {
          if (q.correct_answer) {
            md += `\n**Correct Answer:** ${q.correct_answer}\n`;
          }
          if (q.explanation) {
            md += `\n**Explanation:** ${q.explanation}\n`;
          }
          if (q.model_answer) {
            md += `\n**Model Answer:**\n${q.model_answer}\n`;
          }
          if (q.marking_rubric) {
            md += `\n**Marking Scheme:**\n`;
            q.marking_rubric.forEach((r: any) => {
              md += `- ${r.criterion}: ${r.marks}M\n`;
            });
          }
        }
        md += `\n`;
      });
    });

    if (!includeAnswersInExport) {
      md += `\n*(Solutions and marking rubrics omitted for practice examination mode)*\n`;
    }

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const modeTag = includeAnswersInExport ? "with_solutions" : "practice_paper";
    a.download = `${generatedPaper.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${modeTag}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Print-Ready Academic Exam Paper
  const handlePrintPaper = () => {
    if (!generatedPaper) return;
    const printWindow = window.open("", "_blank", "width=900,height=750");
    if (!printWindow) return;

    let sectionsHtml = "";
    let solutionsHtml = "";

    generatedPaper.sections?.forEach((sec: any) => {
      let questionsHtml = "";
      sec.questions?.forEach((q: any, qi: number) => {
        let optionsHtml = "";
        if (q.options) {
          optionsHtml = `<div class="options">${q.options.map((opt: string) => `<div>${opt}</div>`).join("")}</div>`;
        }
        questionsHtml += `
          <div class="question-block">
            <div class="q-text"><strong>${qi + 1}.</strong> ${q.question || q.question_text} <span class="marks">${q.marks ? `[${q.marks} Marks]` : ""}</span></div>
            ${optionsHtml}
          </div>
        `;

        if (includeAnswersInExport) {
          let rubricList = "";
          if (q.marking_rubric) {
            rubricList = `<ul>${q.marking_rubric.map((r: any) => `<li>${r.criterion}: ${r.marks}M</li>`).join("")}</ul>`;
          }
          solutionsHtml += `
            <div class="sol-block" style="margin-bottom: 16px;">
              <div><strong>Q${qi + 1}: ${q.question || q.question_text}</strong></div>
              ${q.correct_answer ? `<div><strong>Correct:</strong> ${q.correct_answer}</div>` : ""}
              ${q.explanation ? `<div><em>Explanation:</em> ${q.explanation}</div>` : ""}
              ${q.model_answer ? `<div style="margin-top: 4px; white-space: pre-wrap;"><strong>Model Answer:</strong><br/>${q.model_answer}</div>` : ""}
              ${rubricList ? `<div style="margin-top: 4px;"><strong>Rubric:</strong>${rubricList}</div>` : ""}
            </div>
          `;
        }
      });

      sectionsHtml += `
        <div class="section-block">
          <div class="section-title"><span>${sec.section_name}</span><span>[${sec.total_marks} Marks]</span></div>
          ${questionsHtml}
        </div>
      `;
    });

    const instructionsHtml = generatedPaper.instructions?.map((ins: string) => `<li>${ins}</li>`).join("") || "";

    const solutionsSection = includeAnswersInExport ? `
      <div style="page-break-before: always; margin-top: 30px; border-top: 2px dashed #000; padding-top: 20px;">
        <h2 style="text-align: center; font-size: 14pt; text-transform: uppercase; margin-bottom: 16px;">Complete Solutions & Marking Rubrics</h2>
        ${solutionsHtml}
      </div>
    ` : "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${generatedPaper.title}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Times New Roman', Georgia, serif; font-size: 11pt; color: #111; padding: 2cm 2.5cm; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; }
          .header h1 { font-size: 16pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
          .header h2 { font-size: 12pt; font-weight: normal; margin-top: 4px; }
          .meta { display: flex; justify-content: space-between; font-size: 10pt; font-weight: bold; margin-top: 10px; }
          .instructions { font-size: 10pt; margin-bottom: 16px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
          .instructions ul { margin-left: 20px; }
          .section-block { margin-top: 20px; }
          .section-title { font-weight: bold; font-size: 11pt; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 4px; display: flex; justify-content: space-between; margin-bottom: 12px; }
          .question-block { margin-bottom: 14px; page-break-inside: avoid; }
          .q-text { font-size: 11pt; }
          .marks { float: right; font-weight: bold; }
          .options { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 10pt; margin-top: 6px; padding-left: 20px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${generatedPaper.title}</h1>
          <h2>${generatedPaper.subject}</h2>
          <div class="meta">
            <span>Duration: ${generatedPaper.duration_minutes} Minutes</span>
            <span>Maximum Marks: ${generatedPaper.total_marks}</span>
          </div>
        </div>
        <div class="instructions">
          <strong>General Instructions:</strong>
          <ul>${instructionsHtml}</ul>
        </div>
        ${sectionsHtml}
        ${solutionsSection}
        <script>
          window.onload = () => { window.print(); window.close(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    api.getDocuments().then((docs) => {
      setDocuments(docs);
      if (!selectedDocId && docs.length > 0) {
        setSelectedDocId(docs[0].id);
      }
    });
  }, []);

  const handleGenerateMCQs = async () => {
    if (!selectedDocId) return;
    setIsGenerating(true);
    setStatusMessage("Synthesizing curriculum MCQs with exact source page citations...");
    try {
      const res = await api.generateMCQs([selectedDocId], mcqCount, mcqDifficulty, mcqTopic || undefined);
      setGeneratedMCQs(res.questions || []);
    } catch (err: any) {
      alert("MCQ generation failed: " + err.message);
    } finally {
      setIsGenerating(false);
      setStatusMessage(null);
    }
  };

  const handleLaunchTest = async () => {
    if (generatedMCQs.length === 0) return;
    setIsGenerating(true);
    try {
      const test = await api.createPracticeTest(
        `Diagnostic Assessment: ${mcqTopic || "Curriculum Evaluation"}`,
        generatedMCQs,
        selectedDocId,
        15
      );
      router.push(`/tests?testId=${test.id}`);
    } catch (err: any) {
      alert("Failed to create test session: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateMarksQuestion = async () => {
    if (!selectedDocId) return;
    setIsGenerating(true);
    setStatusMessage(`Drafting ${marksValue}-mark examination question with rubric adaptation...`);
    try {
      const res = await api.generateMarksQuestion([selectedDocId], marksValue, marksTopic || undefined);
      setGeneratedMarksQuestion(res);
    } catch (err: any) {
      alert("Question generation failed: " + err.message);
    } finally {
      setIsGenerating(false);
      setStatusMessage(null);
    }
  };

  const handleGeneratePaper = async () => {
    if (!selectedDocId) return;
    setIsGenerating(true);
    setStatusMessage("Structuring multi-section examination paper & marking scheme...");
    try {
      const res = await api.generateQuestionPaper([selectedDocId], paperTitle, paperSubject, paperMarks, paperDuration);
      setGeneratedPaper(res);
    } catch (err: any) {
      alert("Paper generation failed: " + err.message);
    } finally {
      setIsGenerating(false);
      setStatusMessage(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
            AI Exam Preparation Engine
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Generate curriculum-grounded Multiple Choice Questions, marks-adapted short/long answers, and complete exam papers.
          </p>
        </div>

        {/* Document Context Selector */}
        <div className="flex items-center gap-2 bg-[#111827] border border-[#1f2937] px-3 py-1.5 rounded-xl">
          <BookOpen className="h-4 w-4 text-indigo-400 shrink-0" />
          <select
            value={selectedDocId || ""}
            onChange={(e) => setSelectedDocId(parseInt(e.target.value))}
            className="bg-transparent text-xs text-gray-200 focus:outline-none cursor-pointer"
          >
            {documents.map((d) => (
              <option key={d.id} value={d.id} className="bg-[#111827] text-white">
                {d.title} ({d.page_count}p)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1f2937] pb-2">
        <button
          onClick={() => setActiveTab("mcq")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "mcq"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-gray-400 hover:text-white hover:bg-gray-800"
          }`}
        >
          A. Multiple Choice (MCQs)
        </button>
        <button
          onClick={() => setActiveTab("short_long")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "short_long"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-gray-400 hover:text-white hover:bg-gray-800"
          }`}
        >
          B & C. Marks-Based Questions (2, 5, 10, 15 Marks)
        </button>
        <button
          onClick={() => setActiveTab("paper")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "paper"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-gray-400 hover:text-white hover:bg-gray-800"
          }`}
        >
          D. Full Examination Paper Generator
        </button>
      </div>

      {/* TAB A: MCQs */}
      {activeTab === "mcq" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#111827] border border-[#1f2937] space-y-4">
            <h2 className="text-sm font-semibold text-white">MCQ Generation Parameters</h2>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Topic or Chapter Focus (Optional)</label>
              <input
                type="text"
                value={mcqTopic}
                onChange={(e) => setMcqTopic(e.target.value)}
                placeholder="e.g. CAP theorem, consensus, replication"
                className="w-full bg-[#0b0f17] border border-[#1f2937] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Number of MCQs</label>
                <select
                  value={mcqCount}
                  onChange={(e) => setMcqCount(parseInt(e.target.value))}
                  className="w-full bg-[#0b0f17] border border-[#1f2937] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value={3}>3 Questions</option>
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Difficulty</label>
                <select
                  value={mcqDifficulty}
                  onChange={(e) => setMcqDifficulty(e.target.value as any)}
                  className="w-full bg-[#0b0f17] border border-[#1f2937] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 capitalize"
                >
                  <option value="easy">Easy (Definitions)</option>
                  <option value="medium">Medium (Analytical)</option>
                  <option value="hard">Hard (Complex Scenarios)</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateMCQs}
              disabled={isGenerating || !selectedDocId}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>Generate MCQs</span>
            </button>
          </div>

          {/* Results Preview */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-[#111827] border border-[#1f2937]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">
                Generated Assessment Questions ({generatedMCQs.length})
              </h2>
              {generatedMCQs.length > 0 && (
                <button
                  onClick={handleLaunchTest}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow"
                >
                  <FileCheck2 className="h-4 w-4" />
                  <span>Start Interactive Test</span>
                </button>
              )}
            </div>

            {isGenerating && (
              <div className="p-8 text-center text-xs text-indigo-400 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{statusMessage}</span>
              </div>
            )}

            {!isGenerating && generatedMCQs.length === 0 && (
              <div className="p-12 text-center text-xs text-gray-500">
                Configure parameters and click Generate MCQs to inspect examination items.
              </div>
            )}

            <div className="space-y-4">
              {generatedMCQs.map((q, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[#0b0f17] border border-[#1f2937] space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-semibold text-gray-200">
                      Q{idx + 1}. {q.question}
                    </span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {q.difficulty || "Medium"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {q.options?.map((opt: string, oi: number) => (
                      <div
                        key={oi}
                        className={`p-2.5 rounded-lg text-xs border ${
                          opt === q.correct_answer
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-medium"
                            : "bg-gray-900/60 border-gray-800 text-gray-400"
                        }`}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>

                  {q.explanation && (
                    <div className="text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-800/60">
                      <strong>Academic Explanation:</strong> {q.explanation}
                    </div>
                  )}

                  {q.source_page && (
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCitation({
                            document_id: selectedDocId || 1,
                            document_title: q.document_name || "Study Document",
                            page_number: q.source_page || 1,
                            excerpt: q.explanation || q.question,
                            citation: `[${q.document_name || "Source"} — Page ${q.source_page || 1}]`
                          });
                        }}
                        className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-[11px] text-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <BookOpen className="h-3 w-3" />
                        <span>{q.document_name || "Source"} • Page {q.source_page}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB B & C: Marks-Based Questions */}
      {activeTab === "short_long" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#111827] border border-[#1f2937] space-y-4">
            <h2 className="text-sm font-semibold text-white">Marks-Tailored Question Rubric</h2>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Target Marks Allocation</label>
              <div className="grid grid-cols-5 gap-1.5">
                {[2, 3, 5, 10, 15].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMarksValue(m)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      marksValue === m
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "bg-gray-900 text-gray-400 hover:text-white border border-gray-800"
                    }`}
                  >
                    {m}M
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-gray-400 bg-gray-900/80 p-3 rounded-xl border border-gray-800">
              {marksValue <= 2 && "2 Marks Rubric: Direct definition, 2 essential points, concise answer."}
              {marksValue === 3 && "3 Marks Rubric: Definition + 3 core explanatory mechanisms."}
              {marksValue === 5 && "5 Marks Rubric: Introduction, structured explanation, key points & concrete examples."}
              {marksValue === 10 && "10 Marks Rubric: Detailed introduction, structured explanation with subheadings, examples, conclusion."}
              {marksValue === 15 && "15 Marks Rubric: Comprehensive academic essay, flowchart/architecture representation, critical evaluation, conclusion."}
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Topic or Concept</label>
              <input
                type="text"
                value={marksTopic}
                onChange={(e) => setMarksTopic(e.target.value)}
                placeholder="e.g. Distributed consensus or CAP theorem"
                className="w-full bg-[#0b0f17] border border-[#1f2937] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              onClick={handleGenerateMarksQuestion}
              disabled={isGenerating || !selectedDocId}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>Generate {marksValue}-Mark Question</span>
            </button>
          </div>

          {/* Results Preview */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-[#111827] border border-[#1f2937]">
            <h2 className="text-sm font-semibold text-white mb-4">
              Model Question & Academic Answer Scheme
            </h2>

            {isGenerating && (
              <div className="p-8 text-center text-xs text-indigo-400 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{statusMessage}</span>
              </div>
            )}

            {!isGenerating && !generatedMarksQuestion && (
              <div className="p-12 text-center text-xs text-gray-500">
                Select marks tier (2, 3, 5, 10, or 15 Marks) to preview structured model answers.
              </div>
            )}

            {generatedMarksQuestion && (
              <div className="p-5 rounded-xl bg-[#0b0f17] border border-[#1f2937] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                  <span className="text-sm font-bold text-white">
                    {generatedMarksQuestion.question}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold text-xs border border-indigo-500/30">
                    {generatedMarksQuestion.marks} Marks
                  </span>
                </div>

                {/* Marking Rubric */}
                {generatedMarksQuestion.marking_rubric && (
                  <div className="p-3 rounded-xl bg-gray-900 border border-gray-800">
                    <div className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-2">
                      Official Marking Scheme Distribution:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {generatedMarksQuestion.marking_rubric.map((r: any, idx: number) => (
                        <div key={idx} className="p-2 rounded bg-black/40 text-[11px] text-gray-400">
                          <span className="text-gray-200 font-semibold">{r.criterion}:</span> {r.marks}M
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Model Answer */}
                <div className="text-xs md:text-sm text-gray-300 whitespace-pre-wrap leading-relaxed font-sans">
                  {generatedMarksQuestion.model_answer}
                </div>

                {/* Source Citations */}
                {generatedMarksQuestion.source_citations && generatedMarksQuestion.source_citations.length > 0 && (
                  <div className="pt-3 border-t border-gray-800 flex items-center gap-2">
                    <span className="text-[11px] text-gray-500">Source:</span>
                    {generatedMarksQuestion.source_citations.map((c: any, ci: number) => (
                      <button
                        key={ci}
                        type="button"
                        onClick={() => {
                          setActiveCitation({
                            document_id: selectedDocId || 1,
                            document_title: c.document || "Study Document",
                            page_number: c.page || 1,
                            excerpt: generatedMarksQuestion.model_answer.slice(0, 200),
                            citation: `[${c.document || "Source"} — Page ${c.page || 1}]`
                          });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-[11px] text-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <BookOpen className="h-3 w-3" />
                        <span>{c.document} • Page {c.page}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB D: Question Paper Generator */}
      {activeTab === "paper" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#111827] border border-[#1f2937] space-y-4">
            <h2 className="text-sm font-semibold text-white">Paper Specifications</h2>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Examination Title</label>
              <input
                type="text"
                value={paperTitle}
                onChange={(e) => setPaperTitle(e.target.value)}
                className="w-full bg-[#0b0f17] border border-[#1f2937] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Subject / Discipline</label>
              <input
                type="text"
                value={paperSubject}
                onChange={(e) => setPaperSubject(e.target.value)}
                className="w-full bg-[#0b0f17] border border-[#1f2937] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Total Marks</label>
                <input
                  type="number"
                  value={paperMarks}
                  onChange={(e) => setPaperMarks(parseInt(e.target.value))}
                  className="w-full bg-[#0b0f17] border border-[#1f2937] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Duration (Mins)</label>
                <input
                  type="number"
                  value={paperDuration}
                  onChange={(e) => setPaperDuration(parseInt(e.target.value))}
                  className="w-full bg-[#0b0f17] border border-[#1f2937] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              onClick={handleGeneratePaper}
              disabled={isGenerating || !selectedDocId}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              <span>Generate Full Examination Paper</span>
            </button>
          </div>

          {/* Paper View */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-[#111827] border border-[#1f2937]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-sm font-semibold text-white">Printable Examination Paper</h2>
              {generatedPaper && (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer bg-[#0b0f17] border border-[#1f2937] hover:border-gray-700 px-2.5 py-1.5 rounded-lg select-none transition-colors">
                    <input
                      type="checkbox"
                      checked={includeAnswersInExport}
                      onChange={(e) => setIncludeAnswersInExport(e.target.checked)}
                      className="rounded border-gray-700 text-indigo-600 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                    />
                    <span className="font-medium">Include Answers / Rubrics</span>
                  </label>

                  <button
                    onClick={handleExportPaperMarkdown}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Export as Markdown"
                  >
                    <Code2 className="h-4 w-4 text-indigo-400" />
                    <span>Export to Markdown</span>
                  </button>
                  <button
                    onClick={handlePrintPaper}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shadow cursor-pointer"
                    title="Print / Save as PDF"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print / Save as PDF</span>
                  </button>
                </div>
              )}
            </div>

            {isGenerating && (
              <div className="p-8 text-center text-xs text-indigo-400 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{statusMessage}</span>
              </div>
            )}

            {!isGenerating && !generatedPaper && (
              <div className="p-12 text-center text-xs text-gray-500">
                Click Generate to compile full Section A, Section B, and Section C exam papers.
              </div>
            )}

            {generatedPaper && (
              <div className="p-8 rounded-xl bg-white text-gray-900 shadow-2xl print:shadow-none space-y-6 font-serif">
                {/* Header */}
                <div className="text-center border-b-2 border-gray-900 pb-4">
                  <h1 className="text-xl font-bold uppercase tracking-wider">{generatedPaper.title}</h1>
                  <h2 className="text-sm font-semibold text-gray-700 mt-1">{generatedPaper.subject}</h2>
                  <div className="flex justify-between text-xs font-sans font-semibold mt-3 text-gray-600">
                    <span>Duration: {generatedPaper.duration_minutes} Minutes</span>
                    <span>Total Marks: {generatedPaper.total_marks} Marks</span>
                  </div>
                </div>

                {/* Instructions */}
                <div className="text-xs font-sans text-gray-700 space-y-1">
                  <strong>Instructions:</strong>
                  {generatedPaper.instructions?.map((ins: string, idx: number) => (
                    <div key={idx}>• {ins}</div>
                  ))}
                </div>

                {/* Sections */}
                {generatedPaper.sections?.map((sec: any, si: number) => (
                  <div key={si} className="space-y-3 pt-3 border-t border-gray-300">
                    <div className="flex justify-between items-center font-sans font-bold text-xs uppercase border-b pb-1 text-indigo-900">
                      <span>{sec.section_name}</span>
                      <span>[{sec.total_marks} Marks]</span>
                    </div>

                    <div className="space-y-4 text-xs font-sans">
                      {sec.questions?.map((q: any, qi: number) => (
                        <div key={qi} className="space-y-1">
                          <div className="font-semibold text-gray-900">
                            {qi + 1}. {q.question || q.question_text} {q.marks ? `(${q.marks} Marks)` : ""}
                          </div>
                          {q.options && (
                            <div className="grid grid-cols-2 gap-1 text-[11px] text-gray-700 pl-4">
                              {q.options.map((opt: string, oi: number) => (
                                <div key={oi}>{opt}</div>
                              ))}
                            </div>
                          )}

                          {includeAnswersInExport && (
                            <div className="mt-1.5 pl-3 border-l-2 border-indigo-400 text-[11px] text-gray-700 space-y-1 bg-gray-50/80 p-2 rounded">
                              {q.correct_answer && (
                                <div><strong className="text-emerald-700">Correct:</strong> {q.correct_answer}</div>
                              )}
                              {q.explanation && (
                                <div><strong className="text-gray-900">Explanation:</strong> {q.explanation}</div>
                              )}
                              {q.model_answer && (
                                <div className="mt-1">
                                  <strong className="text-indigo-900">Model Answer:</strong>
                                  <div className="whitespace-pre-wrap text-gray-800 mt-0.5">{q.model_answer}</div>
                                </div>
                              )}
                              {q.marking_rubric && (
                                <div className="pt-1 mt-1 border-t border-gray-200">
                                  <strong className="text-indigo-900">Marking Rubric:</strong>
                                  <div className="flex flex-wrap gap-2 mt-0.5">
                                    {q.marking_rubric.map((r: any, ri: number) => (
                                      <span key={ri} className="bg-white px-1.5 py-0.5 rounded border text-[10px] text-gray-600">
                                        {r.criterion}: <strong>{r.marks}M</strong>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Side-panel page preview drawer */}
      <DocumentPageDrawer citation={activeCitation} onClose={() => setActiveCitation(null)} />
    </div>
  );
}
