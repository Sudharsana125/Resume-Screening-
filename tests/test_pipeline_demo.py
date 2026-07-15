"""
Standalone demo/smoke-test of the parsing -> extraction -> ranking pipeline,
independent of the API/database layer. Useful for quickly sanity-checking
the NLP components after changing the skills taxonomy or swapping models.

Run with:  python tests/test_pipeline_demo.py
"""
from app.parsers.resume_parser import parse_resume
from app.nlp.skill_extractor import extract_profile
from app.nlp.ranker import rank_candidate


JOB_TEXT = """
We are hiring a Senior Backend Engineer. Requirements:
- Strong Python experience
- Experience with FastAPI or Django
- PostgreSQL and containerized deployments (Docker, Kubernetes)
- AWS cloud experience
- Bonus: microservices architecture, machine learning exposure
"""

REQUIRED_SKILLS = [
    "python", "fastapi", "django", "postgresql",
    "docker", "kubernetes", "aws", "microservices",
]


def run_demo(resume_path: str):
    parsed = parse_resume(resume_path)
    profile = extract_profile(parsed.raw_text)

    print(f"\n=== {parsed.file_name} ===")
    print("Name:", profile.full_name)
    print("Email:", parsed.email)
    print("Phone:", parsed.phone)
    print("Skills:", profile.skills)
    print("Experience (years):", profile.total_experience_years)
    print("Education:", profile.education)

    result = rank_candidate(
        resume_text=parsed.raw_text,
        candidate_skills=profile.skills,
        job_text=JOB_TEXT,
        required_skills=REQUIRED_SKILLS,
    )
    print("--- Ranking against Senior Backend Engineer JD ---")
    print("Semantic score:", result.semantic_score)
    print("Skill overlap score:", result.skill_overlap_score)
    print("FINAL SCORE:", result.final_score, "/ 100")
    print("Matched skills:", result.matched_skills)
    print("Missing skills:", result.missing_skills)


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python tests/test_pipeline_demo.py <resume.pdf|resume.docx> [more files...]")
        sys.exit(1)

    for path in sys.argv[1:]:
        run_demo(path)
