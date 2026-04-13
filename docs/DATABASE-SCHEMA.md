# Database Schema — PagePersona

**Engine:** PostgreSQL 16
**Local:** `postgresql://chov:chov_dev_password@localhost:5432/chov` (Docker: `chov-db`)
**VPS:** `postgresql://chov:chov_dev_password@localhost/chov`

All 15 tables exist locally and on VPS. `countdowns` is owned by `postgres` on VPS (not `chov`) — functionally fine.

---

## Tables

### users
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| email | VARCHAR(255) UNIQUE | |
| name | VARCHAR(255) | Nullable — guard with `(name || '').split()` |
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
| id | UUID PK | |
| owner_id | UUID FK → users | CASCADE delete |
| name | VARCHAR(255) | |
| slug | VARCHAR(255) UNIQUE | Used in `/join/[slug]` signup link |
| type | TEXT | `personal`, `agency`, `client` — default `personal` |
| parent_workspace_id | UUID FK → workspaces | NULL for agency; set for client (SET NULL on delete) |
| client_name | TEXT | Client display name |
| client_email | TEXT | Client email |
| client_access_level | TEXT | `full` or `view_only` — default `full` |
| white_label_brand_name | TEXT | White-label brand name |
| white_label_logo | TEXT | White-label logo (R2 URL) |
| white_label_primary_color | TEXT | White-label primary colour hex — default `'#1A56DB'` |
| hide_powered_by | BOOLEAN | Default `false` — when true, "Powered by PagePersona" hidden on client pages |
| custom_domain | TEXT UNIQUE | e.g. `clients.acmeagency.com` |
| custom_domain_verified | BOOLEAN | Default `false` |
| created_at | TIMESTAMPTZ | Default `now()` |
| updated_at | TIMESTAMPTZ | Default `now()` |

> ⚠️ White-label columns are `white_label_brand_name`, `white_label_logo`, `white_label_primary_color` — NOT `brand_name`/`logo_url`/`brand_color`.

---

### entitlements
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| workspace_id | UUID FK → workspaces | UNIQUE per (workspace_id, product_id) |
| product_id | VARCHAR(100) | e.g. `pagepersona` |
| plan | VARCHAR(100) | `fe`, `unlimited`, `professional`, `agency`, `owner` |
| source | VARCHAR(50) | `jvzoo`, `stripe`, `internal` |
| status | VARCHAR(50) | `active`, `expired`, `cancelled` — default `active` |
| affiliate_id | VARCHAR(255) | Nullable — JVZoo affiliate ref |
| metadata | TEXT | Nullable — raw webhook payload or notes |
| purchased_at | TIMESTAMPTZ | Default `now()` |
| expires_at | TIMESTAMPTZ | NULL = lifetime |
| created_at | TIMESTAMPTZ | Default `now()` |
| updated_at | TIMESTAMPTZ | Default `now()` |

---

### sessions
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users | CASCADE delete |
| token | TEXT UNIQUE | |
| device_info | TEXT | Nullable |
| ip_address | VARCHAR(45) | Nullable |
| expires_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | Default `now()` |

---

### verification_tokens
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users | CASCADE delete |
| token | TEXT UNIQUE | |
| type | VARCHAR(50) | `email_verification`, `magic_link` |
| expires_at | TIMESTAMPTZ | |
| used_at | TIMESTAMPTZ | Nullable |
| created_at | TIMESTAMPTZ | Default `now()` |

---

### password_reset_tokens
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users | CASCADE delete |
| token | TEXT UNIQUE | |
| expires_at | TIMESTAMPTZ | |
| used_at | TIMESTAMPTZ | Nullable |
| created_at | TIMESTAMPTZ | Default `now()` |

---

### pricing_tiers
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| product_id | VARCHAR(100) | |
| plan | VARCHAR(100) | |
| country_code | VARCHAR(10) | Default `'DEFAULT'` — UNIQUE per (product_id, plan, country_code) |
| currency | VARCHAR(10) | Default `'USD'` |
| amount | NUMERIC(10,2) | |
| billing_cycle | VARCHAR(50) | `one_time`, `yearly`, `monthly` |
| is_active | BOOLEAN | Default `true` |
| created_at | TIMESTAMPTZ | Default `now()` |
| updated_at | TIMESTAMPTZ | Default `now()` |

---

### projects
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| workspace_id | UUID FK → workspaces | CASCADE delete |
| name | VARCHAR(255) | |
| page_url | TEXT | Locked after script verified |
| platform | VARCHAR(100) | `html`, `wordpress`, `shopify`, etc. — default `html` |
| script_id | VARCHAR(50) UNIQUE | `PP-XXXXXX` format |
| script_verified | BOOLEAN | Default `false` |
| status | VARCHAR(50) | `draft`, `active` — default `draft` |
| thumbnail_url | TEXT | R2 URL |
| created_at | TIMESTAMPTZ | Default `now()` |
| updated_at | TIMESTAMPTZ | Default `now()` |

