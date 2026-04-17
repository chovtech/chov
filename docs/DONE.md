# DONE.md — PagePersona Completed Features
> Living document. Updated from actual backend endpoints + local DB.
> Last updated: 2026-04-14

---

## HOW TO USE THIS FILE
- **Green = shipped and live on `app.usepagepersona.com`**
- Add a line under the right section when a feature is done
- Do NOT remove entries — mark superseded ones with `(replaced by X)`

---

## 1. AUTHENTICATION
**Router prefix:** `/api/auth`

| Endpoint | Method | Feature |
|----------|--------|---------|
| `/api/auth/signup` | POST | Email + password signup — creates user, workspace, entitlement; syncs to Mautic |
| `/api/auth/login` | POST | Email + password login — returns JWT tokens via cookie + localStorage |
| `/api/auth/me` | GET | Get current user from session token |
| `/api/auth/logout` | POST | Invalidates session token |
| `/api/auth/verify-email` | POST | Validates email verification token |
| `/api/auth/resend-verification` | POST | Resends verification email via SES |
| `/api/auth/magic-link` | POST | Sends magic link login email |
| `/api/auth/magic-link/verify` | POST | Validates magic link token → auto-login |
| `/api/auth/forgot-password` | POST | Sends password reset email via SES |
| `/api/auth/reset-password` | POST | Token-validated password reset (min 8 chars) |
| `/api/auth/google` | GET | Google OAuth redirect |
| `/api/auth/google/callback` | GET | Google OAuth callback — creates workspace on first login |

**Frontend:**
- Auth middleware (Next.js) — protects `/dashboard` routes via cookie check
- 401 interceptor (axios) — clears tokens + redirects to `/login` on expired session

---

## 2. USER PROFILE
**Router prefix:** `/api/users`

| Endpoint | Method | Feature |
|----------|--------|---------|
| `/api/users/profile` | PUT | Update name + email; syncs to Mautic |
| `/api/users/password` | PUT | Change password — validates current password |

**Frontend:**
- Avatar upload via `/api/upload/image` — auto-saved to R2
- Language preference (EN / FR) — stored on user record + localStorage

---

## 3. WORKSPACES
**Router prefix:** `/api/workspaces`

| Endpoint | Method | Feature |
|----------|--------|---------|
| `/api/workspaces` | GET | List workspaces — owner + member; sorted by ownership; includes stats subqueries |
| `/api/workspaces` | POST | Create workspace — generates unique slug |
| `/api/workspaces/{id}` | GET | Get single workspace |
| `/api/workspaces/{id}` | PATCH | Rename workspace; update white-label (brand name, logo, color); update custom domain |
| `/api/workspaces/{id}` | DELETE | Delete workspace — cascades invites + members via FK |
| `/api/workspaces/{id}/clients` | GET | List client workspaces for agency |
| `/api/workspaces/{id}/verify-domain` | POST | DNS verification — checks A record points to `app.usepagepersona.com` |

**Stats subqueries on GET list:** `project_count`, `active_rules_count`, `sessions_this_month`, `last_activity`

**White-label columns:** `white_label_brand_name`, `white_label_logo`, `white_label_primary_color` (see DATABASE-SCHEMA.md)

**Frontend:** Workspace switcher in sidebar; workspace badge for single-workspace clients; settings tabs: General, Team, Billing, White-label

---

## 4. PROJECTS
**Router prefix:** `/api/projects`

| Endpoint | Method | Feature |
|----------|--------|---------|
| `/api/projects` | POST | Create project — 3-step wizard (name+URL → platform → script install) |
| `/api/projects` | GET | List projects for workspace |
| `/api/projects/{id}` | GET | Get single project |
| `/api/projects/{id}` | PUT | Edit project (name + URL; URL locked after script verified) |
| `/api/projects/{id}` | DELETE | Delete project — with confirmation modal |
| `/api/projects/{id}/wordpress-plugin` | GET | Download branded WordPress plugin ZIP (uses agency brand name + domain) |
| `/api/projects/{id}/send-install-email` | POST | Send script install instructions email to developer (branded per agency) |

