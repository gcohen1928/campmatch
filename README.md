# CampMatch 🏕️💘

**Match.com for summer camps.** Parents take a 3-minute personality/logistics
quiz about their kid; CampMatch scores every camp in the database across a
dozen compatibility dimensions and returns a ranked list with match
percentages, plain-English reasons and honest cautions. Camps can claim their
listing or create a new one.

Built with Next.js (App Router) + Tailwind CSS 4 + optional Supabase.

## Run locally

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # production build
```

## Deploy to Vercel (~2 minutes)

1. Go to [vercel.com/new](https://vercel.com/new) and import the
   `gcohen1928/gabrielcohen.co` repo.
2. Select the branch with this app, and set **Root Directory** to `campmatch/`.
   Framework preset: Next.js (auto-detected). No other settings needed.
3. Deploy. Add the custom domain in Project → Settings → Domains when ready.

The app is fully functional with zero environment variables — quiz, matching,
directory and camp profiles all run off the bundled seed dataset, and the camp
portal runs in clearly-labeled demo mode.

## Going live with real camp accounts (Supabase)

1. Create a Supabase project (free tier is fine).
2. Run `supabase/migrations/0001_init.sql` in the SQL editor.
3. In Vercel → Project → Settings → Environment Variables, add:
   - `NEXT_PUBLIC_SUPABASE_URL` — from Supabase → Settings → API
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — same page
4. Redeploy. Camp signup/sign-in, listing claims and new-listing submissions
   now persist to Postgres with row-level security. Review claims in the
   `camp_claims` table (set `status = 'approved'` and `camps.claimed_by`).

## Where things live

| Path | What it is |
| --- | --- |
| `src/lib/camps-data.ts` | Seed dataset (~55 real camps, marked unverified) |
| `src/lib/matching.ts` | Matching engine: hard filters + weighted scoring |
| `src/lib/quiz.ts` | Labels/enums shared by quiz, cards and detail pages |
| `src/app/quiz/` | Multi-step questionnaire |
| `src/app/matches/` | Ranked results with match % and reasons |
| `src/app/camps/` | Directory with filters + camp profile pages |
| `src/app/for-camps/` | Camp portal: account, claim, create listing |
| `supabase/migrations/` | Database schema + RLS policies |
| `scripts/scraper/` | Data pipeline scaffold for scaling to 1000s of camps |

## Data honesty

Seed listings are compiled from public information and flagged
`verified: false`; tuition/size figures are estimates. The UI labels
unclaimed listings and tells parents to confirm details with the camp.
Verification happens when a camp claims its listing.
