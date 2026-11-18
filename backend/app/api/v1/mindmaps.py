import json
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User, AISetting
from app.models.document import Document
from app.models.mindmap import MindMap
from app.schemas.mindmap import MindMapGenerateRequest, MindMapOut
from app.api.deps import get_current_user
from app.services.rag_engine import RAGEngine
from app.services.ai_providers import AIProviderService

router = APIRouter()

@router.post("/generate", response_model=MindMapOut)
async def generate_mindmap(
    req: MindMapGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(
        Document.id == req.document_id,
        Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    chunks = RAGEngine.retrieve_relevant_chunks(
        db=db,
        query="topics structure categories hierarchy key concepts",
        document_ids=[req.document_id],
        top_k=6
    )

    central_topic = req.central_topic or doc.title

    ai_setting = db.query(AISetting).filter(
        AISetting.user_id == current_user.id,
        AISetting.is_active == True
    ).first()

    provider = ai_setting.provider if ai_setting else "openai"
    api_key = ai_setting.api_key if ai_setting else None

    prompt = (
        f"Generate a hierarchical mind map structure for '{central_topic}' based on the document text.\n"
        f"Output strict JSON with 'nodes' and 'edges':\n"
        f"{{\n"
        f"  \"nodes\": [\n"
        f"    {{\"id\": \"root\", \"label\": \"{central_topic}\", \"level\": 0}},\n"
        f"    {{\"id\": \"branch-1\", \"label\": \"Subtopic 1\", \"level\": 1, \"parentId\": \"root\"}},\n"
        f"    {{\"id\": \"leaf-1\", \"label\": \"Key Concept A\", \"level\": 2, \"parentId\": \"branch-1\"}}\n"
        f"  ],\n"
        f"  \"edges\": [\n"
        f"    {{\"id\": \"e-root-b1\", \"source\": \"root\", \"target\": \"branch-1\"}},\n"
        f"    {{\"id\": \"e-b1-l1\", \"source\": \"branch-1\", \"target\": \"leaf-1\"}}\n"
        f"  ]\n"
        f"}}\n\n"
        f"DOCUMENT TEXT:\n" + "\n\n".join([c["content"][:300] for c in chunks[:4]])
    )

    res = await AIProviderService.generate_chat_response(
        messages=[{"role": "user", "content": prompt}],
        context_chunks=chunks,
        provider=provider,
        api_key=api_key,
        temperature=0.2
    )

    nodes = []
    edges = []
    try:
        content = res.get("content", "")
        match = re.search(r'\{\s*"nodes".*"edges".*\}', content, re.DOTALL)
        data = json.loads(match.group(0)) if match else json.loads(content)
        nodes = data.get("nodes", [])
        edges = data.get("edges", [])
    except Exception:
        # Fallback hierarchical nodes
        nodes = [
            {"id": "root", "label": central_topic, "level": 0},
            {"id": "branch-1", "label": "Core Principles", "level": 1, "parentId": "root"},
            {"id": "branch-2", "label": "Key Mechanisms", "level": 1, "parentId": "root"},
            {"id": "branch-3", "label": "Applications & Analysis", "level": 1, "parentId": "root"},
            {"id": "leaf-1", "label": "Foundational Definition", "level": 2, "parentId": "branch-1"},
            {"id": "leaf-2", "label": "Primary Process", "level": 2, "parentId": "branch-2"},
            {"id": "leaf-3", "label": "Case Scenarios", "level": 2, "parentId": "branch-3"},
        ]
        edges = [
            {"id": "e1", "source": "root", "target": "branch-1"},
            {"id": "e2", "source": "root", "target": "branch-2"},
            {"id": "e3", "source": "root", "target": "branch-3"},
            {"id": "e4", "source": "branch-1", "target": "leaf-1"},
            {"id": "e5", "source": "branch-2", "target": "leaf-2"},
            {"id": "e6", "source": "branch-3", "target": "leaf-3"},
        ]

    mindmap = MindMap(
        user_id=current_user.id,
        document_id=doc.id,
        title=f"Mind Map: {central_topic}",
        central_topic=central_topic,
        nodes_json=json.dumps(nodes),
        edges_json=json.dumps(edges)
    )
    db.add(mindmap)
    db.commit()
    db.refresh(mindmap)

    return {
        "id": mindmap.id,
        "document_id": mindmap.document_id,
        "title": mindmap.title,
        "central_topic": mindmap.central_topic,
        "nodes": nodes,
        "edges": edges,
        "created_at": mindmap.created_at,
        "updated_at": mindmap.updated_at
    }

@router.get("", response_model=List[MindMapOut])
def get_mindmaps(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    maps = db.query(MindMap).filter(MindMap.user_id == current_user.id).order_by(MindMap.created_at.desc()).all()
    results = []
    for m in maps:
        nodes = []
        edges = []
        try:
            nodes = json.loads(m.nodes_json or "[]")
            edges = json.loads(m.edges_json or "[]")
        except Exception:
            pass
        results.append({
            "id": m.id,
            "document_id": m.document_id,
            "title": m.title,
            "central_topic": m.central_topic,
            "nodes": nodes,
            "edges": edges,
            "created_at": m.created_at,
            "updated_at": m.updated_at
        })
    return results

@router.get("/{mindmap_id}", response_model=MindMapOut)
def get_mindmap(mindmap_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.query(MindMap).filter(
        MindMap.id == mindmap_id,
        MindMap.user_id == current_user.id
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Mind map not found")

    return {
        "id": m.id,
        "document_id": m.document_id,
        "title": m.title,
        "central_topic": m.central_topic,
        "nodes": json.loads(m.nodes_json or "[]"),
        "edges": json.loads(m.edges_json or "[]"),
        "created_at": m.created_at,
        "updated_at": m.updated_at
    }