**Script:** Unique `PP-XXXXXX` identifier per project; verified by backend fetching page and checking for script tag

**Frontend:** Project dashboard with Overview tab (status, rules count, install modal) + Analytics tab; status toggle (Draft ↔ Active); thumbnail upload

**Platforms:** HTML, WordPress, Shopify, Webflow, GoHighLevel, ClickFunnels, Systeme.io, Framer, Other

---

## 5. RULES ENGINE
**Router prefix:** `/api/projects/{project_id}/rules`

| Endpoint | Method | Feature |
|----------|--------|---------|
| `/api/projects/{id}/rules` | POST | Create rule |
| `/api/projects/{id}/rules` | GET | List rules — sorted by priority |
| `/api/projects/{id}/rules/{rule_id}` | GET | Get single rule |
| `/api/projects/{id}/rules/{rule_id}` | PUT | Edit rule — conditions, actions, priority, active toggle |
| `/api/projects/{id}/rules/{rule_id}` | DELETE | Delete rule |

**Conditions (JSONB):** `visit_count`, `time_on_page`, `scroll_depth`, `exit_intent`, `visitor_type`, `utm_source`, `utm_medium`, `utm_campaign`, `referrer_url`, `query_param`, `device_type`, `operating_system`, `browser`, `geo_country`, `day_time`

**Condition operators:** `is detected`, `is`, `is not`, `contains`, `equals`, `is greater than`, `is less than`, `is between`

**AND / OR:** Configurable per rule via `condition_operator` field

**Actions (JSONB):** `swap_text`, `swap_image`, `swap_url`, `hide_section`, `show_element`, `show_popup`, `insert_countdown`

---

## 6. POPUPS
**Router prefix:** `/api/popups`

| Endpoint | Method | Feature |
|----------|--------|---------|
| `/api/popups` | POST | Create popup |
| `/api/popups` | GET | List popups for workspace |
| `/api/popups/{id}` | GET | Get single popup |
| `/api/popups/{id}` | PUT | Edit popup config |
| `/api/popups/{id}` | DELETE | Delete popup |

**Config stored as JSONB** — embedded into rule at save time (pp.js does NOT call API at runtime)

**Builder features:** 10 layout templates; block types: text, image, button, embed, no_thanks, columns; 12 position options; background colour + image; border radius, padding, width; overlay; close button; display delay/frequency; animation (fade, slide, zoom); `{country}` token support

---

## 7. COUNTDOWN TIMERS
**Router prefix:** `/api/countdowns`

| Endpoint | Method | Feature |
|----------|--------|---------|
| `/api/countdowns` | POST | Create countdown |
| `/api/countdowns` | GET | List countdowns for workspace |
| `/api/countdowns/{id}` | GET | Get single countdown |
| `/api/countdowns/{id}` | PUT | Edit countdown |
| `/api/countdowns/{id}` | DELETE | Delete countdown |

**Modes:** Fixed-date (`ends_at` timestamp) or duration (per-session localStorage timer)

**Expiry actions:** `hide`, `redirect`, `message`

**Config stored as JSONB** — embedded into rule action at save time

> ✅ `countdowns` table confirmed on VPS.

---

## 8. SDK (pp.js)
**Router prefix:** `/api/sdk`

| Endpoint | Method | Feature |
|----------|--------|---------|
| `/api/sdk/ping` | GET | Hash-based cache invalidation — checked on every page load; 30s cache header |
| `/api/sdk/rules` | GET | Fetch rules by script_id — 5-min localStorage TTL; 30s cache header |
| `/api/sdk/verify` | POST | Script verification (no project ID) |
| `/api/sdk/verify/{project_id}` | POST | Script verification by project |

**pp.js capabilities:** Signal detection for all 15 conditions; rule evaluation (AND/OR); all 7 actions; `{country}` token with fallback; FOUC prevention; picker mode detection; visit beacon; unload beacon; rule-fired event beacon

**Geo:** Resolved server-side via `ipwho.is` — pp.js never calls geo API. In-memory `_geo_cache` in sdk.py (cleared on restart).

