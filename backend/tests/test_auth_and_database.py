from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException


def create_query_response(data):
    query = MagicMock()

    query.select.return_value = query
    query.eq.return_value = query
    query.limit.return_value = query
    query.single.return_value = query
    query.insert.return_value = query

    query.execute.return_value = SimpleNamespace(data=data)

    return query


@pytest.mark.parametrize("authorization", [None, ""])
def test_authenticated_user_id_requires_authorization_header(
    main_module,
    authorization,
):
    with pytest.raises(HTTPException) as error:
        main_module.get_authenticated_user_id(authorization)

    assert error.value.status_code == 401
    assert error.value.detail == "Missing Authorization header"


@pytest.mark.parametrize(
    "authorization",
    [
        "invalid",
        "Basic abc123",
        "Bearer",
        "Bearer ",
    ],
)
def test_authenticated_user_id_rejects_malformed_header(
    main_module,
    authorization,
):
    with pytest.raises(HTTPException) as error:
        main_module.get_authenticated_user_id(authorization)

    assert error.value.status_code == 401
    assert error.value.detail == "Invalid Authorization header"


def test_authenticated_user_id_returns_verified_supabase_user(
    main_module,
):
    main_module.supabase.auth.get_user.return_value = (
        SimpleNamespace(
            user=SimpleNamespace(
                id="verified-user-123",
            )
        )
    )

    user_id = main_module.get_authenticated_user_id(
        "Bearer valid-token"
    )

    assert user_id == "verified-user-123"

    main_module.supabase.auth.get_user.assert_called_once_with(
        "valid-token"
    )


def test_authenticated_user_id_rejects_missing_user(
    main_module,
):
    main_module.supabase.auth.get_user.return_value = (
        SimpleNamespace(user=None)
    )

    with pytest.raises(HTTPException) as error:
        main_module.get_authenticated_user_id(
            "Bearer invalid-token"
        )

    assert error.value.status_code == 401
    assert error.value.detail == "Invalid or expired access token"


def test_authenticated_user_id_handles_supabase_failure(
    main_module,
):
    main_module.supabase.auth.get_user.side_effect = RuntimeError(
        "Supabase unavailable"
    )

    with pytest.raises(HTTPException) as error:
        main_module.get_authenticated_user_id(
            "Bearer broken-token"
        )

    assert error.value.status_code == 401
    assert error.value.detail == "Invalid or expired access token"


def test_verify_execution_ownership_allows_owner(main_module):
    query = create_query_response(
        [
            {
                "id": "execution-1",
            }
        ]
    )

    main_module.supabase.table.return_value = query

    main_module.verify_execution_ownership(
        execution_id="execution-1",
        user_id="user-123",
    )

    main_module.supabase.table.assert_called_once_with(
        "tailor_resume_executions"
    )

    query.eq.assert_any_call("id", "execution-1")
    query.eq.assert_any_call("user_id", "user-123")


def test_verify_execution_ownership_rejects_non_owner(
    main_module,
):
    query = create_query_response([])
    main_module.supabase.table.return_value = query

    with pytest.raises(HTTPException) as error:
        main_module.verify_execution_ownership(
            execution_id="execution-1",
            user_id="wrong-user",
        )

    assert error.value.status_code == 403
    assert (
        error.value.detail
        == "You do not have access to this execution"
    )


def test_canonical_topic_returns_none_for_blank_topic(
    main_module,
):
    result = main_module.get_canonical_brush_up_topic_id("   ")

    assert result is None
    main_module.supabase.table.assert_not_called()


def test_canonical_topic_finds_exact_canonical_key(
    main_module,
):
    canonical_query = create_query_response(
        [
            {
                "id": "canonical-postgresql",
            }
        ]
    )

    main_module.supabase.table.return_value = canonical_query

    result = main_module.get_canonical_brush_up_topic_id(
        "  PostgreSQL  "
    )

    assert result == "canonical-postgresql"

    canonical_query.eq.assert_called_with(
        "canonical_key",
        "postgresql",
    )


def test_canonical_topic_finds_alias(main_module):
    canonical_query = create_query_response([])
    alias_query = create_query_response(
        [
            {
                "canonical_brush_up_topic_id": (
                    "canonical-postgresql"
                ),
            }
        ]
    )

    main_module.supabase.table.side_effect = [
        canonical_query,
        alias_query,
    ]

    result = main_module.get_canonical_brush_up_topic_id(
        "Postgres Internals"
    )

    assert result == "canonical-postgresql"

    alias_query.eq.assert_called_with(
        "alias",
        "postgres internals",
    )


def test_canonical_topic_returns_none_when_unknown(
    main_module,
):
    canonical_query = create_query_response([])
    alias_query = create_query_response([])

    main_module.supabase.table.side_effect = [
        canonical_query,
        alias_query,
    ]

    result = main_module.get_canonical_brush_up_topic_id(
        "Unknown technology"
    )

    assert result is None