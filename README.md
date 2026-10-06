# SocialClubs

**Private community platform rethought for the AI era** — standalone-first, Polygrow-enhanced.

SocialClubs is being rebuilt around a simple thesis: online communities deserve better than 2010s forum software, and they shouldn't need to rebuild agent infrastructure to get AI-native features. Use it standalone — or let community data flow into Polygrow as business information.

## What it is / what it is not

- **Standalone-first:** a complete community product on its own — clubs, events, video calls, media.
- **Polygrow-enhanced via clean seams:** APIs, events, and MCP — community data feeds Polygrow as the business-information core. No agent infrastructure rebuilt inside.
- **Not** a generic social network; **not** a course platform.

## Status

- **Repo made public (2026-09-26).**
- **A major reform is being planned** — the direction is locked: standalone-first, Polygrow-enhanced via clean seams; the old club-agent architecture will be removed. The current code is the **pre-reform MVP**.
- **Next:** write the reform plan, then rebuild per the locked strategy.

## Stack

Next.js 16.3.6 (App Router) · React 19 · TypeScript · Tailwind · Zod (shared client/server schemas) · React Hook Form · SWR · Supabase · Daily (video calls) · Mux (video) · Stripe · Upstash (Redis, rate limiting, queues) · PostHog · Sentry · PWA (service worker, installable, haptics)

## Quickstart

```bash
npm install
npm run dev   # http://localhost:3000
```

Configure service keys (Supabase, etc.) per `.env.example` for full functionality.

## Structure

```
socialclubs/
├── app/            # routes (App Router)
├── components/     # feature + shared + ui (shadcn)
├── services/       # business logic, CRUD (presenter pattern)
├── schemas/        # Zod schemas (client + server)
├── hooks/          # React hooks by feature
├── lib/  utils/    # shared code
└── supabase/       # SQL + migrations
```

UI/business-logic separation: components present, `services/` decides. Zod validates on client and server with the same schemas. Optimistic UI on user interactions.

## License

No license file yet.