**Deploy:** Local uses `localhost:8000`; deploy.sh swaps to `api.usepagepersona.com` via `sed`

---

## 9. SDK ANALYTICS
**Router prefix:** `/api/sdk`

| Endpoint | Method | Feature |
|----------|--------|---------|
| `/api/sdk/visit` | POST | Record page visit — country, device, OS, browser, referrer, UTM, new/returning |
| `/api/sdk/visit/{id}` | PATCH | Update visit on page unload — time_on_page, scroll_depth (keepalive fetch) |
| `/api/sdk/event` | POST | Record rule-fired event — session, geo, device, behaviour context |

---

## 10. ANALYTICS
**Router prefix:** `/api/analytics`

| Endpoint | Method | Feature |
|----------|--------|---------|
| `/api/analytics/project/{id}` | GET | Per-project analytics — visits, unique visitors, new visitors, rules fired, personalisation rate, avg time/scroll, daily series, top countries, traffic sources, device split, visitor split, rules performance, recent visits |
| `/api/analytics/workspace/{id}` | GET | Workspace analytics — aggregated across all projects |
| `/api/analytics/overview` | GET | Dashboard overview stats |

**Period selector:** 7, 14, 30, 90, 180, 365 days

---

## 11. AGENCY / CLIENT
**Router prefix:** `/api/clients`

| Endpoint | Method | Feature |
|----------|--------|---------|
| `/api/clients/invite-info` | GET | Get invite details by token (for accept page) |
| `/api/clients/resolve-domain` | GET | Resolve agency branding by custom domain |
| `/api/clients/join-info` | GET | Get agency info by slug (for self-signup page `/join/[slug]`) |
| `/api/clients/self-signup` | POST | Client self-signup via agency signup link |
| `/api/clients/invite` | POST | Agency invites client — creates client workspace + invite row + SES email |
| `/api/clients/accept` | POST | Accept client invite — new user (name+password form) or existing user (one-click) |
| `/api/clients/access-status` | GET | Check if client access is active or revoked |
| `/api/clients/{workspace_id}/revoke` | DELETE | Revoke client access |
| `/api/clients/{workspace_id}/restore` | POST | Restore revoked client access |
| `/api/clients/report` | POST | Send analytics report email to client (API done; frontend button commented out) |

**Access levels:** `full` (all nav except Agency tab, can create/edit projects) or `view_only` (dashboard + analytics only — 403 on write operations)

**Access control:** All backend routers use `role != 'revoked'` to block access — client role is never excluded from read/write (only `revoked` is blocked).

**White-label:** Agency brand name, logo, colour applied on:
- `/accept` and `/join/[slug]` pages
- All client invite emails (new user + existing user) — including From name
- Team invite emails (new user + existing user) — including From name
- Access revoked / restored emails
- WordPress plugin download (brand name used in plugin slug and labels)
- Send-install-email to developer (brand name, colour, logo, From name)
- Login / forgot-password pages via slug param

**Custom domain:** When agency has a verified custom domain, it is used in invite accept URLs and in the SDK script tag shown to client users. Client workspaces inherit the parent agency's custom domain.

---

## 12. TEAM MANAGEMENT
**Router prefix:** `/api/team`

| Endpoint | Method | Feature |
|----------|--------|---------|
| `/api/team` | GET | List team members for workspace |
| `/api/team/invite-info` | GET | Get invite details by token (for team-accept page) |
| `/api/team/invite` | POST | Invite team member by email + role — sends branded SES email |
| `/api/team/accept` | POST | Accept team invite — creates account if new user |
| `/api/team/{id}/resend` | POST | Resend invite with fresh token |
| `/api/team/{id}/role` | PATCH | Update member role (admin / member) |
| `/api/team/{id}` | DELETE | Remove team member |

---

## 13. UPLOAD
**Endpoint:** `POST /api/upload/image`

Used for: user avatar, workspace logo, project thumbnail, popup background image, popup image blocks. Max 10MB. Formats: JPEG, PNG, GIF, WebP, SVG. Old images deleted from R2 when replaced.

---

## 14. WEBHOOKS
**Router prefix:** `/api/webhooks`

