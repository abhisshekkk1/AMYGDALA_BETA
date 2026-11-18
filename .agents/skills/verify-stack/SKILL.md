---
name: verify-stack
description: Automatically verifies the AMYGDALA full-stack health: FastAPI boot, OpenAPI v3 schema extraction, and Next.js TypeScript compilation.
---

# Verify Stack Skill

Use this skill to validate that the entire AMYGDALA application compiles cleanly and starts without runtime errors.

## Instructions

1. **Verify Backend FastAPI & OpenAPI**:
   Run the backend verification script from the root workspace:
   ```powershell
   cd backend
   ..\venv\Scripts\python.exe -c "from app.main import app; from fastapi.openapi.utils import get_openapi; spec = get_openapi(title=app.title, version=app.version, routes=app.routes); print('FastAPI Boot & OpenAPI schema generated successfully with', len(spec['paths']), 'paths');"
   ```

2. **Verify Frontend TypeScript Compilation**:
   Run TypeScript compiler check from the `frontend/` directory:
   ```powershell
   cd frontend
   npx tsc --noEmit
   ```

3. **Verify End-to-End Test Suite**:
   Run the comprehensive test suite:
   ```powershell
   cd backend
   ..\venv\Scripts\python.exe test_all_features.py
   ```
