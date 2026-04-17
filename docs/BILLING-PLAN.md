# PagePersona — Billing & Entitlement Plan
> Based on: FUNNEL-ANALYSIS.md, actual Anthropic + fal.ai API logs, current codebase.
> Last updated: 2026-04-17

### Locked decisions
- ✅ **No monthly coin resets** — coins are a lifetime quota per plan. Use them, they're gone. Buy more via PayPal recharge packs.
- ✅ **Never delete on downgrade** — lock access to over-limit items, never delete user data.
- ✅ **Bundle (Fastpass) = Agency plan** — $297 all-access bundle gives same access as Agency (500 coins, all features).
- ✅ **7-day grace on plan expiry** — send warning email when plan expires; 7-day grace before locking to FE limits.
- ✅ **Show coin balance to all users including trial** — visible in topbar immediately on signup.
- ✅ **Coin recharge via PayPal** — standalone coin top-up packs sold via PayPal (not Stripe, not JVZoo OTOs).
- ✅ **DFY = service OTO, no software entitlement change** — JVZoo IPN triggers email to Chike only; no plan upgrade in app.

---

## 1. PLAN TIERS — WHAT EACH USER GETS

### Trial (pre-purchase — default on signup)
> Every new signup lands here. Enough to demo the product, not enough to rely on it.

| Feature | Limit |
|---------|-------|
| Projects | 3 |
| Rules per project | 5 |
| Popups | 3 |
| Countdown timers | 2 |
| Client accounts | 0 |
| AI Coins (lifetime quota) | 20 |

---

### FE — PagePersona Core ($37–47 OT)
> Bought FE. Real user. Hit limits faster than trial.

| Feature | Limit |
|---------|-------|
| Projects | 5 |
| Rules per project | 10 |
| Popups | 10 |
| Countdown timers | 5 |
| Client accounts | 0 |
| AI Coins (lifetime quota) | 50 |
| Powered by PagePersona | Shown |

---

### Unlimited — OTO 1 ($67/year)
> Power user. No restrictions. No client seats.

| Feature | Limit |
|---------|-------|
| Projects | Unlimited |
| Rules per project | Unlimited |
| Popups | Unlimited |
| Countdown timers | Unlimited |
| Client accounts | 0 |
| AI Coins (lifetime quota) | 200 |
| Powered by PagePersona | Shown |

---

### Professional — OTO 2 ($47/year)
> White-label cosmetics. Own brand, no PagePersona mention.
> Must also have Unlimited for full power — can be stacked.

| Feature | Limit |
|---------|-------|
| Projects | 5 (same as FE unless they also have Unlimited) |
| Rules per project | 10 (same as FE unless stacked) |
| AI Coins (lifetime quota) | 200 |
| Remove "Powered by PagePersona" | ✅ |
| Custom sender name on emails | ✅ |
| Branded email templates | ✅ |
| Analytics exports (CSV) | ✅ |

> **Note:** Professional is cosmetic — it layers ON TOP of FE or Unlimited.
> If they buy Professional only (not Unlimited), they still have FE limits on features.
> Stacking (FE + Professional + Unlimited) unlocks all three layers.

---

### Bundle / All-Access Fastpass — Bump ($297 OT)
> Buys everything at once. Identical access to Agency. Saves $161 vs buying individually.

| Feature | Value |
|---------|-------|
| Everything in Agency | ✅ |
| AI Coins (lifetime quota) | 500 |
| Entitlement plan stored as | `agency` |

---

### Agency — OTO 3 ($197/year)
> Business builder. Sell to clients. Everything in Unlimited + Professional included.

| Feature | Limit |
|---------|-------|
| Projects | Unlimited |
| Rules per project | Unlimited |
| Popups | Unlimited |
| Countdown timers | Unlimited |
| Client accounts | 100 |
| AI Coins (lifetime quota) | 500 |
| Remove "Powered by PagePersona" | ✅ |
| Custom domain | ✅ |
| White-label logo + brand color | ✅ |
| Branded client invite emails | ✅ |
| Agency login/signup pages | ✅ |
| DFY promo website template | ✅ |

> **Agency includes everything.** Buying Agency = Unlimited + Professional + Agency in one. No stacking needed.

---

### DFY — OTO 4 ($147 OT)
> Service purchase — not a software plan. Chike does the work.

| What buyer gets | Detail |
|----------------|--------|
| First 3 projects set up | Chike creates projects, adds page URLs, installs script |
| First 5 rules configured | Chike builds rules per buyer's goals |
| White-label branding installed | Logo, brand color, domain applied |
| 1-hour live onboarding call | Zoom call — screen share, walkthrough, Q&A |
| Slots | 20/month — hard cap, reopens next month |