| Endpoint | Method | Feature |
|----------|--------|---------|
| `/api/webhooks/jvzoo` | POST | JVZoo IPN — auto-creates account on purchase; sends magic link welcome email |

---

## 15. EMAIL SYSTEM (AWS SES)

| Email type | Trigger |
|-----------|---------|
| Email verification | Signup |
| Welcome | Email verified |
| Password reset | Forgot password flow |
| JVZoo welcome + magic link | JVZoo purchase webhook |
| Magic link login | Request magic link |
| Client invite (new user) | Agency invites new client |
| Client invite (existing user) | Agency invites existing PagePersona user |
| Client access revoked | Agency revokes client access |
| Client access restored | Agency restores client access |
| Team invite (new user) | Workspace owner/admin invites new team member |
| Team invite (existing user) | Workspace owner/admin invites existing user |
| Script install instructions | "Send to developer" from project — branded per agency |
| Analytics report | `POST /api/clients/report` — API done; frontend button commented out |

All emails: EN + FR bilingual (where applicable), SES via boto3, `noreply@usepagepersona.com`. Agency-triggered emails (client invites, team invites, install instructions) use agency brand name as the From display name and apply agency logo, colour, and hide_powered_by flag.

---

## 16. IMAGE UPLOADS (Cloudflare R2)

| Use case | Endpoint |
|---------|---------|
| User avatar | `POST /api/upload/image` |
| Workspace logo | `POST /api/upload/image` |
| Project thumbnail | `POST /api/upload/image` |
| Popup background image | `POST /api/upload/image` |
| Popup image blocks | `POST /api/upload/image` |

---

## 17. SETTINGS PAGE (Frontend)

| Tab | Features |
|-----|---------|
| General | Avatar upload, name, email, change password, workspace rename |
| Team | Invite members, manage roles, remove members |
| Billing | Current plan display (LTD), feature list |
| White-label | Brand name, logo, primary colour — 2-column layout with live preview; custom domain + DNS instructions; URLs & Domain section (slug link + custom domain merged) |

---

## 18. ON-PAGE PICKER (Frontend)

| Feature | Notes |
|---------|-------|
| Iframe-based element picker | Loads target page in iframe with pp.js injected |
| Element hover overlay | Highlights clickable elements |
| CSS selector capture | Clicked element → selector used in rule action |
| Picker mode detection | pp.js detects iframe context; skips rule execution |

---

## 19. INFRASTRUCTURE & DEPLOYMENT

| Item | Detail |
|------|--------|
| Backend | FastAPI + asyncpg; systemd (`pagepersona-api`) on VPS |
| Frontend | Next.js 15 + Tailwind; PM2 (`pagepersona-app`) on VPS |
| Database | PostgreSQL 16; Docker locally, native on VPS |
| CDN | Cloudflare R2 (`pub-f4f0504e96a04026adad9d727d7ad64e.r2.dev`) |
| Email | AWS SES `us-east-1` |
| Reverse proxy | Nginx; `api.usepagepersona.com` + `app.usepagepersona.com` |
| Deploy script | `~/deploy.sh` — git pull → sed swap → restart backend → rebuild frontend |
| CORS | Explicit origins + regex; credentials enabled |
| i18n | EN + FR via `locales/{lang}/common.json` + `useTranslation` hook |
| Google OAuth | Web client; prod + local redirect URIs |
| Mautic CRM | Self-hosted at `mailer.chovgroup.com`; contact sync on signup/update |

---

## 20. WHAT IS NOT BUILT YET

| Item | Note |
|------|------|
| Chov Libraries extraction | Phase 2 — after first sales |

---

## 21. AI MODULE — INFRASTRUCTURE ✅

| Item | Detail |
|------|--------|
| `ai_coins` table | Balance per workspace, default 100 coins, `last_reset_at` |
| `ai_coin_transactions` table | Full audit log — `action_type`, `coins_deducted`, `claude_tokens_used`, `fal_image_generated`, `metadata` |
| `coin_service.py` | `get_balance()`, `check_coins()`, `deduct_coins()` — owner plan always bypasses |
| Coin balance in topbar | Live badge, updates via `coinsUpdated` custom DOM event after every AI action |
| Coin history | Settings → Billing tab shows last 20 transactions |

