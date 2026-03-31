# DONE.md — PagePersona Completed Features
> Living document. Update this every time a feature ships. Companion to CLAUDE.md.
> Last updated: 2026-03-31

---

## HOW TO USE THIS FILE
- **Green = shipped and live on `app.usepagepersona.com`**
- Add a line under the right section when a feature is done
- Do NOT remove entries — mark superseded ones with `(replaced by X)`

---

## 1. AUTHENTICATION

| Feature | Notes |
|---------|-------|
| Email + password signup | Creates user, workspace, entitlement row; syncs to Mautic |
| Email + password login | JWT access + refresh tokens; cookie + localStorage |
| Email verification flow | SES email → `/verify-email?token=` → welcome email on success |
| Resend verification email | POST `/api/auth/resend-verification` |
| Forgot password | SES email → `/reset-password?token=` |
| Reset password | Token-validated; min 8 chars |
| Google OAuth | Login + signup via Google; creates workspace on first login |
| Magic link login | Email → `/auth/magic?token=` → auto-login |
| JVZoo IPN webhook | Auto-creates account on purchase; sends magic link welcome email |
| Logout | Invalidates session token |
| Auth middleware (Next.js) | Protects `/dashboard` routes via cookie check |
| 401 interceptor (axios) | Clears tokens + redirects to `/login` on expired session |

---

## 2. USER PROFILE

| Feature | Notes |
|---------|-------|
| Update name + email | PUT `/api/users/profile`; syncs to Mautic |
| Change password | PUT `/api/users/password`; validates current password |
| Avatar upload | R2 image upload → auto-saved to profile |
| Language preference | EN / FR; stored on user record and in localStorage |

---

## 3. WORKSPACE MANAGEMENT

| Feature | Notes |
|---------|-------|
| Create workspace | Generates unique slug |
| List workspaces | Owner + member workspaces; sorted by ownership |
| Workspace rename | PATCH `/api/workspaces/{id}`; updates sidebar + topbar immediately |
| Delete workspace | Cascades client_invites; workspace_members cleaned up via FK |
| White-label brand name | `brand_name` on workspace |
| White-label logo | `logo_url` on workspace (R2 upload) |
| White-label primary colour | `brand_color` on workspace |
| Custom domain field | `custom_domain` stored + shown in settings |
| Custom domain DNS verification | Checks A record points to `app.usepagepersona.com` |
| Workspace stats subqueries | project_count, active_rules_count, sessions_this_month, last_activity |
| Workspace switcher in sidebar | Shows all workspaces; agency owners see all; clients see badge |

---

## 4. PROJECT MANAGEMENT

| Feature | Notes |
|---------|-------|
| Create project (3-step wizard) | Name + URL → Platform → Script install |
| Script ID generation | Unique `PP-XXXXXX` identifier per project |
| Script installation email | Sends tag + instructions to developer email |
| Script verification | Backend fetches page and checks for script tag presence |
| Project status toggle | Draft ↔ Active (Publish/Unpublish) |
| Project thumbnail upload | R2 image; shown on dashboard card |
| Edit project (name + URL) | URL locked once script is verified |
| Delete project | With confirmation modal |
| Project dashboard | Overview tab (script status, rules count, install modal) + Analytics tab |
| Project scoping to workspace | Projects only accessible within their own workspace (owner + member check) |
| Platform picker | HTML, WordPress, Shopify, Webflow, GoHighLevel, ClickFunnels, Systeme.io, Framer, Other |

---

## 5. RULES ENGINE

| Feature | Notes |
|---------|-------|
| Create rule | Name, conditions (AND/OR), actions, priority |
| Edit rule | Full condition + action editing |
| Delete rule | With confirmation |
| List rules | Per-project; sorted by priority |
| Activate / deactivate rule | Toggle on rules list |
| Priority ordering | Drag-to-reorder (or manual) |
| Condition operators | is detected, is, is not, contains, equals, is greater than, is less than, is between |
| AND / OR condition logic | Configurable per rule |

### Signals (conditions) available:
| Signal | Key |
|--------|-----|
| Visit count | `visit_count` |
| Time on page | `time_on_page` |
| Scroll depth | `scroll_depth` |
| Exit intent | `exit_intent` |
| Visitor type | `visitor_type` (new / returning) |
| UTM source | `utm_source` |
| UTM medium | `utm_medium` |
| UTM campaign | `utm_campaign` |
| Referrer URL | `referrer_url` |
| Query param | `query_param` |
| Device type | `device_type` |
| Operating system | `operating_system` |
| Browser | `browser` |
| Geo country | `geo_country` |
| Day / time | `day_time` |

### Actions available:
| Action | Notes |
|--------|-------|
| `swap_text` | Replaces element text; supports `{country}` token with fallback |
| `swap_image` | Replaces `src` on image element |
| `swap_url` | Changes `href` on link element |
| `hide_section` | Sets `display: none` |
| `show_element` | Removes display restriction |
| `show_popup` | Renders popup from embedded config |
| `insert_countdown` | Renders countdown timer from config |