**In the app:** DFY buyer gets no plan change. They already have FE (minimum) when they buy DFY. What triggers:
- Chike receives email: "DFY slot claimed — [name] [email]"
- Buyer receives confirmation: "Your DFY setup has been booked — Chike will contact you within 24 hours"
- Chike manually schedules call + does the setup work

**No backend entitlement change.** DFY is Chike's time, not software.

---

### Owner (Internal — never public)
> Chike's account + partners + beta testers.

| Feature | Value |
|---------|-------|
| Everything | Unlimited |
| AI Coins | Unlimited (deducted as 0) |
| All limits | Bypassed entirely |

---

## 2. COIN ECONOMICS — API COST ANALYSIS

### Actual API costs from logs (April 15–17, 2026)
| Model | Typical tokens | Our cost per call |
|-------|---------------|-------------------|
| claude-sonnet-4-6 | ~1,200 in / ~500 out | ~$0.011 |
| claude-haiku-4-5 | ~600 in / ~185 out | ~$0.0012 |
| fal-ai/flux/dev | per image | $0.0250 |

### Cost per AI action (our API spend)
| Action | Model | Our cost |
|--------|-------|----------|
| write_copy | Sonnet | ~$0.011 |
| project_describe | Sonnet | ~$0.011 |
| rule_creation_ai | Sonnet | ~$0.011 |
| rule_suggestion | Sonnet | ~$0.011 |
| popup_content | Haiku | ~$0.001 |
| generate_image | fal.ai | ~$0.025 |

### Coin cost vs API cost — margin check
| Action | Coins charged | API cost | Value per coin (to us) |
|--------|--------------|----------|----------------------|
| write_copy | 5 | $0.011 | ~$0.002 |
| project_describe | 3 | $0.011 | ~$0.004 |
| rule_creation_ai | 15 | $0.011 | ~$0.001 |
| popup_content | 5 | $0.001 | ~$0.0002 |
| generate_image | 10 | $0.025 | ~$0.003 |

**Worst-case per plan (all coins spent on image generation @ $0.025/image):**
| Plan | Coins (lifetime) | Worst-case API cost | Revenue |
|------|-----------------|---------------------|---------|
| Trial | 20 | $0.05 | $0 (free) |
| FE | 50 | $0.125 | $37–47 OT |
| Unlimited | 200 | $0.50 | $67/year |
| Professional | 200 | $0.50 | $47/year |
| Agency / Bundle | 500 | $1.25 | $197/year or $297 OT |

**Verdict:** Since coins are lifetime (not monthly), API costs are a one-time hit per customer — not recurring. Even better margin than monthly reset model. Model is very safe.

### Coin recharge packs — margins
| Pack | Coins | Price | Worst-case API cost | Margin |
|------|-------|-------|---------------------|--------|
| Starter | 100 | $7 | $0.25 | 96% |
| Growth | 500 | $27 | $1.25 | 95% |
| Pro | 2,000 | $67 | $5.00 | 93% |
| Agency | 10,000 | $197 | $25.00 | 87% |

**All recharge packs are high-margin.** The coin model is validated.

---

## 3. FEATURE GATE RULES

### What is checked at each write operation
```
Projects:     on POST /api/projects        → count projects in workspace
Rules:        on POST /api/projects/{id}/rules → count rules in project
Popups:       on POST /api/popups          → count popups in workspace
Countdowns:   on POST /api/countdowns      → count countdowns in workspace
Client seats: on POST /api/clients/invite  → count client workspaces (parent_workspace_id)
```

### Gate logic (backend service — `entitlement_service.py`)
```python
PLAN_LIMITS = {
    'trial':        {'projects': 3,  'rules': 5,  'popups': 3,  'countdowns': 2,  'clients': 0},
    'fe':           {'projects': 5,  'rules': 10, 'popups': 10, 'countdowns': 5,  'clients': 0},
    'unlimited':    {'projects': None,'rules': None,'popups': None,'countdowns': None,'clients': 0},
    'professional': {'projects': 5,  'rules': 10, 'popups': 10, 'countdowns': 5,  'clients': 0},
    'agency':       {'projects': None,'rules': None,'popups': None,'countdowns': None,'clients': 100},
    'owner':        {'projects': None,'rules': None,'popups': None,'countdowns': None,'clients': None},
}
# None = unlimited
```

> **Professional stacking rule:** If workspace has BOTH `unlimited` and `professional` entitlements active,
> use Unlimited limits. Professional only adds cosmetic features. Agency overrides all.

### Error response when limit hit
```json
HTTP 402
{
  "error": "plan_limit_reached",
  "limit_type": "projects",
  "current": 5,
  "limit": 5,
  "plan": "fe",
  "upgrade_url": "https://jvzoo.com/pagepersona-oto1"
}
```