---

## 22. AI MODULE — FEATURES BUILT ✅

### Brand Knowledge (Settings → Brand Knowledge tab)
- Fields: website_url, brand_name, industry, tone_of_voice, target_audience, key_benefits, about_brand
- "Extract from URL" — free Sonnet call, scrapes site and fills all fields
- CopyWriter on `about_brand` with `workspaceOnly` flag (no project selector)

### Project Description
- `description TEXT` column on projects — required at creation (> 10 chars)
- "Extract from URL" — 3 coins, Sonnet scrapes project URL, writes 4–6 sentence description
- Available in Create and Edit project modals
- Used by CopyWriter and Image Generator as project-level context

### CopyWriter (`components/ui/CopyWriter.tsx`) — 5 coins
- Generates 3 copy variants with rationale
- Context stack: Brand Knowledge → Project description → current text → visitor conditions → user goal
- Project selector shown in popup context (`needsProjectSelector = !projectId && !workspaceOnly`)
- Surfaces: Rules Engine, Live Picker, Popup Builder (text/button/no_thanks), Brand Knowledge

### Image Generator (`components/ui/ImageGenerator.tsx`) — 10 coins
- fal.ai Flux Dev — Photorealistic (default), Illustration, Anime, Abstract styles
- Style keywords appended to prompt on backend per style selection
- Auto-detects W/H from existing image; user-editable W/H fields
- Generated image → R2 → asset library → pre-selected → Insert
- Project selector in popup context; `projectId` threaded through ImageUploader from Rules/Picker
- Surfaces: Popup Builder image block, Rules Engine swap_image, Live Picker swap_image

### Popup Content Generator (PopupBuilder template picker) — 5 coins
- "Generate with AI" button in template picker header
- Haiku decides: layout, bg_color, blocks (text/image/button/no_thanks/countdown), all copy
- Backend strict JSON validation — wrong types/colors/shapes rejected before reaching frontend
- Style defaults by block role (backend, not AI): headline 24px/800, body 14px/400, button contrasts bg
- Two-column: AI returns `left_blocks` + `right_blocks` → backend wraps in `columns` block
- Loads into popup editor — user fills image slots, wires countdown, saves

### Technical Stack (locked)
| Layer | Choice |
|-------|--------|
| Fast copy/popup AI | `claude-haiku-4-5` (AI_MODEL_FAST) |
| Smart extraction | `claude-sonnet-4-6` (AI_MODEL_SMART) |
| Image generation | `fal-ai/flux/dev` via `fal-client==0.5.9` |
| Page scraping | `httpx` + `BeautifulSoup` |
| Image storage | R2 → asset library (same as manual upload) |

---

## 23. WHAT'S NEXT

### Remaining AI Features
| # | Feature | Where | Notes |
|---|---------|--------|-------|
| 1 | **Rule Creation Hub** | New rule entry point | 3 paths: Manual (unchanged), Template (goal → pre-built rule), AI (goal → scans page → ready rules) |
| 2 | **AI Rule Suggestions** | Project overview / rule list | Contextual nudges from traffic + analytics |
| 3 | **Analytics Insights** | Analytics page per project | Plain-English story from rule fires + visitor breakdown |

### After AI module complete
- Entitlements / plan limits enforcement (coin allocations per plan)
- JVZoo sales funnel pages (FE, OTO 1–5, thank-you pages)

---

## HANDOVER — Session ending 2026-04-17 (part 2)

### What was completed today
Systematic test update pass — reviewed every existing test module against the current codebase and added tests for all endpoints/features added since the last test run.

