"""
Ranking Module
===============
Combines two signals into a single candidate/job match score:

  1. Semantic similarity - cosine similarity between transformer sentence
     embeddings (default: a MiniLM sentence-transformers model; swap in
     any BERT/RoBERTa-family model via EMBEDDING_MODEL in .env, e.g.
     'sentence-transformers/all-roberta-large-v1') of the full resume text
     vs. the full job description text. This captures conceptual/contextual
     match beyond exact keywords (e.g. "built REST APIs" ~ "backend development").

  2. Skill overlap - a Jaccard-style overlap between the structured skill
     lists extracted by skill_extractor.py. This rewards candidates who
     explicitly list the exact required skills, which semantic similarity
     alone can under-weight.

Final score = semantic_weight * semantic_score + skill_weight * skill_overlap,
scaled to 0-100 for readability in the API response.

If sentence-transformers / the model download is unavailable (e.g. no
internet access), the ranker automatically falls back to TF-IDF cosine
similarity so the system remains usable in a degraded mode.
"""
from dataclasses import dataclass
from functools import lru_cache
from typing import Optional

import numpy as np

from app.config import get_settings

settings = get_settings()


@dataclass
class RankResult:
    semantic_score: float          # 0-1
    skill_overlap_score: float     # 0-1
    final_score: float             # 0-100
    matched_skills: list
    missing_skills: list


class _TfidfFallback:
    """Lightweight fallback embedding backend using TF-IDF + cosine similarity."""

    def __init__(self):
        from sklearn.feature_extraction.text import TfidfVectorizer
        self._vectorizer_cls = TfidfVectorizer

    def similarity(self, text_a: str, text_b: str) -> float:
        from sklearn.metrics.pairwise import cosine_similarity
        vectorizer = self._vectorizer_cls(stop_words="english")
        try:
            tfidf = vectorizer.fit_transform([text_a, text_b])
        except ValueError:
            # e.g. empty vocabulary after stop-word removal
            return 0.0
        sim = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
        return float(np.clip(sim, 0.0, 1.0))


class _SentenceTransformerBackend:
    """Primary embedding backend: transformer sentence embeddings."""

    def __init__(self, model_name: str):
        from sentence_transformers import SentenceTransformer
        self.model = SentenceTransformer(model_name)

    def similarity(self, text_a: str, text_b: str) -> float:
        from sentence_transformers import util
        embeddings = self.model.encode([text_a, text_b], convert_to_tensor=True)
        sim = util.cos_sim(embeddings[0], embeddings[1]).item()
        return float(np.clip(sim, 0.0, 1.0))


@lru_cache
def _get_backend():
    """
    Tries to load the configured transformer model. Falls back to TF-IDF
    if the model/weights can't be downloaded or loaded (e.g. offline env).
    Cached so the (potentially large) model is only loaded once per process.
    """
    try:
        return _SentenceTransformerBackend(settings.embedding_model)
    except Exception as exc:  # broad: network errors, OOM, missing torch, etc.
        import warnings
        warnings.warn(
            f"Could not load transformer model '{settings.embedding_model}' "
            f"({exc}). Falling back to TF-IDF similarity. For full semantic "
            "ranking quality, ensure internet access and enough memory to "
            "download the model, then restart the service."
        )
        return _TfidfFallback()


def compute_semantic_similarity(resume_text: str, job_text: str) -> float:
    backend = _get_backend()
    return backend.similarity(resume_text, job_text)


def compute_skill_overlap(candidate_skills: list[str], required_skills: list[str]) -> tuple[float, list, list]:
    """
    Returns (overlap_score, matched_skills, missing_skills).
    overlap_score = |matched| / |required| (how much of the JD's required
    skill set the candidate covers) - more interpretable for recruiters than
    a symmetric Jaccard score, since we specifically care about JD coverage.
    """
    candidate_set = {s.lower() for s in candidate_skills}
    required_set = {s.lower() for s in required_skills}

    if not required_set:
        return 0.0, [], []

    matched = sorted(candidate_set & required_set)
    missing = sorted(required_set - candidate_set)
    overlap_score = len(matched) / len(required_set)

    return overlap_score, matched, missing


def rank_candidate(
    resume_text: str,
    candidate_skills: list[str],
    job_text: str,
    required_skills: list[str],
) -> RankResult:
    semantic_score = compute_semantic_similarity(resume_text, job_text)
    skill_overlap_score, matched, missing = compute_skill_overlap(candidate_skills, required_skills)

    final_score = (
        settings.semantic_weight * semantic_score
        + settings.skill_overlap_weight * skill_overlap_score
    ) * 100

    return RankResult(
        semantic_score=round(semantic_score, 4),
        skill_overlap_score=round(skill_overlap_score, 4),
        final_score=round(final_score, 2),
        matched_skills=matched,
        missing_skills=missing,
    )
