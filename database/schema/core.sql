-- ─────────────────────────────────────────────
-- CHOV CORE SCHEMA
-- The foundation of every Chov product.
-- Never name tables after a specific product.
-- ─────────────────────────────────────────────

-- 01 USERS
-- One record per person. Forever.
-- A JVZoo buyer, a direct signup, an invited team
-- member -- all end up as one row in this table.
CREATE TABLE IF NOT EXISTS users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               VARCHAR(255) UNIQUE NOT NULL,
    name                VARCHAR(255),
    avatar_url          TEXT,
    google_id           VARCHAR(255) UNIQUE,
    email_verified      BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 02 WORKSPACES
-- The account. Owns products and members.
-- Every user gets one workspace on signup.
-- Agency users can have multiple workspaces.
CREATE TABLE IF NOT EXISTS workspaces (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL,
    slug                VARCHAR(255) UNIQUE NOT NULL,
    owner_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 03 ENTITLEMENTS
-- Controls which products a workspace has access to.
-- One row per product owned.
-- This table powers the entire chov.ai suite.
CREATE TABLE IF NOT EXISTS entitlements (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    product_id          VARCHAR(100) NOT NULL,
    plan                VARCHAR(100) NOT NULL,
    source              VARCHAR(50) NOT NULL,
    status              VARCHAR(50) NOT NULL DEFAULT 'active',
    affiliate_id        VARCHAR(255),
    purchased_at        TIMESTAMPTZ DEFAULT NOW(),
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, product_id)
);

-- 04 SESSIONS
-- Active login sessions.
-- One row per logged-in device.
CREATE TABLE IF NOT EXISTS sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token               TEXT UNIQUE NOT NULL,
    device_info         TEXT,
    ip_address          VARCHAR(45),
    expires_at          TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 05 VERIFICATION TOKENS
-- Email verification and magic link tokens.
CREATE TABLE IF NOT EXISTS verification_tokens (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token               TEXT UNIQUE NOT NULL,
    type                VARCHAR(50) NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    used_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 06 PASSWORD RESET TOKENS
-- One-time tokens for password reset flow.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token               TEXT UNIQUE NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    used_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- INDEXES
-- Speed up the most common lookups.
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email
    ON users(email);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner
    ON workspaces(owner_id);

CREATE INDEX IF NOT EXISTS idx_workspaces_slug
    ON workspaces(slug);

CREATE INDEX IF NOT EXISTS idx_entitlements_workspace
    ON entitlements(workspace_id);

CREATE INDEX IF NOT EXISTS idx_entitlements_product
    ON entitlements(product_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user
    ON sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_token
    ON sessions(token);

CREATE INDEX IF NOT EXISTS idx_verification_tokens_token
    ON verification_tokens(token);

CREATE INDEX IF NOT EXISTS idx_password_reset_token
    ON password_reset_tokens(token);

-- 07 PRICING TIERS
-- True local currency pricing per country.
-- DEFAULT country_code is the fallback for
-- any country not specifically priced.
CREATE TABLE IF NOT EXISTS pricing_tiers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      VARCHAR(100) NOT NULL,
    plan            VARCHAR(100) NOT NULL,
    country_code    VARCHAR(10) NOT NULL DEFAULT 'DEFAULT',
    currency        VARCHAR(10) NOT NULL DEFAULT 'USD',
    amount          DECIMAL(10,2) NOT NULL,
    billing_cycle   VARCHAR(50) NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, plan, country_code)
);

CREATE INDEX IF NOT EXISTS idx_pricing_product
    ON pricing_tiers(product_id);

CREATE INDEX IF NOT EXISTS idx_pricing_country
    ON pricing_tiers(country_code);
