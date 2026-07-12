import json
from types import SimpleNamespace
from unittest.mock import MagicMock


ANALYZE_BODY = {
    "resume_text": "Python developer resume",
    "job_description": "Backend engineer job",
}


SYNTHESIZE_BODY = {
    "execution_id": "execution-123",
    "results": [
        {
            "provider": "openai",
            "model": "gpt-4.1-mini",
            "success": True,
            "analysis": {
                "match_score": 80,
            },
        },
        {
            "provider": "claude",
            "model": "claude-haiku",
            "success": True,
            "analysis": {
                "match_score": 90,
            },
        },
    ],
    "originalResumeText": "Original resume",
    "job_description": "Backend job",
}


def authenticated_headers():
    return {
        "X-App-Secret": "test-app-secret",
        "Authorization": "Bearer valid-token",
    }


def test_analyze_requires_correct_app_secret(
    client,
    main_module,
):
    main_module.APP_ACCESS_SECRET = "correct-secret"

    response = client.post(
        "/analyze",
        json=ANALYZE_BODY,
        headers={
            "X-App-Secret": "wrong-secret",
            "Authorization": "Bearer valid-token",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Unauthorized"


def test_analyze_returns_all_provider_results(
    client,
    main_module,
    monkeypatch,
):
    main_module.APP_ACCESS_SECRET = "test-app-secret"

    monkeypatch.setattr(
        main_module,
        "get_authenticated_user_id",
        lambda authorization: "verified-user-123",
    )

    monkeypatch.setattr(
        main_module,
        "analyze_with_openai",
        lambda request: {
            "match_score": 80,
            "company_name": "Example Company",
            "job_title": "Software Developer",
        },
    )

    monkeypatch.setattr(
        main_module,
        "analyze_with_claude",
        lambda request: {
            "match_score": 85,
        },
    )

    monkeypatch.setattr(
        main_module,
        "analyze_with_gemini",
        lambda request: {
            "match_score": 90,
        },
    )

    create_execution = MagicMock(
        return_value="execution-123"
    )
    save_analysis = MagicMock()

    monkeypatch.setattr(
        main_module,
        "create_tailor_resume_execution",
        create_execution,
    )
    monkeypatch.setattr(
        main_module,
        "save_analysis_result",
        save_analysis,
    )

    response = client.post(
        "/analyze",
        json=ANALYZE_BODY,
        headers=authenticated_headers(),
    )

    assert response.status_code == 200

    body = response.json()

    assert body["execution_id"] == "execution-123"
    assert len(body["results"]) == 3

    assert all(
        result["success"] is True
        for result in body["results"]
    )

    create_execution.assert_called_once()
    assert save_analysis.call_count == 3

    create_request, create_results, user_id = (
        create_execution.call_args.args
    )

    assert create_request.resume_text == ANALYZE_BODY["resume_text"]
    assert create_results == body["results"]
    assert user_id == "verified-user-123"


def test_analyze_preserves_provider_failure(
    client,
    main_module,
    monkeypatch,
):
    main_module.APP_ACCESS_SECRET = "test-app-secret"

    monkeypatch.setattr(
        main_module,
        "get_authenticated_user_id",
        lambda authorization: "verified-user-123",
    )

    monkeypatch.setattr(
        main_module,
        "analyze_with_openai",
        lambda request: {
            "match_score": 80,
        },
    )

    def fail_claude(request):
        raise RuntimeError("Claude unavailable")

    monkeypatch.setattr(
        main_module,
        "analyze_with_claude",
        fail_claude,
    )

    monkeypatch.setattr(
        main_module,
        "analyze_with_gemini",
        lambda request: {
            "match_score": 90,
        },
    )

    monkeypatch.setattr(
        main_module,
        "create_tailor_resume_execution",
        lambda request, results, user_id: "execution-123",
    )

    save_analysis = MagicMock()

    monkeypatch.setattr(
        main_module,
        "save_analysis_result",
        save_analysis,
    )

    response = client.post(
        "/analyze",
        json=ANALYZE_BODY,
        headers=authenticated_headers(),
    )

    assert response.status_code == 200

    body = response.json()

    claude_result = next(
        result
        for result in body["results"]
        if result["provider"] == "claude"
    )

    assert claude_result["success"] is False
    assert claude_result["error"] == "Claude unavailable"

    # Failed analyses should still be persisted.
    assert save_analysis.call_count == 3


def test_analyze_rejects_blank_fields(
    client,
    main_module,
):
    main_module.APP_ACCESS_SECRET = "test-app-secret"

    response = client.post(
        "/analyze",
        json={
            "resume_text": "",
            "job_description": "",
        },
        headers=authenticated_headers(),
    )

    assert response.status_code == 422


def test_synthesize_returns_synthesis(
    client,
    main_module,
    monkeypatch,
):
    main_module.APP_ACCESS_SECRET = "test-app-secret"

    monkeypatch.setattr(
        main_module,
        "get_authenticated_user_id",
        lambda authorization: "verified-user-123",
    )

    verify_ownership = MagicMock()

    monkeypatch.setattr(
        main_module,
        "verify_execution_ownership",
        verify_ownership,
    )

    monkeypatch.setattr(
        main_module,
        "build_synthesis_prompt",
        lambda *args, **kwargs: "synthesis prompt",
    )

    synthesis_content = {
        "overall_summary": "Strong match.",
        "estimated_new_match_score": 92,
        "new_resume_text": "Improved resume",
        "cover_letter": "Dear Hiring Manager",
        "notable_model_differences": [],
        "recommended_next_steps": [],
        "synthesized_brush_up_topics": [],
    }

    main_module.openai_client.chat.completions.create.return_value = (
        SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(
                        content=json.dumps(synthesis_content)
                    )
                )
            ]
        )
    )

    save_synthesis = MagicMock(
        return_value="synthesis-123"
    )

    monkeypatch.setattr(
        main_module,
        "save_synthesis_result",
        save_synthesis,
    )

    response = client.post(
        "/synthesize",
        json=SYNTHESIZE_BODY,
        headers=authenticated_headers(),
    )

    assert response.status_code == 200

    body = response.json()

    assert body["overall_summary"] == "Strong match."
    assert body["estimated_new_match_score"] == 92
    assert body["average_original_match_score"] == 85
    assert body["synthesis_id"] == "synthesis-123"

    verify_ownership.assert_called_once_with(
        execution_id="execution-123",
        user_id="verified-user-123",
    )

    save_synthesis.assert_called_once()


