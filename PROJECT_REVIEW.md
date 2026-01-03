# Verdict AI Project Review
_Date: 2025-12-22_

## System Understanding
- The app is a Next.js 14 App Router project (`app/`) that exposes multiple experiences: the default consensus UI (`app/page.tsx`), trading dashboards/modes (`app/trading/*`), the Ultra preset (`app/ultra/page.tsx`), debate/arena tooling, admin/debug routes, and a marketing landing surface. Shared layout/providers live in `app/layout.tsx`.
- State is coordinated through React contexts such as `AuthProvider`, `GlobalModelTierProvider`, and `CostTrackerProvider` plus custom hooks under `contexts/` and `hooks/`. Persistent data (users, conversations, feedback) is stored in Supabase per `supabase-schema.sql` with helper clients in `lib/supabase`.
- AI orchestration happens in `lib/ai-providers/*` (wrappers around Vercel AI SDK clients), the prompt/judge systems (`lib/prompt-system.ts`, `lib/judge-system.ts`), and the consensus API (`app/api/consensus/route.ts`). Model metadata, pricing, and tier rules are centralized in `lib/models` + `lib/model-metadata.ts`.
- Trading, research, and arena features live under `lib/trading`, `lib/research`, `lib/arena`, and corresponding UI components in `components/trading`, `components/arena`, etc. Question generation, caching, rate limiting, and web search helpers sit in `lib/question-generator`, `lib/cache`, `lib/rate-limit.ts`, and `lib/web-search`.
- Documentation is extensive (`docs/`), with system overview, architecture, workflow/priorities, and feature-specific guides that describe how to run/prioritize work.
- Tests rely on the custom Node runner (`tests/run-tests.js`), scenario scripts under `tests/features`/`tests/integration`, and utility pages inside `tests/pages`. There are also Playwright configs/reports, but no automated CI wiring is visible in this repo snapshot.

## Improvement Opportunities
1. **AI question generator hits a non-existent relative endpoint**
   - _Location:_ `lib/question-generator/question-generator.ts:140-178`
   - _Issue:_ `generateWithAI` tries to call `fetch('/api/ai-providers/groq', …)` from the server-side API route (`app/api/question-generator/route.ts`). There is no `app/api/ai-providers` route in the repo, and node-fetch requires absolute URLs, so every `useAI` request throws and the feature silently falls back to templates.
   - _Fix idea:_ Invoke the configured Groq provider directly (via `providerRegistry`) or add a real `/api/ai-providers/groq` handler. If you must call another route, build an absolute URL using `request.nextUrl.origin`.

2. **Cost reporting for comparison/fallback models is always zero**
   - _Location:_ `app/api/consensus/route.ts:620-642`, `lib/model-metadata.ts`, `lib/ai-providers/groq.ts:70-145`
   - _Issue:_ Comparison cost is looked up with a `provider/model` key (`const modelKey = \`\${comparisonModel.provider}/\${comparisonModel.model}\``) but `MODEL_COSTS_PER_1K` is keyed by the bare model id, so `costPerK` is always undefined and the comparison block reports `$0`. Additionally, the Groq provider rewrites `response.model` to strings like `"llama-3.1-8b-instant (fallback from llama-3.3-70b-versatile)"`, which will never match any pricing entry, so fallback runs look “free” as well.
   - _Fix idea:_ Use plain model ids for pricing (`MODEL_COSTS_PER_1K[comparisonModel.model]`) and add a separate field on `ModelResponse` for the actual model used vs. display text so cost calculators can stay stable even when fallbacks run.

3. **Guest conversation saving cannot work with the current schema**
   - _Location:_ `app/api/conversations/route.ts:205-224`, `supabase-schema.sql:11-34`
   - _Issue:_ The POST handler explicitly sets `user_id: user?.id || null` to support guest analytics, but the Supabase schema declares `user_id UUID … NOT NULL`. Every guest submission therefore violates the constraint and returns a 500, so the “anonymous analytics” path never persists anything.
   - _Fix idea:_ Either make `conversations.user_id` nullable with a CHECK ensuring at least one of `user_id`/`guest_session_id` is set, or store guest runs in a separate table keyed by a UUID while keeping `user_id` non-null.

4. **Premium credit counts never persist between sessions**
   - _Location:_ `contexts/auth-context.tsx:28-66,132-149`
   - _Issue:_ `fetchUserProfile` only selects `subscription_tier` from `public.users` and then derives credits from the tier, yet `usePremiumCredit` decrements the `premium_credits` column. After a reload the client ignores the stored value and repopulates with 5/50/999 credits, so paid credits can never be enforced.
   - _Fix idea:_ Select both `subscription_tier` and `premium_credits`, initialize state from the DB, and only fall back to tier defaults when the column is null.

5. **Sensitive data is dumped to logs**
   - _Location:_ `app/api/conversations/route.ts:10-17`, `lib/ai-providers/openai.ts:42-126` (similar patterns in other providers)
   - _Issue:_ The conversations API prints `authorization`, the first 100 characters of `cookie`, and full user agents for every GET. Provider wrappers log prompts, first/last 300 characters of model responses, and tool arguments. In production these logs expose user queries, tokens, and auth material.
   - _Fix idea:_ Remove or guard these logs behind an environment flag, and never log credentials/tokens unredacted. Centralize structured logging with explicit scrubbing.

6. **Rate limiting is per-instance memory only**
   - _Location:_ `lib/rate-limit.ts:1-64`
   - _Issue:_ The limiter uses a `Map` in module scope, which resets on every serverless cold start and doesn’t coordinate across instances. Attackers can also bypass per-IP limits by hitting different Vercel regions. The comments even note “use Redis in production,” but nothing enforces that.
   - _Fix idea:_ Back the limiter with a shared store (Supabase, Upstash Redis, etc.) or move enforcement to the edge (Vercel Edge Middleware, API Gateway) so limits are global and survive deployments.

7. **DuckDuckGo integration is brittle and non-compliant**
   - _Location:_ `lib/web-search/duckduckgo-service.ts:50-94`
   - _Issue:_ Web search scrapes the HTML endpoint with regexes that rely on internal class names (`result__url`) and discards snippets entirely (every snippet is hardcoded to “Search result from DuckDuckGo”). Any markup change will return zero results, and scraping the HTML endpoint may violate DuckDuckGo’s usage terms.
   - _Fix idea:_ Switch to an official API/SDK (e.g., `duckduckgo-search` or Brave Search), parse responses via a DOM parser (cheerio) if scraping, and capture real snippets + citations so judge prompts have usable evidence.

8. **Conversation API header logging conflicts with compliance requirements**
   - _Location:_ `app/api/conversations/route.ts:10-17`
   - _Issue:_ Besides the general logging problem above, dumping `authorization` headers and cookie contents makes SOC 2/GDPR compliance impossible because secrets end up in persistent logs.

9. **(Optional) Improve coverage**
   - While there are CLI-based feature tests (`tests/features/*.test.js`) and Playwright artifacts, there are no automated assertions around `/api/consensus`, `/api/question-generator`, or the trading APIs. Consider adding integration tests that hit those endpoints directly, mocked against provider registries, to prevent regressions like the question generator bug from shipping unnoticed.

## Suggested Next Steps
- Prioritize fixes 1–4 to restore core functionality (question generator, accurate cost display, guest analytics, and credit enforcement).
- Address observability/privacy (items 5 & 8) before exposing the platform to real users to avoid leaking auth material.
- Plan infrastructure work for rate limiting and web search, then expand automated coverage for consensus/trading flows using the existing `tests/run-tests.js` harness or Playwright.
