# CLAUDE.md — Chov Monorepo
> Read this file at the start of every Claude Code session. It is the single source of truth for how we work.

---

## 1. WHO & WHAT

**Developer:** Chike Okoli — Chov Technology (`github.com/chovtech`)
**Email:** chovtechllc@gmail.com | **Location:** Lagos, Nigeria
**Building:** `PagePersona` — Product 1 of the chov.ai SaaS suite
**Monorepo:** `~/chov` (WSL 2 Ubuntu 24.04, accessed from VS Code)

---

## 2. HOW WE WORK (NON-NEGOTIABLE)

- Give **ONE command** → Chike runs it → pastes output → continue
- **Never** give multiple options and ask Chike to choose
- **Always read a file before editing it** — never write blind
- After every change: give a `grep -n` confirmation command to verify
- Chike **never manually edits files** — always provide the exact command
- **Live (`app.usepagepersona.com`) is the default testing environment**
- Local is for development only — live is where we verify everything works

---

## 3. TERMINAL SETUP (always assumed — never ask Chike to SSH)

| Terminal | Purpose | State |
|----------|---------|-------|
| 0 |Local command terminal | Where commands are run |
| 1 | Local backend | `uvicorn app.main:app --reload --port 8000` |
| 2 | Local frontend | `npm run dev` |
| 3 | Docker | Where commands are run |
| 4 | Live VPS | Always SSH'd in as `chike@mail` |

---

## 4. FILE WRITING PATTERNS

```bash
# For .py, .md, .sh files:
cat > /path/to/file.py << 'PYEOF'
content here
PYEOF

# For .tsx/.ts files — ALWAYS python3, NEVER heredoc:
python3 << 'PYEOF'
content = '''file content here'''
with open('/path/to/file.tsx', 'w') as f:
    f.write(content)
print("Done")
PYEOF

# For surgical edits:
python3 << 'PYEOF'
path = '/path/to/file.tsx'
with open(path, 'r') as f:
    content = f.read()
content = content.replace('old string', 'new string')
with open(path, 'w') as f:
    f.write(content)
print("Done")
PYEOF
```

---

## 5. DEPLOY WORKFLOW

```bash
cd ~/chov && git add -A && git commit -m "message" && git push
```

