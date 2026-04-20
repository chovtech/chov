"""
PayPal coin top-up — create order + capture order.
"""
import uuid
import httpx
import asyncpg
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.core.access import get_accessible_workspace

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/billing/coins", tags=["coins"])

COIN_PACKS = {
    "starter":  {"coins": 100,   "amount": "7.00",   "label": "100 Coins"},
    "growth":   {"coins": 500,   "amount": "27.00",  "label": "500 Coins"},
    "pro":      {"coins": 2000,  "amount": "67.00",  "label": "2,000 Coins"},
    "agency":   {"coins": 10000, "amount": "197.00", "label": "10,000 Coins"},
}


async def _paypal_access_token() -> str:
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{settings.PAYPAL_BASE_URL}/v1/oauth2/token",
            data={"grant_type": "client_credentials"},
            auth=(settings.PAYPAL_CLIENT_ID, settings.PAYPAL_CLIENT_SECRET),
        )
        res.raise_for_status()
        return res.json()["access_token"]


class CreateOrderRequest(BaseModel):
    pack: str  # starter | growth | pro | agency
    workspace_id: Optional[str] = None


class CaptureOrderRequest(BaseModel):
    order_id: str
    pack: str
    workspace_id: Optional[str] = None


@router.post("/create-order")
async def create_order(
    body: CreateOrderRequest,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    pack = COIN_PACKS.get(body.pack)
    if not pack:
        raise HTTPException(status_code=400, detail="Invalid pack")

    workspace = await get_accessible_workspace(db, current_user["id"], body.workspace_id)

    try:
        token = await _paypal_access_token()
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"{settings.PAYPAL_BASE_URL}/v2/checkout/orders",
                json={
                    "intent": "CAPTURE",
                    "purchase_units": [{
                        "amount": {
                            "currency_code": "USD",
                            "value": pack["amount"],
                        },
                        "description": f"PagePersona AI Coins — {pack['label']}",
                        "custom_id": f"{workspace['id']}:{body.pack}",
                    }],
                    "application_context": {
                        "brand_name": "PagePersona",
                        "user_action": "PAY_NOW",
                    },
                },
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            )
            res.raise_for_status()
            data = res.json()
            return {"order_id": data["id"]}
    except Exception as exc:
        logger.error(f"PayPal create-order failed: {exc}")
        raise HTTPException(status_code=502, detail="Could not create PayPal order")


@router.post("/capture-order")
async def capture_order(
    body: CaptureOrderRequest,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    pack = COIN_PACKS.get(body.pack)
    if not pack:
        raise HTTPException(status_code=400, detail="Invalid pack")

    workspace = await get_accessible_workspace(db, current_user["id"], body.workspace_id)
    ws_id = uuid.UUID(str(workspace["id"]))

    try:
        token = await _paypal_access_token()
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"{settings.PAYPAL_BASE_URL}/v2/checkout/orders/{body.order_id}/capture",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={},
            )
            res.raise_for_status()
            data = res.json()

        status = data.get("status")
        if status != "COMPLETED":
            raise HTTPException(status_code=402, detail=f"Payment not completed: {status}")

        # Add coins to workspace
        coins_to_add = pack["coins"]
        await db.execute(
            """INSERT INTO ai_coins (id, workspace_id, balance, lifetime_earned)
               VALUES ($1, $2, $3, $3)
               ON CONFLICT (workspace_id)
               DO UPDATE SET
                 balance          = ai_coins.balance + $3,
                 lifetime_earned  = ai_coins.lifetime_earned + $3,
                 updated_at       = NOW()""",
            uuid.uuid4(), ws_id, coins_to_add,
        )

        new_balance = await db.fetchval(
            "SELECT balance FROM ai_coins WHERE workspace_id = $1", ws_id
        )

        logger.info(f"Coins added: +{coins_to_add} to workspace {ws_id} (order {body.order_id})")
        return {"success": True, "coins_added": coins_to_add, "new_balance": int(new_balance)}

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"PayPal capture-order failed: {exc}")
        raise HTTPException(status_code=502, detail="Could not capture PayPal order")
