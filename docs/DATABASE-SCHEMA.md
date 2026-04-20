# Database Schema — PagePersona

**Engine:** PostgreSQL 16
**Local:** `postgresql://chov:chov_dev_password@localhost:5432/chov` (Docker: `chov-db`)
**VPS:** `postgresql://chov:chov_dev_password@localhost/chov`

Last synced from VPS: 2026-04-20 (via `pg_dump --schema-only`)

---

## Tables

### users
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Default `gen_random_uuid()` |
| email | VARCHAR(255) UNIQUE NOT NULL | |
| name | VARCHAR(255) | Nullable — guard with `(name or '').split()` |
| password_hash | TEXT | Nullable — null for Google OAuth users |
| avatar_url | TEXT | R2 URL |
| google_id | VARCHAR(255) UNIQUE | Nullable — set on Google OAuth |
| email_verified | BOOLEAN | Default `false` |
| language | VARCHAR(10) | Default `'en'` |
| created_at | TIMESTAMPTZ | Default `now()` |
| updated_at | TIMESTAMPTZ | Default `now()` |

---

### workspaces
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Default `gen_random_uuid()` |
| owner_id | UUID FK → users NOT NULL | CASCADE delete |
| name | VARCHAR(255) NOT NULL | |
| slug | VARCHAR(255) UNIQUE NOT NULL | Used in `/join/[slug]` signup link |
| type | TEXT NOT NULL | `personal`, `agency`, `client` — default `personal` |
| parent_workspace_id | UUID FK → workspaces | NULL for agency; set for client (SET NULL on delete) |
| client_name | TEXT | Client display name |
| client_email | TEXT | Client email address |
| client_access_level | TEXT NOT NULL | `full` or `view_only` — default `full` |
| white_label_brand_name | TEXT | White-label brand name |
| white_label_logo | TEXT | White-label logo (R2 URL) |
| white_label_icon | TEXT | White-label favicon/icon (R2 URL) |
| white_label_primary_color | TEXT | White-label primary colour hex — default `'#1A56DB'` |
| hide_powered_by | BOOLEAN NOT NULL | Default `false` |
| custom_domain | TEXT UNIQUE | e.g. `clients.acmeagency.com` |
| custom_domain_verified | BOOLEAN | Default `false` |
| brand_name | TEXT | Legacy — always NULL; do not use; use `white_label_brand_name` |
| logo_url | TEXT | Legacy — always NULL; do not use; use `white_label_logo` |
| brand_color | TEXT | Legacy — always NULL; do not use; use `white_label_primary_color` |
| onboarding_completed | BOOLEAN NOT NULL | Default `false` — set via `POST /api/workspaces/{id}/complete-onboarding` |
| created_at | TIMESTAMPTZ | Default `now()` |
| updated_at | TIMESTAMPTZ | Default `now()` |

> ⚠️ Always use `white_label_brand_name`, `white_label_logo`, `white_label_primary_color`. The `brand_name`/`logo_url`/`brand_color` columns are legacy and always NULL for new workspaces.

---

### workspace_members
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Default `gen_random_uuid()` |
| workspace_id | UUID FK → workspaces NOT NULL | CASCADE delete |
| user_id | UUID FK → users | Nullable — NULL for pending invites |
| email | TEXT NOT NULL | Invited/member email |
| role | TEXT NOT NULL | `admin`, `member`, `client`, `revoked` — default `member` |
| status | TEXT NOT NULL | `pending`, `active` — default `active` |
| invite_token | TEXT UNIQUE | Nullable — set for pending team invites, cleared on accept |
| invited_at | TIMESTAMPTZ NOT NULL | Default `now()` |
| joined_at | TIMESTAMPTZ | Nullable |

---

### client_invites
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Default `gen_random_uuid()` |
| workspace_id | UUID FK → workspaces NOT NULL | Agency workspace — CASCADE delete |
| email | TEXT NOT NULL | Invited client email — this is the active column |
| token | TEXT UNIQUE NOT NULL | Accept link token |
| status | TEXT NOT NULL | `pending`, `active`, `revoked` — default `pending` |
| client_workspace_id | UUID FK → workspaces | Client workspace — SET NULL on delete |
| client_email | TEXT | Legacy — always NULL; do not use; use `email` |
| created_at | TIMESTAMPTZ NOT NULL | Default `now()` |
| accepted_at | TIMESTAMPTZ | Nullable |

> ⚠️ `email` (NOT NULL) is the active column. `client_email` is a legacy nullable column — never read from it.