### "Powered by PagePersona" rule
- Shown if plan is `trial` or `fe`
- Hidden if plan is `professional`, `agency`, or `owner`
- Checked via: `GET /api/workspaces` → `hide_powered_by` field (already exists)
- Backend sets `hide_powered_by = true` when Professional/Agency entitlement is activated

---

## 4. JVZOO IPN → ENTITLEMENT UPGRADE FLOW

### Current state
The webhook at `POST /api/webhooks/jvzoo` creates a new account when someone purchases via JVZoo but does **not** upgrade an existing account's plan.

### JVZoo product ID → plan mapping
> ⚠️ DECISION NEEDED: Confirm product IDs when funnel is set up in JVZoo.
> These are placeholders — replace with real JVZoo product IDs before launch.

| JVZoo Product | plan value | coins to seed | Notes |
|---------------|-----------|--------------|-------|
| FE (product ID: TBD) | `fe` | 50 | |
| Bundle Bump / Fastpass (product ID: TBD) | `agency` | 500 | Maps to agency — includes everything |
| OTO 1 Unlimited (product ID: TBD) | `unlimited` | 200 | |
| OTO 2 Professional (product ID: TBD) | `professional` | 200 | |
| OTO 3 Agency (product ID: TBD) | `agency` | 500 | |
| OTO 4 DFY (product ID: TBD) | **no plan change** | 0 | Email Chike only — service delivery, not software |

> **Bundle note:** Bundle sends one IPN. Map it to `agency`. If user already has a higher plan, coins are NOT re-seeded.
> **DFY note:** DFY is a service. No entitlement row created. Backend emails Chike with buyer details + triggers confirmation email to buyer.

### Upgraded IPN flow
```
JVZoo IPN arrives → verify signature → extract email + product_id

1. Look up user by email
   → If not found: create account (current flow) → seed coins for plan
   → If found: upgrade entitlement (new flow below)

2. Upgrade entitlement:
   → Upsert entitlements row for this workspace + product_id='pagepersona'
   → Set plan = mapped plan, source = 'jvzoo', affiliate_id = jvzoo_cbitems[affiliate]
   → If new plan > current plan: reseed coins to new allocation
   → Send plan upgrade email (optional — simple "You're now on Unlimited" email)

3. If Professional/Agency: set hide_powered_by = true on workspace
```

### Plan hierarchy (for "is new plan better?" check)
```python
PLAN_RANK = {'trial': 0, 'fe': 1, 'professional': 2, 'unlimited': 3, 'agency': 4, 'owner': 99}
```

---

## 5. COIN QUOTA — NO RESETS

Coins are a **lifetime quota** per plan. No monthly resets for anyone.

- Trial signup → 20 coins, one-time
- FE purchase → 50 coins added to balance
- Unlimited purchase → 200 coins added to balance
- Professional purchase → 200 coins added to balance
- Agency/Bundle purchase → 500 coins added to balance
- Downgrade → coins already spent stay spent; balance unchanged

When they run out: they buy a recharge pack (see Section 7).

> **This simplifies the backend significantly** — no cron job, no reset logic, no `last_reset_at` needed operationally.

---

## 6. SETTINGS → BILLING TAB

### What to show
```
Current Plan: Unlimited  [Upgrade to Agency →]
Coins: 143 / 200  ████████░░ this month
Resets in: 12 days

[Buy more coins]  →  shows recharge pack options

--- Recent AI usage ---
Date         Action           Coins
Apr 17       Write Copy       -5
Apr 17       Generate Image   -10
Apr 16       Popup Content    -5
[View all]
```

### API needed
- `GET /api/entitlements` → current plan, status, purchased_at (already readable from entitlements table)
- `GET /api/ai/coins` → balance + reset date (already built)
- `GET /api/ai/coins/history` → last 20 transactions (already built)

---

## 7. COIN RECHARGE PACKS

When a user runs out of coins, they can buy more without touching their plan. These are **standalone purchases** — completely separate from the JVZoo funnel.

| Pack | Coins | Price |
|------|-------|-------|
| Starter | 100 | $7 |
| Growth | 500 | $27 |
| Pro | 2,000 | $67 |
| Agency | 10,000 | $197 |

### Payment processor — PayPal
Chike has PayPal but not Stripe. PayPal supports one-time checkout with IPN (Instant Payment Notification) — same pattern as JVZoo IPN.

**Flow:**
1. User clicks "Buy 500 coins — $27" on Billing tab
2. Redirected to PayPal checkout (PayPal-hosted page)
3. User pays → PayPal sends IPN to `POST /api/webhooks/paypal`
4. Backend verifies IPN → adds coins to workspace balance → logs transaction

