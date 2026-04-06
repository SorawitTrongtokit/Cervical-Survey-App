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

2. Add your Supabase service role key to [.env.local](/C:/Users/User/Downloads/project3/.env.local).

3. Run the SQL in [20260407_internal_cervical_screening.sql](/C:/Users/User/Downloads/project3/supabase/migrations/20260407_internal_cervical_screening.sql) inside the Supabase SQL Editor.

4. Import the Excel workbook:

   ```powershell
   npm.cmd run import:excel
   ```

   You can also provide another workbook path:

   ```powershell
   npm.cmd run import:excel -- ".\another-file.xlsx"
   ```

5. Start the app:

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
