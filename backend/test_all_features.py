import os
import json
from fastapi.testclient import TestClient
from app.main import app, init_seed_data
from app.core.database import Base, engine

# Initialize tables & seeds
Base.metadata.create_all(bind=engine)
init_seed_data()

client = TestClient(app)

def run_tests():
    print("==================================================")
    print("MENTORA END-TO-END AUTOMATED VERIFICATION SUITE")
    print("==================================================")

    # 1. Health Check
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("✔ 1. Health Check Endpoint: OK (200)")

    # 2. Authentication Login
    login_res = client.post("/api/v1/auth/login", json={
        "email": "student@mentora.ai",
        "password": "mentora123"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✔ 2. User Authentication & JWT Issuance: OK (200)")

    # 3. User Profile
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "student@mentora.ai"
    print("✔ 3. User Profile Verification: OK (200)")

    # 4. Document Library
    docs_res = client.get("/api/v1/documents", headers=headers)
    assert docs_res.status_code == 200
    docs = docs_res.json()
    assert len(docs) > 0, "No seeded documents found"
    doc_id = docs[0]["id"]
    print(f"✔ 4. Document Library Retrieval: OK ({len(docs)} documents indexed)")

    # 5. Document Upload Pipeline (Txt/Md test)
    sample_content = (
        "# Operating Systems: Virtual Memory & Paging\n\n"
        "Virtual memory decouples logical memory as perceived by the programmer from physical memory. "
        "Pages represent fixed-length contiguous blocks of virtual memory, whereas page frames represent "
        "fixed-length blocks of physical memory. The Translation Lookaside Buffer (TLB) acts as a high-speed "
        "hardware cache to accelerate page-table lookups."
    )
    test_file_path = "test_memory_architecture.txt"
    with open(test_file_path, "w", encoding="utf-8") as f:
        f.write(sample_content)

    with open(test_file_path, "rb") as f:
        upload_res = client.post(
            "/api/v1/documents/upload",
            headers=headers,
            files={"file": ("test_memory_architecture.txt", f, "text/plain")}
        )
    if os.path.exists(test_file_path):
        os.remove(test_file_path)

    assert upload_res.status_code == 200, f"Upload failed: {upload_res.text}"
    new_doc = upload_res.json()
    new_doc_id = new_doc["id"]
    print(f"✔ 5. Document Ingestion, Chunking & Embedding Pipeline: OK (Document #{new_doc_id})")

    # 6. RAG AI Study Assistant with Citations
    chat_res = client.post(
        "/api/v1/assistant/chat",
        headers=headers,
        json={
            "content": "Explain what the CAP theorem states about consistency and availability.",
            "document_ids": [doc_id],
            "tone": "academic"
        }
    )
    assert chat_res.status_code == 200, f"Chat failed: {chat_res.text}"
    chat_data = chat_res.json()
    assert "citations" in chat_data
    assert len(chat_data["citations"]) > 0, "Expected citations from RAG retrieval"
    print(f"✔ 6. RAG AI Assistant with Page Citations: OK ({len(chat_data['citations'])} source citations returned)")

    # 7. Exam Preparation: MCQ Generation
    mcq_res = client.post(
        "/api/v1/exam/generate-mcqs",
        headers=headers,
        json={
            "document_ids": [doc_id],
            "num_questions": 3,
            "difficulty": "medium",
            "topic": "CAP Theorem"
        }
    )
    assert mcq_res.status_code == 200, f"MCQ generation failed: {mcq_res.text}"
    mcqs = mcq_res.json()["questions"]
    assert len(mcqs) > 0
    print(f"✔ 7. AI MCQ Examination Generation: OK ({len(mcqs)} questions created)")

    # 8. Exam Preparation: Marks-Tailored Questions (5 Marks)
    marks_res = client.post(
        "/api/v1/exam/generate-marks-question",
        headers=headers,
        json={
            "document_ids": [doc_id],
            "marks": 5,
            "topic": "Consensus Protocols"
        }
    )
    assert marks_res.status_code == 200, f"Marks question failed: {marks_res.text}"
    marks_data = marks_res.json()
    assert marks_data["marks"] == 5
    assert "marking_rubric" in marks_data
    print("✔ 8. Marks-Tailored Question & Rubric Generation (5M): OK")

    # 9. Full Question Paper Generator
    paper_res = client.post(
        "/api/v1/exam/generate-paper",
        headers=headers,
        json={
            "document_ids": [doc_id],
            "title": "Semester Final Exam",
            "subject": "Distributed Systems",
            "total_marks": 50,
            "duration_minutes": 60
        }
    )
    assert paper_res.status_code == 200
    paper = paper_res.json()
    assert len(paper["sections"]) == 3
    print("✔ 9. Full Multi-Section Examination Paper Generator: OK (Sections A, B, C)")

    # 10. Interactive Practice Test Creation & Submission
    test_create_res = client.post(
        "/api/v1/exam/tests/create-from-mcqs",
        headers=headers,
        json={
            "title": "Verification Practice Test",
            "questions": mcqs,
            "document_id": doc_id,
            "duration_minutes": 15
        }
    )
    assert test_create_res.status_code == 200
    created_test = test_create_res.json()
    test_id = created_test["id"]

    # Submit answers
    sample_answers = {q["id"]: q["options"][0] if q.get("options") else "A" for q in created_test["questions"]}
    submit_res = client.post(
        f"/api/v1/exam/tests/{test_id}/submit",
        headers=headers,
        json={"answers": sample_answers}
    )
    assert submit_res.status_code == 200
    submitted = submit_res.json()
    assert submitted["status"] == "completed"
    print(f"✔ 10. Interactive Test Session & Scoring Engine: OK (Score: {submitted['percentage']}%)")

    # 11. Flashcards & SM-2 Spaced Repetition
    decks_res = client.get("/api/v1/flashcards/decks", headers=headers)
    assert decks_res.status_code == 200
    decks = decks_res.json()
    assert len(decks) > 0
    deck_id = decks[0]["id"]
    card_id = decks[0]["cards"][0]["id"]

    review_res = client.post(
        f"/api/v1/flashcards/cards/{card_id}/review",
        headers=headers,
        json={"rating": 3}  # Easy
    )
    assert review_res.status_code == 200
    updated_card = review_res.json()
    assert updated_card["repetition"] > 0
    print(f"✔ 11. SuperMemo SM-2 Spaced Repetition Engine: OK (Interval updated to {updated_card['interval_days']} days)")

    # 12. Mind Map Generation
    mindmap_res = client.post(
        "/api/v1/mindmaps/generate",
        headers=headers,
        json={"document_id": doc_id, "central_topic": "Distributed Architecture"}
    )
    assert mindmap_res.status_code == 200
    mm_data = mindmap_res.json()
    assert len(mm_data["nodes"]) > 0
    print(f"✔ 12. Hierarchical Mind Map Tree Generator: OK ({len(mm_data['nodes'])} nodes rendered)")

    # 13. Study Notes & Summaries Generator
    note_res = client.post(
        "/api/v1/notes/generate",
        headers=headers,
        json={"document_id": doc_id, "note_type": "summary"}
    )
    assert note_res.status_code == 200
    note_data = note_res.json()
    assert len(note_data["content_markdown"]) > 0
    print("✔ 13. Chapter Summary & Note Generation: OK")

    # 14. Learning Analytics & Recommendations
    analytics_res = client.get("/api/v1/analytics/dashboard", headers=headers)
    assert analytics_res.status_code == 200
    analytics_data = analytics_res.json()
    assert "summary" in analytics_data
    assert analytics_data["summary"]["total_study_minutes"] > 0
    print("✔ 14. Real Learning Analytics & Engagement Trajectory: OK")

    # 15. AI Settings Management
    settings_res = client.put(
        "/api/v1/settings/ai",
        headers=headers,
        json={"provider": "openai", "model_name": "gpt-4o-mini", "temperature": "0.3"}
    )
    assert settings_res.status_code == 200
    print("✔ 15. AI Provider Configuration Management: OK")

    print("==================================================")
    print("ALL 15 ENTERPRISE SUBSYSTEMS VERIFIED AND OPERATIONAL!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
