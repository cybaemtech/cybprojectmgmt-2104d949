

## Plan: Consolidate Demo Strategy

Based on your preference to simplify, here's what I'd implement:

### Approach: Remove Admin Seed/Reset, Rely on Explore Demo

1. **Remove seed/reset from Admin Settings** — strip the "Seed Test Data" and "Reset All Data" cards from `admin-settings.tsx` (or remove the page entirely if no other admin features exist)

2. **Remove seed-data logic** — clean up `resetDatabase()` and `seedDatabase()` from `seed-data.ts` if no longer needed

3. **Keep Explore Demo as-is** — the existing demo mode already provides a full preview experience using static data without touching the database

4. **Optional: Enhance demo data** — if the current `demo-data.ts` doesn't cover all features (roadmaps, bug reports, etc.), expand it to be more comprehensive

### Files affected
- `src/pages/admin-settings.tsx` — remove seed/reset UI (or remove page)
- `src/lib/seed-data.ts` — remove or simplify
- `src/components/layout/sidebar.tsx` — remove Admin Settings link if page is removed
- `src/App.tsx` — remove route if page is removed

### Alternative: Keep Both
If you want to keep admin seed/reset for internal QA, I'll just leave it as-is and make no changes.

