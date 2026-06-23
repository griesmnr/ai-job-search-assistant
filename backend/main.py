from fastapi import FastAPI, HTTPException
from typing import Optional
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
from anthropic import Anthropic
from google import genai
from fastapi.middleware.cors import CORSMiddleware
from concurrent.futures import ThreadPoolExecutor
import os
import json
from fastapi import Header

SYNTHESIS_PROVIDER = "openai"

load_dotenv(".env.local", override=True)

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
genai_client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
APP_ACCESS_SECRET = os.getenv("VITE_APP_ACCESS_SECRET")

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
    originalResumeText: str
    job_description: str


def validate_secret(app_secret: Optional[str]):
    if app_secret != APP_ACCESS_SECRET:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

def clean_json_response(content: str) -> str:
    cleaned = content.strip()

    if cleaned.startswith("```json"):
        cleaned = cleaned.removeprefix("```json").strip()

    if cleaned.startswith("```"):
        cleaned = cleaned.removeprefix("```").strip()

    if cleaned.endswith("```"):
        cleaned = cleaned.removesuffix("```").strip()

    return cleaned


def calculate_average_match_score(results: list[dict]) -> int:
    scores = [
        result["analysis"]["match_score"]
        for result in results
        if "analysis" in result and "match_score" in result["analysis"]
    ]

    if not scores:
        return 0

    return round(sum(scores) / len(scores))


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
- Provide a brief match score explanation in 2-4 sentences.
- The explanation should mention the strongest matches, the most important missing qualifications, and any significant strengths or gaps.

Use this exact JSON shape:
{{
  "match_score": 87,
  "match_score_explanation": "brief explanation",
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
    prompt = build_analysis_prompt(request.resume_text, request.job_description)

    response = openai_client.chat.completions.create(
        model=openai_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )

    content = response.choices[0].message.content
    return json.loads(clean_json_response(content))


def analyze_with_claude(request: AnalyzeRequest):
    prompt = build_analysis_prompt(request.resume_text, request.job_description)

    response = anthropic_client.messages.create(
        model=anthropic_model,
        max_tokens=4000,
        temperature=0,
        messages=[{"role": "user", "content": prompt}],
    )

    content = response.content[0].text
    return json.loads(clean_json_response(content))


def analyze_with_gemini(request: AnalyzeRequest):
    prompt = build_analysis_prompt(request.resume_text, request.job_description)

    response = genai_client.models.generate_content(
        model=genai_model,
        contents=prompt,
    )

    content = response.text
    return json.loads(clean_json_response(content))


@app.post("/analyze")
def analyze(request: AnalyzeRequest, x_app_secret: Optional[str] = Header(default=None)):
    validate_secret(x_app_secret)
    providers = [
        {
            "provider": "openai",
            "model": openai_model,
            "function": analyze_with_openai,
        },
        {
            "provider": "claude",
            "model": anthropic_model,
            "function": analyze_with_claude,
        },
        {
            "provider": "gemini",
            "model": genai_model,
            "function": analyze_with_gemini,
        },
    ]

    def run_provider(provider_config):
        try:
            analysis = provider_config["function"](request)

            return {
                "provider": provider_config["provider"],
                "model": provider_config["model"],
                "success": True,
                "analysis": analysis,
            }

        except Exception as e:
            return {
                "provider": provider_config["provider"],
                "model": provider_config["model"],
                "success": False,
                "error": str(e),
            }

    with ThreadPoolExecutor(max_workers=3) as executor:
        results = list(executor.map(run_provider, providers))

    return {
        "results": results
    }


def build_synthesis_prompt(
    results: list[dict],
    original_resume_text: str,
    job_description: str,
    average_original_match_score: int,
) -> str:
    return f"""
You are synthesizing resume optimization analyses from multiple AI providers.

Goal:
Create a practical, truthful, minimally changed tailored resume for this specific job application.

Return valid JSON only.
No markdown.
No explanation outside the JSON.

Inputs:
- Original resume
- Job description
- Analyses from multiple AI providers
- Average original match score

Rules:
- Focus on practical resume changes.
- Identify meaningful model differences.
- Recommend concrete next steps.
- Do not invent experience.
- Keep recommendations truthful and grounded in the original resume and model analyses.
- Prefer changes that multiple models agree on.
- Preserve the existing resume structure.
- Preserve section order.
- Preserve line breaks between sections.
- Preserve the formatting style of the original resume.
- If the original resume uses plain lines without bullet characters, do not introduce bullet characters.
- Do not add bullets, numbering, or symbols that do not already exist.
- Prefer modifying existing lines over replacing entire sections.
- Make the smallest changes necessary to improve alignment with the job description.
- Do not rewrite sections that already match well.
- Return the full rewritten resume as a single string field called "new_resume_text".
- Estimate the new match score after all proposed resume changes are implemented.
- The estimated new match score should be an integer from 0 to 100.

First determine the role intent.

Then determine how the current resume is positioned.

Then identify the positioning gap.

Then identify the minimum changes required to close that gap.

Only then rewrite the resume.

Let's also please try and not make this look AI generated.

Use this exact JSON shape:
{{
  "overall_summary": "short summary of the combined model opinions",
  "average_original_match_score": {average_original_match_score},
  "estimated_new_match_score": 92,
  "estimated_new_match_score_explanation": "brief explanation of why the new score is estimated this way",
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
  "new_resume_text": "full rewritten resume text",
  "cover_letter": "cover letter"
}}

Average original match score:
{average_original_match_score}

Model analyses:
{json.dumps(results, indent=2)}

Original resume:
{original_resume_text}

Job description:
{job_description}
"""


@app.post("/synthesize")
def synthesize(request: SynthesizeRequest, x_app_secret: Optional[str] = Header(default=None)):
    
    validate_secret(x_app_secret)
    
    average_original_match_score = calculate_average_match_score(request.results)

    prompt = build_synthesis_prompt(
        request.results,
        request.originalResumeText,
        request.job_description,
        average_original_match_score,
    )

    try:
        response = openai_client.chat.completions.create(
            model=openai_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )

        content = response.choices[0].message.content
        parsed = json.loads(clean_json_response(content))

        parsed["average_original_match_score"] = average_original_match_score

        return parsed

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="Synthesis model returned invalid JSON.",
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Synthesis request failed: {str(e)}",
        )