# Hocus Pocus Landing

Invite-only landing + admin access flow powered by Vercel Functions and Supabase.

## Live

- Production domain: `https://hoc-est-corpus-meum.com/`

## What Is Included

- Public landing page: `index.html`
- Private inside page: `inside.html`
- Admin login page: `admin-login.html`
- Admin dashboard: `admin.html`
- API routes under `api/`
- Route protection middleware: `middleware.js`

## Environment Variables

Required in `.env.local` (and Vercel project env):

- `ADMIN_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_APPLICATIONS_TABLE` (default `applications`)
- `SUPABASE_MEMBERS_TABLE` (default `members`)
- `SUPABASE_INVITES_TABLE` (default `invites`)

## Local Development

Run with env loaded:

```bash
set -a; source .env.local; set +a; vercel dev
```

Open:

- `http://localhost:3000/` (or printed port)
- `http://localhost:3000/admin-login.html`

## Admin Auth Model

- `POST /api/admin/login` validates `ADMIN_SECRET` and sets HTTP-only cookie.
- `middleware.js` blocks `/admin.html` before render unless cookie is valid.
- `POST /api/admin/logout` clears admin session.
- Admin APIs remain protected server-side.

## Supabase Notes

Run SQL schema in `SETUP.md` to create:

- `applications`
- `members`
- `invites`

Storage layer is in `api/_storage.js`.

## Social Preview Metadata

Open Graph + Twitter metadata is configured in `index.html`.

- OG/Twitter image: `https://hoc-est-corpus-meum.com/og-cover.png`
- Asset file: `og-cover.png`

## Deploy

Production deploy:

```bash
vercel --prod --yes
```
