# Automated Resume Screening and Ranking System

## 🛠️ Tech Stack

- **Backend:** FastAPI
- **Programming Language:** Python
- **NLP:** spaCy, NER, PhraseMatcher
- **Machine Learning:** Sentence Transformers, BERT/RoBERTa
- **Fallback Similarity:** TF-IDF
- **Database:** PostgreSQL
- **ORM:** SQLAlchemy
- **Document Processing:** pdfplumber, python-docx
- **Deployment:** Docker
- **API Documentation:** Swagger / OpenAPI

An AI system that parses resumes (PDF/DOCX), extracts skills via NLP/NER, and
ranks candidates against a job description using transformer-based semantic
similarity combined with structured skill-overlap matching.

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌────────────────────┐
│  Resume Parser   │ --> │  Skill Extraction /  │ --> │   Ranking Engine    │
│ (PDF/DOCX -> text)│     │  NER (spaCy)         │     │ (BERT/RoBERTa       │
│                   │     │                       │     │  embeddings +       │
│                   │     │                       │     │  skill overlap)     │
└─────────────────┘     └──────────────────────┘     └────────────────────┘
        │                          │                            │
        ▼                          ▼                            ▼
   raw text, email,        skills, education,          semantic_score,
   phone                   experience years,            skill_overlap_score,
                            organizations                final_score (0-100)

                                   │
                                   ▼
                    FastAPI REST API + PostgreSQL storage
