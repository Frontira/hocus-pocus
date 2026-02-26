# Hocus Pocus

Invite-only event platform for exclusive networking events. Public landing page, token-gated event details, guest invite system, and admin dashboard - powered by Vercel Functions, Supabase, Brevo, and Apify.

## Live

- Production: `https://hoc-est-corpus-meum.com/`
- GitHub: `jo-vanna/hocus-pocus` (branch `focus-pocus`)

## Architecture

```
index.html          Public landing page (apply for access)
inside.html         Token-gated event page + invite claim flow
admin-login.html    Admin login
admin.html          Admin dashboard (applications, proactive invites)
middleware.js       Vercel Edge Middleware (admin route protection)

api/
  _auth.js          Admin auth (cookie + secret validation)
  _storage.js       Supabase data layer (applications, members, invites)
  _email.js         Brevo transactional email templates
  _linkedin.js      Apify LinkedIn profile enrichment
  apply.js          POST - submit application
  access.js         POST/GET - validate member token, get event details
  invite.js         POST - legacy invite endpoint
  invites/
    create.js       POST - member creates invite (email or link, max 2)
    claim.js        POST - claim invite, become member
  admin/
    login.js        POST - admin login
    logout.js       POST - admin logout
    applications.js GET - list all applications
    approve.js      POST - approve application, send access email
    reject.js       POST - reject application
    invite.js       POST - send proactive invite as persona
    invites.js      GET - list admin-sent invites
```

## Flows

**Application flow:** Visitor applies on landing page -> admin reviews -> approve sends "You're in" email with token link -> member sees full event details on inside page.

**Guest invite flow:** Members get 2 invites (24h expiry). They can send via email or generate a one-time link. Claiming an invite creates a new member and notifies the inviter.

**Admin proactive invite flow:** Admin sends invites on behalf of team personas (Joanna Bakas, Thomas Pisar, Stefan Erschwendner). 7-day expiry, no quota limit. Invite email shows "Name / email has personally invited you".

**LinkedIn enrichment:** When a member is created, their name is extracted from the LinkedIn URL slug instantly. An Apify scrape runs in the background to get the actual display name ($0.004/profile). The scraped name is used in invite emails: "Full Name / email invited you".

## Environment Variables

Required:

- `ADMIN_SECRET` - secret for admin login
- `SUPABASE_URL` - Supabase project REST URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `BREVO_API_KEY` - Brevo transactional email API key

Optional:

- `EMAIL_FROM` - sender email (default `content@frontira.io`)
- `EMAIL_FROM_NAME` - sender display name (default `Hocus Pocus`)
- `APIFY_API_TOKEN` - enables LinkedIn profile enrichment via Apify
- `SUPABASE_APPLICATIONS_TABLE` (default `applications`)
- `SUPABASE_MEMBERS_TABLE` (default `members`)
- `SUPABASE_INVITES_TABLE` (default `invites`)

## Supabase Schema

Run SQL in `SETUP.md` to create tables. Key columns:

- **applications**: email, linkedin, status, memberToken, createdAt
- **members**: name, email, linkedin, accessToken, inviterMemberId, createdAt
- **invites**: token, memberId, recipientEmail, method, senderPersona, expiresAt, usedAt

## Local Development

```bash
set -a; source .env.local; set +a; vercel dev
```

- Landing: `http://localhost:3000/`
- Admin: `http://localhost:3000/admin-login.html`

## Deploy

```bash
vercel --prod --yes
```
