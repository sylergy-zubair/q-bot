## Text-to-SQL PoC Architecture

### Overview
The PoC enables natural-language questions against a Postgres analytics database by orchestrating four layers:

1. **Web Dashboard (React + Vite)** — Collects user questions, previews generated SQL, and renders tabular query results with warnings when guardrails adjust the statement.
2. **API Service (Express + TypeScript)** — Exposes `/schema`, `/nl-query`, and `/health` endpoints, manages request validation, invokes the OpenRouter-backed text-to-SQL model, applies SQL guardrails, and executes approved queries.
3. **OpenRouter Inference API** — Routes requests to a hosted instruction-tuned model (e.g., `mistralai/mistral-7b-instruct:free`) that receives schema context and user questions, returning candidate SQL.
4. **Postgres (Docker)** — Provides the analytics dataset (seeded `sale` schema) serving as the execution target for sanitized SQL statements.

### Request Flow
1. User submits a question via the dashboard (`POST /nl-query`).
2. Backend fetches schema metadata (`information_schema`) and formats it into a concise prompt, including table structures and sample rows.
3. Backend sends the prompt + question to the Hugging Face endpoint, receives generated SQL.
4. Guardrails sanitize SQL (strip comments, enforce single SELECT, append `LIMIT`, block dangerous keywords).
5. Approved SQL executes against Postgres; results (fields, rows, rowCount) are bundled with warnings (if any).
6. Frontend displays SQL preview, warnings, and result table; schema sidebar helps users craft follow-up questions.

### Key Files
- `docker/compose.yml` & `docker/saleup/init.sql` — Postgres container and seed data derived from `docs/data/data.csv`.
- `backend/src/server.ts` — Express entry point configuring routes and middleware.
- `backend/src/routes/nlQuery.ts` — Main orchestration for NL→SQL flow with guardrails.
- `backend/src/services/openRouterClient.ts`, `promptBuilder.ts`, & `schemaFormatter.ts` — Compose prompt sections, call OpenRouter, and format schema context.
- `backend/src/services/sqlSanitizer.ts` — Enforces read-only SQL and auto-limit behaviour (tested via `sqlSanitizer.test.ts`).
- `frontend/src/App.tsx` — Dashboard layout combining form, previews, results, and schema explorer.
- `backend/scripts/demo.ts` — CLI script showcasing an end-to-end query against the running stack.

### Configuration
- Backend env (`backend/.env.example`):
  - `DATABASE_URL` → Dockerized Postgres (`sale` schema)
  - `OPENROUTER_API_URL` & `OPENROUTER_API_KEY` → OpenRouter endpoint/token
  - `CORS_ORIGIN` → Frontend origin (e.g., `http://localhost:5173`)
- Frontend env (`frontend/.env.example`):
  - `VITE_API_BASE_URL` → Backend base URL
  - `VITE_PORT` → Vite dev server port

### Future Enhancements
- Persist query history & user feedback for iterative prompt tuning.
- Add role-based access control and parameterized query templates.
- Stream results for large datasets and add chart visualizations.
- Support schema caching and diff detection for multi-database environments.

