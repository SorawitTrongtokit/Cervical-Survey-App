# Internal Cervical Screening Survey

Internal Next.js app for อสม. to record `ประสงค์ตรวจ` for women aged 30-60 using Supabase as the shared database and the provided Excel workbook as the seed source.

## Stack

- Next.js App Router
- Tailwind CSS
- TypeScript
- Supabase

## Setup

1. Install dependencies:

   ```powershell
   npm.cmd install
   ```

2. Add these values to [.env.local](/C:/Users/User/Downloads/project3/.env.local):

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `INTERNAL_ALLOWED_EMAILS`

3. Run these SQL files in Supabase SQL Editor:

   - [20260407_internal_cervical_screening.sql](/C:/Users/User/Downloads/project3/supabase/migrations/20260407_internal_cervical_screening.sql)
   - [20260407_internal_cervical_screening_auth_hardening.sql](/C:/Users/User/Downloads/project3/supabase/migrations/20260407_internal_cervical_screening_auth_hardening.sql)

4. In Supabase Auth, create the internal admin users with email and password, and make sure their email addresses are included in `INTERNAL_ALLOWED_EMAILS`.

5. Import the Excel workbook:

   ```powershell
   npm.cmd run import:excel
   ```

   You can also provide another workbook path:

   ```powershell
   npm.cmd run import:excel -- ".\another-file.xlsx"
   ```

6. Start the app:

   ```powershell
   npm.cmd run dev
   ```

## Expected import counts for the current workbook

- Citizens: 603
- Volunteers: 100
- Pending citizens: 290

## Notes

- `survey_intents` stores follow-up phone numbers separately from the imported Excel phone field.
- Only rows with imported status `ยังไม่ได้ตรวจ` can be marked as `ประสงค์ตรวจ`.
- Re-running the import updates citizen and volunteer source data without deleting saved intents.
- The app now uses Supabase Auth with email/password login for `/admin`. Access is limited to signed-in users whose email is present in `INTERNAL_ALLOWED_EMAILS`.
- `/admin` supports filtering, row-level updates for citizens and volunteers, and Excel export for the current filtered view.

## Netlify

- Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `INTERNAL_ALLOWED_EMAILS` in the Netlify environment variable settings instead of committing real values to the repo.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` is intentionally exposed to the browser by Next.js, so this repo includes [netlify.toml](/C:/Users/User/Downloads/project3/netlify.toml) to omit that key from Netlify secret scanning.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only and never prefix it with `NEXT_PUBLIC_`.