---

### sessions
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Default `gen_random_uuid()` |
| user_id | UUID FK → users NOT NULL | CASCADE delete |
| token | TEXT UNIQUE NOT NULL | |
| device_info | TEXT | Nullable |
| ip_address | VARCHAR(45) | Nullable |
| expires_at | TIMESTAMPTZ NOT NULL | |
| created_at | TIMESTAMPTZ | Default `now()` |

---

### verification_tokens
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Default `gen_random_uuid()` |
| user_id | UUID FK → users NOT NULL | CASCADE delete |
| token | TEXT UNIQUE NOT NULL | |
| type | VARCHAR(50) NOT NULL | `email_verification`, `magic_link` |
| expires_at | TIMESTAMPTZ NOT NULL | |
| used_at | TIMESTAMPTZ | Nullable |
| created_at | TIMESTAMPTZ | Default `now()` |

---

### password_reset_tokens
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Default `gen_random_uuid()` |
| user_id | UUID FK → users NOT NULL | CASCADE delete |
| token | TEXT UNIQUE NOT NULL | |
| expires_at | TIMESTAMPTZ NOT NULL | |
| used_at | TIMESTAMPTZ | Nullable |
| created_at | TIMESTAMPTZ | Default `now()` |

---

### entitlements
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Default `gen_random_uuid()` |
| workspace_id | UUID FK → workspaces NOT NULL | UNIQUE per (workspace_id, product_id) — CASCADE delete |
| product_id | VARCHAR(100) NOT NULL | `pagepersona` |
| plan | VARCHAR(100) NOT NULL | `trial`, `fe`, `unlimited`, `professional`, `agency`, `owner` |
| source | VARCHAR(50) NOT NULL | `direct` (signup), `jvzoo`, `stripe` |
| status | VARCHAR(50) NOT NULL | `active`, `refunded` — default `active` |
| affiliate_id | VARCHAR(255) | Nullable — JVZoo affiliate ref |
| purchased_at | TIMESTAMPTZ | Default `now()` |
| expires_at | TIMESTAMPTZ | NULL = lifetime deal; date = yearly plan expiry |
| created_at | TIMESTAMPTZ | Default `now()` |
| updated_at | TIMESTAMPTZ | Default `now()` |

**Plan hierarchy (lowest → highest):** `trial(0)` → `fe(1)` → `unlimited(2)` → `professional(3)` → `agency(4)` → `owner(5)`
Plans never downgrade — JVZoo webhook only upgrades.

---

### expiry_notifications
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Default `gen_random_uuid()` |
| entitlement_id | UUID FK → entitlements NOT NULL | CASCADE delete |
| notification_type | VARCHAR(50) NOT NULL | `grace_day1`, `grace_day4`, `grace_day7` |
| sent_at | TIMESTAMPTZ | Default `now()` |

UNIQUE(entitlement_id, notification_type) — prevents duplicate reminder emails.
Checked by the daily background task in `expiry_service.py`.

---

### pricing_tiers
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Default `gen_random_uuid()` |
| product_id | VARCHAR(100) NOT NULL | |
| plan | VARCHAR(100) NOT NULL | |
| country_code | VARCHAR(10) NOT NULL | Default `'DEFAULT'` — UNIQUE per (product_id, plan, country_code) |
| currency | VARCHAR(10) NOT NULL | Default `'USD'` |
| amount | NUMERIC(10,2) NOT NULL | |
| billing_cycle | VARCHAR(50) NOT NULL | `one_time`, `yearly`, `monthly` |
| is_active | BOOLEAN | Default `true` |
| created_at | TIMESTAMPTZ | Default `now()` |
| updated_at | TIMESTAMPTZ | Default `now()` |

---

### projects
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Default `gen_random_uuid()` |
| workspace_id | UUID FK → workspaces NOT NULL | CASCADE delete |
| name | VARCHAR(255) NOT NULL | |
| page_url | TEXT NOT NULL | Locked after `script_verified = true` |
| platform | VARCHAR(100) NOT NULL | `html`, `wordpress`, `shopify`, `webflow`, etc. — default `html` |
| script_id | VARCHAR(50) UNIQUE NOT NULL | `PP-XXXXXX` format |
| script_verified | BOOLEAN | Default `false` |
| status | VARCHAR(50) NOT NULL | `draft`, `active` — default `draft` |
| thumbnail_url | TEXT | R2 URL |
| description | TEXT | AI context — what the page sells/does. Used by CopyWriter and Image Generator. |
| page_scan | JSONB | Scanned page structure: `{headings, ctas, images, sections, custom_blocks}` arrays |
| deleted_at | TIMESTAMPTZ | NULL = not deleted. Soft delete — row stays for quota accounting. |
| created_at | TIMESTAMPTZ | Default `now()` |
| updated_at | TIMESTAMPTZ | Default `now()` |