---

## 6. POPUPS

| Feature | Notes |
|---------|-------|
| Create popup | Name + config via builder |
| Edit popup | Full canvas editor |
| Delete popup | With confirmation |
| List popups | Elements page → Popups tab |
| Status: draft / active | Toggle |
| Canvas click-to-edit builder | No drag-and-drop (post-launch) |
| 10 layout templates | Selectable as starting point |
| Block types | text, image, button, embed, no_thanks, columns |
| Text block | Font size, weight, italic, underline, alignment, colour |
| Image block | Height, fit, optional link |
| Button block | Label, URL, action (link/close), colour, text colour, radius, bold, italic |
| No-thanks block | Label, colour, "don't show again" option |
| Embed block | Arbitrary HTML embed code |
| Columns block | Left + right sub-blocks with split ratio |
| Layout: single / two-column | Toggle |
| Column split ratios | 50-50, 40-60, 60-40 |
| Position: 12 options | center, top/bottom/left/right corners, top bar, bottom bar, fullscreen |
| Background colour | Colour picker |
| Background image | R2 upload with opacity control |
| Border radius | Slider |
| Padding | Slider |
| Width | px input |
| Overlay | Toggle + opacity slider |
| Close button | Toggle |
| Close on overlay click | Toggle |
| Display delay | Seconds input |
| Display frequency | once, session, every |
| Animation | fade, slide, zoom |
| Token support | `{country}` in text blocks |
| PopupPicker (rule builder) | Dropdown to pick from workspace popups when adding show_popup action |
| Config embedded in rule | pp.js does NOT call API at runtime — config is baked into rule |

---

## 7. COUNTDOWN TIMERS

| Feature | Notes |
|---------|-------|
| Create countdown | Name, mode, config via builder |
| Edit countdown | Full builder |
| Delete countdown | With confirmation |
| List countdowns | Elements page → Countdown Timers tab |
| Status: draft / active | Toggle |
| Fixed-date mode | `ends_at` ISO timestamp; counts down to specific moment |
| Duration mode | Per-session timer stored in localStorage (minutes/hours/days) |
| Show/hide units | Toggle days, hours, minutes, seconds independently |
| Digit background colour | Colour picker |
| Digit text colour | Colour picker |
| Label colour | Colour picker |
| Container background | Colour picker |
| Padding, gap, border radius | Sliders |
| Digit size | px input |
| Expiry action: hide | Hide the timer element |
| Expiry action: redirect | Navigate to URL |
| Expiry action: message | Replace timer with custom text |
| CountdownPicker (rule builder) | Dropdown to pick from workspace countdowns when adding insert_countdown action |
| Tab-numeric font | Consistent digit width during countdown tick |

> ⚠️ VPS DB table (`countdowns`) not yet created — create before testing live.

---

## 8. SDK (pp.js)

| Feature | Notes |
|---------|-------|
| Script loading via `?id=` param | Identifies project by script_id |
| Rule fetching from backend | GET `/api/sdk/rules` with 5-min localStorage TTL |
| Hash-based cache invalidation | GET `/api/sdk/ping` checked on every page load |
| Signal detection | All 15 signals listed in section 5 |
| Rule evaluation (AND/OR) | Full condition operator support |
| All 7 actions | See section 5 |
| Token resolution: `{country}` | With fallback text |
| FOUC prevention | visibility:hidden on load, removed after actions fire |
| Picker mode detection | Detects when running inside PagePersona iframe; skips rules |
| Visit beacon | POST `/api/sdk/visit` on load |
| Unload beacon | PATCH `/api/sdk/visit/{id}` on page hide (keepalive fetch) |
| Rule-fired event beacon | POST `/api/sdk/event` when rule fires |
| Geo via server (ipwho.is) | Backend resolves country + timezone; pp.js never calls geo API |
| Geo in-memory cache | `_geo_cache` dict in sdk.py (cleared on restart) |
| Visitor type tracking | Increments visit_count in localStorage |
| Session tracking | UUID stored in sessionStorage |
| CDN-safe endpoints | 30s cache headers on `/api/sdk/ping` and `/api/sdk/rules` |
| Local vs prod URL | Local: `localhost:8000`; deploy.sh swaps to `api.usepagepersona.com` via sed |

---

## 9. ANALYTICS

| Feature | Notes |
|---------|-------|
| Visit tracking | country, device, OS, browser, referrer, UTM, new/returning, session |
| Time on page | Updated at page unload via PATCH beacon |
| Scroll depth | Updated at page unload via PATCH beacon |
| Rule events | Tracked per rule fire with session + geo + behaviour context |
| Per-project analytics dashboard | Visits, unique visitors, new visitors, rules fired, personalisation rate, avg time/scroll |
| Daily series chart | Visits over time (line chart) |
| Top countries | Table |
| Traffic sources | Referrer/UTM breakdown |
| Device split | Pie chart |
| Visitor split | New vs returning |
| Rules performance | Per-rule fire count |
| Recent visits | Last 20 visits with geo + device |
| Workspace analytics page | Aggregated across all projects |
| Analytics period selector | 7, 14, 30, 90, 180, 365 days |
| In-project analytics tab | Shown on project dashboard (30-day default) |

