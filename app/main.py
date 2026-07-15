"""
Automated Resume Screening and Ranking System - API
=====================================================
FastAPI service exposing:

  POST /jobs                     - create a job description
  GET  /jobs                     - list job descriptions
  GET  /jobs/{job_id}            - get one job description

  POST /resumes/upload           - upload + parse a resume (PDF/DOCX), stores candidate
  GET  /candidates               - list all candidates
  GET  /candidates/{candidate_id}- get one candidate

  POST /rank                     - rank candidates against a job description
  GET  /rank/{job_id}            - fetch previously computed rankings for a job
"""
import os
import shutil
import uuid

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import init_db, get_db, JobDescription, Candidate, Ranking
from app.schemas import (
    JobDescriptionCreate, JobDescriptionOut,
    CandidateOut, RankingOut, RankingRequest,
)
from app.parsers.resume_parser import (
    parse_resume, UnsupportedFileTypeError, EmptyResumeError, SUPPORTED_EXTENSIONS,
)
from app.nlp.skill_extractor import extract_profile
from app.nlp.ranker import rank_candidate

settings = get_settings()

app = FastAPI(title="Automated Resume Screening and Ranking System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health_check():
    return {"status": "ok"}


# ----------------------------------------------------------------------
# Job Descriptions
# ----------------------------------------------------------------------

@app.post("/jobs", response_model=JobDescriptionOut)
def create_job(payload: JobDescriptionCreate, db: Session = Depends(get_db)):
    required_skills = payload.required_skills
    if not required_skills:
        # Auto-extract skills from the JD text if the caller didn't supply an explicit list
        profile = extract_profile(payload.raw_text)
        required_skills = profile.skills

    job = JobDescription(
        title=payload.title,
        raw_text=payload.raw_text,
        required_skills=required_skills,
        min_experience_years=payload.min_experience_years,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@app.get("/jobs", response_model=list[JobDescriptionOut])
def list_jobs(db: Session = Depends(get_db)):
    return db.query(JobDescription).order_by(JobDescription.created_at.desc()).all()


@app.get("/jobs/{job_id}", response_model=JobDescriptionOut)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(JobDescription).get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job description not found")
    return job


# ----------------------------------------------------------------------
# Resume upload & parsing
# ----------------------------------------------------------------------

@app.post("/resumes/upload", response_model=CandidateOut)
async def upload_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Supported: {sorted(SUPPORTED_EXTENSIONS)}",
        )

    # Save upload to disk with a collision-proof name
    safe_name = f"{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(settings.upload_dir, safe_name)
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        parsed = parse_resume(dest_path)
    except (UnsupportedFileTypeError, EmptyResumeError) as exc:
        os.remove(dest_path)
        raise HTTPException(status_code=422, detail=str(exc))

    profile = extract_profile(parsed.raw_text)

    candidate = Candidate(
        full_name=profile.full_name,
        email=parsed.email,
        phone=parsed.phone,
        file_name=file.filename,
        file_type=parsed.file_type,
        raw_text=parsed.raw_text,
        skills=profile.skills,
        education=profile.education,
        organizations=profile.organizations,
        total_experience_years=profile.total_experience_years,
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


@app.get("/candidates", response_model=list[CandidateOut])
def list_candidates(db: Session = Depends(get_db)):
    return db.query(Candidate).order_by(Candidate.created_at.desc()).all()


@app.get("/candidates/{candidate_id}", response_model=CandidateOut)
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).get(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


# ----------------------------------------------------------------------
# Ranking
# ----------------------------------------------------------------------

@app.post("/rank", response_model=list[RankingOut])
def rank_candidates(payload: RankingRequest, db: Session = Depends(get_db)):
    job = db.query(JobDescription).get(payload.job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job description not found")

    query = db.query(Candidate)
    if payload.candidate_ids:
        query = query.filter(Candidate.id.in_(payload.candidate_ids))
    candidates = query.all()

    if not candidates:
        raise HTTPException(status_code=404, detail="No candidates found to rank")

    results = []
    for candidate in candidates:
        rank_result = rank_candidate(
            resume_text=candidate.raw_text,
            candidate_skills=candidate.skills or [],
            job_text=job.raw_text,
            required_skills=job.required_skills or [],
        )

        # Persist the ranking so /rank/{job_id} can retrieve it later without recomputing
        ranking_row = Ranking(
            job_id=job.id,
            candidate_id=candidate.id,
            semantic_score=rank_result.semantic_score,
            skill_overlap_score=rank_result.skill_overlap_score,
            final_score=rank_result.final_score,
            matched_skills=rank_result.matched_skills,
            missing_skills=rank_result.missing_skills,
        )
        db.add(ranking_row)

        results.append(RankingOut(
            candidate_id=candidate.id,
            candidate_name=candidate.full_name,
            candidate_email=candidate.email,
            semantic_score=rank_result.semantic_score,
            skill_overlap_score=rank_result.skill_overlap_score,
            final_score=rank_result.final_score,
            matched_skills=rank_result.matched_skills,
            missing_skills=rank_result.missing_skills,
            total_experience_years=candidate.total_experience_years,
            meets_min_experience=candidate.total_experience_years >= job.min_experience_years,
        ))

    db.commit()

    # Highest match first
    results.sort(key=lambda r: r.final_score, reverse=True)
    if payload.top_n:
        results = results[: payload.top_n]

    return results


@app.get("/rank/{job_id}", response_model=list[RankingOut])
def get_rankings_for_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(JobDescription).get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job description not found")

    rankings = (
        db.query(Ranking)
        .filter(Ranking.job_id == job_id)
        .order_by(Ranking.final_score.desc())
        .all()
    )

    return [
        RankingOut(
            candidate_id=r.candidate_id,
            candidate_name=r.candidate.full_name,
            candidate_email=r.candidate.email,
            semantic_score=r.semantic_score,
            skill_overlap_score=r.skill_overlap_score,
            final_score=r.final_score,
            matched_skills=r.matched_skills,
            missing_skills=r.missing_skills,
            total_experience_years=r.candidate.total_experience_years,
            meets_min_experience=r.candidate.total_experience_years >= job.min_experience_years,
        )
        for r in rankings
    ]
