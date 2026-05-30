from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
from anthropic import Anthropic
from fastapi.middleware.cors import CORSMiddleware
import os
import json

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

anthropic_client = Anthropic(
    api_key=os.getenv("ANTHROPIC_API_KEY")
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    resume_text: str
    job_description: str

def clean_json_response(content: str) -> str:
    cleaned = content.strip()

    if cleaned.startswith("```json"):
        cleaned = cleaned.removeprefix("```json").strip()

    if cleaned.startswith("```"):
        cleaned = cleaned.removeprefix("```").strip()

    if cleaned.endswith("```"):
        cleaned = cleaned.removesuffix("```").strip()

    return cleaned

def build_analysis_prompt(resume_text: str, job_description: str) -> str:
    return f"""
You are an ATS-focused resume optimization assistant.

Goal:
Help the user look like a strong matching candidate for this specific job description.

Return valid JSON only.
No markdown.
No explanation outside the JSON.

Rules:
- Focus on top-of-funnel resume matching.
- Prefer exact language from the job description when identifying keywords.
- Do not invent experience the resume does not support.
- Rank missing keywords by importance.
- Keep recommendations truthful and grounded in the resume.
- For each bullet suggestion, begin with the most appropriate resume section in brackets.

Use this exact JSON shape:
{{
  "match_score": 87,
  "matching_keywords": ["keyword 1", "keyword 2"],
  "missing_keywords": [
    {{"priority": 1, "keyword": "keyword 1", "why_it_matters": "short reason"}},
    {{"priority": 2, "keyword": "keyword 2", "why_it_matters": "short reason"}}
  ],
  "bullet_suggestions": [
    "[Healthfirst] Truthful rewritten bullet 1",
    "[Professional Summary] Truthful rewritten bullet 2"
  ]
}}

Resume:
{resume_text}

Job description:
{job_description}
"""

def analyze_with_openai(request: AnalyzeRequest):
    prompt = build_analysis_prompt(
        request.resume_text,
        request.job_description
    )

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )

    content = response.choices[0].message.content

    return json.loads(clean_json_response(content))

def analyze_with_claude(request: AnalyzeRequest):
    prompt = build_analysis_prompt(
        request.resume_text,
        request.job_description
    )

    response = anthropic_client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=4000,
        temperature=0,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    content = response.content[0].text

    return json.loads(clean_json_response(content))

@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    return {
        "results": [
            {
                "provider": "openai",
                "model": "gpt-4.1-mini",
                "analysis": analyze_with_openai(request),
            },
            {
                "provider": "claude",
                "model": "claude-haiku-4-5-20251001",
                "analysis": analyze_with_claude(request),
            },
        ]
    }