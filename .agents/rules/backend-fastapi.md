---
globs: ["backend/**/*.py"]
---

# Backend Rules: FastAPI, SQLAlchemy & Pydantic v2

- **Schema Strictness**:
  - Every router endpoint body MUST use a concrete Pydantic v2 model inheriting from `pydantic.BaseModel`. Raw `dict` or untyped `body: dict` is prohibited.
  - Model config should use `model_config = ConfigDict(from_attributes=True)` or Pydantic v2 standards.
  - Floating-point fields (such as `AISetting.temperature` and `score_percentage`) must be defined as `float` in SQLAlchemy and Pydantic models.

- **Data Isolation**:
  - Always inject `current_user: User = Depends(get_current_user)` on protected routes.
  - Ensure queries filter on `User.id == current_user.id` or foreign keys tied to `current_user.id`.

- **Citations & Stratified Chunking**:
  - Document chunking must retain `page_number`, `heading`, and `token_count`.
  - For full-document operations (summaries, study notes), call `RAGEngine.get_stratified_chunks(db, document_id, max_chunks=16)` to guarantee complete coverage across beginning, middle, and end.
