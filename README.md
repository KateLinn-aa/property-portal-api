# property-portal-api

Backend REST API for the Myanmar Property Portal (Yangon, Mandalay, Bago listings for sale/rent).

Built with Express + TypeScript, Prisma 7 (SQLite), JWT auth, zod validation, and multer for photo
uploads. Full endpoint/data-model spec: see [SPEC.md](../SPEC.md) in the root project (§4-§7).

## Getting started

```bash
npm install
cp .env.example .env          # edit JWT_SECRET for anything beyond local dev
npx prisma migrate dev        # creates dev.db and applies migrations (no-op if already applied)
npx prisma db seed            # idempotent — safe to re-run, uses upsert for demo accounts
npm run dev                   # http://localhost:4000
```

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | SQLite file path | `file:./dev.db` |
| `JWT_SECRET` | Signing secret for auth tokens | *(generate your own — see `.env.example`)* |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `PORT` | HTTP port | `4000` |

## Demo accounts (from the seed script)

| Email | Password | Role |
|---|---|---|
| `demo.owner@example.com` | `DemoPass123!` | USER — owns 3 sample listings |
| `demo.admin@example.com` | `DemoPass123!` | ADMIN — can moderate all listings/users via `/admin/*` |

Plus 5 other sample users, password `password123` for all (see `prisma/seed.ts`).

## Prisma 7 notes

Prisma 7 removed support for a plain `url = env("DATABASE_URL")` connection — it now requires a
driver adapter. This project wires SQLite through `@prisma/adapter-better-sqlite3` in
`prisma.config.ts`, `src/lib/prisma.ts`, and `prisma/seed.ts`. The `DATABASE_URL` env var and
`datasource` block in `schema.prisma` are unchanged from a pre-7 setup — only the connection
plumbing moved.

`better-sqlite3` has native bindings, so after copying/cloning this repo onto a different OS or
CPU architecture, delete `node_modules` and run `npm install` fresh rather than reusing a copied
`node_modules` — a binary built for one platform won't load on another.

Prisma 7 also ships an AI-agent safety guard: running `prisma migrate reset` (or any command that
would drop data) from an agent like Claude Code is blocked until the user gives fresh, explicit
consent in that conversation — it will not silently reset a database on your behalf.

## Scripts

- `npm run dev` — start with `tsx watch` (auto-reload)
- `npm run build` — `tsc` to `dist/`
- `npm start` — run the built output

## Project structure

```
prisma/
  schema.prisma     User, Listing, ListingPhoto + ListingType/PropertyType/City/ListingStatus/UserRole enums
  migrations/        init, add_user_role
  seed.ts            sample users/listings + demo accounts (idempotent)
src/
  index.ts           Express app, CORS, /uploads static, error handler
  lib/prisma.ts       PrismaClient singleton (driver-adapter based)
  middleware/auth.ts   requireAuth / optionalAuth / requireAdmin (JWT)
  schemas/            zod request validation
  routes/
    auth.ts            register, login, me
    listings.ts         public search/filter + owner CRUD + photo upload
    users.ts            current user's own listings
    admin.ts             ADMIN-only moderation (all listings, all users)
```

## Endpoints

Public: `GET /listings` (filterable — city, listing_type, property_type, price range, bedrooms, `q`,
sort, pagination), `GET /listings/:id`.
Auth required: register/login, `POST/PUT/DELETE /listings*`, photo upload, `GET /users/me/listings`.
Admin only: `GET/PUT/DELETE /admin/listings*`, `GET /admin/users`.

Full details in [SPEC.md](../SPEC.md) §5-§7.
