# Architecture

## High Level Overview

The application is split into four major systems.

```
React (Vercel)
        │
        ▼
FastAPI (Render)
        │
        ▼
Supabase
(Database + Auth)
        │
        ▼
AI Providers
(OpenAI / Claude / Gemini)
```

---

# Frontend

Technology:

- React
- JavaScript

Responsibilities:

- User authentication
- Resume editing
- Job description input
- Display AI analyses
- Resume diff review
- Final resume generation
- History

Primary pages:

```
App
├── Tailor Resume
└── History
```

Important components:

```
AppHeader
AppTabs
TailorForm
LoadingSpinner
ScoreSummary
MoreInfoSection
DiffReview
FinalResume
HistoryPage
LoginModal
```

---

# Backend

Technology:

- FastAPI
- Python

Responsibilities:

- Coordinate AI providers
- Save execution history
- Synthesize AI recommendations
- Validate requests
- Return JSON to frontend

Endpoints:

```
POST /analyze
POST /synthesize
```

---

# AI Pipeline

## Analyze

```
Resume
+
Job Description
        │
        ▼
OpenAI
Claude
Gemini
        │
        ▼
Individual Analyses
```

Each provider returns:

- match score
- explanation
- missing keywords
- bullet suggestions
- inferred company
- inferred job title

All analysis results are persisted.

---

## Synthesize

The backend combines:

- original resume
- job description
- all provider analyses

The synthesis model produces:

- overall summary
- estimated new match score
- model differences
- recommended next steps
- proposed resume
- cover letter

The synthesis is also persisted.

---

# Database

Supabase provides:

- PostgreSQL
- Authentication
- Google OAuth

Major tables:

```
tailor_resume_executions
```

One row per tailoring attempt.

Contains:

- user
- company
- job title
- original resume
- final chosen resume
- job description

```
analysis_results
```

One row per AI provider.

```
synthesis_results
```

One synthesized result per execution.

Supporting tables:

```
missing_keywords
bullet_suggestions
recommended_next_steps
notable_model_differences

ai_providers
ai_models
```

---

# Authentication

Authentication is handled by Supabase.

Current provider:

- Google OAuth

Anonymous visitors may experiment with the application.

Authentication is required before:

- saving history
- accessing previous runs

---

# Deployment

Frontend

```
Vercel
```

Backend

```
Render
```

Database/Auth

```
Supabase
```

---

# Current Application Flow

```
Paste Resume
        │
Paste Job Description
        │
Tailor Resume
        │
Analyze
(OpenAI + Claude + Gemini)
        │
Save Analyses
        │
Synthesize
        │
Save Synthesis
        │
Review Resume Diff
        │
Approve / Reject Changes
        │
Generate Final Resume
        │
History
```

---

# Future Ideas

- Brush-up page
- Saved resumes
- Resume export
- PDF/DOCX import
- Cost tracking
- Provider benchmarking
- RLS policies
- Automated testing
- Admin dashboard