Then in terminal 4 (already SSH'd to VPS): `~/deploy.sh`

- `deploy.sh`: git pull → copy pp.js to CDN (with prod API_BASE via sed) → restart backend → rm -rf .next → npm run build → pm2 restart
- **Never edit the CDN pp.js directly** — always go through deploy.sh
- `ssh chov-vps ~/deploy.sh` fails from Claude's terminal (no SSH key) — Chike always runs it manually in terminal 4

---

## 6. TECH STACK (locked)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React + Next.js 15 + Tailwind CSS | Port 3000 local, 3001 VPS |
| Backend | Python + FastAPI | Port 8000 |
| Database | PostgreSQL 16 | Docker locally, native on VPS |
| Icons | Material Symbols Outlined (Google) | |
| Fonts | Public Sans (dashboard), Syne (headings) | |
| Images | Cloudflare R2 | `chov-media` bucket — wired up |
| Email | Amazon SES via boto3 | |
| CRM | Mautic (self-hosted) | Via bridge API |
| Payments | Stripe + JVZoo webhooks | |
| Deployment | Hostinger VPS, Docker + Nginx + PM2 | |
| Translation | Custom `useTranslation` hook | `/locales/{lang}/common.json` |
| Geo lookup | ipwho.is | Free, no key needed — called server-side in sdk.py |

**Polyglot rule:** Node.js/TypeScript for pure SaaS products. Python/FastAPI for AI-heavy products. This is intentional architecture, not inconsistency.

---

## 7. LOCAL MACHINE

| Field | Value |
|-------|-------|
| OS | Windows 11 + WSL 2 Ubuntu 24.04 |
| Docker | v29.2 — must start Docker Desktop on Windows first |
| Node | v20.20.1 |
| Python | 3.12.3 |
| Monorepo | `~/chov` (inside WSL) |
| GitHub | `github.com/chovtech/chov` (private) |
| SSH key | `~/.ssh/chov_github` |
| VPS SSH | `ssh chov-vps` (key: `~/.ssh/chov_vps`) |

### Start local environment:
```bash
# Terminal 3 — Database (run first)
docker start chov-db

# Terminal 1 — Backend
cd ~/chov/apps/pagepersona/backend && source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd ~/chov/apps/pagepersona/frontend && npm run dev
```

---

## 8. DATABASE (PostgreSQL 16)

| Field | Value |
|-------|-------|
| Container | `chov-db` (local Docker) |
| User / Password | `chov` / `chov_dev_password` |
| Database | `chov` |
| Port | 5432 local, native on VPS |

### Tables (local: 11, VPS: 10):

| Table | Key Columns |
|-------|-------------|
| users | id, email, name, language, avatar_url |
| workspaces | id, owner_id, name |
| entitlements | id, workspace_id, product, plan |
| sessions | id, user_id, token |
| verification_tokens | id, user_id, token |
| password_reset_tokens | id, user_id, token |
| pricing_tiers | id, country, currency, price |
| projects | id, workspace_id, name, page_url, platform, script_id, script_verified, status, thumbnail_url |
| rules | id, project_id, name, conditions JSONB, condition_operator, actions JSONB, priority, is_active |
| popups | id, workspace_id, name, status, config JSONB, created_at, updated_at |
| countdowns | id, workspace_id, name, ends_at, expiry_action, expiry_value, config JSONB, status, created_at |
| page_visits | id, project_id, session_id, timestamp, country, country_code, continent, device, os, browser, referrer, utm_*, is_new_visitor, time_on_page, scroll_depth |
| rule_events | id, rule_id, project_id, session_id, timestamp, country, device, time_on_page_at_fire, scroll_depth_at_fire |

> ⚠️ `countdowns` — table code is 100% done. Only needs `CREATE TABLE` run on VPS.
> ⚠️ `page_visits` + `rule_events` — created locally. Only needs `CREATE TABLE` run on VPS.
> ℹ️ `workspace_members` — exists locally only, not referenced by any backend code. Dormant — not blocking anything.

---

## 9. ENVIRONMENT VARIABLES

### Backend `.env` (local)
```
DATABASE_URL=postgresql://chov:chov_dev_password@localhost:5432/chov
SECRET_KEY=your_secret_key_here
FRONTEND_URL=http://localhost:3000
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
SES_SENDER_EMAIL=noreply@usepagepersona.com
R2_ACCOUNT_ID=<see .env>
R2_ACCESS_KEY_ID=<see .env>
R2_SECRET_ACCESS_KEY=<see .env>
R2_BUCKET_NAME=chov-media
R2_PUBLIC_URL=https://pub-f4f0504e96a04026adad9d727d7ad64e.r2.dev
GOOGLE_CLIENT_ID=<see .env>
GOOGLE_CLIENT_SECRET=<see .env>
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
```

### Production differences (VPS):
```
DATABASE_URL=postgresql://chov:chov_dev_password@localhost/chov
FRONTEND_URL=https://app.usepagepersona.com
GOOGLE_REDIRECT_URI=https://api.usepagepersona.com/api/auth/google/callback
```

---

## 10. FOLDER & FILE STRUCTURE

```
~/chov/
  apps/pagepersona/
    backend/
      app/
        core/           — config.py, security.py
        routers/        — auth.py, users.py, projects.py, rules.py, sdk.py,
                          upload.py, webhooks.py, google_auth.py, popups.py, countdowns.py,
                          analytics.py, sdk_analytics.py
        schemas/        — projects.py, users.py, rules.py
        services/       — project_service.py, user_service.py,
                          popup_service.py, countdown_service.py, email_service.py
        database.py
        main.py
      static/
        pp.js           — SDK (local: localhost:8000, CDN gets prod URL via deploy.sh sed swap)
        test.html       — Vektor AI test page (git skip-worktree on VPS — never overwritten)
      .env
      venv/
    frontend/
      app/
        (auth)/         — login, signup, verify-email, forgot-password, reset-password
        auth/google/callback/, auth/magic/
        dashboard/
          page.tsx                          — home dashboard (project cards + thumbnails)
          settings/page.tsx                 — profile, password, avatar upload
          elements/
            page.tsx                        — Elements page (Popups tab + Countdown Timers tab)
            popups/
              PopupBuilder.tsx              — Shared canvas popup builder (10 templates)
              new/page.tsx
              [id]/edit/page.tsx
            countdowns/
              CountdownBuilder.tsx          — Countdown builder (type, style, expiry settings)
              new/page.tsx
              [id]/edit/page.tsx
          projects/
            [id]/
              page.tsx                      — project dashboard
              picker/page.tsx               — ON-PAGE PERSONALISATION workspace
              rules/
                page.tsx                    — rules overview
                new/page.tsx                — new rule builder
                [rule_id]/edit/page.tsx     — edit rule
        page.tsx                            — redirects to /login
      components/
        layouts/        — Topbar.tsx, Sidebar.tsx
        ui/             — Icon.tsx, SignalLibraryModal.tsx, ImageUploader.tsx,
                          NewProjectModal.tsx, CitySearchInput.tsx (built, dormant — geo_city removed)
      lib/
        api/client.ts
        hooks/          — useTranslation.ts, useLanguage.ts
        data/           — world-cities.ts (3000+ cities, built, dormant — geo_city removed)
      locales/
        en/common.json  — English strings
        fr/common.json  — French strings
  packages/             — Chov Libraries (built AFTER first sales)
```

---

## 11. TRANSLATION RULE (MANDATORY — NO EXCEPTIONS)

> Skipping this caused 2–3 hours of cleanup in Chat 7. Every string must be translated as it is written.

**Pattern:**
1. Add English string to `locales/en/common.json`
2. Add French string to `locales/fr/common.json`
3. Use `t('namespace.key')` in the component

```tsx
// ❌ NEVER
<button>Save Rule</button>
placeholder="Enter value..."

// ✅ ALWAYS
<button>{t('rules.save')}</button>
placeholder={t('rules.value_placeholder')}
```

Applies to: button labels, headings, placeholders, toasts, modals, dropdowns, empty states, tooltips — every visible string.

---

## 12. TRANSLATION SUBCOMPONENT CRASH RULE (MANDATORY)

> This crash happened 3 times across Chats 7, 8, and 9. Each took ~2 hours to fix.

**The problem:** Standalone functions outside the main exported component (e.g. `CanvasBlock`, `BlockPreview`, `BlockProperties`) have NO access to `useTranslation`. Calling `t()` inside them without receiving it as a prop causes a **runtime crash — build passes clean**.

**Before ANY translation pass on a file with subcomponents:**
1. List every standalone function in the file
2. Add `t: any` to each function's props signature
3. Add `t={t}` at every call site, including nested/recursive calls

```tsx
// ✅ CORRECT
function SubComponent({ data, t }: { data: any; t: any }) {
  return <p>{t('some.key')}</p>
}
<SubComponent data={x} t={t} />

// ❌ WRONG — crashes at runtime, NOT at build time
function SubComponent({ data }: { data: any }) {
  return <p>{t('some.key')}</p>
}
```

**Grep to run before deploying any translation pass:**
```bash
grep -n "t(el\.\|t(block\.\|t(action\.\|t(item\.\|t(a\.\|t(undefined" /path/to/file.tsx
```

**Files already fixed:** `PopupBuilder.tsx`, `projects/[id]/rules/[rule_id]/edit/page.tsx`

---

## 13. TECHNICAL RULES (locked)

| Rule | Detail |
|------|--------|
| No heredoc for TSX/TS | Always use `python3 << 'PYEOF'` pattern |
| `bg-primary` doesn't work | Always use `bg-[#1A56DB]` directly |
| `'use client'` needs blank line | Next.js 15 requires blank line after directive before imports |
| JSONB fields need parsing | `conditions` and `actions` are strings — use `json.loads()` |
| Windows CRLF | Open files with `.replace('\r\n', '\n')` before processing |
| `useSearchParams` needs Suspense | Use `SearchParamReader` pattern |
| R2 credentials | Via `config.py` settings object — NOT `os.getenv()` |
| `app.` runs on port 3001 on VPS | Port 3000 is taken by another Docker container |
| Docker Desktop must be running | Before `docker start chov-db` works in WSL |
| `pp.js` local vs production | Local: `localhost:8000` — deploy.sh swaps to prod URL via `sed` |
| `test.html` on VPS | Uses `git update-index --skip-worktree` — never overwritten by deploy |
| `user.name.split()` guard | Always `(user.name || '').split()` — Topbar, Sidebar, Settings |
| `t(undefined)` crashes | Never pass dynamic object properties into `t()` without a guard |
| PopupPicker must be stateless | hooks in parent only — no useState/useEffect inside PopupPicker |
| `axios` 401 interceptor | Excludes `/api/auth/login` and `/api/auth/signup` |
| `ImageUploader` content type | Needs `{ headers: { 'Content-Type': 'multipart/form-data' } }` |
| Nginx body size | `client_max_body_size 10m` on `api.usepagepersona.com` |
| `_geo_cache` in sdk.py | Module-level dict — in-memory, cleared on backend restart. No eviction. |
| swap_text JSON format | When `{country}` token present, value is `{"text":"...","fallbacks":{"country":"..."}}`. pp.js tries JSON.parse first — plain strings still work (backward compat). |

---

## 14. DESIGN SYSTEM (locked)

| Token | Value |
|-------|-------|
| Primary blue | `#1A56DB` — always `bg-[#1A56DB]`, never `bg-primary` |
| Teal accent | `#14B8A6` |
| Dark | `#0F172A` |
| Publish state | Rose/red — warning colour |
| Draft state | Blue — inviting colour |
| Icons | Material Symbols Outlined |
| Font — dashboard | Public Sans |
| Font — headings | Syne |

---

## 15. ACTIONS STATUS

| Action | Status |
|--------|--------|
| swap_text | ✅ Working — supports `{country}` token with fallback |
| swap_image | ✅ Working |
| hide_section | ✅ Working |
| show_element | ✅ Working |
| swap_url | ✅ Working |
| show_popup | ✅ Working — full canvas builder + PopupPicker in rule engine + live picker |
| insert_countdown | ✅ Fully built — CountdownBuilder, Elements page, CountdownPicker, pp.js all done. Only VPS DB table creation pending. |
| inject_token | ❌ Removed — replaced by `{country}` token in swap_text |
| send_webhook | ❌ Removed |

---

## 16. SIGNAL LIBRARY — CURRENT STATE

### Available signals (what the rule builder exposes):

| Group | Signal | Key | Value type |
|-------|--------|-----|------------|
| Visitor Behaviour | Visit count | `visit_count` | number |
| Visitor Behaviour | Time on page | `time_on_page` | number (seconds) |
| Visitor Behaviour | Scroll depth | `scroll_depth` | number (%) |
| Visitor Behaviour | Exit intent | `exit_intent` | none (detected) |
| Visitor Behaviour | Visitor type | `visitor_type` | select: new / returning |
| Traffic Source | UTM source | `utm_source` | text |
| Traffic Source | UTM medium | `utm_medium` | text |
| Traffic Source | UTM campaign | `utm_campaign` | text |
| Traffic Source | Referrer URL | `referrer_url` | text |
| Traffic Source | Query param | `query_param` | text |
| Context | Device type | `device_type` | select: mobile / tablet / desktop |
| Context | Operating system | `operating_system` | select |
| Context | Browser | `browser` | select |
| Context | Geo country | `geo_country` | select (all countries) |
| Context | Day / time | `day_time` | text (HH:MM) |

**Removed (permanently):** `geo_city`, `company_name`, `industry`, `company_size` (entire Firmographics group).

### How geo_country and day_time work:
- `geo_country` is resolved **server-side** in `/api/sdk/rules` via ipwho.is and returned in the rules API response as `geo.country`.
- pp.js reads `data.geo` from the API response, stores it in the localStorage rules cache, and populates `signals.geo_country` from it.
- `day_time` uses `geo.timezone_id` from ipwho.is via `Intl.DateTimeFormat` to get the visitor's accurate local time — NOT browser time or server time. Falls back to browser local time if timezone is unavailable.

---

## 17. TOKEN SUPPORT

Only **`{country}`** is supported. No other tokens exist.

| Token | Resolves from | Default fallback |
|-------|--------------|-----------------|
| `{country}` | `signals.geo_country` (from ipwho.is) | "Your Country" |

**Where tokens work:**
- `swap_text` action (rule engine new + edit + live picker)
- Popup `text` blocks (PopupBuilder)

**Serialization:** When `{country}` is present in the text, value is stored as:
```json
{"text": "Hello visitor from {country}!", "fallbacks": {"country": "Your Country"}}
```
Plain strings without tokens are stored as-is. pp.js handles both transparently.

**In pp.js:** `resolveTokensWithFallbacks(text, fallbacks)` reads `window.__pp.signals.geo_country`, falls back to `fallbacks.country`, falls back to empty string.

---

## 18. POPUP BUILDER — CONFIG SHAPE

```json
{
  "layout": "single | two-column",
  "col_split": "50-50 | 40-60 | 60-40",
  "position": "center | top_center | top_left | top_right | bottom_center | bottom_left | bottom_right | top_bar | bottom_bar | fullscreen",
  "bg_color": "#1A56DB",
  "bg_image": "",
  "bg_image_opacity": 40,
  "border_radius": 16,
  "overlay": true,
  "overlay_opacity": 50,
  "padding": 32,
  "width": 480,
  "height": "auto",
  "popup_url": "",
  "close_button": true,
  "close_on_overlay": true,
  "delay": 0,
  "frequency": "once | session | every",
  "animation": "fade | slide | zoom",
  "blocks": [...]
}
```

### Block types:
| Type | Key fields |
|------|-----------|
| text | text, text_fallbacks, font_size, font_weight, text_align, text_color, text_italic, text_underline |
| image | image_url, image_height, image_fit, image_link |
| button | btn_label, btn_url, btn_action (link/close), btn_color, btn_text_color, btn_radius, btn_bold, btn_italic |
| embed | embed_code |
| no_thanks | no_thanks_label, no_thanks_color, no_thanks_dont_show |
| columns | col_left: Block[], col_right: Block[] |

Popup config is **embedded in the rule at save** — pp.js does NOT make a runtime API call to fetch popup data.

---

## 19. pp.js SDK

| Environment | Location | API_BASE |
|-------------|----------|----------|
| Local | `~/chov/apps/pagepersona/backend/static/pp.js` | `http://localhost:8000` |
| Production CDN | `/var/www/cdn/pp.js` | `https://api.usepagepersona.com` |

### Data flow:
1. pp.js calls `/api/sdk/rules?script_id=X`
2. Backend extracts visitor IP (`X-Forwarded-For` → `X-Real-IP` → direct), calls `ipwho.is/{ip}` (server-cached in `_geo_cache` dict)
3. Response: `{ rules_hash, rules, geo: { country, country_code, continent, isp, timezone_id } }`
4. pp.js stores full response in localStorage (5-min TTL), including `geo`
5. `detectSignals(geo)` builds signals: `geo_country` from `geo.country`, `day_time` from `geo.timezone_id`
6. `evaluateRules` runs, `fireActions` fires

### Picker mode:
pp.js detects when loaded inside the PagePersona iframe and skips all rule execution — only the element picker overlay runs.

---

## 20. NEXT TASKS

### 1. Create 3 missing tables on VPS ← START HERE
Everything is built locally. Run on VPS (terminal 4):

```sql
CREATE TABLE IF NOT EXISTS countdowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ends_at TIMESTAMPTZ,
  expiry_action TEXT NOT NULL DEFAULT 'hide',
  expiry_value TEXT NOT NULL DEFAULT '',
  config JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS page_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  session_id VARCHAR NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  country VARCHAR, country_code VARCHAR, continent VARCHAR,
  device VARCHAR, os VARCHAR, browser VARCHAR,
  referrer VARCHAR,
  utm_source VARCHAR, utm_medium VARCHAR, utm_campaign VARCHAR, utm_content VARCHAR, utm_term VARCHAR,
  is_new_visitor BOOLEAN NOT NULL DEFAULT false,
  time_on_page INTEGER, scroll_depth INTEGER
);
CREATE INDEX IF NOT EXISTS idx_page_visits_project_id ON page_visits(project_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_timestamp ON page_visits(timestamp);

CREATE TABLE IF NOT EXISTS rule_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  session_id VARCHAR NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  country VARCHAR, device VARCHAR,
  time_on_page_at_fire INTEGER, scroll_depth_at_fire INTEGER
);
CREATE INDEX IF NOT EXISTS idx_rule_events_project_id ON rule_events(project_id);
CREATE INDEX IF NOT EXISTS idx_rule_events_rule_id ON rule_events(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_events_timestamp ON rule_events(timestamp);
```

### 2. End-to-end action testing
All actions tested on `test.html` and SMI WordPress page.

---

## 21. LOCKED DECISIONS (never revisit)

- No onboarding flow — JVZoo buyers are self-selected marketers
- No 'Projects' in sidebar — Home shows all projects
- 'Project' not 'Campaign'
- Manual rules first, AI later
- Publish = rose/red (warning), Draft = blue (inviting)
- `pp.js` not `sdk.js`
- Polyglot backend — Node for SaaS, Python for AI-heavy
- **Ship first, extract Chov Libraries after first sales**
- `app.` runs on port 3001 on VPS
- ImageUploader everywhere — no bare URL fields
- Translation-first — never after
- URL locked after first script verification
- Rules/picker blocked until script verified
- Popup builder is canvas click-to-edit — full DnD is post-launch
- Popups are global to workspace
- Elements page is umbrella for all reusable elements (Popups, Countdown Timers, etc.)
- Popup config embedded in rule at save — no runtime API call from pp.js
- PopupPicker must be stateless — hooks in parent only
- Countdown timers stored in DB, picked in rule builder like popups, pp.js handles live ticking
- Only `{country}` token — no city, region, or company tokens
- `inject_token` and `send_webhook` actions are permanently removed
- Firmographics signals (company_name, industry, company_size) permanently removed from signal library
- `geo_city` signal permanently removed — country-level targeting only
- Geo data resolved server-side via ipwho.is — pp.js never calls a geo API directly

---

## 22. BIG PICTURE — CHOV ARCHITECTURE

### Three phases:
1. **Phase 1** — Launch individual products on JVZoo (LTDs) — *we are here*
2. **Phase 2** — Extract reusable code into Chov Libraries after each launch
3. **Phase 3** — Launch chov.ai as unified suite (subscription)

### Building blocks (vocabulary is permanent):
| Block | Location | Definition |
|-------|----------|-----------|
| **UI Component** | `/packages/ui/` | Visual element only — no logic, no API, no DB |
| **Package** | `/packages/utils/` | Pure logic utility — no UI, no rendering |
| **Module** | `/packages/modules/` | Complete feature: UI + logic + API + database |
| **Engine** | `/packages/engines/` | Major capability system entire products are built around |
| **Product** | `/packages/product/` | A full product that executes independently — e.g. PagePersona |
| **Pack** | `/packages/pack/` | A bundle of 2–4 complementary products — e.g. PagePersona + MagnetIQ + LeadGenie + Qualifir = LeadOps |
| **Suite** | `/packages/suite/` | All products together — this is chov.ai |

### The launch-first rule:
Build PagePersona first. Extract libraries after first sales. Every reusable piece found during the build goes into a **"Library Later" note** — flagged for extraction, not built as a library yet. Name tables and folders generically so extraction requires renaming nothing.

### chov.ai flip-the-switch architecture:
Every JVZoo product is simultaneously a brick in chov.ai. When enough products exist — one email to all buyers, one switch flipped, chov.ai opens its doors. Every customer already has an account.

---

## 23. SOPs IN PROJECT FILES
> These files will be moved to the SOP folder Chike created.

| File | Purpose |
|------|---------|
| `ADD_NEW_DOMAIN_SOP.md` | Adding new domain to `mail.chovgroup.com` |
| `SES_Mautic_Multi_Domain_SOP.docx` | Verify domain on SES and use in Mautic |
| `SMTP_setup_to_connect_email.docx` | SMTP configuration |
| `__Mailer_API_Integration_doc_Documentation.docx` | Mautic bridge API reference |
| `CHOV_LibraryMasterPlan_FINAL.docx` | Full architecture document |
| `PagePersona_Strategy_v3.docx` | Product strategy |
| `PagePersona_UIScreens_v2.docx` | 31 UI screen designs (S01–S31) |
| `PagePersona_userflow_v2.html` | Complete user flow diagram |

## Working Style
- Work autonomously. Do not ask for approval before editing files.
- Do not ask clarifying questions mid-task. Make a decision and proceed.
- Only stop and ask if something is genuinely ambiguous or destructive.
- Tell me what you built when you're done, not before.
