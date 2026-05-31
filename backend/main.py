from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
from anthropic import Anthropic
from google import genai
from fastapi.middleware.cors import CORSMiddleware
import os
import json
SYNTHESIS_PROVIDER = "openai"

load_dotenv()

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

anthropic_client = Anthropic(
    api_key=os.getenv("ANTHROPIC_API_KEY")
)

genai_client = genai.Client(
    api_key=os.getenv("GOOGLE_API_KEY")
)

openai_model = "gpt-4.1-mini"
anthropic_model = "claude-haiku-4-5-20251001"
genai_model = "gemini-3.5-flash"


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

class SynthesizeRequest(BaseModel):
    results: list[dict]

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

    response = openai_client.chat.completions.create(
        model=openai_model,
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
        model=anthropic_model,
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

def analyze_with_gemini(request: AnalyzeRequest):
    prompt = build_analysis_prompt(
        request.resume_text,
        request.job_description
    )

    response = genai_client.models.generate_content(
        model=genai_model,
        contents=prompt
    )

    content = response.text

    return json.loads(clean_json_response(content))

@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    return {
        "results": [
            {
                "provider": "openai",
                "model": openai_model,
                "analysis": analyze_with_openai(request),
            },
            {
                "provider": "claude",
                "model": anthropic_model,
                "analysis": analyze_with_claude(request),
            },
            {
                "provider": "gemini",
                "model": genai_model,
                "analysis": analyze_with_gemini(request),
            },
        ]
    }

def build_synthesis_prompt(results: list[dict]) -> str:
    return f"""
You are synthesizing resume optimization analyses from multiple AI providers.

Goal:
Help the user quickly decide what resume changes to make for this specific job application.

You will receive several model analyses. Each analysis may contain:
- match_score
- matching_keywords
- missing_keywords
- bullet_suggestions

Return valid JSON only.
No markdown.
No explanation outside the JSON.

Rules:
- Focus on practical resume changes, not abstract commentary.
- Identify where the models agree.
- Identify meaningful disagreements or differences in emphasis.
- Prioritize recommendations that appear across multiple models.
- Do not invent experience.
- Keep recommendations truthful and grounded in the provided analyses.
- Prefer concrete next steps the user can take quickly.
- If multiple models suggest similar bullets, consolidate them.

Use this exact JSON shape:
{{
  "overall_summary": "short summary of the combined model opinions",
  "consensus_missing_keywords": [
    {{
      "keyword": "keyword",
      "why_it_matters": "short reason"
    }}
  ],
  "notable_model_differences": [
    {{
      "topic": "topic",
      "difference": "short explanation"
    }}
  ],
  "recommended_next_steps": [
    {{
      "priority": 1,
      "action": "specific action the user should take"
    }}
  ],
  "best_bullet_suggestions": [
    "[Resume Section] Bullet text"
  ]
}}

Model analyses:
{json.dumps(results, indent=2)}
"""

@app.post("/synthesize")
def synthesize(request: SynthesizeRequest):
    prompt = build_synthesis_prompt(request.results)

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )

        content = response.choices[0].message.content

        return json.loads(clean_json_response(content))

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="Synthesis model returned invalid JSON."
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Synthesis request failed: {str(e)}"
        )