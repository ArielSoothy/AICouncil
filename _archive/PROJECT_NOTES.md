## AI Council – Local Dev Notes

### Stack
- **Framework**: Next.js 14 (App Router), React 18, TypeScript
- **UI**: Tailwind CSS, shadcn/ui
- **AI SDKs**: Vercel AI SDK providers (OpenAI, Anthropic, Google, Groq)
- **Auth/DB**: Supabase (SSR helpers, middleware)
- **Port**: 3000

### Quick Start
- Start dev: `npm run dev` → http://localhost:3000
- Build: `npm run build`
- Start prod: `npm start`
- Type check: `npm run type-check`
- Lint: `npm run lint`

### Environment Variables
Required for app boot (Supabase middleware):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional to enable model calls:
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`  ← note the exact name used in code
- `GROQ_API_KEY`

Where used:
- Supabase browser client: `lib/supabase/client.ts`
- Supabase server/middleware: `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, `middleware.ts`
- Provider configs: `lib/ai-providers/{openai,anthropic,google,groq}.ts`

### Key Endpoints
- `GET /api/models` → lists available models based on configured keys
  - Test: `curl http://localhost:3000/api/models`
- `POST /api/consensus` → orchestrates multi-model query + judge analysis
 - `POST /api/consensus/normalize` → semantic normalization for ranked options
 - `POST /api/consensus/why` → AI one-line rationale per model for its #1 pick
  - Example:
    ```bash
    curl -X POST http://localhost:3000/api/consensus \
      -H "Content-Type: application/json" \
      -d '{
        "prompt": "What are the benefits of exercise?",
        "mode": "normal",
        "models": [
          {"provider": "openai", "model": "gpt-3.5-turbo", "enabled": true},
          {"provider": "anthropic", "model": "claude-3-haiku-20240307", "enabled": true}
        ]
      }'
    ```

### Project Structure – Important Files
- Entry/UI: `app/page.tsx`, `app/layout.tsx`
- API Orchestration: `app/api/consensus/route.ts`
- Models listing: `app/api/models/route.ts`
- Provider Registry: `lib/ai-providers/index.ts`
- Providers: `lib/ai-providers/{openai,anthropic,google,groq}.ts`
- Judge system: `lib/judge-system.ts`
- Prompt system: `lib/prompt-system.ts`
- Model benchmarks/weights: `lib/model-metadata.ts`
- Types: `types/consensus.ts`

### Supabase Setup (summary)
- Guide: `SUPABASE_SETUP.md`
- Schema: `supabase-schema.sql` (run in Supabase SQL editor)
- Required envs: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (+ service key only for server tasks if needed)

### Deployment
- Platform: Vercel (see `vercel.json`)
- Manual deploy recommended (private repo): `vercel --prod`
- Ensure env vars are configured in Vercel project settings

### Debugging Tips
- Check server listening: `lsof -nP -iTCP:3000 -sTCP:LISTEN`
- Fetch home: `curl -I http://127.0.0.1:3000`
- If browser can’t reach: try Incognito, disable VPN/ad-blockers, use `127.0.0.1`

### Useful Docs in Repo
- `README.md` – features and quick start
- `DEVELOPMENT.md` – dev workflow, curl examples, deployment notes
- `ENHANCED_JUDGE_SYSTEM.md` – judge analysis internals
- `STRUCTURED_PROMPTS.md` / `TOKEN_OPTIMIZATION.md` – prompt formats and token strategy
- `DEFAULT_MODEL_OPTIMIZATION.md` – cost-optimized defaults

### Notes
- The Google API env var in code is `GOOGLE_GENERATIVE_AI_API_KEY`.
- The app adapts to whichever provider keys are present; at least one is enough for basic model calls.
- Gemini Flash models are treated as FREE for guest/free. Gemini Pro is paid and excluded from guest/free defaults.

### Local Setup Status (this machine)
- Node.js and npm: installed (verified)
- Dependencies: installed; no `npm install` needed unless `package.json`/lockfile changes or `node_modules` is missing
- Dev server: currently reachable at `http://localhost:3000`


