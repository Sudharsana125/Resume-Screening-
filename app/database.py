"""
SQLAlchemy models and PostgreSQL session management.

Tables:
    job_descriptions  - job postings to rank candidates against
    candidates        - parsed resume data
    rankings          - computed score of a candidate against a job
"""
from datetime import datetime

from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Text,
    Float,
    DateTime,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

from app.config import get_settings

settings = get_settings()

connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# `future=True` / pool_pre_ping keeps long-lived connections healthy
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    raw_text = Column(Text, nullable=False)
    required_skills = Column(JSON, default=list)   # list[str], parsed/curated
    min_experience_years = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    rankings = relationship("Ranking", back_populates="job", cascade="all, delete-orphan")


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(50), nullable=True)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(10), nullable=False)   # pdf / docx
    raw_text = Column(Text, nullable=False)
    skills = Column(JSON, default=list)               # list[str]
    education = Column(JSON, default=list)            # list[str]
    organizations = Column(JSON, default=list)         # list[str] (NER orgs, e.g. past employers)
    total_experience_years = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    rankings = relationship("Ranking", back_populates="candidate", cascade="all, delete-orphan")


class Ranking(Base):
    """Stores the computed match score of one candidate against one job."""
    __tablename__ = "rankings"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("job_descriptions.id"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)

    semantic_score = Column(Float, nullable=False)     # cosine similarity (0-1)
    skill_overlap_score = Column(Float, nullable=False)  # jaccard-style overlap (0-1)
    final_score = Column(Float, nullable=False)        # weighted combination (0-100)
    matched_skills = Column(JSON, default=list)
    missing_skills = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("JobDescription", back_populates="rankings")
    candidate = relationship("Candidate", back_populates="rankings")


def init_db():
    """Create all tables. Call once on startup."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency that yields a DB session and closes it afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
