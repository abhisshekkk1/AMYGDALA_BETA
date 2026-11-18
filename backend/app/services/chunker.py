import re
from typing import List, Dict, Any

class Chunker:
    """
    Intelligent sliding-window chunker that preserves page numbers,
    structural headings, and semantic paragraph boundaries.
    """

    @classmethod
    def chunk_pages(
        cls,
        pages: List[Dict[str, Any]],
        chunk_size: int = 500,  # approximate words
        chunk_overlap: int = 80
    ) -> List[Dict[str, Any]]:
        chunks: List[Dict[str, Any]] = []
        chunk_idx = 0

        for page in pages:
            page_num = page["page_number"]
            heading = page.get("heading", f"Page {page_num}")
            text = page.get("text", "").strip()

            if not text:
                continue

            # Split into paragraphs
            paragraphs = re.split(r'\n\s*\n', text)
            current_chunk_words = []
            
            for para in paragraphs:
                para = para.strip()
                if not para:
                    continue

                words = para.split()
                if not words:
                    continue

                if len(current_chunk_words) + len(words) > chunk_size and len(current_chunk_words) >= 100:
                    # Flush current chunk
                    chunk_text = " ".join(current_chunk_words)
                    chunks.append({
                        "chunk_index": chunk_idx,
                        "page_number": page_num,
                        "heading": heading,
                        "content": chunk_text,
                        "token_count": len(current_chunk_words)
                    })
                    chunk_idx += 1
                    # Keep overlap words
                    current_chunk_words = current_chunk_words[-chunk_overlap:] + words
                else:
                    current_chunk_words.extend(words)

            if current_chunk_words:
                chunk_text = " ".join(current_chunk_words)
                chunks.append({
                    "chunk_index": chunk_idx,
                    "page_number": page_num,
                    "heading": heading,
                    "content": chunk_text,
                    "token_count": len(current_chunk_words)
                })
                chunk_idx += 1

        return chunks