```

### Modules

| Module | File | Responsibility |
|---|---|---|
| Resume Parser | `app/parsers/resume_parser.py` | Extracts raw text from PDF (`pdfplumber`) and DOCX (`python-docx`), plus email/phone via regex, and naive section splitting. |
| Skills Taxonomy | `app/skills_db.py` | Curated, categorized list of ~150 skills (languages, frameworks, ML/DS, cloud/devops, databases, soft skills) used for matching. |
| Skill Extraction / NER | `app/nlp/skill_extractor.py` | spaCy `en_core_web_sm` pipeline: general NER (PERSON/ORG) for name & employers, a `PhraseMatcher` seeded from the skills taxonomy for reliable skill detection, plus regex heuristics for years-of-experience and education. |
| Ranking Engine | `app/nlp/ranker.py` | Computes (1) cosine similarity between transformer sentence embeddings of resume vs. job description text, and (2) skill-overlap coverage of the JD's required skills. Combines both into a weighted 0-100 final score. Falls back to TF-IDF similarity automatically if the transformer model can't be loaded. |
| API layer | `app/main.py`, `app/schemas.py` | FastAPI endpoints for job descriptions, resume upload, and ranking. |
| Persistence | `app/database.py` | SQLAlchemy models + PostgreSQL session management (`job_descriptions`, `candidates`, `rankings` tables). |

## Why this design

- **Semantic similarity alone isn't enough**: two resumes can be "conceptually similar" to a JD while lacking the exact required tools. Two resumes can share few generic words yet both be excellent matches. Combining a transformer embedding score with an explicit skill-overlap score (weighted 65/35 by default, configurable) balances contextual understanding against hard requirements.
- **Graceful degradation**: the ranking engine tries to load a `sentence-transformers` model (any BERT/RoBERTa-family checkpoint) and automatically falls back to TF-IDF cosine similarity if the model/weights aren't available (e.g. no internet access, low memory). The system stays usable in constrained environments rather than crashing.
- **Explainability**: every ranking result includes `matched_skills` and `missing_skills`, not just a bare score, so a recruiter can see *why* a candidate ranked where they did.

## Setup

### 1. Install dependencies

```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Download the spaCy English model (small, fast; en_core_web_trf is more
# accurate but far heavier if you have GPU/CPU budget)
python -m spacy download en_core_web_sm

# NLTK data used for basic tokenization/stopwords fallback paths
python -m nltk.downloader punkt stopwords
```

### 2. Start PostgreSQL

Easiest via Docker:

```bash
docker compose up -d
```

Or point `DATABASE_URL` in your `.env` at any existing Postgres instance.

### 3. Configure environment

```bash
cp .env.example .env
# edit .env if needed (DB credentials, embedding model, score weights)
```

### 4. Run the API

```bash
uvicorn app.main:app --reload --port 8000
```

Interactive API docs: `http://localhost:8000/docs`

Tables are created automatically on startup (`init_db()` in `app/main.py`).

## API Walkthrough

**1. Create a job description**

```bash
curl -X POST http://localhost:8000/jobs \
  -H "Content-Type: application/json" \
  -d '{
        "title": "Senior Backend Engineer",
        "raw_text": "We need a backend engineer skilled in Python, FastAPI, Django, PostgreSQL, Docker, Kubernetes, and AWS.",
        "min_experience_years": 3
      }'
```
If `required_skills` is omitted, it's auto-extracted from `raw_text` using the same skill extractor used on resumes.

**2. Upload resumes**

```bash
curl -X POST http://localhost:8000/resumes/upload \
  -F "file=@/path/to/candidate_resume.pdf"
```
Returns the parsed candidate record (name, email, phone, skills, education, experience years).

**3. Rank candidates against a job**

```bash
curl -X POST http://localhost:8000/rank \
  -H "Content-Type: application/json" \
  -d '{"job_id": 1, "top_n": 10}'
```
Returns candidates sorted by `final_score` descending, each with `semantic_score`, `skill_overlap_score`, `matched_skills`, and `missing_skills`.

Rankings are persisted, so `GET /rank/{job_id}` retrieves the last computed ranking without recomputation.

## Standalone pipeline demo (no API/DB needed)

```bash
PYTHONPATH=. python tests/test_pipeline_demo.py path/to/resume.pdf path/to/resume2.docx
```
Prints the extracted profile and ranking score against a built-in sample "Senior Backend Engineer" JD — useful for quickly checking parsing/extraction quality on real resumes.

## Configuration (`.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `EMBEDDING_MODEL` | Any `sentence-transformers` model name. Default `all-MiniLM-L6-v2` (fast). For higher accuracy, use a larger BERT/RoBERTa model, e.g. `sentence-transformers/all-roberta-large-v1`. |
| `SEMANTIC_WEIGHT` / `SKILL_OVERLAP_WEIGHT` | How much the final score weights conceptual similarity vs. explicit skill matching. Must sum to 1.0. |
| `UPLOAD_DIR` | Where uploaded resume files are stored on disk. |

## Extending the system

- **Bigger skills taxonomy**: replace/extend `app/skills_db.py` with an external taxonomy (ESCO, O*NET, LinkedIn Skills Graph) for broader coverage — no other code changes needed since the `PhraseMatcher` is built dynamically from that list.
- **Better NER**: swap `en_core_web_sm` for `en_core_web_trf` (transformer-based spaCy model) in `skill_extractor.py` for higher-accuracy name/organization extraction, at the cost of speed.
- **Fine-tuned skill extraction**: the current approach is taxonomy-matching (precise, but limited to known skills). For open-vocabulary skill discovery, this can be swapped for a fine-tuned token-classification model (e.g. a BERT model fine-tuned on a skill-NER dataset) behind the same `extract_profile()` interface.
- **Batch ranking at scale**: for very large candidate pools, precompute and cache resume embeddings at upload time (add an `embedding` column to `Candidate`) instead of re-embedding on every `/rank` call.

## Known limitations (by design, for a v1)

- Years-of-experience and education extraction are regex/heuristic-based, not ML-based — they work well on conventional resume formats but can miss unconventional layouts.
- General-purpose spaCy NER occasionally misclassifies non-organization phrases as `ORG` (visible in the `organizations` field); treat it as a helpful hint, not ground truth.
- Scanned/image-only PDFs aren't supported (no OCR step) and will raise a clear `EmptyResumeError`.