---

## 10. AGENCY / CLIENT FEATURE

| Feature | Notes |
|---------|-------|
| Agency workspace type | `type='agency'` or `'personal'`; owner creates client sub-workspaces |
| Client workspace type | `type='client'`; `parent_workspace_id` links to agency |
| Invite new client | Creates client workspace + `client_invites` row + SES email |
| Invite existing user | Different email copy; no password setup needed |
| Invite accept page | `/accept?token=` — unauthenticated, white-label styled |
| New user accept flow | Name + password form → creates account → JWT → dashboard |
| Existing user accept flow | One-click "Accept" button — no password form |
| Re-invite deleted client | Orphaned invite detection via JOIN; starts fresh |
| Revoke client access | Marks invite + workspace_members row as revoked |
| Access level: full | Client sees all nav items except Agency tab |
| Access level: view_only | Client sees dashboard + analytics only |
| White-label on invite page | Brand name, logo, primary colour, powered-by footer |
| Workspace badge in sidebar | Shown instead of switcher for single-workspace client users |
| Workspace switcher | Always shown if user has 2+ workspaces (regardless of role) |
| Client list in Agency tab | Lists all client workspaces with invite status |
| Manage access modal | Change access level, resend invite, revoke access |
| Send analytics report | White-label styled email to client with workspace metrics |

---

## 11. TEAM MANAGEMENT

| Feature | Notes |
|---------|-------|
| Invite team member | Email + role (member / admin) |
| List team members | Shows status (pending / active) |
| Update member role | PATCH `/api/team/{id}/role` |
| Remove member | DELETE with confirmation |
| Team tab in Settings | Full UI with invite modal |

---

## 12. EMAIL SYSTEM (AWS SES)

| Email type | Trigger |
|-----------|---------|
| Email verification | Signup |
| Welcome | Email verified |
| Password reset | Forgot password flow |
| JVZoo welcome + magic link | JVZoo purchase webhook |
| Magic link login | Request magic link |
| Script install instructions | "Send to developer" from project |
| Client invite (new user) | Agency invites new client |
| Client invite (existing user) | Agency invites existing PagePersona user |
| Analytics report | Agency sends report to client |

All emails: EN + FR bilingual, SES via boto3, `noreply@usepagepersona.com`

---

## 13. IMAGE UPLOADS (Cloudflare R2)

| Use case | Notes |
|---------|-------|
| User avatar | Auto-saved on file select |
| Workspace logo | White-label settings |
| Project thumbnail | Dashboard card image |
| Popup background image | PopupBuilder |
| Popup image blocks | Per-block image in PopupBuilder |

Max size: 10MB. Formats: JPEG, PNG, GIF, WebP, SVG.
Old images deleted from R2 when replaced.

---

## 14. SETTINGS PAGE

| Tab | Features |
|-----|---------|
| General | Avatar upload, name, email, change password, workspace rename |
| Team | Invite members, manage roles, remove members |
| Billing | Current plan display (LTD), feature list |
| White-label | Brand name, logo, primary colour, custom domain + DNS verify |

---

## 15. ON-PAGE PICKER

| Feature | Notes |
|---------|-------|
| Iframe-based element picker | Loads target page in iframe with pp.js injected |
| Element hover overlay | Highlights clickable elements |
| CSS selector capture | Clicked element → selector used in rule action |
| Picker mode detection | pp.js detects iframe context; skips rule execution |

---

## 16. INFRASTRUCTURE & DEPLOYMENT

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

## 17. DATABASE TABLES (VPS STATUS)

| Table | VPS |
|-------|-----|
| users | ✅ |
| workspaces | ✅ |
| sessions | ✅ |
| verification_tokens | ✅ |
| password_reset_tokens | ✅ |
| entitlements | ✅ |
| projects | ✅ |
| rules | ✅ |
| popups | ✅ |
| page_visits | ✅ |
| workspace_members | ✅ |
| client_invites | ✅ |
| pricing_tiers | ✅ |
| countdowns | ⚠️ local only — SQL in CLAUDE.md §20 |
| rule_events | ⚠️ local only — SQL in CLAUDE.md §20 |

---

## 18. WHAT IS NOT BUILT YET

| Item | Note |
|------|------|
| `countdowns` + `rule_events` VPS tables | SQL ready in CLAUDE.md §20 — just needs running |
| Popup DnD reorder | Post-launch |
| AI rule suggestions | Post-launch |
| Onboarding flow | Intentionally skipped — JVZoo buyers are self-selected |
| `inject_token` action | Permanently removed (replaced by `{country}` in swap_text) |
| `send_webhook` action | Permanently removed |
| Firmographics signals | Permanently removed (company_name, industry, company_size) |
| `geo_city` signal | Permanently removed — country-level only |
| Chov Libraries extraction | Phase 2 — after first sales |
