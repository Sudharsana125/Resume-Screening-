# SIGNAL — frontend console

A standalone, no-build-step frontend for the Resume Screening & Ranking API
(`index.html` + `style.css` + `app.js`, vanilla JS, no frameworks). It does not
modify anything in `app/` — it just talks to your existing endpoints over HTTP.

## Run it

Any static file server works. From this folder:

```bash
python -m http.server 5173
```

Then open `http://localhost:5173`.

On first load, sign in with the local demo account:

- Email: `recruiter@demo.com`
- Password: `demo123`

After signing in, click the connection pill in the bottom-left corner to
configure the API URL if needed. It defaults to `http://localhost:8000` and is
remembered in the browser.

## Backend connection

The FastAPI app already enables CORS for the frontend, so the two local servers
can run on different ports. Start the API from the project root with:

```bash
python -m uvicorn app.main:app --reload --port 8000
```

## What's here

- **Job Descriptions** — create job postings (auto-extracts skills if you
  leave the skills field blank, same as the API does), browse existing ones.
- **Upload Resumes** — drag-and-drop PDF/DOCX upload with live parse status,
  shows the extracted profile (skills, education, organizations, experience).
- **Candidates** — browse every parsed candidate.
- **Rank** — pick a job, run `/rank`, see animated match-score gauges per
  candidate with semantic-fit vs skill-overlap breakdowns and matched/missing
  skill chips.

All views pull live from your API — nothing is hardcoded or mocked.
