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
| 1 | Local backend | `uvicorn app.main:app --reload --port 8000` |
| 2 | Local frontend | `npm run dev` |
| 3 | Local command terminal | Where commands are run |
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
cd ~/chov && git add -A && git commit -m "message" && deploy-pp
```

- `deploy-pp` = git push + `ssh chov-vps ~/deploy.sh`
- `deploy.sh`: git pull → copy pp.js to CDN (with prod API_BASE via sed) → restart backend → rm -rf .next → npm run build → pm2 restart
- **Never edit the CDN pp.js directly** — always go through deploy.sh

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
# Terminal 0 — Local Bash
ssh chov-vps

# Terminal 1 — Backend
cd ~/chov/apps/pagepersona/backend && source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd ~/chov/apps/pagepersona/frontend && npm run dev

# Terminal 3 — Database (run first)
docker start chov-db

# Terminal 4 — Live server for chike
ssh chov-vps
```

---

## 8. DATABASE (PostgreSQL 16)

| Field | Value |
|-------|-------|
| Container | `chov-db` (local Docker) |
| User / Password | `chov` / `chov_dev_password` |
| Database | `chov` |
| Port | 5432 local, native on VPS |

### Tables (10 total):

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

> ⚠️ `workspace_members` — exists locally only, NOT on VPS yet
> ⚠️ `countdowns` — needs to be created (next task)

---

## 9. ENVIRONMENT VARIABLES

### Backend `.env` (local)
```
DATABASE_URL=postgresql://chov:chov_dev_password@localhost:5432/chov
SECRET_KEY=your_secret_key_here
FRONTEND_URL=http://localhost:3000
AWS_ACCESS_KEY_ID=<ses key>
AWS_SECRET_ACCESS_KEY=<ses secret>
AWS_REGION=us-east-1
SES_SENDER_EMAIL=noreply@usepagepersona.com
R2_ACCOUNT_ID=38adfb8674a24ddd849978308933db09
R2_ACCESS_KEY_ID=cfd09466c76f80a5ef4be1fe4d909ace
R2_SECRET_ACCESS_KEY=52fb17ca0083d0515bb6e35a492327dcc365ac03a17cfc28577c788e0a43c72d
R2_BUCKET_NAME=chov-media
R2_PUBLIC_URL=https://pub-f4f0504e96a04026adad9d727d7ad64e.r2.dev
GOOGLE_CLIENT_ID=658252743900-43o3583huf6tvjrghulsq79f793bbvgs.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
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
                          upload.py, webhooks.py, google_auth.py, popups.py
        schemas/        — projects.py, users.py, rules.py
        services/       — project_service.py, user_service.py,
                          popup_service.py, email_service.py
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
        ui/             — Icon.tsx, SignalLibraryModal.tsx, ImageUploader.tsx, NewProjectModal.tsx
      lib/
        api/client.ts
        hooks/          — useTranslation.ts, useLanguage.ts
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
| swap_text | ✅ Working |
| swap_image | ✅ Working |
| hide_section | ✅ Working |
| inject_token | ✅ Working |
| show_popup | ✅ Working — full canvas builder + PopupPicker |
| send_webhook | ✅ Working |
| insert_countdown | 🔲 TO BUILD |
| swap_url | 🔲 TO BUILD |
| show_element | 🔲 TO BUILD |

---

## 16. POPUP BUILDER — CONFIG SHAPE

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
| text | text, font_size, font_weight, text_align, text_color, text_italic, text_underline |
| image | image_url, image_height, image_fit, image_link |
| button | btn_label, btn_url, btn_action (link/close), btn_color, btn_text_color, btn_radius, btn_bold, btn_italic |
| embed | embed_code |
| no_thanks | no_thanks_label, no_thanks_color, no_thanks_dont_show |
| columns | col_left: Block[], col_right: Block[] |

Popup config is **embedded in the rule at save** — pp.js does NOT make a runtime API call to fetch popup data.

---

## 17. pp.js SDK

| Environment | Location | API_BASE |
|-------------|----------|----------|
| Local | `~/chov/apps/pagepersona/backend/static/pp.js` | `http://localhost:8000` |
| Production CDN | `/var/www/cdn/pp.js` | `https://api.usepagepersona.com` |

---

## 18. NEXT TASKS (Chat 10 Agenda)

### 1. Countdown Builder ← START HERE
- **DB:** `countdowns` table — `id, workspace_id, name, ends_at, expiry_action (hide|redirect|message), expiry_value, created_at`
- **Backend:** `routers/countdowns.py` with CRUD
- **Frontend:** Countdown Timers tab in `/dashboard/elements/page.tsx` (currently "Coming Soon") + `countdowns/new/` + `countdowns/[id]/edit/` pages
- **Rule builder:** `insert_countdown` action + CountdownPicker (mirrors PopupPicker)
- **pp.js:** `insertCountdown(value)` → injects live `DD:HH:MM:SS` ticker → fires expiry_action on zero

### 2. swap_url action
Changes `href` on any link/button based on visitor segment.

### 3. show_element action
Complement to `hide_section`. Reveals a hidden element for a segment.

### 4. End-to-end action testing
All actions tested on `test.html` and SMI WordPress page.

---

## 19. LOCKED DECISIONS (never revisit)

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

---

## 20. BIG PICTURE — CHOV ARCHITECTURE

### Three phases:
1. **Phase 1** — Launch individual products on JVZoo (LTDs) — *we are here*
2. **Phase 2** — Extract reusable code into Chov Libraries after each launch
3. **Phase 3** — Launch chov.ai as unified suite (subscription)

### Four building blocks (vocabulary is permanent):
| Block | Location | Definition |
|-------|----------|-----------|
| **UI Component** | `/packages/ui/` | Visual element only — no logic, no API, no DB |
| **Package** | `/packages/utils/` | Pure logic utility — no UI, no rendering |
| **Module** | `/packages/modules/` | Complete feature: UI + logic + API + database |
| **Engine** | `/packages/engines/` | Major capability system entire products are built around |

### The launch-first rule:
Build PagePersona first. Extract libraries after first sales. Every reusable piece found during the build goes into a **"Library Later" note** — flagged for extraction, not built as a library yet. Name tables and folders generically so extraction requires renaming nothing.

### chov.ai flip-the-switch architecture:
Every JVZoo product is simultaneously a brick in chov.ai. When enough products exist — one email to all buyers, one switch flipped, chov.ai opens its doors. Every customer already has an account.

---

## 21. SOPs IN PROJECT FILES

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
