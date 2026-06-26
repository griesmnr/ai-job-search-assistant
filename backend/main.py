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
APP_ACCESS_SECRET = os.getenv("APP_ACCESS_SECRET")

openai_model = "gpt-4.1-mini"
anthropic_model = "claude-haiku-4-5-20251001"
genai_model = "gemini-3.5-flash"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173",
        "https://ai-job-search-assistant-beta.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def load_prompt_template(filename: str) -> str:
    prompt_path = os.path.join(
        os.path.dirname(__file__),
        "prompts",
        filename
    )

    with open(prompt_path, "r", encoding="utf-8") as file:
        return file.read()


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
    template = load_prompt_template("analysis_prompt.txt")

    return template.format(
        resume_text=resume_text,
        job_description=job_description,
    )


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
    template = load_prompt_template("synthesis_prompt.txt")

    return template.format(
        results_json=json.dumps(results, indent=2),
        original_resume_text=original_resume_text,
        job_description=job_description,
        average_original_match_score=average_original_match_score,
    )


@app.post("/synthesize")
def synthesize(request: SynthesizeRequest, x_app_secret: Optional[str] = Header(default=None)):
    
    validate_secret(x_app_secret)
    
    average_original_match_score = calculate_average_match_score(request.results)

    results_json = json.dumps(request.results, indent=2)
    prompt = build_synthesis_prompt(
        results_json,
        request.originalResumeText,
        request.job_description,
        average_original_match_score,
    )

    print(prompt)

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