---

### rules
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| project_id | UUID FK → projects | CASCADE delete |
| name | VARCHAR(255) | |
| conditions | JSONB | Array of condition objects — default `'[]'` |
| condition_operator | VARCHAR(10) | `AND` or `OR` — default `AND` |
| actions | JSONB | Array of action objects — default `'[]'` |
| priority | INTEGER | Default `0` — lower = higher priority |
| is_active | BOOLEAN | Default `false` |
| created_at | TIMESTAMPTZ | Default `now()` |
| updated_at | TIMESTAMPTZ | Default `now()` |

---

### popups
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| workspace_id | UUID FK → workspaces | CASCADE delete |
| name | VARCHAR(255) | |
| status | VARCHAR(20) | `draft`, `active` — default `draft` |
| config | JSONB | Full popup config shape — default `'{}'` |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

### workspace_members
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| workspace_id | UUID FK → workspaces | CASCADE delete |
| user_id | UUID FK → users | Nullable — NULL for pending invites |
| email | TEXT | |
| role | TEXT | `owner`, `member`, `client`, `revoked` — default `member` |
| status | TEXT | `pending`, `active` — default `active` |
| invited_at | TIMESTAMPTZ | Default `now()` |
| joined_at | TIMESTAMPTZ | Nullable |

---

### client_invites
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| workspace_id | UUID FK → workspaces | Agency workspace — CASCADE delete |
| client_workspace_id | UUID FK → workspaces | Client workspace — SET NULL on delete |
| client_email | TEXT | |
| token | TEXT UNIQUE | Accept link token |
| status | TEXT | `pending`, `active`, `revoked` — default `pending` |
| created_at | TIMESTAMPTZ | |
| accepted_at | TIMESTAMPTZ | Nullable |

---

### page_visits
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| project_id | UUID FK → projects | CASCADE delete |
| session_id | VARCHAR | UUID from visitor sessionStorage |
| timestamp | TIMESTAMPTZ | Default `now()` |
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
| is_new_visitor | BOOLEAN | Default `false` |
| time_on_page | INTEGER | Seconds — updated at unload |
| scroll_depth | INTEGER | % — updated at unload |

---

### rule_events
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| rule_id | UUID FK → rules | CASCADE delete |
| project_id | UUID FK → projects | CASCADE delete |
| session_id | VARCHAR | |
| timestamp | TIMESTAMPTZ | Default `now()` |
| country | VARCHAR | |
| device | VARCHAR | |
| time_on_page_at_fire | INTEGER | |
| scroll_depth_at_fire | INTEGER | |

Indexes: `project_id`, `rule_id`, `timestamp`

---

### countdowns
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| workspace_id | UUID FK → workspaces | CASCADE delete |
| name | VARCHAR(255) | |
| ends_at | TIMESTAMPTZ | Fixed-date mode only; NULL for duration mode |
| expiry_action | VARCHAR(50) | `hide`, `redirect`, `message` — default `hide` |
| expiry_value | TEXT | URL or message text — default `''` |
| config | JSONB | Full style + display config — default `'{}'` |
| status | VARCHAR(50) | `draft`, `active` — default `draft` |
| created_at | TIMESTAMPTZ | Default `now()` |

---

### assets
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| workspace_id | UUID FK → workspaces | Nullable — CASCADE delete; NULL for non-workspace uploads |
| user_id | UUID FK → users | NOT NULL — CASCADE delete |
| url | TEXT | R2 public URL |
| filename | TEXT | Original filename |
| size | INTEGER | File size in bytes |
| mime_type | VARCHAR(100) | e.g. `image/jpeg`, `image/png` |
| created_at | TIMESTAMPTZ | Default `now()` |

Indexes: `workspace_id`, `user_id`

---

## VPS Table Status

| Table | Local | VPS |
|-------|-------|-----|
| users | ✅ | ✅ |
| workspaces | ✅ | ✅ |
| sessions | ✅ | ✅ |
| verification_tokens | ✅ | ✅ |
| password_reset_tokens | ✅ | ✅ |
| entitlements | ✅ | ✅ |
| pricing_tiers | ✅ | ✅ |
| projects | ✅ | ✅ |
| rules | ✅ | ✅ |
| popups | ✅ | ✅ |
| workspace_members | ✅ | ✅ |
| client_invites | ✅ | ✅ |
| page_visits | ✅ | ✅ |
| rule_events | ✅ | ✅ |
| countdowns | ✅ | ✅ (owned by `postgres`, not `chov`) |
| assets | ✅ | ⚠️ Run migration on VPS |
