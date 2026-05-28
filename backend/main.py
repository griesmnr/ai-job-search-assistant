from fastapi import FastAPI
from fastapi import HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
import os

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

class AnalyzeRequest(BaseModel):
    resume_text: str
    job_description: str


@app.get("/")
def root():
    return {"message": "Backend is alive!"}


@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    prompt = f"""
You are helping analyze a resume against a job description.

Resume:
{request.resume_text}

Job description:
{request.job_description}

Return:
1. Matching keywords
2. Missing keywords
3. Suggested resume bullet improvements
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[{"role": "user", "content": prompt}],
        )

        return {"analysis": response.choices[0].message.content}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"OpenAI request failed: {str(e)}"
        )