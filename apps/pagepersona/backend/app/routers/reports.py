"""
Project Reports — send analytics snapshots to any recipient via a public link.
No plan restriction — available to all users.
"""
import uuid
import json
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
import asyncpg

from app.database import get_db
from app.core.security import get_current_user
from app.services.email_service import send_email
from app.templates.emails.emails import render_project_report
from app.core.config import settings

router = APIRouter(tags=["reports"])


# ── helpers ────────────────────────────────────────────────────────────────────

async def _get_project_for_user(db: asyncpg.Connection, project_id: str, user_id) -> dict:
    row = await db.fetchrow(
        """SELECT p.*, w.owner_id, w.white_label_brand_name, w.white_label_primary_color,
                  w.hide_powered_by, w.custom_domain, w.custom_domain_verified
           FROM projects p
           JOIN workspaces w ON p.workspace_id = w.id
           WHERE p.id = $1 AND (
               w.owner_id = $2
               OR EXISTS (
                   SELECT 1 FROM workspace_members wm
                   WHERE wm.workspace_id = w.id AND wm.user_id = $2
                     AND wm.status = 'active' AND wm.role != 'revoked'
               )
           )""",
        project_id, user_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    return dict(row)


def _date_range(period: int):
    now = datetime.now(timezone.utc)
    return now - timedelta(days=period), now


async def _build_snapshot(db: asyncpg.Connection, project_id: str, period: int) -> dict:
    """Collect analytics data and return a frozen snapshot dict."""
    start, _ = _date_range(period)

    total_visits = await db.fetchval(
        "SELECT COUNT(*) FROM page_visits WHERE project_id=$1 AND timestamp>=$2",
        project_id, start
    ) or 0
    unique_visitors = await db.fetchval(
        "SELECT COUNT(DISTINCT session_id) FROM page_visits WHERE project_id=$1 AND timestamp>=$2",
        project_id, start
    ) or 0
    rules_fired = await db.fetchval(
        "SELECT COUNT(*) FROM rule_events WHERE project_id=$1 AND timestamp>=$2",
        project_id, start
    ) or 0
    avg_time = await db.fetchval(
        "SELECT AVG(time_on_page) FROM page_visits WHERE project_id=$1 AND timestamp>=$2 AND time_on_page IS NOT NULL",
        project_id, start
    )
    avg_scroll = await db.fetchval(
        "SELECT AVG(scroll_depth) FROM page_visits WHERE project_id=$1 AND timestamp>=$2 AND scroll_depth IS NOT NULL",
        project_id, start
    )
    personalisation_rate = round(rules_fired / total_visits * 100, 1) if total_visits else 0

    country_rows = await db.fetch(
        """SELECT country, COUNT(*) AS cnt FROM page_visits
           WHERE project_id=$1 AND timestamp>=$2 AND country IS NOT NULL
           GROUP BY country ORDER BY cnt DESC LIMIT 8""",
        project_id, start
    )
    device_rows = await db.fetch(
        """SELECT COALESCE(device,'unknown') AS device, COUNT(*) AS cnt FROM page_visits
           WHERE project_id=$1 AND timestamp>=$2
           GROUP BY device ORDER BY cnt DESC""",
        project_id, start
    )
    source_rows = await db.fetch(
        """SELECT COALESCE(utm_source,'direct') AS source, COUNT(*) AS cnt FROM page_visits
           WHERE project_id=$1 AND timestamp>=$2
           GROUP BY source ORDER BY cnt DESC LIMIT 6""",
        project_id, start
    )
    rule_rows = await db.fetch(
        """SELECT r.name, COUNT(*) AS fires, COUNT(DISTINCT re.session_id) AS unique_sessions
           FROM rule_events re JOIN rules r ON r.id = re.rule_id
           WHERE re.project_id=$1 AND re.timestamp>=$2
           GROUP BY r.name ORDER BY fires DESC LIMIT 10""",
        project_id, start
    )

    return {
        "period": period,
        "total_visits": int(total_visits),
        "unique_visitors": int(unique_visitors),
        "rules_fired": int(rules_fired),
        "personalisation_rate": personalisation_rate,
        "avg_time_on_page": round(float(avg_time), 1) if avg_time else None,
        "avg_scroll_depth": round(float(avg_scroll), 1) if avg_scroll else None,
        "top_countries": [{"country": r["country"], "visits": int(r["cnt"])} for r in country_rows],
        "device_split": [{"device": r["device"], "visits": int(r["cnt"])} for r in device_rows],
        "traffic_sources": [{"source": r["source"], "visits": int(r["cnt"])} for r in source_rows],
        "rules_performance": [
            {"name": r["name"], "fires": int(r["fires"]), "unique_sessions": int(r["unique_sessions"])}
            for r in rule_rows
        ],
    }


def _report_public_url(token: str) -> str:
    base = getattr(settings, "FRONTEND_URL", "https://app.usepagepersona.com")
    return f"{base}/r/{token}"


# ── schemas ────────────────────────────────────────────────────────────────────

class ReportCreate(BaseModel):
    recipient_email: EmailStr
    recipient_name: Optional[str] = None
    message: Optional[str] = None
    period: int = 30


class ReportResend(BaseModel):
    recipient_email: Optional[EmailStr] = None  # if None, resend to original


# ── routes ─────────────────────────────────────────────────────────────────────

@router.post("/api/projects/{project_id}/reports")
async def create_report(
    project_id: str,
    body: ReportCreate,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    project = await _get_project_for_user(db, project_id, current_user["id"])
    snapshot = await _build_snapshot(db, project_id, body.period)

    report = await db.fetchrow(
        """INSERT INTO project_reports
               (project_id, workspace_id, recipient_email, recipient_name, message, analytics_snapshot, period)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
           RETURNING *""",
        uuid.UUID(project_id),
        uuid.UUID(str(project["workspace_id"])),
        body.recipient_email,
        body.recipient_name,
        body.message,
        json.dumps(snapshot),
        body.period,
    )

    brand_name = project.get("white_label_brand_name") or "PagePersona"
    brand_color = project.get("white_label_primary_color") or "#1A56DB"
    hide_powered_by = bool(project.get("hide_powered_by"))
    report_url = _report_public_url(report["public_token"])
    sender_name = current_user.get("name") or current_user.get("email", "")

    subject, html = render_project_report(
        sender_name=sender_name,
        project_name=project["name"],
        project_url=project["page_url"],
        report_url=report_url,
        message=body.message or "",
        snapshot=snapshot,
        brand_name=brand_name,
        brand_color=brand_color,
        hide_powered_by=hide_powered_by,
    )
    send_email(body.recipient_email, subject, html, sender_name=brand_name)

    return {
        "id": str(report["id"]),
        "public_token": report["public_token"],
        "report_url": report_url,
        "created_at": report["created_at"].isoformat(),
    }


@router.get("/api/projects/{project_id}/reports")
async def list_reports(
    project_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    await _get_project_for_user(db, project_id, current_user["id"])
    rows = await db.fetch(
        """SELECT id, recipient_email, recipient_name, message, public_token,
                  period, created_at
           FROM project_reports
           WHERE project_id = $1
           ORDER BY created_at DESC""",
        uuid.UUID(project_id),
    )
    base = getattr(settings, "FRONTEND_URL", "https://app.usepagepersona.com")
    return [
        {
            "id": str(r["id"]),
            "recipient_email": r["recipient_email"],
            "recipient_name": r["recipient_name"],
            "message": r["message"],
            "period": r["period"],
            "public_token": r["public_token"],
            "report_url": f"{base}/r/{r['public_token']}",
            "created_at": r["created_at"].isoformat(),
        }
        for r in rows
    ]


@router.post("/api/projects/{project_id}/reports/{report_id}/resend")
async def resend_report(
    project_id: str,
    report_id: str,
    body: ReportResend,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    project = await _get_project_for_user(db, project_id, current_user["id"])
    report = await db.fetchrow(
        "SELECT * FROM project_reports WHERE id = $1 AND project_id = $2",
        uuid.UUID(report_id), uuid.UUID(project_id)
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    to_email = body.recipient_email or report["recipient_email"]
    raw = report["analytics_snapshot"]
    snapshot = raw if isinstance(raw, dict) else json.loads(raw)

    brand_name = project.get("white_label_brand_name") or "PagePersona"
    brand_color = project.get("white_label_primary_color") or "#1A56DB"
    hide_powered_by = bool(project.get("hide_powered_by"))
    report_url = _report_public_url(report["public_token"])
    sender_name = current_user.get("name") or current_user.get("email", "")

    subject, html = render_project_report(
        sender_name=sender_name,
        project_name=project["name"],
        project_url=project["page_url"],
        report_url=report_url,
        message=report["message"] or "",
        snapshot=snapshot,
        brand_name=brand_name,
        brand_color=brand_color,
        hide_powered_by=hide_powered_by,
    )
    send_email(to_email, subject, html, sender_name=brand_name)
    return {"sent_to": to_email, "report_url": report_url}


@router.get("/api/reports/{token}")
async def get_public_report(
    token: str,
    db: asyncpg.Connection = Depends(get_db),
):
    """Public endpoint — no auth. Returns full report data for display."""
    report = await db.fetchrow(
        """SELECT pr.*, p.name AS project_name, p.page_url,
                  w.white_label_brand_name, w.white_label_logo, w.white_label_primary_color
           FROM project_reports pr
           JOIN projects p ON p.id = pr.project_id
           JOIN workspaces w ON w.id = pr.workspace_id
           WHERE pr.public_token = $1""",
        token
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    raw = report["analytics_snapshot"]
    snapshot = raw if isinstance(raw, dict) else json.loads(raw)

    return {
        "project_name": report["project_name"],
        "page_url": report["page_url"],
        "period": report["period"],
        "created_at": report["created_at"].isoformat(),
        "brand_name": report["white_label_brand_name"] or "PagePersona",
        "brand_logo": report["white_label_logo"],
        "brand_color": report["white_label_primary_color"] or "#1A56DB",
        "snapshot": snapshot,
    }
