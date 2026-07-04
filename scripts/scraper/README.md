# CampMatch data pipeline

The app ships with a hand-curated seed dataset (`src/lib/camps-data.ts`,
~55 camps). This directory is the scaffold for growing that into a national
dataset of thousands of camps.

## Pipeline design

```
discover → fetch → extract → normalize → dedupe → review → load
```

1. **Discover** — build a URL list of camps from public directories:
   - ACA "Find a Camp" (find.acacamps.org) — ~2,400 accredited camps,
     the single best structured source (type, ages, gender, sessions, price bands)
   - State camp associations (e.g., NJ, NY, PA camp associations)
   - CampNavigator / MySummerCamps category pages (directory-style listings)
   - Google Places API, query "summer camp" per county (fills in day camps)
2. **Fetch** — `fetch-camps.ts` politely downloads pages (respect robots.txt,
   1 req/sec/host, identify with a real User-Agent and contact email).
3. **Extract** — for each camp homepage, extract structured fields. The
   fastest reliable approach: pass page text to an LLM (Claude) with the
   JSON schema in `camp-schema.json` and temperature 0. Deterministic
   parsers only survive on the big directories; camp websites are too varied.
4. **Normalize** — map free-text into our enums (interests, religious,
   gender), geocode city/state to lat/lng, bucket 1–5 personality scales.
   The scales (vibe/competitiveness/structure) are estimated by the LLM from
   the camp's own language and flagged `verified: false`.
5. **Dedupe** — key on normalized name + state; prefer ACA data on conflict.
6. **Review** — spot-check a sample per batch; anything with low extraction
   confidence goes to a manual review queue.
7. **Load** — upsert into Supabase `camps` (`source = 'scraper'`) with
   `load-to-supabase.ts`. The app reads Supabase when configured and merges
   with the seed data.

## Legal & etiquette notes

- Only collect facts (name, address, ages, prices, programs) — facts are not
  copyrightable, but do not copy marketing prose verbatim; have the LLM
  write an original neutral summary.
- Respect robots.txt and rate limits; cache aggressively; never scrape
  behind logins.
- Every scraped listing stays marked **unverified** until the camp claims it.

## Running the sample fetcher

```bash
npx tsx scripts/scraper/fetch-camps.ts urls.txt out/
```