> **Soft delete quota rule:** Verified deleted projects (`script_verified = true`) still count against the plan quota. Unverified deleted projects free their slot.
> Plan limit query: `WHERE workspace_id = $1 AND (deleted_at IS NULL OR script_verified = TRUE)`

---

### rules
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Default `gen_random_uuid()` |
| project_id | UUID FK → projects NOT NULL | CASCADE delete |
| name | VARCHAR(255) NOT NULL | |
| conditions | JSONB NOT NULL | Array of condition objects — default `'[]'` |
| condition_operator | VARCHAR(10) NOT NULL | `AND` or `OR` — default `AND` |
| actions | JSONB NOT NULL | Array of action objects — default `'[]'` |
| priority | INTEGER NOT NULL | Default `0` — lower = higher priority |
| is_active | BOOLEAN | Default `false` |
| element_mapped | BOOLEAN NOT NULL | Default `false` — true when rule was created via the Live Picker |
| created_at | TIMESTAMPTZ | Default `now()` |
| updated_at | TIMESTAMPTZ | Default `now()` |

---

### popups
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Default `gen_random_uuid()` |
| workspace_id | UUID FK → workspaces NOT NULL | CASCADE delete |
| name | VARCHAR(255) NOT NULL | |
| status | VARCHAR(20) NOT NULL | `draft`, `active` — default `draft` |
| config | JSONB NOT NULL | Full popup config shape — default `'{}'` |
| created_at | TIMESTAMPTZ NOT NULL | Default `now()` |
| updated_at | TIMESTAMPTZ NOT NULL | Default `now()` |

---

### countdowns
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Default `gen_random_uuid()` |
| workspace_id | UUID FK → workspaces NOT NULL | CASCADE delete |
| name | VARCHAR(255) NOT NULL | |
| ends_at | TIMESTAMPTZ | Fixed-date mode only — NULL for duration mode |
| expiry_action | VARCHAR(50) NOT NULL | `hide`, `redirect`, `message` — default `hide` |
| expiry_value | TEXT NOT NULL | URL or message text — default `''` |
| config | JSONB NOT NULL | Full style + display config — default `'{}'` |
| status | VARCHAR(50) NOT NULL | `draft`, `active` — default `draft` |
| created_at | TIMESTAMPTZ | Default `now()` |

---

### page_visits
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Default `gen_random_uuid()` |
| project_id | UUID FK → projects NOT NULL | CASCADE delete |
| session_id | VARCHAR NOT NULL | UUID from visitor sessionStorage |
| timestamp | TIMESTAMPTZ NOT NULL | Default `now()` |
| country | VARCHAR | |
| country_code | VARCHAR | |
| continent | VARCHAR | |
| device | VARCHAR | `mobile`, `tablet`, `desktop` |
| os | VARCHAR | |
| browser | VARCHAR | |
| referrer | VARCHAR | |
| utm_source | VARCHAR | |
| utm_medium | VARCHAR | |
| utm_campaign | VARCHAR | |
| utm_content | VARCHAR | |
| utm_term | VARCHAR | |
| is_new_visitor | BOOLEAN NOT NULL | Default `false` |
| time_on_page | INTEGER | Seconds — updated at unload via keepalive beacon |
| scroll_depth | INTEGER | % — updated at unload via keepalive beacon |

---

### rule_events
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Default `gen_random_uuid()` |
| rule_id | UUID FK → rules NOT NULL | CASCADE delete |
| project_id | UUID FK → projects NOT NULL | CASCADE delete |
| session_id | VARCHAR NOT NULL | |
| timestamp | TIMESTAMPTZ NOT NULL | Default `now()` |
| country | VARCHAR | |
| device | VARCHAR | |
| time_on_page_at_fire | INTEGER | |
| scroll_depth_at_fire | INTEGER | |

---

### assets
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Default `gen_random_uuid()` |
| workspace_id | UUID FK → workspaces | Nullable — CASCADE delete |
| user_id | UUID FK → users NOT NULL | CASCADE delete |
| url | TEXT NOT NULL | R2 public URL |
| filename | TEXT | Original filename |
| size | INTEGER | File size in bytes |
| mime_type | VARCHAR(100) | e.g. `image/jpeg`, `image/png` |
| created_at | TIMESTAMPTZ | Default `now()` |