1. **`test_auth.py`** — added 18 new tests: GET /me, logout, refresh (valid + invalid), verify-email (valid + invalid + missing token), forgot-password (known + unknown email), reset-password (success + invalid token + password change verification), magic-link (request + verify success + verify invalid), signup creates trial entitlement, signup creates ai_coins balance=20, short password rejected.
2. **`test_users.py`** — added 2 tests: language update, short new_password rejected.
3. **`test_workspaces.py`** — added 4 tests: stats fields in list response, onboarding_completed=false on signup, complete-onboarding endpoint, white-label PATCH.
4. **`test_projects.py`** — added 9 tests: description field, edit description, trigger scan, add custom block, no-duplicate block, bulk add blocks, update block, delete block, import from rules.
5. **`test_sdk.py`** — added 3 tests: page_url in response, geo object in response, insert_countdown config resolved live.
6. **`conftest.py`** — added `db` fixture (session-scoped asyncpg connection) for direct DB assertions.

**Total test count: 181 / 181 passing** (was 145 before this session).

### State of the codebase right now
- All 181 tests passing
- All 5 updated test modules fully reflect current codebase
- Branch: `main`

### Where to pick up next
**Next feature: Billing & Entitlements enforcement**
- Wire plan limits: per-plan coin allocations, feature gating by plan
- JVZoo IPN → auto-upgrade entitlement → reseed coins
- Entitlement check middleware for plan-locked features
- Settings → Billing tab showing real plan + coin usage

---

## HANDOVER — Session ending 2026-04-16

### What was completed today
1. **CopyWriter project selector** — dropdown inside the AI write panel for popup context (`needsProjectSelector = !projectId && !workspaceOnly`). Rules/Picker pass `projectId` prop → no dropdown. Popup Builder has no `projectId` → dropdown shown.
2. **CopyWriter `workspaceOnly` prop** — suppresses project selector on Brand Knowledge surface.
3. **Image Generator** (`components/ui/ImageGenerator.tsx`) — fal.ai Flux Dev, style picker, auto W/H detection, R2 upload, asset library save, project selector in popup context, `projectId` threaded through `ImageUploader` to all 3 surfaces.
4. **Popup Content Generator** — "Generate with AI · 5 coins" in template picker. Haiku picks layout + blocks + copy. Backend strict validation + style defaults by role. Two-column support.
5. **Countdown in popup fix** — root cause: `GET /api/countdowns` (no workspace_id path) returned raw `dict(r)` without `_parse()`, so `config` was a string. Fixed by using `_parse()` consistently. SDK also defensively parses string configs for already-saved popups.
6. **Documentation** — DONE.md sections 21–23 written, DATABASE-SCHEMA.md updated (projects.description, ai_coins, ai_coin_transactions tables), TESTING.md sections 13.11–13.18 added.

### State of the codebase right now
- All AI features (CopyWriter, Image Generator, Popup Generator) fully working and deployed
- All 8 CopyWriter surfaces tested by user ✅
- Image Generator tested on Popup Builder and Live Picker ✅
- Popup Content Generator tested — generates, customises, countdown wired and working ✅
- Branch: `main`, latest commit: `58b95a0`

### Where to pick up tomorrow
**Next feature: Rule Creation Hub — AI Path**

The AI path is: user types a natural-language goal (e.g. "Show a discount popup to visitors from Google Ads who haven't bought yet") → backend scans the project page URL (httpx + BeautifulSoup, same pattern as brand/project extract) → reads real element selectors from the DOM → Sonnet returns 3–5 ready-to-use rules with conditions + actions → user reviews, edits if needed, accepts → rules saved.

Key files to read before starting:
- `apps/pagepersona/backend/app/routers/ai.py` — add new endpoint `POST /api/ai/rules/suggest`
- `apps/pagepersona/frontend/app/dashboard/projects/[id]/rules/new/page.tsx` — where the 3-path entry point UI lives
- `docs/SYSTEM-DESIGN.md` — signal library and action types reference
- `docs/DONE.md` section 23 — feature spec

Design agreed:
- 3 entry paths on the New Rule page: Manual (existing), Template (pre-built), AI (new)
- AI path costs: `rule_creation_ai` = 15 coins (already in COIN_COSTS)
- Model: Sonnet (AI_MODEL_SMART) — needs page context + element selectors
- Page scan: same httpx + BeautifulSoup pattern already used in brand extract and project describe endpoints
