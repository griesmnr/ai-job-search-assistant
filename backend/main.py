from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
from fastapi.middleware.cors import CORSMiddleware
import os
import json

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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


@app.get("/")
def root():
    return {"message": "Backend is alive!"}


@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    prompt = f"""
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
- Prioritize keywords that appear important to the role, especially repeated skills, required qualifications, tools, platforms, and responsibilities.
- Rank missing keywords by importance.
- Keep recommendations truthful and grounded in the resume.

For each bullet suggestion, begin the bullet with the most appropriate resume section in brackets.

Examples:

[Professional Summary] Software Developer with experience building cloud-native applications using Kubernetes and Azure.

[Healthfirst] Developed and maintained containerized Node.js REST APIs deployed through Kubernetes infrastructure.

[Optimum Energy] Built backend APIs and cloud-native services using Java, Node.js, and AWS technologies.

Choose the resume section that is the best location for the suggested bullet. Use existing resume sections whenever possible.

Return the bullet suggestions as strings.

Use this exact JSON shape:
{{
  "match_score": 87,
  "matching_keywords": ["keyword 1", "keyword 2"],
  "missing_keywords": [
    {{"priority": 1, "keyword": "keyword 1", "why_it_matters": "short reason"}},
    {{"priority": 2, "keyword": "keyword 2", "why_it_matters": "short reason"}}
  ],
  "resume_optimization_opportunities": [
    {{
      "area": "Professional Summary",
      "recommendation": "short recommendation"
    }}
  ],
  "bullet_suggestions": ["truthful rewritten bullet 1", "truthful rewritten bullet 2"]
}}

Resume:
{request.resume_text}

Job description:
{request.job_description}
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )

        content = response.choices[0].message.content
        parsed = json.loads(content)
        return parsed

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"OpenAI request failed: {str(e)}"
        )