def test_synthesize_returns_500_for_invalid_json(
    client,
    main_module,
    monkeypatch,
):
    main_module.APP_ACCESS_SECRET = "test-app-secret"

    monkeypatch.setattr(
        main_module,
        "get_authenticated_user_id",
        lambda authorization: "verified-user-123",
    )

    monkeypatch.setattr(
        main_module,
        "verify_execution_ownership",
        lambda **kwargs: None,
    )

    monkeypatch.setattr(
        main_module,
        "build_synthesis_prompt",
        lambda *args, **kwargs: "synthesis prompt",
    )

    main_module.openai_client.chat.completions.create.return_value = (
        SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(
                        content="not valid json"
                    )
                )
            ]
        )
    )

    response = client.post(
        "/synthesize",
        json=SYNTHESIZE_BODY,
        headers=authenticated_headers(),
    )

    assert response.status_code == 500
    assert (
        response.json()["detail"]
        == "Synthesis model returned invalid JSON."
    )


def test_synthesize_rejects_wrong_execution_owner(
    client,
    main_module,
    monkeypatch,
):
    main_module.APP_ACCESS_SECRET = "test-app-secret"

    monkeypatch.setattr(
        main_module,
        "get_authenticated_user_id",
        lambda authorization: "verified-user-123",
    )

    from fastapi import HTTPException

    def reject_ownership(**kwargs):
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this execution",
        )

    monkeypatch.setattr(
        main_module,
        "verify_execution_ownership",
        reject_ownership,
    )

    response = client.post(
        "/synthesize",
        json=SYNTHESIZE_BODY,
        headers=authenticated_headers(),
    )

    assert response.status_code == 403
    assert (
        response.json()["detail"]
        == "You do not have access to this execution"
    )