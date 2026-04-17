-- ──────────────────────────────────────────────────────────────────────────────
-- FULL PAGEPERSONA SCHEMA
-- Run this on a fresh chov database to get all tables.
-- idempotent: uses IF NOT EXISTS everywhere.
-- ──────────────────────────────────────────────────────────────────────────────

-- 01 USERS
CREATE TABLE IF NOT EXISTS users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               VARCHAR(255) UNIQUE NOT NULL,
    name                VARCHAR(255),
    password_hash       TEXT,
    avatar_url          TEXT,
    google_id           VARCHAR(255) UNIQUE,
    email_verified      BOOLEAN DEFAULT FALSE,
    language            VARCHAR(10) DEFAULT 'en',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 02 WORKSPACES
CREATE TABLE IF NOT EXISTS workspaces (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id                    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                        VARCHAR(255) NOT NULL,
    slug                        VARCHAR(255) UNIQUE NOT NULL,
    type                        TEXT NOT NULL DEFAULT 'personal',
    parent_workspace_id         UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    client_name                 TEXT,
    client_email                TEXT,
    client_access_level         TEXT NOT NULL DEFAULT 'full',
    white_label_brand_name      TEXT,
    white_label_logo            TEXT,
    white_label_icon            TEXT,
    white_label_primary_color   TEXT DEFAULT '#1A56DB',
    hide_powered_by             BOOLEAN NOT NULL DEFAULT FALSE,
    custom_domain               TEXT UNIQUE,
    custom_domain_verified      BOOLEAN DEFAULT FALSE,
    brand_name                  TEXT,
    logo_url                    TEXT,
    brand_color                 TEXT,
    onboarding_completed        BOOLEAN DEFAULT FALSE,
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- 03 WORKSPACE MEMBERS
CREATE TABLE IF NOT EXISTS workspace_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    email           TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'member',
    status          TEXT NOT NULL DEFAULT 'active',
    invite_token    TEXT UNIQUE,
    invited_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    joined_at       TIMESTAMPTZ
);

-- 04 CLIENT INVITES
CREATE TABLE IF NOT EXISTS client_invites (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id            UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email                   TEXT NOT NULL,
    token                   TEXT UNIQUE NOT NULL,
    status                  TEXT NOT NULL DEFAULT 'pending',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at             TIMESTAMPTZ,
    client_email            TEXT,
    client_workspace_id     UUID REFERENCES workspaces(id) ON DELETE SET NULL
);

-- 05 ENTITLEMENTS
CREATE TABLE IF NOT EXISTS entitlements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    product_id      VARCHAR(100) NOT NULL,
    plan            VARCHAR(100) NOT NULL,
    source          VARCHAR(50) NOT NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'active',
    affiliate_id    VARCHAR(255),
    purchased_at    TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, product_id)
);

-- 06 SESSIONS
CREATE TABLE IF NOT EXISTS sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT UNIQUE NOT NULL,
    device_info TEXT,
    ip_address  VARCHAR(45),
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 07 VERIFICATION TOKENS
CREATE TABLE IF NOT EXISTS verification_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT UNIQUE NOT NULL,
    type        VARCHAR(50) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 08 PASSWORD RESET TOKENS
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT UNIQUE NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 09 PRICING TIERS
CREATE TABLE IF NOT EXISTS pricing_tiers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      VARCHAR(100) NOT NULL,
    plan            VARCHAR(100) NOT NULL,
    country_code    VARCHAR(10) NOT NULL DEFAULT 'DEFAULT',
    currency        VARCHAR(10) NOT NULL DEFAULT 'USD',
    amount          NUMERIC(10,2) NOT NULL,
    billing_cycle   VARCHAR(50) NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, plan, country_code)
);

