# CampMatch data pipeline

The app ships with two data layers, merged at build time by
`src/lib/camps-data.ts`:

1. **Curated seeds** — `src/lib/camps-seed.ts` (~70 hand-written listings).
2. **Compiled national dataset** — `src/data/camps.extra.json`, thousands of
   real US camps compiled with LLM research agents (one agent per region /
   network: state-by-state, YMCA, Jewish, Christian, Scouting, specialty…),
   then validated, normalized and deduped by `merge-batches.ts`.
   Community-sentiment snapshots live in `src/data/reviews.json` (loaded
   server-side only, so review text never ships in the client bundle) and
   seed-camp ratings in `src/data/seed-ratings.json`.

Everything stays `verified: false` — figures are good-faith estimates until a
camp claims its listing. Ratings/reviews are labeled in the UI as community
snapshots compiled from public web sentiment, not verified reviews.

## Scripts

| script | what it does |
| --- | --- |
| `merge-batches.ts` | Validate/normalize/dedupe research-agent batch files into `src/data/*.json`. `pnpm dlx tsx scripts/scraper/merge-batches.ts <batches-dir>` |
| `fetch-camps.ts` | Politely download camp pages for LLM extraction (`camp-schema.json` is the target shape). |
| `reddit-reviews.ts` | Search Reddit's public JSON API for real threads about every camp in the dataset → `out/reddit/<slug>.json`, ready for an LLM distillation pass into `reviews.json`. |
| `fetch-photos.ts` | Grab each camp website's own `og:image` social-preview photo → `out/photos.json`, to merge into the `photos` field. |
| `load-to-supabase.ts` | Upsert the full dataset + reviews into Supabase (needs migrations 0001+0002 and a service-role key). |

> **Note:** the network-restricted CI/agent sandbox can't reach Reddit or camp
> websites — run `reddit-reviews.ts` and `fetch-photos.ts` from a normal
> machine. Both are rate-limited to ~1 req/sec with an honest User-Agent.

## Growing the dataset further

```
discover → fetch → extract → normalize → dedupe → review → load
```

- **Discover** — ACA "Find a Camp" (find.acacamps.org, ~3,500 accredited
  camps) is the best structured source; also state camp associations,
  CampNavigator/MySummerCamps directories, Google Places per county.
- **Extract** — pass fetched page text to an LLM with `camp-schema.json`,
  temperature 0; deterministic parsers only survive on the big directories.
- **Normalize/dedupe/load** — `merge-batches.ts` accepts any batch of records
  in the schema shape, so new sources plug straight in.

## Legal & etiquette notes

- Only collect facts (name, address, ages, prices, programs) — facts are not
  copyrightable, but never copy marketing prose; write original summaries.
- Respect robots.txt and rate limits; cache aggressively; never scrape behind
  logins. Reddit content: store permalinks, distill sentiment, don't republish
  full posts.
- Photos: `og:image` URLs are what sites publish for link previews; treat
  them as provisional and let camps replace them when claiming a listing.
- Every scraped/compiled listing stays **unverified** until the camp claims it.
