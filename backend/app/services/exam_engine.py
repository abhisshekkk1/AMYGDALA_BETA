import json
import re
from typing import List, Dict, Any, Optional
from app.services.ai_providers import AIProviderService

class ExamEngine:
    """
    Intelligent examination generation engine supporting:
    - Multiple Choice Questions (Easy, Medium, Hard)
    - Short Answer Questions (2, 3, 5 marks with tailored rubric)
    - Long Answer Questions (5, 10, 15 marks with academic structure)
    - Full Question Paper Generator with sections, durations, and answer key
    """

    @classmethod
    async def generate_mcqs(
        cls,
        context_chunks: List[Dict[str, Any]],
        num_questions: int = 5,
        difficulty: str = "medium",
        subject: Optional[str] = None,
        provider: str = "openai",
        api_key: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        if not context_chunks:
            return cls._fallback_mcqs(num_questions, difficulty)

        context_text = "\n\n".join([
            f"[Source: {c['document_title']} | Page {c['page_number']}]\n{c['content']}"
            for c in context_chunks[:6]
        ])

        prompt = (
            f"Generate exactly {num_questions} rigorous, examination-level Multiple Choice Questions (MCQs) "
            f"at '{difficulty}' difficulty based SOLELY on the study material below.\n\n"
            f"Output MUST be strict valid JSON array of objects with the following schema:\n"
            f"[\n"
            f"  {{\n"
            f"    \"question\": \"Question text here\",\n"
            f"    \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"],\n"
            f"    \"correct_answer\": \"Option A\",\n"
            f"    \"explanation\": \"Detailed academic reasoning for why this option is correct and others are incorrect\",\n"
            f"    \"source_page\": 1,\n"
            f"    \"difficulty\": \"{difficulty}\"\n"
            f"  }}\n"
            f"]\n\n"
            f"STUDY MATERIAL:\n{context_text}"
        )

        messages = [{"role": "user", "content": prompt}]
        response = await AIProviderService.generate_chat_response(
            messages=messages,
            context_chunks=context_chunks,
            provider=provider,
            api_key=api_key,
            temperature=0.2
        )

        content = response.get("content", "")
        parsed = cls._extract_json_array(content)
        if parsed:
            return parsed

        return cls._fallback_mcqs_from_chunks(context_chunks, num_questions, difficulty)

    @classmethod
    async def generate_marks_question(
        cls,
        context_chunks: List[Dict[str, Any]],
        marks: int = 5,
        topic: str = "",
        provider: str = "openai",
        api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates examination question and model answer structured strictly according to the marks allocated:
        - 2 marks: Direct definition, essential points, concise answer.
        - 3 marks: Concise definition, 3 core explanatory points.
        - 5 marks: Introduction, explanation, key points, relevant examples.
        - 10 marks: Detailed introduction, structured explanation, subheadings, examples, conclusion.
        - 15 marks: Comprehensive academic essay, logical structure, flowchart/diagram description, conclusion.
        """
        if marks <= 2:
            structure_req = "Direct definition, 2-3 essential points, concise and sharp answer (approx. 50-80 words)."
        elif marks <= 3:
            structure_req = "Concise introduction, 3-4 distinct technical points, focused explanation (approx. 80-120 words)."
        elif marks <= 5:
            structure_req = "Introduction, structured explanation, 4-5 key points with bullet points, and at least 1 concrete example (approx. 180-250 words)."
        elif marks <= 10:
            structure_req = "Detailed introduction, structured explanation across 3-4 subheadings, real-world/academic examples, and a formal conclusion (approx. 400-500 words)."
        else: # 15 marks
            structure_req = "Comprehensive academic answer: Executive Introduction, In-depth Conceptual Analysis with Subheadings, Flowchart or Architecture ASCII/Text representation, Critical Evaluation & Examples, and Concluding Remarks (approx. 600-800 words)."

        context_text = "\n\n".join([
            f"[Source: {c['document_title']} | Page {c['page_number']}]\n{c['content']}"
            for c in context_chunks[:6]
        ])

        prompt = (
            f"Generate a {marks}-mark academic exam question on '{topic or 'the document content'}' based on the source material below.\n"
            f"Required Answer Structure for {marks} marks: {structure_req}\n\n"
            f"Output MUST be strict JSON object with this format:\n"
            f"{{\n"
            f"  \"marks\": {marks},\n"
            f"  \"question\": \"The exam question\",\n"
            f"  \"model_answer\": \"The complete, rigorous model answer formatted with markdown headers and bullet points according to the marks specification\",\n"
            f"  \"marking_rubric\": [\n"
            f"    {{\"criterion\": \"Concept definition\", \"marks\": {round(marks*0.3, 1)}}},\n"
            f"    {{\"criterion\": \"Key points & explanation\", \"marks\": {round(marks*0.5, 1)}}},\n"
            f"    {{\"criterion\": \"Examples & conclusion\", \"marks\": {round(marks*0.2, 1)}}}\n"
            f"  ],\n"
            f"  \"source_citations\": [{{\"document\": \"{context_chunks[0]['document_title'] if context_chunks else 'Text'}\", \"page\": {context_chunks[0]['page_number'] if context_chunks else 1}}}]\n"
            f"}}\n\n"
            f"STUDY MATERIAL:\n{context_text}"
        )

        messages = [{"role": "user", "content": prompt}]
        response = await AIProviderService.generate_chat_response(
            messages=messages,
            context_chunks=context_chunks,
            provider=provider,
            api_key=api_key,
            temperature=0.2
        )

        content = response.get("content", "")
        parsed = cls._extract_json_object(content)
        if parsed:
            return parsed

        return cls._fallback_marks_question(context_chunks, marks, topic)

    @classmethod
    async def generate_full_question_paper(
        cls,
        context_chunks: List[Dict[str, Any]],
        title: str = "Examination Paper",
        subject: str = "General",
        total_marks: int = 50,
        duration_minutes: int = 60,
        provider: str = "openai",
        api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates a comprehensive examination paper with Section A (MCQs & Short Questions),
        Section B (Analytical 5-Mark Questions), and Section C (Comprehensive 10/15-Mark Long Questions).
        """
        # Distribute marks
        sec_a_marks = int(total_marks * 0.3)
        sec_b_marks = int(total_marks * 0.4)
        sec_c_marks = total_marks - sec_a_marks - sec_b_marks

        mcq_count = max(4, sec_a_marks // 2)
        short_count = max(2, sec_b_marks // 5)
        long_count = max(1, sec_c_marks // 10)

        mcqs = await cls.generate_mcqs(context_chunks, num_questions=mcq_count, provider=provider, api_key=api_key)
        
        short_questions = []
        for i in range(short_count):
            q = await cls.generate_marks_question(context_chunks, marks=5, topic=f"Question {i+1}", provider=provider, api_key=api_key)
            short_questions.append(q)

        long_questions = []
        for i in range(long_count):
            q = await cls.generate_marks_question(context_chunks, marks=10, topic=f"Comprehensive Question {i+1}", provider=provider, api_key=api_key)
            long_questions.append(q)

        paper = {
            "title": title,
            "subject": subject,
            "total_marks": total_marks,
            "duration_minutes": duration_minutes,
            "instructions": [
                "All questions in Section A are compulsory.",
                "Answer any two questions from Section B.",
                "Answer one question from Section C.",
                "Write clear, legibly structured answers with headings and bullet points where appropriate."
            ],
            "sections": [
                {
                    "section_name": "Section A: Multiple Choice & Objective",
                    "total_marks": sec_a_marks,
                    "questions": mcqs
                },
                {
                    "section_name": "Section B: Analytical & Short Answer (5 Marks Each)",
                    "total_marks": sec_b_marks,
                    "questions": short_questions
                },
                {
                    "section_name": "Section C: Comprehensive Long Answer (10 Marks Each)",
                    "total_marks": sec_c_marks,
                    "questions": long_questions
                }
            ]
        }
        return paper

    @staticmethod
    def _extract_json_array(text: str) -> Optional[List[Dict[str, Any]]]:
        try:
            match = re.search(r'\[\s*\{.*\}\s*\]', text, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            return json.loads(text)
        except Exception:
            return None

    @staticmethod
    def _extract_json_object(text: str) -> Optional[Dict[str, Any]]:
        try:
            match = re.search(r'\{\s*".*"\s*:.*\}', text, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            return json.loads(text)
        except Exception:
            return None

    @classmethod
    def _fallback_mcqs(cls, count: int, difficulty: str) -> List[Dict[str, Any]]:
        return [
            {
                "question": f"Sample Practice Question {i+1} ({difficulty.capitalize()} level)",
                "options": [
                    "A) Primary foundational concept and principle",
                    "B) Secondary secondary mechanism",
                    "C) Auxiliary parameter",
                    "D) Inapplicable premise"
                ],
                "correct_answer": "A) Primary foundational concept and principle",
                "explanation": "Option A accurately formulates the core concept described in the curriculum.",
                "source_page": 1,
                "difficulty": difficulty
            }
            for i in range(count)
        ]

    @classmethod
    def _fallback_mcqs_from_chunks(cls, chunks: List[Dict[str, Any]], count: int, difficulty: str) -> List[Dict[str, Any]]:
        results = []
        for i in range(min(count, len(chunks))):
            chunk = chunks[i]
            first_sentence = chunk["content"].split(".")[0]
            if len(first_sentence) < 15:
                first_sentence = chunk["content"][:100]

            results.append({
                "question": f"Based on {chunk['document_title']} (Page {chunk['page_number']}), what is stated regarding: \"{first_sentence[:80]}...\"?",
                "options": [
                    f"A) {chunk['content'][:90].strip()}...",
                    "B) The assertion is not verified in empirical trials.",
                    "C) The mechanism acts independently of external conditions.",
                    "D) None of the above."
                ],
                "correct_answer": f"A) {chunk['content'][:90].strip()}...",
                "explanation": f"Explicitly stated in {chunk['document_title']} on Page {chunk['page_number']}.",
                "source_page": chunk["page_number"],
                "difficulty": difficulty
            })
        return results

    @classmethod
    def _fallback_marks_question(cls, chunks: List[Dict[str, Any]], marks: int, topic: str) -> Dict[str, Any]:
        chunk = chunks[0] if chunks else {"document_title": "Uploaded Study Notes", "page_number": 1, "content": "Core principles."}
        return {
            "marks": marks,
            "question": f"Explain the fundamental concepts and principles of {topic or chunk['document_title']} in detail ({marks} Marks).",
            "model_answer": (
                f"### Introduction\n"
                f"According to {chunk['document_title']} (Page {chunk['page_number']}), the concept forms a foundational mechanism.\n\n"
                f"### Core Elements\n"
                f"- **Primary Definition**: {chunk['content'][:200]}...\n"
                f"- **Operational Mechanism**: The process functions through direct interactions as outlined in the source text.\n\n"
                f"### Conclusion\n"
                f"Mastery of this principle is critical for understanding downstream topics in this discipline."
            ),
            "marking_rubric": [
                {"criterion": "Clear Conceptual Introduction", "marks": round(marks * 0.2, 1)},
                {"criterion": "Technical Explanation & Key Points", "marks": round(marks * 0.6, 1)},
                {"criterion": "Appropriate Examples & Conclusion", "marks": round(marks * 0.2, 1)}
            ],
            "source_citations": [
                {"document": chunk["document_title"], "page": chunk["page_number"]}
            ]
        }