-- 10 PROJECTS
CREATE TABLE IF NOT EXISTS projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    page_url        TEXT NOT NULL,
    platform        VARCHAR(100) NOT NULL DEFAULT 'html',
    script_id       VARCHAR(50) UNIQUE NOT NULL,
    script_verified BOOLEAN DEFAULT FALSE,
    status          VARCHAR(50) NOT NULL DEFAULT 'draft',
    thumbnail_url   TEXT,
    description     TEXT,
    page_scan       JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 11 RULES
CREATE TABLE IF NOT EXISTS rules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name                VARCHAR(255) NOT NULL,
    conditions          JSONB NOT NULL DEFAULT '[]',
    condition_operator  VARCHAR(10) NOT NULL DEFAULT 'AND',
    actions             JSONB NOT NULL DEFAULT '[]',
    priority            INTEGER NOT NULL DEFAULT 0,
    is_active           BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 12 POPUPS
CREATE TABLE IF NOT EXISTS popups (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
    config          JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13 COUNTDOWNS
CREATE TABLE IF NOT EXISTS countdowns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    ends_at         TIMESTAMPTZ,
    expiry_action   VARCHAR(50) NOT NULL DEFAULT 'hide',
    expiry_value    TEXT NOT NULL DEFAULT '',
    config          JSONB NOT NULL DEFAULT '{}',
    status          VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 14 PAGE VISITS
CREATE TABLE IF NOT EXISTS page_visits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    session_id      VARCHAR NOT NULL,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    country         VARCHAR,
    country_code    VARCHAR,
    continent       VARCHAR,
    device          VARCHAR,
    os              VARCHAR,
    browser         VARCHAR,
    referrer        VARCHAR,
    utm_source      VARCHAR,
    utm_medium      VARCHAR,
    utm_campaign    VARCHAR,
    utm_content     VARCHAR,
    utm_term        VARCHAR,
    is_new_visitor  BOOLEAN NOT NULL DEFAULT FALSE,
    time_on_page    INTEGER,
    scroll_depth    INTEGER
);

-- 15 RULE EVENTS
CREATE TABLE IF NOT EXISTS rule_events (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id                 UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
    project_id              UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    session_id              VARCHAR NOT NULL,
    timestamp               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    country                 VARCHAR,
    device                  VARCHAR,
    time_on_page_at_fire    INTEGER,
    scroll_depth_at_fire    INTEGER
);

-- 16 ASSETS
CREATE TABLE IF NOT EXISTS assets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url             TEXT NOT NULL,
    filename        TEXT,
    size            INTEGER,
    mime_type       VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 17 WORKSPACE AI SETTINGS
CREATE TABLE IF NOT EXISTS workspace_ai_settings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    website_url         TEXT,
    brand_name          TEXT,
    industry            TEXT,
    tone_of_voice       TEXT,
    target_audience     TEXT,
    key_benefits        TEXT,
    about_brand         TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id)
);

-- 18 AI COINS
CREATE TABLE IF NOT EXISTS ai_coins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    balance         INTEGER NOT NULL DEFAULT 100,
    lifetime_earned INTEGER NOT NULL DEFAULT 100,
    last_reset_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id)
);

-- 19 AI COIN TRANSACTIONS
CREATE TABLE IF NOT EXISTS ai_coin_transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    action_type         VARCHAR(50) NOT NULL,
    coins_deducted      INTEGER NOT NULL,
    claude_tokens_used  INTEGER,
    fal_image_generated BOOLEAN DEFAULT FALSE,
    metadata            JSONB,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_entitlements_workspace ON entitlements(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_script_id ON projects(script_id);
CREATE INDEX IF NOT EXISTS idx_rules_project ON rules(project_id);
CREATE INDEX IF NOT EXISTS idx_rules_priority ON rules(project_id, priority);
CREATE INDEX IF NOT EXISTS idx_page_visits_project ON page_visits(project_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_session ON page_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_rule_events_project ON rule_events(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_workspace ON assets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_coins_workspace ON ai_coins(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_transactions_workspace ON ai_coin_transactions(workspace_id);
