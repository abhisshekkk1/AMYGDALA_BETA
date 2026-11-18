import json
import math
import re
from typing import List, Dict, Any, Tuple
import numpy as np
from sqlalchemy.orm import Session
from app.models.document import Document, DocumentChunk

class RAGEngine:
    """
    Retrieval-Augmented Generation (RAG) engine.
    Computes vector representations, stores in document chunks, and retrieves
    the most relevant context chunks with page-number citations.
    """

    DIMENSION = 128

    @classmethod
    def compute_local_embedding(cls, text: str) -> List[float]:
        """
        Fast deterministic normalized embedding vector for local offline retrieval.
        Allows instant semantic & keyword matching without requiring external API calls.
        """
        words = re.findall(r'\b[a-zA-Z0-9_]{2,}\b', text.lower())
        vec = np.zeros(cls.DIMENSION, dtype=np.float32)

        if not words:
            return vec.tolist()

        for word in words:
            # Deterministic hash projection into embedding dimensions
            h = hash(word)
            idx1 = abs(h) % cls.DIMENSION
            idx2 = abs(h >> 7) % cls.DIMENSION
            weight = 1.0 / (1.0 + math.log(1.0 + len(word)))
            vec[idx1] += weight
            vec[idx2] += weight * 0.5

        # L2 normalize
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm

        return vec.tolist()

    @classmethod
    def cosine_similarity(cls, vec_a: List[float], vec_b: List[float]) -> float:
        a = np.array(vec_a, dtype=np.float32)
        b = np.array(vec_b, dtype=np.float32)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

    @classmethod
    def retrieve_relevant_chunks(
        cls,
        db: Session,
        query: str,
        document_ids: List[int],
        top_k: int = 5,
        threshold: float = 0.15
    ) -> List[Dict[str, Any]]:
        """
        Retrieves top_k chunks for the given query across specified documents.
        Returns chunk content along with citation metadata (document title, page number, score).
        """
        query_vec = cls.compute_local_embedding(query)
        
        # Query chunks from database
        query_builder = db.query(DocumentChunk, Document.title).join(
            Document, DocumentChunk.document_id == Document.id
        )
        
        if document_ids:
            query_builder = query_builder.filter(DocumentChunk.document_id.in_(document_ids))

        all_chunks = query_builder.all()
        scored_results: List[Tuple[float, DocumentChunk, str]] = []

        query_terms = set(re.findall(r'\b[a-zA-Z0-9]{3,}\b', query.lower()))

        for chunk, doc_title in all_chunks:
            if not chunk.embedding_json:
                chunk_vec = cls.compute_local_embedding(chunk.content)
            else:
                try:
                    chunk_vec = json.loads(chunk.embedding_json)
                except Exception:
                    chunk_vec = cls.compute_local_embedding(chunk.content)

            cos_sim = cls.cosine_similarity(query_vec, chunk_vec)
            
            # Keyword bonus for exact matches
            chunk_text_lower = chunk.content.lower()
            keyword_matches = sum(1 for term in query_terms if term in chunk_text_lower)
            keyword_bonus = min(0.3, keyword_matches * 0.05) if query_terms else 0.0

            final_score = cos_sim + keyword_bonus
            if final_score >= threshold:
                scored_results.append((final_score, chunk, doc_title))

        # Sort descending by score
        scored_results.sort(key=lambda x: x[0], reverse=True)
        top_results = scored_results[:top_k]

        formatted_citations = []
        for score, chunk, doc_title in top_results:
            # Create a concise excerpt (first 250 chars)
            excerpt = chunk.content[:240].strip() + ("..." if len(chunk.content) > 240 else "")
            formatted_citations.append({
                "chunk_id": chunk.id,
                "document_id": chunk.document_id,
                "document_title": doc_title,
                "page_number": chunk.page_number,
                "heading": chunk.heading or f"Page {chunk.page_number}",
                "content": chunk.content,
                "excerpt": excerpt,
                "relevance_score": round(score, 3)
            })

        return formatted_citations
