# AMYGDALA Workspace Identity & Engineering Directives

**Repository**: `https://github.com/abhisshekkk1/AMYGDALA_BETA.git`  
**System**: AMYGDALA — AI-Powered Learning, Knowledge Management & Exam Preparation Platform  
**Architecture**: Monorepo with Next.js 15 (App Router, React 19, TypeScript, Tailwind CSS, Framer Motion) frontend and Python FastAPI (SQLAlchemy, Pydantic v2, PyMuPDF) backend.

---

## Non-Negotiable Engineering Rules

1. **Strict Pydantic v2 Schemas**:
   - Never use raw `dict` or untyped `Any` as FastAPI request payloads or response envelopes.
   - All request bodies and endpoint responses must be defined with explicit Pydantic v2 `BaseModel` classes in `backend/app/schemas/`.
   - Numeric hyper-parameters (such as `temperature`) must be typed as `float` (not `str` or loose text) with validation bounds `ge=0.0, le=1.0`.

2. **Strict Multi-Tenant User Isolation**:
   - Every database query touching user-owned entities (`Document`, `DocumentChunk`, `Folder`, `ChatSession`, `ChatMessage`, `PracticeTest`, `TestQuestion`, `FlashcardDeck`, `Flashcard`, `MindMap`, `StudyNote`, `ActivityLog`, `AISetting`) MUST strictly filter by `user_id == current_user.id`.
   - Cross-user data leakage is strictly forbidden.

3. **Verifiable Source Grounding & Page Citations**:
   - Document ingestion must preserve granular page numbers (`page_number` / `source_page`), structural headings, and verbatim text excerpts.
   - RAG responses must supply clickable page citations.
   - For full-document operations (summaries, revision sheets, study notes), use `RAGEngine.get_stratified_chunks()` to evenly sample across the entire page spectrum rather than slicing top chunks.

4. **Centralized LLM Provider Routing**:
   - Direct third-party API calls outside `AIProviderService` are forbidden.
   - All model interaction routes through `AIProviderService`, supporting OpenAI, Google Gemini, local Ollama, and OpenAI-compatible endpoints with graceful offline fallback when no external API key is active.
   - Never hardcode API keys or credentials.

5. **Immediate Client-Server Schema Synchronization**:
   - Whenever backend schemas change, update TypeScript interfaces in `frontend/types/index.ts` and sync the API client in `frontend/lib/api.ts` (and `frontend/src/lib/api.ts`).
   - Run `npx tsc --noEmit` to verify type agreement.
