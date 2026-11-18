import os
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, AISetting
from app.models.document import Document, DocumentChunk, Folder
from app.models.flashcard import FlashcardDeck, Flashcard
from app.models.mindmap import MindMap, StudyNote, ActivityLog
from app.models.exam import PracticeTest, TestQuestion
from app.services.rag_engine import RAGEngine

# Import routers
from app.api.v1 import auth, documents, assistant, exam, flashcards, mindmaps, notes, analytics, settings as settings_api

def init_seed_data():
    """Seeds default user and realistic academic materials for first-time local execution."""
    db = SessionLocal()
    try:
        # Check if default demo student exists
        demo_user = db.query(User).filter(User.email == "student@mentora.ai").first()
        if not demo_user:
            demo_user = User(
                email="student@mentora.ai",
                hashed_password=get_password_hash("mentora123"),
                full_name="Alex Chen",
                theme_preference="dark"
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)

            # Default AI setting
            ai_set = AISetting(
                user_id=demo_user.id,
                provider="openai",
                model_name="gpt-4o-mini",
                temperature="0.3"
            )
            db.add(ai_set)

            # Seed default folders
            f_cs = Folder(user_id=demo_user.id, name="Computer Science", color="#6366f1")
            f_sys = Folder(user_id=demo_user.id, name="Operating Systems", color="#10b981")
            db.add_all([f_cs, f_sys])
            db.commit()
            db.refresh(f_cs)

            # Seed Document 1: Distributed Systems Core Principles
            doc1 = Document(
                user_id=demo_user.id,
                folder_id=f_cs.id,
                title="Distributed Systems & Cloud Architecture",
                filename="distributed_systems_notes.pdf",
                file_type="pdf",
                file_path=os.path.join(settings.UPLOAD_DIR, "demo_doc1.pdf"),
                file_size_bytes=145000,
                page_count=3,
                processing_status="completed",
                summary="Comprehensive guide to the CAP theorem, consensus protocols (Raft, Paxos), and data consistency models in distributed cloud architecture."
            )
            db.add(doc1)
            db.commit()
            db.refresh(doc1)

            # Chunks for Document 1 with Page Citations
            p1_text = (
                "The CAP theorem, introduced by Eric Brewer, posits that in any distributed data store, "
                "it is impossible to simultaneously achieve all three guarantees: Consistency (every read receives the most recent write), "
                "Availability (every non-failing node returns a response), and Partition Tolerance (the system continues to operate despite arbitrary message loss). "
                "Because network partitions are physically inevitable in wide-area distributed systems, a system must fundamentally choose between CP (Consistency and Partition Tolerance) "
                "or AP (Availability and Partition Tolerance) during network failures."
            )
            p2_text = (
                "Consensus protocols solve the problem of agreeing on a single state transition across multiple unreliable distributed nodes. "
                "The Raft consensus algorithm is designed specifically for understandability while providing equivalent safety to Paxos. "
                "Raft decomposes consensus into three independent sub-problems: Leader Election, Log Replication, and Safety. "
                "A node in Raft operates in one of three states: Follower, Candidate, or Leader. A leader maintains authority by sending periodic heartbeats (AppendEntries RPCs)."
            )
            p3_text = (
                "Data replication models define the latency versus durability trade-off. "
                "Synchronous replication ensures zero data loss (RPO = 0) by requiring a write to be committed on all replicas before acknowledging the client, "
                "at the cost of increased write latency. In contrast, asynchronous replication minimizes write latency by acknowledging the client immediately after writing to the primary, "
                "replicating changes to secondaries in the background, which introduces potential data divergence if the primary crashes."
            )

            c1 = DocumentChunk(
                document_id=doc1.id, chunk_index=0, page_number=1,
                heading="CAP Theorem & Fundamental Trade-offs",
                content=p1_text, token_count=110,
                embedding_json=json.dumps(RAGEngine.compute_local_embedding(p1_text))
            )
            c2 = DocumentChunk(
                document_id=doc1.id, chunk_index=1, page_number=2,
                heading="Consensus Protocols: Raft and Paxos",
                content=p2_text, token_count=95,
                embedding_json=json.dumps(RAGEngine.compute_local_embedding(p2_text))
            )
            c3 = DocumentChunk(
                document_id=doc1.id, chunk_index=2, page_number=3,
                heading="Replication Strategies & Consistency Trade-offs",
                content=p3_text, token_count=105,
                embedding_json=json.dumps(RAGEngine.compute_local_embedding(p3_text))
            )
            db.add_all([c1, c2, c3])

            # Seed Flashcard Deck
            deck = FlashcardDeck(
                user_id=demo_user.id,
                document_id=doc1.id,
                title="Distributed Systems Exam Review",
                description="High-yield concepts for midterm exam on CAP theorem & Consensus.",
                color="#6366f1"
            )
            db.add(deck)
            db.commit()
            db.refresh(deck)

            fc1 = Flashcard(
                deck_id=deck.id,
                front="What three properties compose the CAP theorem, and why can't all three be guaranteed simultaneously?",
                back="Consistency, Availability, and Partition Tolerance. Because network partitions (P) are physically inevitable, the system must compromise either Consistency (AP) or Availability (CP) during network splits.",
                source_page=1,
                source_citation="Distributed Systems & Cloud Architecture (Page 1)",
                ease_factor=2.5, repetition=1, interval_days=1
            )
            fc2 = Flashcard(
                deck_id=deck.id,
                front="What are the three operational states of a node in the Raft consensus protocol?",
                back="Follower, Candidate, and Leader.",
                source_page=2,
                source_citation="Distributed Systems & Cloud Architecture (Page 2)",
                ease_factor=2.4, repetition=2, interval_days=6
            )
            db.add_all([fc1, fc2])

            # Seed Practice Test
            test = PracticeTest(
                user_id=demo_user.id,
                document_id=doc1.id,
                title="Distributed Systems Diagnostic Assessment",
                difficulty="medium",
                duration_minutes=15,
                total_marks=2,
                score_achieved=2.0,
                percentage=100.0,
                status="completed"
            )
            db.add(test)
            db.commit()
            db.refresh(test)

            tq1 = TestQuestion(
                test_id=test.id,
                order_index=1,
                question_type="mcq",
                marks=1,
                question_text="Under the CAP theorem, what must a distributed system sacrifice when a network partition occurs if it chooses Availability?",
                options_json=json.dumps([
                    "A) Consistency (reads may return stale data)",
                    "B) Partition Tolerance",
                    "C) Latency optimization",
                    "D) Leader Election"
                ]),
                correct_answer="A) Consistency (reads may return stale data)",
                explanation="In an AP system, both sides of a partition continue answering queries, leading to divergent and inconsistent states.",
                source_citation_json=json.dumps({"doc": "Distributed Systems", "page": 1}),
                user_answer="A) Consistency (reads may return stale data)",
                is_correct=True,
                marks_awarded=1.0
            )
            db.add(tq1)

            # Seed Study Activities
            act1 = ActivityLog(
                user_id=demo_user.id,
                activity_type="test_completed",
                score_percentage=100.0,
                duration_seconds=900,
                topic_or_subject="Distributed Systems Diagnostic Assessment"
            )
            act2 = ActivityLog(
                user_id=demo_user.id,
                activity_type="flashcard_reviewed",
                duration_seconds=300,
                topic_or_subject="Raft Consensus"
            )
            db.add_all([act1, act2])
            db.commit()

    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed demo data
    Base.metadata.create_all(bind=engine)
    init_seed_data()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise AI-Powered Learning, Knowledge Management & Exam Preparation Platform",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])
app.include_router(assistant.router, prefix="/api/v1/assistant", tags=["AI Study Assistant"])
app.include_router(exam.router, prefix="/api/v1/exam", tags=["Exam Preparation"])
app.include_router(flashcards.router, prefix="/api/v1/flashcards", tags=["Flashcards"])
app.include_router(mindmaps.router, prefix="/api/v1/mindmaps", tags=["Mind Maps"])
app.include_router(notes.router, prefix="/api/v1/notes", tags=["Notes & Summaries"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics & Progress"])
app.include_router(settings_api.router, prefix="/api/v1/settings", tags=["Settings"])

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "MENTORA Backend API",
        "version": settings.VERSION
    }
