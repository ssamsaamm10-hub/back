# ReadEasy Arabic (Nebras) — Backend

Node.js + Express + SQLite (built-in `node:sqlite`) + Gemini API. Serves the
same content shape your frontend's `readeasyData.js` mocks, plus real auth,
per-child progress, and an AI simplification endpoint.

**Why SQLite instead of Prisma/Postgres:** zero native binary downloads —
runs immediately with only `npm install`. Swapping to Postgres later just
means rewriting `src/db/*` with `pg`; every route file only calls the
`run/get/all` helpers, so the rewrite is isolated to one folder.

## Setup
```bash
npm install
cp .env.example .env   # fill in JWT_SECRET and (optionally) GEMINI_API_KEY
npm start               # creates data/dev.db, migrates, seeds, and boots on :4000
```
Requires **Node 22.5+** (for built-in `node:sqlite`).

## Auth
`POST /api/auth/register` `{email, password, role?}` → `{token, user}`
`POST /api/auth/login` `{email, password}` → `{token, user}`
`GET /api/auth/me` (Bearer token) → current user

All routes below require `Authorization: Bearer <token>` unless marked public.

## Children
- `GET /api/children` — list your child profiles
- `POST /api/children` `{name, emoji?, color?}` — creates profile + unlocks first region + grants starter items
- `GET /api/children/:childId`
- `PATCH /api/children/:childId`
- `DELETE /api/children/:childId`

## Content (public, read-only)
`GET /api/regions`, `/api/lessons/:id`, `/api/regions/:slug/lessons`,
`/api/harakat/sets`, `/api/harakat/questions`, `/api/words`,
`/api/read-sentences`, `/api/collection/catalog`, `/api/avatar/catalog`

## Per-child progress
- `GET /api/children/:childId/regions` — catalog merged with this child's status/completed count
- `POST /api/children/:childId/regions/:slug/complete-mission` `{starsEarned?, gemsEarned?}` — increments progress, auto-unlocks next region at 100%
- `POST /api/children/:childId/mastery/attempt` `{conceptKey, correct, lessonId?}` — updates accuracy/attempts; flips to `STALLED` after 3 attempts below 80% accuracy (see `src/lib/mastery.js`)
- `GET /api/children/:childId/mastery`
- `POST /api/children/:childId/sessions` `{durationSeconds, regionSlug?}`
- `GET /api/children/:childId/collection`, `POST .../collection/:itemId/unlock`
- `GET /api/children/:childId/avatar`, `PATCH .../avatar/loadout` (equip check verifies ownership server-side)

## Parent dashboard
`GET /api/children/:childId/insights` — leads with `stalled` + `suggestion`
(actionable) before descriptive stats (`sessions`, `weekly`).

## AI
`POST /api/ai/simplify` `{text, targetLevel?, allowIrregularFocus?}` — Gemini
call with a diacritization-enforcing system prompt, JSON-schema validation,
one corrective re-prompt on malformed output, and per-user rate limiting.
Returns `503` if `GEMINI_API_KEY` isn't set, rather than failing silently.

## Wiring up the MSHNBRAS frontend
Replace `base44.auth.*` calls in `AuthContext.jsx` with `fetch` calls to
`/api/auth/*`, store the returned `token` (e.g. in memory + `sessionStorage`,
not `localStorage` for anything sensitive), and replace the static imports
from `readeasyData.js` with calls to the matching `/api/...` endpoints above
— the field names were kept identical on purpose so the swap is mostly
find-and-replace.

## Security notes for production
- Rotate `JWT_SECRET` and never commit `.env`.
- Swap the in-memory rate limiter (`src/lib/rateLimit.js`) for a Redis-backed
  one if you deploy more than one instance.
- Move SQLite to Postgres before multi-instance deployment (SQLite file
  locking doesn't work across machines).
