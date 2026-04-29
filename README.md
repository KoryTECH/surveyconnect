# SurveyConnectHub

A marketplace for geospatial professionals. Clients post surveying, GIS, and drone jobs. Verified professionals apply, contracts are funded via escrow, and payment is released on completion.

## Stack

- **Framework:** Next.js 15 (App Router, TypeScript)
- **Database & Auth:** Supabase (PostgreSQL + RLS)
- **Payments:** Paystack (NGN escrow)
- **Email:** Resend
- **Rate Limiting:** Upstash Redis
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

## Getting Started

1. Clone the repo
2. Copy `.env.example` to `.env.local` and fill in all values
3. Run Supabase migrations in `supabase/migrations/` in order
4. Install dependencies and start dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

See `.env.example` for all required variables. Key ones:

| Variable                        | Purpose                                     |
| ------------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key                           |
| `PAYSTACK_SECRET_KEY`           | Paystack secret (server-side only)          |
| `RESEND_API_KEY`                | Resend email API key                        |
| `UPSTASH_REDIS_REST_URL`        | Upstash Redis URL for rate limiting         |
| `UPSTASH_REDIS_REST_TOKEN`      | Upstash Redis token                         |
| `NEXT_PUBLIC_APP_URL`           | Full production URL (no trailing slash)     |
| `ADMIN_EMAIL`                   | Email address for admin alerts              |
| `EXCHANGE_RATE_API_KEY`         | ExchangeRate-API key for USD→NGN conversion |

## Migrations

Run in order from `supabase/migrations/`:

1. `20260425_add_exchange_columns.sql`
2. `20260425_rename_payment_reference.sql`
3. `20260426_onboarding_notifications_settings.sql`
4. `20260428_applications_count_trigger.sql`
5. `20260428_rls_policies.sql`

## Architecture

- `/app/api/` — Server-side API routes (auth, payments, notifications)
- `/app/dashboard/` — Protected dashboard pages (client + professional)
- `/app/admin/` — Admin verification dashboard
- `/components/` — Shared UI components
- `/lib/` — Supabase client, rate limiting, CSRF helpers
- `/types/` — TypeScript database interfaces
- `/supabase/migrations/` — SQL migration files
