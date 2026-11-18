# Repository guidance

Use pnpm 12.3.4 in this Next.js 15 / React 19 frontend and API repository. Admin is an independent sibling repository also using pnpm 12.3.4. Keep their lockfiles separate; CI and deployment use Node 24.

Preserve unrelated working changes; stage task files explicitly. Use codex/ branches and reviewed PRs, never push main directly.

Public reads must apply published visibility before search. scope=admin and every management mutation require JWT; sync endpoints use the separate sync credential. Do not put tokens in URLs. All embedded JSON uses safeJson; Markdown skips raw HTML. Keep existing slugs and first-publication dates stable.

Use database unique constraints for slug and series conflicts. Do not retry non-slug errors as slug allocation. POST retries require the same idempotency key; AI preparation is outside database retries. Do not delete creation records or analytics history.

Run pnpm test, pnpm typecheck, pnpm lint and pnpm build. Integration and browser tests use only tests/compose.yaml isolated MySQL/Redis. Never run tests or destructive resets against configured development/production databases. CI uses Node 24. Publication requires a verified backup restore and per-stage review/acceptance.
