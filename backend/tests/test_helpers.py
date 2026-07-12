import json

import pytest
from fastapi import HTTPException


@pytest.mark.parametrize(
    ("raw_content", "expected"),
    [
        ('{"value": 1}', '{"value": 1}'),
        ('  {"value": 1}  ', '{"value": 1}'),
        ('```json\n{"value": 1}\n```', '{"value": 1}'),
        ('```\n{"value": 1}\n```', '{"value": 1}'),
    ],
)
def test_clean_json_response(main_module, raw_content, expected):
    assert main_module.clean_json_response(raw_content) == expected


def test_calculate_average_match_score(main_module):
    results = [
        {
            "success": True,
            "analysis": {
                "match_score": 80,
            },
        },
        {
            "success": True,
            "analysis": {
                "match_score": 90,
            },
        },
        {
            "success": False,
            "error": "Provider failed",
        },
    ]

    assert main_module.calculate_average_match_score(results) == 85


def test_calculate_average_match_score_returns_zero_without_scores(
    main_module,
):
    results = [
        {
            "success": False,
            "error": "Provider failed",
        }
    ]

    assert main_module.calculate_average_match_score(results) == 0


def test_get_execution_metadata_uses_first_available_analysis(
    main_module,
):
    results = [
        {
            "success": False,
            "error": "Provider failed",
        },
        {
            "success": True,
            "analysis": {
                "company_name": "Blue Origin",
                "job_title": "Software Developer",
            },
        },
    ]

    assert main_module.get_execution_metadata(results) == {
        "company_name": "Blue Origin",
        "job_title": "Software Developer",
    }


def test_get_execution_metadata_returns_null_values_when_missing(
    main_module,
):
    results = [
        {
            "success": True,
            "analysis": {
                "match_score": 80,
            },
        }
    ]

    assert main_module.get_execution_metadata(results) == {
        "company_name": None,
        "job_title": None,
    }


def test_validate_secret_accepts_correct_secret(main_module):
    main_module.APP_ACCESS_SECRET = "correct-secret"

    # No exception means validation succeeded.
    main_module.validate_secret("correct-secret")


def test_validate_secret_rejects_incorrect_secret(main_module):
    main_module.APP_ACCESS_SECRET = "correct-secret"

    with pytest.raises(HTTPException) as error:
        main_module.validate_secret("wrong-secret")

    assert error.value.status_code == 401
    assert error.value.detail == "Unauthorized"


def test_build_analysis_prompt(main_module, monkeypatch):
    monkeypatch.setattr(
        main_module,
        "load_prompt_template",
        lambda filename: ("Resume:\n{resume_text}\n\n" "Job:\n{job_description}"),
    )

    prompt = main_module.build_analysis_prompt(
        "Python developer",
        "Backend engineer position",
    )

    assert "Python developer" in prompt
    assert "Backend engineer position" in prompt


def test_build_synthesis_prompt(main_module, monkeypatch):
    monkeypatch.setattr(
        main_module,
        "load_prompt_template",
        lambda filename: (
            "{results_json}\n"
            "{original_resume_text}\n"
            "{job_description}\n"
            "{average_original_match_score}"
        ),
    )

    results = [
        {
            "provider": "openai",
            "analysis": {
                "match_score": 80,
            },
        }
    ]

    prompt = main_module.build_synthesis_prompt(
        results=results,
        original_resume_text="Original resume",
        job_description="Job description",
        average_original_match_score=80,
    )

    assert json.dumps(results, indent=2) in prompt
    assert "Original resume" in prompt
    assert "Job description" in prompt
    assert "80" in prompt
