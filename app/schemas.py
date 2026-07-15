"""Pydantic schemas for API request/response validation."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ---------- Job Description ----------

class JobDescriptionCreate(BaseModel):
    title: str = Field(..., examples=["Senior Backend Engineer"])
    raw_text: str = Field(..., description="Full job description text")
    required_skills: list[str] = Field(
        default_factory=list,
        description="Explicit list of required skills. If omitted, skills "
                     "will be auto-extracted from raw_text.",
    )
    min_experience_years: float = 0.0


class JobDescriptionOut(BaseModel):
    id: int
    title: str
    raw_text: str
    required_skills: list[str]
    min_experience_years: float
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Candidate ----------

class CandidateOut(BaseModel):
    id: int
    full_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    file_name: str
    file_type: str
    skills: list[str]
    education: list[str]
    organizations: list[str]
    total_experience_years: float
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Ranking ----------

class RankingOut(BaseModel):
    candidate_id: int
    candidate_name: Optional[str]
    candidate_email: Optional[str]
    semantic_score: float
    skill_overlap_score: float
    final_score: float
    matched_skills: list[str]
    missing_skills: list[str]
    total_experience_years: float
    meets_min_experience: bool

    class Config:
        from_attributes = True


class RankingRequest(BaseModel):
    job_id: int
    candidate_ids: Optional[list[int]] = Field(
        default=None,
        description="Restrict ranking to these candidate IDs. Omit to rank all candidates.",
    )
    top_n: Optional[int] = Field(default=None, description="Return only the top N candidates.")
