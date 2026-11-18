---
globs: ["frontend/**/*.{ts,tsx}"]
---

# Frontend Rules: Next.js App Router, TypeScript & Tailwind CSS

- **Type Safety**:
  - Always keep `frontend/types/index.ts` synchronized with backend Pydantic models.
  - Never use `any` when a known backend schema exists.
  - Verify changes with `npx tsc --noEmit` before concluding any feature.

- **Next.js 15 App Router Conventions**:
  - Client components utilizing dynamic hooks like `useSearchParams()` must be wrapped in `<Suspense fallback={...}>` to avoid prerender blocking errors.
  - Use `amygdala_token` and `amygdala_theme` in `localStorage` for session & preference persistence.

- **Design Standard**:
  - Maintain the AMYGDALA dark theme palette (`#0b0f17`, `#111827`, `#1f2937`) with indigo/violet accents and emerald citation pills.
