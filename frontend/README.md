# SIGNAL — frontend console

A standalone, no-build-step frontend for the Resume Screening & Ranking API
(`index.html` + `style.css` + `app.js`, vanilla JS, no frameworks). It does not
modify anything in `app/` — it just talks to your existing endpoints over HTTP.

## Run it

Any static file server works. From this folder:

```bash
python3 -m http.server 5173
```

Then open `http://localhost:5173`.

On first load, click the connection pill in the top-right corner and enter
your API's URL (defaults to `http://localhost:8000`). It's remembered in the
browser for next time.

## One setting you may need on the backend: CORS

Your FastAPI app doesn't currently enable CORS, so if the frontend is served
from a different origin/port than the API (which it will be, per above), the
browser will block the requests. This isn't something the frontend can fix —
it has to be allowed server-side. Since you asked not to touch the backend,
here's the snippet to add yourself in `app/main.py` (right after `app = FastAPI(...)`)
if you hit CORS errors in the browser console:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # or restrict to your frontend's origin
    allow_methods=["*"],
    allow_headers=["*"],
)
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
