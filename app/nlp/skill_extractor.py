"""
Skill Extraction & Named Entity Recognition Module
====================================================
Uses spaCy for:
  1. General NER (PERSON, ORG, DATE) to pull candidate name / employers.
  2. A PhraseMatcher seeded from the curated skills taxonomy to reliably
     detect known skills, since off-the-shelf NER models don't have a
     "SKILL" entity type.
  3. Regex-based heuristics for total years of experience and education.

Loading the spaCy model is expensive, so it's cached as a module-level
singleton via `get_nlp()`.
"""
import re
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Optional

import spacy
from spacy.matcher import PhraseMatcher

from app.skills_db import ALL_SKILLS, SKILL_TO_CATEGORY, DEGREE_KEYWORDS

_MODEL_NAME = "en_core_web_sm"


@lru_cache
def get_nlp():
    """
    Loads (and caches) the spaCy pipeline. Falls back to a blank English
    pipeline with just a sentencizer if the trained model isn't installed,
    so the rest of the app can still run in degraded mode rather than crash.
    """
    try:
        return spacy.load(_MODEL_NAME)
    except OSError:
        import warnings
        warnings.warn(
            f"spaCy model '{_MODEL_NAME}' not found. Run "
            f"`python -m spacy download {_MODEL_NAME}`. "
            "Falling back to a blank pipeline (NER for names/orgs will be disabled)."
        )
        nlp = spacy.blank("en")
        nlp.add_pipe("sentencizer")
        return nlp


@lru_cache
def get_skill_matcher() -> PhraseMatcher:
    """Builds a case-insensitive PhraseMatcher seeded with the skills taxonomy."""
    nlp = get_nlp()
    matcher = PhraseMatcher(nlp.vocab, attr="LOWER")
    patterns = [nlp.make_doc(skill) for skill in ALL_SKILLS]
    matcher.add("SKILL", patterns)
    return matcher


@dataclass
class ExtractedProfile:
    full_name: Optional[str] = None
    organizations: list = field(default_factory=list)
    skills: list = field(default_factory=list)
    skills_by_category: dict = field(default_factory=dict)
    education: list = field(default_factory=list)
    total_experience_years: float = 0.0


# Matches ranges like "2019 - 2023", "Jan 2020 to Present", "2018-2021"
_DATE_RANGE_RE = re.compile(
    r"(\b(?:19|20)\d{2}\b)\s*(?:-|–|to|until)\s*(\b(?:19|20)\d{2}\b|present|current)",
    re.IGNORECASE,
)

# Matches explicit statements like "5 years of experience" / "5+ yrs experience"
_EXPLICIT_YEARS_RE = re.compile(
    r"(\d{1,2}(?:\.\d+)?)\+?\s*(?:years|yrs)\s*(?:of)?\s*(?:experience|exp)",
    re.IGNORECASE,
)


def _extract_name(doc) -> Optional[str]:
    """
    Heuristic: the first PERSON entity found is usually the candidate's own
    name, since resumes lead with it. This is imperfect (co-authors, referees)
    but works well for the common single-column resume format, especially
    when combined with a check against the top of the document.
    """
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            return ent.text.strip()
    return None


def _extract_organizations(doc, limit: int = 15) -> list:
    seen = []
    for ent in doc.ents:
        if ent.label_ == "ORG" and ent.text.strip() not in seen:
            seen.append(ent.text.strip())
        if len(seen) >= limit:
            break
    return seen


def _extract_skills(doc) -> tuple[list, dict]:
    matcher = get_skill_matcher()
    matches = matcher(doc)

    found = set()
    for match_id, start, end in matches:
        span_text = doc[start:end].text.lower()
        found.add(span_text)

    skills_by_category: dict[str, list] = {}
    for skill in found:
        category = SKILL_TO_CATEGORY.get(skill, "other")
        skills_by_category.setdefault(category, []).append(skill)

    return sorted(found), skills_by_category


def _extract_education(text: str) -> list:
    lower = text.lower()
    found = []
    for keyword in DEGREE_KEYWORDS:
        if keyword.strip() and keyword in lower:
            found.append(keyword.strip())
    # de-duplicate while preserving a stable order
    return sorted(set(found))


def _estimate_experience_years(text: str) -> float:
    """
    Two-pass heuristic:
      1. Look for an explicit "X years of experience" statement (most reliable).
      2. Otherwise, sum up date ranges found in the work-experience section.
    """
    explicit_matches = _EXPLICIT_YEARS_RE.findall(text)
    if explicit_matches:
        return max(float(y) for y in explicit_matches)

    total_months = 0
    current_year = 2026  # kept static/deterministic for reproducible scoring
    for start_str, end_str in _DATE_RANGE_RE.findall(text):
        start_year = int(start_str)
        end_year = current_year if end_str.lower() in ("present", "current") else int(end_str)
        if end_year >= start_year:
            total_months += (end_year - start_year) * 12

    return round(total_months / 12, 1)


def extract_profile(text: str) -> ExtractedProfile:
    """Main entry point: runs the full NER + skill-extraction pipeline on resume text."""
    nlp = get_nlp()
    # spaCy has a default max_length; guard against very long resumes/attachments
    doc = nlp(text[: nlp.max_length])

    skills, skills_by_category = _extract_skills(doc)

    return ExtractedProfile(
        full_name=_extract_name(doc),
        organizations=_extract_organizations(doc),
        skills=skills,
        skills_by_category=skills_by_category,
        education=_extract_education(text),
        total_experience_years=_estimate_experience_years(text),
    )
