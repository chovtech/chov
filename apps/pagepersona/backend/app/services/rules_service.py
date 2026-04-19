import asyncpg
import uuid
import json


def parse_rule(row: dict) -> dict:
    """Parse JSONB fields from string to Python objects."""
    r = dict(row)
    if isinstance(r.get('conditions'), str):
        r['conditions'] = json.loads(r['conditions'])
    if isinstance(r.get('actions'), str):
        r['actions'] = json.loads(r['actions'])
    return r


async def create_rule(
    db: asyncpg.Connection,
    project_id: str,
    name: str,
    conditions: list,
    condition_operator: str,
    actions: list,
    priority: int = 0,
    element_mapped: bool = False
) -> dict:
    rule = await db.fetchrow(
        """
        INSERT INTO rules
            (id, project_id, name, conditions, condition_operator, actions, priority, is_active, element_mapped)
        VALUES
            ($1, $2, $3, $4::jsonb, $5, $6::jsonb, $7, FALSE, $8)
        RETURNING *
        """,
        uuid.uuid4(),
        uuid.UUID(project_id),
        name,
        json.dumps(conditions),
        condition_operator,
        json.dumps(actions),
        priority,
        element_mapped
    )
    return parse_rule(dict(rule))


async def get_rules(db: asyncpg.Connection, project_id: str) -> list:
    rows = await db.fetch(
        """
        SELECT * FROM rules
        WHERE project_id = $1
        ORDER BY priority ASC, created_at ASC
        """,
        uuid.UUID(project_id)
    )
    return [parse_rule(dict(r)) for r in rows]


async def get_rule(db: asyncpg.Connection, rule_id: str, project_id: str) -> dict | None:
    row = await db.fetchrow(
        "SELECT * FROM rules WHERE id = $1 AND project_id = $2",
        uuid.UUID(rule_id), uuid.UUID(project_id)
    )
    return parse_rule(dict(row)) if row else None


async def update_rule(db: asyncpg.Connection, rule_id: str, project_id: str, **kwargs) -> dict | None:
    allowed = {'name', 'conditions', 'condition_operator', 'actions', 'priority', 'is_active', 'element_mapped'}
    fields = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
    if not fields:
        return await get_rule(db, rule_id, project_id)

    set_parts = []
    values = []
    i = 3
    for col, val in fields.items():
        if col in ('conditions', 'actions'):
            set_parts.append(f"{col} = ${i}::jsonb")
            values.append(json.dumps(val))
        else:
            set_parts.append(f"{col} = ${i}")
            values.append(val)
        i += 1

    set_clause = ', '.join(set_parts)
    row = await db.fetchrow(
        f"""
        UPDATE rules SET {set_clause}, updated_at = NOW()
        WHERE id = $1 AND project_id = $2
        RETURNING *
        """,
        uuid.UUID(rule_id), uuid.UUID(project_id), *values
    )
    return parse_rule(dict(row)) if row else None


async def delete_rule(db: asyncpg.Connection, rule_id: str, project_id: str) -> bool:
    result = await db.execute(
        "DELETE FROM rules WHERE id = $1 AND project_id = $2",
        uuid.UUID(rule_id), uuid.UUID(project_id)
    )
    return result == "DELETE 1"
