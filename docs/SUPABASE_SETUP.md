# Supabase Setup Guide

This guide will help you configure your Supabase project to work with the BuildPro application.

## 1. Database Setup

The application will automatically create the necessary tables when it connects for the first time. However, you need to set up Row Level Security (RLS) policies and Realtime subscriptions manually or via the SQL Editor.

### Run the following SQL in the Supabase SQL Editor:

```sql
-- Enable Realtime for team_messages
alter publication supabase_realtime add table team_messages;

-- Enable Row Level Security (RLS) on all tables
-- (Optional but recommended for production)
alter table projects enable row level security;
alter table tasks enable row level security;
alter table team enable row level security;
alter table documents enable row level security;
alter table clients enable row level security;
alter table inventory enable row level security;
alter table rfis enable row level security;
alter table punch_items enable row level security;
alter table daily_logs enable row level security;
alter table dayworks enable row level security;
alter table safety_incidents enable row level security;
alter table equipment enable row level security;
alter table timesheets enable row level security;
alter table channels enable row level security;
alter table team_messages enable row level security;

-- Create policies (Example: Allow all access for authenticated users for now)
-- You should refine these policies based on your actual security requirements.

create policy "Enable read access for all users" on projects for select using (true);
create policy "Enable insert for authenticated users only" on projects for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users only" on projects for update using (auth.role() = 'authenticated');

-- Repeat similar policies for other tables or use a broad policy for development:
-- create policy "Allow all for authenticated" on projects for all using (auth.role() = 'authenticated');
```

## 2. Storage Setup

You need to create a storage bucket for documents.

1.  Go to **Storage** in the Supabase Dashboard.
2.  Create a new bucket named `documents`.
3.  Make it **Public** (or keep private and use signed URLs, but the current app code expects public URLs for simplicity in some views, though `uploadFile` handles standard uploads).
4.  Add a **Policy** to the bucket:
    *   **Name**: Allow Authenticated Uploads
    *   **Allowed Operations**: INSERT, SELECT, UPDATE
    *   **Target Roles**: authenticated
    *   **Select**: `bucket_id = 'documents'`

Or run this SQL:

```sql
insert into storage.buckets (id, name, public) values ('documents', 'documents', true);

create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'documents' );

create policy "Authenticated Uploads"
  on storage.objects for insert
  with check ( bucket_id = 'documents' and auth.role() = 'authenticated' );
```

## 3. Environment Variables for Vercel

When deploying to Vercel, you must set the following Environment Variables in the Vercel Project Settings:

| Variable Name | Description | Value Source |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Your Supabase Project URL | Supabase Settings > API |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase Anon Key | Supabase Settings > API |
| `DATABASE_URL` | The Transaction Pooler Connection String | Supabase Settings > Database > Connection String > Node.js (Use the one with port 6543 usually) |
| `PGSSLMODE` | SSL Mode for Postgres | `no-verify` (Required for some poolers) |

**Important:**
*   The `DATABASE_URL` should look like: `postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`
*   Ensure you append `?pgbouncer=true` if using the transaction pooler (recommended for Serverless).
*   If you encounter SSL errors, try setting `PGSSLMODE=no-verify`.

## 4. Deployment

1.  Push your code to a GitHub repository.
2.  Import the repository into Vercel.
3.  Add the Environment Variables listed above.
4.  Deploy.

The application will automatically detect the `DATABASE_URL` and switch from SQLite to PostgreSQL.
