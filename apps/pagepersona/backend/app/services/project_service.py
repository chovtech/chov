import asyncpg
import uuid
import secrets
import string


def generate_script_id() -> str:
    """Generate a unique PP-XXXXXX script ID."""
    chars = string.ascii_uppercase + string.digits
    suffix = ''.join(secrets.choice(chars) for _ in range(6))
    return f"PP-{suffix}"


async def create_project(
    db: asyncpg.Connection,
    workspace_id: str,
    name: str,
    page_url: str,
    platform: str = 'html'
) -> dict:
    # Keep generating until script_id is unique
    while True:
        script_id = generate_script_id()
        exists = await db.fetchrow(
            "SELECT id FROM projects WHERE script_id = $1", script_id
        )
        if not exists:
            break

    project = await db.fetchrow(
        """
        INSERT INTO projects
            (id, workspace_id, name, page_url, platform, script_id, status)
        VALUES
            ($1, $2, $3, $4, $5, $6, 'draft')
        RETURNING *
        """,
        uuid.uuid4(),
        uuid.UUID(workspace_id),
        name,
        page_url,
        platform,
        script_id
    )
    return dict(project)


async def get_projects(
    db: asyncpg.Connection,
    workspace_id: str
) -> list[dict]:
    rows = await db.fetch(
        """
        SELECT * FROM projects
        WHERE workspace_id = $1
        ORDER BY created_at DESC
        """,
        uuid.UUID(workspace_id)
    )
    return [dict(r) for r in rows]


async def get_project(
    db: asyncpg.Connection,
    project_id: str,
    workspace_id: str
) -> dict | None:
    row = await db.fetchrow(
        """
        SELECT * FROM projects
        WHERE id = $1 AND workspace_id = $2
        """,
        uuid.UUID(project_id),
        uuid.UUID(workspace_id)
    )
    return dict(row) if row else None


async def update_project(
    db: asyncpg.Connection,
    project_id: str,
    workspace_id: str,
    **kwargs
) -> dict | None:
    # Build SET clause dynamically from provided kwargs
    allowed = {'name', 'status', 'script_verified'}
    fields = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
    if not fields:
        return await get_project(db, project_id, workspace_id)

    set_clause = ', '.join(
        f"{col} = ${i+3}"
        for i, col in enumerate(fields.keys())
    )
    values = list(fields.values())

    row = await db.fetchrow(
        f"""
        UPDATE projects
        SET {set_clause}, updated_at = NOW()
        WHERE id = $1 AND workspace_id = $2
        RETURNING *
        """,
        uuid.UUID(project_id),
        uuid.UUID(workspace_id),
        *values
    )
    return dict(row) if row else None


async def delete_project(
    db: asyncpg.Connection,
    project_id: str,
    workspace_id: str
) -> bool:
    result = await db.execute(
        """
        DELETE FROM projects
        WHERE id = $1 AND workspace_id = $2
        """,
        uuid.UUID(project_id),
        uuid.UUID(workspace_id)
    )
    return result == "DELETE 1"
