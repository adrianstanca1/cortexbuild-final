# Cloud Setup & Secrets Guide

Because your project is split between **Vercel** (Frontend) and **Google Cloud Run** (Backend), you must configure environment variables in **BOTH** places.

## 1. Google Cloud Run (Backend)
**Where to go**: [Google Cloud Console](https://console.cloud.google.com/run) -> Select Service (`buildpro-app`) -> **Edit & Deploy New Revision** -> **Variables & Secrets** tab.

Add these variables so the backend can send emails, access the DB, and use AI:

| Variable Name | Value (Copy from your local .env) | Purpose |
| :--- | :--- | :--- |
| `SENDGRID_API_KEY` | `SG.JzKfPM...` (The long secret key) | Sending emails |
| `GEMINI_API_KEY` | `AIzaSy...` | AI Features |
| `EMAIL_FROM` | `noreply@buildpro.app` | Sender address |
| `SUPABASE_URL` | `https://zwxyoeqsbntsogvgwily.supabase.co` | Auth & DB |
| `SUPABASE_SERVICE_ROLE_KEY` | (Your specific service role key) | Admin Auth |
| `DATABASE_URL` | (Your Postgres connection string) | Database access |

> **Important**: After adding these, click **Deploy** to push the changes.

---

## 2. Vercel (Frontend)
**Where to go**: [Vercel Dashboard](https://vercel.com/dashboard) -> Select Project -> **Settings** -> **Environment Variables**.

Add these variables so the Frontend knows where to connect:

| Variable Name | Value | Purpose |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://zwxyoeqsbntsogvgwily.supabase.co` | Frontend Auth |
| `VITE_SUPABASE_ANON_KEY` | (Your Supabase Anon/Public Key) | Frontend Auth |
| `VITE_API_URL` | `/api` | Proxy to Backend |

> **Important**: After adding these, you may need to **Redeploy** (or push a small empty commit) for the frontend to pick them up.

## Verification
Once both are configured:
1.  **Test Login**: Verifies Supabase keys on Frontend.
2.  **Test "Invite User"**: Verifies SendGrid on Backend.
3.  **Test "Project AI Analysis"**: Verifies Gemini on Backend.
