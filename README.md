# AI Job Search Assistant

An AI-powered resume tailoring application that compares a resume against a job description using multiple large language models, synthesizes their recommendations, and guides users through reviewing changes before producing a final tailored resume and cover letter.

## Features

- Resume vs. job description analysis
- Multi-model AI comparison
  - OpenAI
  - Anthropic Claude
  - Google Gemini
- AI synthesis across providers
- Human review of proposed resume changes
- Resume diff viewer with approve/reject workflow
- AI-generated cover letters
- Resume history (authenticated users)
- Google authentication via Supabase

## Tech Stack

### Frontend

- React
- JavaScript
- Vercel

### Backend

- FastAPI
- Python
- Pydantic
- Uvicorn
- Render

### Database / Authentication

- Supabase
- PostgreSQL
- Google OAuth

### AI Providers

- OpenAI
- Anthropic Claude
- Google Gemini

## Running the Project

### Backend

```bash
cd backend

python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt

uvicorn main:app --reload
```

Backend:

```
http://127.0.0.1:8000
```

Swagger docs:

```
http://127.0.0.1:8000/docs
```

### Frontend

```bash
cd frontend

npm install
npm run dev
```

Frontend:

```
http://localhost:5173
```

## Documentation

- Architecture: `ARCHITECTURE.md`

## Motivation

This project began as a tool to speed up my own job applications while serving as a practical way to learn modern full-stack AI application development.

## Disclaimer

AI-generated recommendations should always be reviewed. The application is designed to help tailor resumes while preserving truthful representations of experience.