---

### workspace_ai_settings
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Default `gen_random_uuid()` |
| workspace_id | UUID FK → workspaces NOT NULL | UNIQUE per workspace — CASCADE delete |
| website_url | TEXT | Used for AI auto-extraction |
| brand_name | TEXT | Brand / company name |
| industry | TEXT | Industry or niche |
| tone_of_voice | TEXT | Communication style |
| target_audience | TEXT | Who they sell to |
| key_benefits | TEXT | Main value propositions |
| about_brand | TEXT | Free-form brand description — CopyWriter uses this as base voice/style |
| created_at | TIMESTAMPTZ | Default `now()` |
| updated_at | TIMESTAMPTZ | Default `now()` |

---

### ai_coins
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Default `gen_random_uuid()` |
| workspace_id | UUID FK → workspaces NOT NULL | UNIQUE per workspace — CASCADE delete |
| balance | INTEGER NOT NULL | Current spendable balance — default `0`; seeded by `seed_coins()` on signup |
| lifetime_earned | INTEGER NOT NULL | Total coins ever earned — default `0` |
| last_reset_at | TIMESTAMPTZ | Default `now()` |
| created_at | TIMESTAMPTZ | Default `now()` |
| updated_at | TIMESTAMPTZ | Default `now()` |

**Coin allocation by plan (seeded on signup / upgraded):**
| Plan | Coins |
|------|-------|
| trial | 20 |
| fe | 50 |
| unlimited | 200 |
| professional | 200 |
| agency | 200 |
| owner | ∞ (bypasses deduction entirely) |

---

### ai_coin_transactions
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Default `gen_random_uuid()` |
| workspace_id | UUID FK → workspaces NOT NULL | CASCADE delete |
| action_type | VARCHAR(50) NOT NULL | See table below |
| coins_deducted | INTEGER NOT NULL | |
| claude_tokens_used | INTEGER | Nullable — set for Anthropic calls |
| fal_image_generated | BOOLEAN | Default `false` — set for fal.ai image gen calls |
| metadata | JSONB | e.g. `{goal, prompt, style, width, height, insight}` |
| created_at | TIMESTAMPTZ | Default `now()` |

**Coin costs per action:**
| action_type | Coins |
|-------------|-------|
| `write_copy` | 5 |
| `generate_image` | 10 |
| `popup_content` | 5 |
| `project_describe` | 3 |
| `analytics_insights` | 8 |
| `rule_creation_ai` | 15 |
| `rule_suggestion` | 3 |
| `purchase` | 0 (credit, not deduction) |

---

### project_reports
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Default `gen_random_uuid()` |
| project_id | UUID FK → projects NOT NULL | CASCADE delete |
| workspace_id | UUID FK → workspaces NOT NULL | CASCADE delete |
| recipient_email | TEXT NOT NULL | |
| recipient_name | TEXT | Nullable |
| message | TEXT | Nullable — custom message from sender |
| public_token | TEXT UNIQUE NOT NULL | `encode(gen_random_bytes(24), 'hex')` — used in `/r/[token]` public URL |
| analytics_snapshot | JSONB NOT NULL | Snapshot of analytics data at time of send — default `'{}'` |
| period | INTEGER NOT NULL | Days of data included — default `30` |
| created_at | TIMESTAMPTZ NOT NULL | Default `now()` |

---

## VPS Table Status

All 21 tables confirmed present on VPS as of 2026-04-20.

| Table | VPS | Notes |
|-------|-----|-------|
| users | ✅ | |
| workspaces | ✅ | |
| workspace_members | ✅ | |
| client_invites | ✅ | |
| sessions | ✅ | |
| verification_tokens | ✅ | |
| password_reset_tokens | ✅ | |
| entitlements | ✅ | |
| expiry_notifications | ✅ | Added 2026-04-20 |
| pricing_tiers | ✅ | |
| projects | ✅ | `description`, `page_scan`, `deleted_at` columns present |
| rules | ✅ | `element_mapped` column present |
| popups | ✅ | |
| countdowns | ✅ | |
| page_visits | ✅ | |
| rule_events | ✅ | |
| assets | ✅ | |
| workspace_ai_settings | ✅ | |
| ai_coins | ✅ | |
| ai_coin_transactions | ✅ | |
| project_reports | ✅ | Added 2026-04-18 |
