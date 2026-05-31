# AI Job Search Assistant

A personal project that helps tailor resumes to job descriptions using multiple AI providers.

The application compares a resume against a job posting, identifies important matching and missing keywords, suggests resume improvements, and synthesizes recommendations from multiple large language models.

## Features

- Resume-to-job-description analysis
- Multi-provider AI support
  - OpenAI
  - Anthropic Claude
  - Google Gemini
- Missing keyword prioritization
- Resume bullet recommendations
- AI-generated synthesis of provider results
- React frontend
- FastAPI backend

## Tech Stack

### Frontend

- React
- JavaScript
- Fetch API

### Backend

- FastAPI
- Python
- Pydantic
- Uvicorn

### AI Providers

- OpenAI
- Anthropic Claude
- Google Gemini

## Architecture

```text
React Frontend
        ↓
     FastAPI
        ↓
 ┌─────────────┐
 │   OpenAI    │
 │   Claude    │
 │   Gemini    │
 └─────────────┘
        ↓
   Synthesis
        ↓
 Resume Recommendations
```

## Motivation

Applying to large numbers of jobs often requires tailoring resumes to individual job descriptions.

This project was created to:

- Speed up the resume customization process
- Compare recommendations from multiple AI providers
- Learn modern AI application development techniques
- Gain hands-on experience with Python, FastAPI, React, prompt engineering, and LLM integrations

## Future Ideas

- Additional AI providers and model comparisons
- Cost optimization and provider selection strategies
- Resume upload support (PDF/DOCX)
- Application tracking
- Resume export and customization workflows
- Historical analysis and recommendation storage
- Advanced synthesis and consensus scoring

## Running the Project

### Backend

```bash
cd backend

python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt

uvicorn main:app --reload
```

Backend runs at:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

### Frontend

```bash
cd frontend

npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

## Disclaimer

This project provides AI-assisted resume recommendations. Users should review all suggested changes and ensure that resumes remain accurate and truthful representations of their skills and experience.