**What we need to build:**
- PayPal product/button for each pack (set up in PayPal dashboard — no code)
- `POST /api/webhooks/paypal` endpoint (verifies + credits coins)
- Billing tab UI — coin pack picker + PayPal redirect links

> **Build timing:** Post-launch. At launch, users who run out can upgrade their plan via JVZoo.
> Add PayPal recharge in v1.1 once first sales validate the model.

---

## 8. PLAN EXPIRY — YEARLY PLANS

Unlimited ($67/year), Professional ($47/year), and Agency ($197/year) are recurring. When they don't renew:

### Expiry flow
```
JVZoo sends cancellation/refund IPN → OR expires_at date passes

Day 0 (expiry):   Send "Your plan has expired" email
                  Update entitlement status = 'expired'
                  Start 7-day grace period

Day 7 (grace end): Lock down to FE limits
                   Do NOT delete projects/rules/popups over the limit
                   Show "Plan expired — upgrade to unlock" banner in app
                   Locked items shown greyed out with lock icon

User renews:       JVZoo sends new IPN → reactivate entitlement → remove locks
```

### What "locked" means in practice
- Projects 6+ → listed but can't edit/activate (read-only)
- Rules 11+ in a project → listed but `is_active` forced to false
- Popups 11+ → listed but can't be attached to new rules
- Client accounts → still exist, clients can't be invited to new ones (over 0 limit)
- No data deleted ever

### Expiry emails
| Timing | Email |
|--------|-------|
| 7 days before expiry | "Your plan renews in 7 days — [renew link]" |
| Day of expiry | "Your plan has expired — renew to keep full access" |
| Day 7 (grace end) | "Your account has been limited — some features are now locked" |

---

## 11. IMPLEMENTATION ORDER

### Phase 1 — Gate the product (before launch)
1. `entitlement_service.py` — `get_plan()`, `check_limit()` functions
2. Add limit checks to: `POST /api/projects`, `POST /api/projects/{id}/rules`, `POST /api/popups`, `POST /api/countdowns`, `POST /api/clients/invite`
3. Frontend: show upgrade prompt modal when 402 `plan_limit_reached` is returned

### Phase 2 — JVZoo upgrade flow
4. Update `POST /api/webhooks/jvzoo` to handle existing user upgrades
5. Map JVZoo product IDs → plans (fill in when JVZoo funnel is live)
6. Set `hide_powered_by` on Professional/Agency activation

### Phase 3 — Billing tab
7. `GET /api/billing/plan` endpoint → current plan + limits + next reset
8. Frontend Billing tab: show plan card, coin meter, transaction history, upgrade CTAs

### Phase 4 — Coin recharge (post-launch)
9. Stripe checkout for coin packs
10. Stripe webhook → coin top-up

---

## 10. OPEN DECISIONS (resolve before building)

| # | Decision | Status | Resolution |
|---|----------|--------|------------|
| 1 | Coin resets? | ✅ LOCKED | No resets — lifetime quota per plan |
| 2 | Downgrade — lock or delete? | ✅ LOCKED | Lock — never delete user data |
| 3 | Professional stacking with FE? | ✅ LOCKED | Yes, stacks. Agency = all-in-one |
| 4 | Plan expiry grace period | ✅ LOCKED | 7 days + 3 emails (7 days before, day of, day 7) |
| 5 | Show coins to trial users | ✅ LOCKED | Yes — visible in topbar from signup |
| 6 | DFY handling | ✅ LOCKED | Email Chike + confirm buyer. No entitlement change |
| 7 | Coin recharge payment | ✅ LOCKED | PayPal IPN. Build post-launch (v1.1) |
| 8 | JVZoo product IDs | ⏳ TBD | Fill in when creating products in JVZoo |

---

## 12. WHAT IS ALREADY BUILT

| Item | Status |
|------|--------|
| `entitlements` table | ✅ |
| `ai_coins` + `ai_coin_transactions` tables | ✅ |
| `coin_service.py` — `PLAN_COIN_ALLOCATIONS`, `check_coins()`, `deduct_coins()`, `seed_coins()` | ✅ |
| `GET /api/ai/coins` — balance + lifetime_earned | ✅ |
| `GET /api/ai/coins/history` — last 20 transactions | ✅ |
| `POST /api/webhooks/jvzoo` — creates account on new purchase | ✅ |
| Owner plan bypass in coin_service | ✅ |
| `hide_powered_by` column on workspaces | ✅ |
| Trial entitlement + 20 coins seeded on signup | ✅ |

**What is NOT built yet:** everything in Phase 1–4 above.
