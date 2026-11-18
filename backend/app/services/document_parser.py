import os
import csv
from typing import List, Dict, Any
import pymupdf as fitz
from docx import Document as DocxDocument
from pptx import Presentation

class DocumentParser:
    """
    Extensible document parser supporting PDF, DOCX, PPTX, TXT, MD, CSV.
    Extracts text page-by-page to ensure source citations can reference exact pages.
    """

    @classmethod
    def parse_file(cls, file_path: str, filename: str) -> Dict[str, Any]:
        ext = os.path.splitext(filename)[1].lower().strip(".")
        if ext == "pdf":
            return cls._parse_pdf(file_path)
        elif ext in ["docx", "doc"]:
            return cls._parse_docx(file_path)
        elif ext in ["pptx", "ppt"]:
            return cls._parse_pptx(file_path)
        elif ext in ["txt", "md"]:
            return cls._parse_text(file_path)
        elif ext == "csv":
            return cls._parse_csv(file_path)
        else:
            # Fallback text read
            return cls._parse_text(file_path)

    @classmethod
    def _parse_pdf(cls, file_path: str) -> Dict[str, Any]:
        doc = fitz.open(file_path)
        page_count = len(doc)
        pages_content: List[Dict[str, Any]] = []

        for page_idx in range(page_count):
            page = doc[page_idx]
            text = page.get_text("text").strip()
            # If page text is very sparse, it might be scanned
            if not text:
                text = f"[Page {page_idx + 1} content could not be extracted directly as text]"
            
            pages_content.append({
                "page_number": page_idx + 1,
                "text": text,
                "heading": f"Page {page_idx + 1}"
            })

        doc.close()
        return {
            "page_count": max(1, page_count),
            "pages": pages_content
        }

    @classmethod
    def _parse_docx(cls, file_path: str) -> Dict[str, Any]:
        doc = DocxDocument(file_path)
        pages_content: List[Dict[str, Any]] = []
        current_page_text = []
        page_num = 1
        current_heading = "Overview"

        for p in doc.paragraphs:
            text = p.text.strip()
            if not text:
                continue
            if p.style.name.startswith("Heading"):
                current_heading = text

            current_page_text.append(text)
            # Approximate page break every ~500 words
            total_words = sum(len(t.split()) for t in current_page_text)
            if total_words >= 500:
                pages_content.append({
                    "page_number": page_num,
                    "text": "\n".join(current_page_text),
                    "heading": current_heading
                })
                page_num += 1
                current_page_text = []

        if current_page_text or not pages_content:
            pages_content.append({
                "page_number": page_num,
                "text": "\n".join(current_page_text) if current_page_text else "Empty document",
                "heading": current_heading
            })

        return {
            "page_count": len(pages_content),
            "pages": pages_content
        }

    @classmethod
    def _parse_pptx(cls, file_path: str) -> Dict[str, Any]:
        prs = Presentation(file_path)
        pages_content: List[Dict[str, Any]] = []

        for slide_idx, slide in enumerate(prs.slides):
            slide_texts = []
            heading = f"Slide {slide_idx + 1}"
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text.strip():
                    slide_texts.append(shape.text.strip())
                    if not heading or heading.startswith("Slide"):
                        heading = shape.text.strip().split("\n")[0][:60]

            full_text = "\n".join(slide_texts) if slide_texts else f"[Slide {slide_idx + 1}]"
            pages_content.append({
                "page_number": slide_idx + 1,
                "text": full_text,
                "heading": heading
            })

        return {
            "page_count": max(1, len(pages_content)),
            "pages": pages_content
        }

    @classmethod
    def _parse_text(cls, file_path: str) -> Dict[str, Any]:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()

        pages_content = []
        current_page_lines = []
        page_num = 1
        heading = "Notes"

        for line in lines:
            stripped = line.strip()
            if stripped.startswith("#"):
                heading = stripped.lstrip("#").strip()[:80]
            current_page_lines.append(line)

            # Paginate by line count or token count (~60 lines / ~400 words per page)
            if len(current_page_lines) >= 60:
                pages_content.append({
                    "page_number": page_num,
                    "text": "".join(current_page_lines).strip(),
                    "heading": heading
                })
                page_num += 1
                current_page_lines = []

        if current_page_lines or not pages_content:
            pages_content.append({
                "page_number": page_num,
                "text": "".join(current_page_lines).strip() if current_page_lines else "Empty file",
                "heading": heading
            })

        return {
            "page_count": len(pages_content),
            "pages": pages_content
        }

    @classmethod
    def _parse_csv(cls, file_path: str) -> Dict[str, Any]:
        rows = []
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            reader = csv.reader(f)
            for row in reader:
                rows.append(" | ".join(row))

        return {
            "page_count": 1,
            "pages": [{
                "page_number": 1,
                "text": "\n".join(rows),
                "heading": "CSV Dataset"
            }]
        }
