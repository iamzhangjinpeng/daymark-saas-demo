# Daymark

**Make room for what matters.**

Daymark is a small, production-minded task workspace built to demonstrate a complete SaaS flow: email sign-up, protected sessions, and private, persistent task management. Each account can only read and change its own tasks.

**Live demo:** Not deployed yet — add the Vercel URL after connecting the project.

The app preview is available locally after setup. A live link and customer-ready screenshot can be added once the Supabase project is connected and the Vercel deployment is live.

## What you can do

- Create an account with email and password, confirm your email, sign in, and sign out.
- Create, edit, complete, reopen, search, filter, and delete tasks.
- Add a description, priority, and optional due date to a task.
- Keep tasks in Supabase Postgres. Data survives refreshes and is isolated with Row Level Security (RLS).
- Visit `/dashboard` while signed out and be redirected to sign in.
- Use the workspace on desktop, tablet, or mobile.

There are no sample accounts, fake task records, or password shortcuts. The app requires a Supabase project before authentication and task storage are enabled.

## Stack

| Area | Technology |
| --- | --- |
| App | Next.js App Router, React, TypeScript |
| Styling | Tailwind CSS 4 and responsive CSS |
| Authentication | Supabase Auth with cookie-based SSR sessions |
| Database | Supabase Postgres with Row Level Security |
| Hosting | Vercel |
| Icons | Lucide React |

## Run locally

Requires Node.js 20.9 or newer and npm.

1. Install the packages:

   ```bash
   npm install
   ```

2. Create a Supabase project at [supabase.com](https://supabase.com/dashboard).

3. Copy `.env.example` to `.env.local`. Add the project URL and publishable key from **Project Settings → API Keys**:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
   ```

   Only the publishable key belongs in this app. Never put a secret or service-role key in a `NEXT_PUBLIC_` variable.

4. In the Supabase SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql). This creates the `tasks` table, indexes, timestamp trigger, and per-user RLS policies.

5. In **Authentication → URL Configuration**, set the local Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/confirm` to the redirect allow list. For production, add the matching Vercel URL too.

6. Start the app:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000), create an account, and confirm the email if email confirmation is enabled for the Supabase project.

## Deploy to Vercel

Import this repository into Vercel with the default Next.js settings. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the project environment variables, then deploy. Add the resulting production URL and its `/auth/confirm` callback to Supabase's URL allow list.

The app deliberately renders a setup guide while the Supabase variables are missing; it never substitutes local storage or pretend authentication.

## Data security

The browser uses Supabase's publishable key. The `tasks` table requires an authenticated user and has separate select, insert, update, and delete RLS policies tied to `auth.uid()`. The `user_id` is assigned by the database on insert. Route checks improve navigation, while RLS remains the data access boundary.

## Project structure

```text
app/
  auth/confirm/route.ts  Email confirmation callback
  dashboard/page.tsx     Protected task workspace
  login/page.tsx         Email sign-in
  signup/page.tsx        Email registration
components/
  auth-form.tsx          Sign-in and sign-up experience
  dashboard-shell.tsx    Task views and database-backed CRUD
  setup-state.tsx        Supabase connection instructions
lib/supabase/            Browser, server, and session clients
supabase/schema.sql      Tasks table and user-scoped RLS
```

## Production build

```bash
npm run build
npm start
```
