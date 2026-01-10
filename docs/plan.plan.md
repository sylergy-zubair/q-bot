<!-- 6bb1c9f7-e2d1-4cd4-80e1-b704294640ed 5724529a-eb7f-44cd-aac3-58289d8d82a8 -->
# Text-to-SQL PoC Plan

## Goals

- Deliver a lightweight web dashboard where users ask natural-language questions and receive SQL query results from an existing database.
- Use an OpenRouter-hosted instruction-tuned model for NL→SQL conversion.

## Approach

1. Document data flow: User prompt → backend passes schema & prompt to OpenRouter model → model returns SQL → backend validates & executes query against Postgres → backend returns answer.
2. Define components:

- `frontend/`: React + Tailwind dashboard, question form, result table, SQL preview.
- `backend/`: Node/Express service with endpoints for schema fetch, NL query, SQL execution, and history logging.
- `services/openRouterClient.ts`: wraps OpenRouter chat-completions API.
- `db/`: Postgres client module using `pg` (or `knex` + `pg`) with connection pooling.
- `docker/compose.yml`: Postgres container plus seed SQL sourced from `docs/data/data.csv`.

3. Outline prompt strategy for OpenRouter model: template injecting Postgres schema metadata (tables, columns, sample rows via `SELECT ... LIMIT 5`), instructions to limit rows, ask for `SELECT` only, and output SQL-formatted response.
4. Specify guardrails:

- Static allowlist per schema; block mutating statements.
- Query parser to strip trailing text & enforce `LIMIT`.
- Error handling with fallback messaging.

5. Testing plan:

- Sample schema fixtures for unit tests of prompt builder and SQL sanitizer tailored for Postgres.
- End-to-end smoke scenario pointing at the Docker Postgres instance.

6. Deployment considerations: environment variables (OpenRouter API key, Postgres `DATABASE_URL`), Docker secrets for credentials, HTTPS requirement, logging + optional caching.
7. Potential enhancements: query memory, chart visualization, role-based access, feedback loop for correcting SQL.

## Implementation Todos

- arch-doc: Draft architecture diagram & request/response flow description
- prompt-template: Write OpenRouter prompt template and schema serialization helper
- backend-skeleton: Scaffold Express backend with `pg` client and OpenRouter client
- docker-postgres: Add `docker-compose.yml` and seed scripts for Postgres demo data
- frontend-ui: Scaffold React dashboard with form/results display
- guardrails-test: Add SQL sanitizer + unit tests
- e2e-demo: Create end-to-end demo script hitting Dockerized Postgres