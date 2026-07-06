from fastapi import FastAPI, HTTPException
from typing import Optional
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from openai import OpenAI
from anthropic import Anthropic
from google import genai
from fastapi.middleware.cors import CORSMiddleware
from concurrent.futures import ThreadPoolExecutor
import os
import json
from fastapi import Header
from supabase import create_client
import traceback

load_dotenv(".env.local", override=True)

SYNTHESIS_PROVIDER = "openai"

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

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
    resume_text: str = Field(min_length=1)
    job_description: str = Field(min_length=1)
    user_id: str

class SynthesizeRequest(BaseModel):
    execution_id: str
    results: list[dict]
    originalResumeText: str
    job_description: str

def get_canonical_brush_up_topic_id(topic: str):
    normalized_topic = topic.strip().lower()

    if not normalized_topic:
        return None

    canonical_response = (
        supabase
        .table("canonical_brush_up_topics")
        .select("id")
        .eq("canonical_key", normalized_topic)
        .limit(1)
        .execute()
    )

    if canonical_response.data:
        return canonical_response.data[0]["id"]

    alias_response = (
        supabase
        .table("brush_up_topic_aliases")
        .select("canonical_brush_up_topic_id")
        .eq("alias", normalized_topic)
        .limit(1)
        .execute()
    )

    if alias_response.data:
        return alias_response.data[0]["canonical_brush_up_topic_id"]

    return None

def create_tailor_resume_execution(request: AnalyzeRequest, results: list[dict]):
    
    metadata = get_execution_metadata(results)

    response = supabase.table("tailor_resume_executions").insert({
        "user_id": request.user_id,
        "job_description": request.job_description,
        "user_resume": request.resume_text,
        "company_name": metadata["company_name"],
        "job_title": metadata["job_title"],
    }).execute()

    return response.data[0]["id"]

def save_analysis_result(execution_id: str, provider_result: dict):
    model_response = (
        supabase
        .table("ai_models")
        .select("id, ai_providers!inner(provider_name)")
        .eq("model_name", provider_result["model"])
        .eq("ai_providers.provider_name", provider_result["provider"])
        .single()
        .execute()
    )

    ai_model_id = model_response.data["id"]

    analysis = provider_result.get("analysis")

    response = supabase.table("analysis_results").insert({
        "tailor_resume_execution_id": execution_id,
        "ai_model_id": ai_model_id,
        "success": provider_result["success"],
        "error_message": provider_result.get("error"),
        "match_score": analysis.get("match_score") if analysis else None,
        "match_score_explanation": analysis.get("match_score_explanation") if analysis else None,
        "raw_response_json": analysis if analysis else None,
    }).execute()

    analysis_result_id = response.data[0]["id"]

    if not analysis:
        return

    for keyword in analysis.get("missing_keywords", []):
        supabase.table("missing_keywords").insert({
            "analysis_result_id": analysis_result_id,
            "priority": keyword.get("priority"),
            "keyword": keyword.get("keyword"),
            "why_it_matters": keyword.get("why_it_matters"),
        }).execute()

    for suggestion in analysis.get("bullet_suggestions", []):
        supabase.table("bullet_suggestions").insert({
            "analysis_result_id": analysis_result_id,
            "suggestion": suggestion,
        }).execute()

    for brushup_topic in analysis.get("brush_up_topics", []):
        canonical_topic_id = get_canonical_brush_up_topic_id(
            brushup_topic.get("topic", "")
        )

        supabase.table("analysis_brush_up_topics").insert({
            "analysis_result_id": analysis_result_id,
            "canonical_brush_up_topic_id": canonical_topic_id,
            "priority": brushup_topic.get("priority"),
            "topic" : brushup_topic.get("topic"),
            "why_it_matters": brushup_topic.get("why_it_matters"),
        }).execute()

def save_synthesis_result(execution_id: str, provider_name: str, model_name: str, synthesis: dict):
    model_response = (
        supabase
        .table("ai_models")
        .select("id, ai_providers!inner(provider_name)")
        .eq("model_name", model_name)
        .eq("ai_providers.provider_name", provider_name)
        .single()
        .execute()
    )

    ai_model_id = model_response.data["id"]

    response = supabase.table("synthesis_results").insert({
        "tailor_resume_execution_id": execution_id,
        "ai_model_id": ai_model_id,
        "overall_summary": synthesis.get("overall_summary"),
        "average_original_match_score": synthesis.get("average_original_match_score"),
        "estimated_new_match_score": synthesis.get("estimated_new_match_score"),
        "estimated_new_match_score_explanation": synthesis.get("estimated_new_match_score_explanation"),
        "new_proposed_resume": synthesis.get("new_resume_text"),
        "cover_letter": synthesis.get("cover_letter"),
        "raw_response_json": synthesis,
    }).execute()

    synthesis_result_id = response.data[0]["id"]

    for item in synthesis.get("notable_model_differences", []):
        supabase.table("notable_model_differences").insert({
            "synthesis_result_id": synthesis_result_id,
            "topic": item.get("topic"),
            "difference": item.get("difference"),
        }).execute()

    for step in synthesis.get("recommended_next_steps", []):
        supabase.table("recommended_next_steps").insert({
            "synthesis_result_id": synthesis_result_id,
            "priority": step.get("priority"),
            "action": step.get("action"),
        }).execute()

    for brushup_topic in synthesis.get("synthesized_brush_up_topics", []):
        supabase.table("synthesis_brush_up_topics").insert({
            "synthesis_result_id": synthesis_result_id,
            "topic": brushup_topic.get("topic"),
            "canonical_brush_up_topic_id": get_canonical_brush_up_topic_id(
                brushup_topic.get("topic", "")
            ),
            "priority": brushup_topic.get("priority"),
            "why_it_matters": brushup_topic.get("why_it_matters"),
        }).execute()

    return synthesis_result_id

def get_execution_metadata(results: list[dict]) -> dict:
    for result in results:
        analysis = result.get("analysis")

        if not analysis:
            continue

        company_name = analysis.get("company_name")
        job_title = analysis.get("job_title")

        if company_name or job_title:
            return {
                "company_name": company_name,
                "job_title": job_title,
            }

    return {
        "company_name": None,
        "job_title": None,
    }

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

    execution_id = create_tailor_resume_execution(request, results)

    for result in results:
        save_analysis_result(execution_id, result)
        
    return {
        "execution_id": execution_id,
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

    try:
        response = openai_client.chat.completions.create(
            model=openai_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )

        content = response.choices[0].message.content
        parsed = json.loads(clean_json_response(content))

        parsed["average_original_match_score"] = average_original_match_score

        synthesis_id = save_synthesis_result(
            request.execution_id,
            SYNTHESIS_PROVIDER,
            openai_model,
            parsed,
        )

        parsed["synthesis_id"] = synthesis_id

        return parsed

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="Synthesis model returned invalid JSON.",
        )

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Synthesis request failed: {str(e)}",
        )