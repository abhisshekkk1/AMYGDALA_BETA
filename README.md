# MENTORA: AI-Powered Learning, Knowledge Management & Exam Preparation Platform

MENTORA is a production-quality, enterprise-grade AI learning platform designed to transform textbooks, lecture notes, presentations, and syllabus materials into source-grounded learning experiences:
- **Verified AI Study Assistant** with exact document and page number citations.
- **AI Examination Preparation** with tiered Multiple Choice Questions (Easy, Medium, Hard), marks-adapted short/long answers (2, 3, 5, 10, 15 marks), and complete question papers with printable answer keys.
- **Interactive Practice Test Engine** with timed countdowns, question navigation palettes, and autosave.
- **Spaced Repetition Flashcard System** powered by the SuperMemo SM-2 retention algorithm.
- **Interactive Mind Map Visualizer** with expandable/collapsible concept trees and export capabilities.
- **Smart Revision Center & Performance Analytics** tracking actual student engagement velocity and detecting weak topics.

---

## Architecture Overview

```
d:\AI Learning Project/
├── frontend/                     # Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Framer Motion
│   ├── app/                      # App router: (auth), (dashboard), library, assistant, exam-prep, tests, etc.
│   ├── components/               # Sidebar, Topbar, Modals, Document Reader
│   ├── lib/                      # Typed API client, AuthProvider session context
│   └── types/                    # Shared TypeScript interfaces
├── backend/                      # Python FastAPI services
│   ├── app/
│   │   ├── api/v1/               # Auth, Documents, Assistant, Exam, Flashcards, Mindmaps, Analytics, Settings
│   │   ├── core/                 # Config, Database engine, Security (JWT & bcrypt)
│   │   ├── models/               # SQLAlchemy ORM models (SQLite local & PostgreSQL SaaS)
│   │   ├── schemas/              # Pydantic v2 schemas
│   │   └── services/             # Document parser (PyMuPDF, docx, pptx), Chunker, RAG Engine, SM-2 Engine
│   ├── storage/                  # Local isolated document uploads and exports
│   └── requirements.txt          # Python dependencies
├── docker-compose.yml            # Multi-container cloud SaaS orchestration (Postgres, pgvector, Backend, Frontend)
├── run_backend.bat               # 1-click Windows backend launcher
├── run_frontend.bat              # 1-click Windows frontend launcher
└── run_all.bat                   # 1-click full-stack launcher
```

---

## Quick Start on Windows

### 1. Prerequisites
- **Node.js**: v18+ (verified with v24.19)
- **Python**: 3.10+ (verified with 3.14)

### 2. Fast Launch (1-Click)
Double-click `run_all.bat` or run:
```cmd
.\run_all.bat
```

Or run services in separate terminals:

**Terminal 1 (Backend API):**
```cmd
cd backend
..\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be live at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

**Terminal 2 (Frontend Client):**
```cmd
cd frontend
npm run dev
```
Client application will be live at: [http://localhost:3000](http://localhost:3000)

---

## Default Demo Credentials

The platform automatically seeds a rich demonstration student account on initial launch with pre-indexed academic materials:

- **Email**: `student@mentora.ai`
- **Password**: `mentora123`

You can also register any new student account directly from the login page.

---

## AI Provider Configuration

MENTORA features a **provider-independent AI integration layer**:
1. **Offline Grounded Mode (Default)**: If no external LLM key is configured, MENTORA performs local RAG extraction, retrieving and displaying exact page excerpts from uploaded documents without requiring external paid services.
2. **OpenAI**: Connect your `OPENAI_API_KEY` (e.g., `gpt-4o-mini`, `gpt-4o`).
3. **Google Gemini**: Connect your `GEMINI_API_KEY` (e.g., `gemini-1.5-flash`, `gemini-1.5-pro`).
4. **Local Ollama**: Run completely private local models (`llama3:latest`, `mistral`) at `http://localhost:11434`.
5. **OpenAI-Compatible Custom Endpoints**: Any self-hosted vLLM, LMStudio, or LocalAI instance.

Configure keys either in `backend/.env` or dynamically in the **Settings** page within the application UI.

---

## Production Cloud SaaS Deployment

To run in multi-user production SaaS mode with PostgreSQL:
```bash
docker compose up -d --build
```
This deploys PostgreSQL with vector support, the FastAPI backend, and the Next.js frontend with isolated volume persistence.
