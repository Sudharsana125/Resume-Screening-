"""
Curated skills taxonomy used by the NER/skill-extraction module.

In production this would live in a database table (or be loaded from a
larger external taxonomy like ESCO / LinkedIn Skills / O*NET) so it can be
updated without a code deploy. It's kept here as a flat, categorized
Python structure for simplicity and easy editing.

Matching is case-insensitive and includes common aliases/abbreviations.
Add new skills/aliases as your domain requires.
"""

SKILLS_TAXONOMY = {
    "programming_languages": [
        "python", "java", "javascript", "typescript", "c++", "c#", "c",
        "go", "golang", "rust", "ruby", "php", "swift", "kotlin", "scala",
        "r", "matlab", "perl", "sql", "bash", "shell scripting",
    ],
    "web_frameworks": [
        "django", "flask", "fastapi", "react", "react.js", "angular",
        "vue", "vue.js", "node.js", "nodejs", "express", "express.js",
        "next.js", "spring", "spring boot", "asp.net", "ruby on rails",
    ],
    "data_science_ml": [
        "machine learning", "deep learning", "natural language processing",
        "nlp", "computer vision", "data science", "data analysis",
        "statistics", "pandas", "numpy", "scikit-learn", "sklearn",
        "tensorflow", "pytorch", "keras", "spacy", "nltk", "huggingface",
        "transformers", "bert", "roberta", "gpt", "llm", "large language models",
        "opencv", "xgboost", "lightgbm", "reinforcement learning",
    ],
    "databases": [
        "postgresql", "postgres", "mysql", "mongodb", "redis", "sqlite",
        "oracle", "sql server", "cassandra", "elasticsearch", "dynamodb",
        "nosql", "sqlalchemy",
    ],
    "cloud_devops": [
        "aws", "amazon web services", "azure", "gcp", "google cloud",
        "docker", "kubernetes", "k8s", "terraform", "ansible", "jenkins",
        "ci/cd", "git", "github", "gitlab", "linux", "unix", "nginx",
        "microservices", "serverless", "lambda",
    ],
    "soft_skills": [
        "leadership", "communication", "teamwork", "problem solving",
        "project management", "agile", "scrum", "time management",
        "critical thinking", "collaboration", "mentoring", "stakeholder management",
    ],
    "business_analytics": [
        "excel", "power bi", "tableau", "looker", "google analytics",
        "a/b testing", "business intelligence", "data visualization",
    ],
}

# Flat lookup set for fast membership checks (all lowercase)
ALL_SKILLS = sorted({
    skill.lower()
    for group in SKILLS_TAXONOMY.values()
    for skill in group
})

# Map skill -> category, useful for reporting/UX
SKILL_TO_CATEGORY = {
    skill.lower(): category
    for category, skills in SKILLS_TAXONOMY.items()
    for skill in skills
}

DEGREE_KEYWORDS = [
    "b.tech", "btech", "bachelor", "b.sc", "bsc", "b.e.", "be",
    "m.tech", "mtech", "master", "m.sc", "msc", "mba", "phd", "ph.d",
    "doctorate", "associate degree", "b.a", "ba ", "m.a", "ma ",
]
