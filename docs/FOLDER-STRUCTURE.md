# Folder & File Structure

```
~/chov/
  apps/pagepersona/
    backend/
      app/
        core/
          config.py         — Settings / env vars
          security.py       — JWT, password hashing, get_current_user
          access.py         — get_accessible_workspace, require_admin_or_owner (client-aware)
        routers/
          auth.py           — signup, login, verify-email, magic link, refresh, logout
          users.py          — profile, avatar upload
          google_auth.py    — Google OAuth callback
          workspaces.py     — list, create, update, list-clients, white-label settings
          projects.py       — CRUD, WordPress plugin download, send-install-email
          rules.py          — CRUD for personalisation rules
          popups.py         — CRUD for popup elements
          countdowns.py     — CRUD for countdown timer elements
          analytics.py      — page visits + rule events analytics endpoints
          sdk.py            — script serving, script verify
          sdk_analytics.py  — beacon endpoints (page visit, rule fire, time/scroll update)
          team.py           — team member invite, accept, resend, role update, remove
          clients.py        — client invite, accept, revoke, restore, self-signup, join-info
          upload.py         — R2 image upload / delete
          webhooks.py       — JVZoo webhook → entitlements
          assets.py         — asset library CRUD
        schemas/
          auth.py           — Auth request/response schemas
          projects.py       — ProjectCreate, ProjectResponse, ProjectUpdate
          rules.py          — RuleCreate, RuleResponse, RuleUpdate
        services/
          auth_service.py
          project_service.py
          popup_service.py
          countdown_service.py
          rules_service.py
          email_service.py  — SES send_email + all branded email helpers
          mautic_service.py — subscribe_contact (Mautic CRM)
        templates/
          emails/
            emails.py       — HTML email renderers (verification, welcome, reset, jvzoo)
        models/             — (reserved — not used yet)
        database.py         — asyncpg pool + get_db dependency
        main.py             — FastAPI app, CORS, router mounts
      tests/
        conftest.py                 — session-scoped event_loop + AsyncClient fixture
        test_auth.py
        test_users.py
        test_health.py
        test_workspaces.py
        test_projects.py
        test_rules.py
        test_popups.py
        test_countdowns.py
        test_sdk.py
        test_analytics.py
        test_assets.py
        test_team.py
      static/
        pp.js             — SDK (local: localhost:8000, CDN gets prod URL via deploy.sh sed swap)
        test.html         — Vektor AI test page (git skip-worktree on VPS — never overwritten)
      .env
      venv/
    frontend/
      app/
        (auth)/
          login/page.tsx
          signup/page.tsx
          forgot-password/page.tsx
          reset-password/page.tsx
          layout.tsx
        auth/
          google/callback/page.tsx  — Google OAuth callback
          magic/page.tsx            — Magic link login
        accept/page.tsx             — Client invite accept page (unauthenticated, white-label)
        join/[slug]/page.tsx        — Client self-signup page (unauthenticated, white-label)
        team-accept/page.tsx        — Team member invite accept page (unauthenticated)
        verify-email/page.tsx       — Email verification page
        access-revoked/page.tsx     — Shown when client's access has been revoked
        dashboard/
          layout.tsx
          page.tsx                  — Home dashboard (project cards + thumbnails)
          settings/page.tsx         — Profile, password, avatar, workspace, white-label tabs
          agency/
            page.tsx                — Clients page (list, invite, manage)
            NewClientModal.tsx      — Invite new client modal
            ManageAccessModal.tsx   — Manage client access level, resend/revoke invite
          analytics/page.tsx        — Analytics dashboard
          billing/page.tsx          — Billing page
          elements/
            page.tsx                — Elements page (Popups tab + Countdown Timers tab)
            popups/
              PopupBuilder.tsx      — Shared canvas popup builder (10 templates)
              new/page.tsx
              [id]/edit/page.tsx
            countdowns/
              CountdownBuilder.tsx  — Countdown builder (type, style, expiry settings)
              new/page.tsx
              [id]/edit/page.tsx
          projects/
            [id]/
              page.tsx              — Project dashboard
              picker/page.tsx       — On-page personalisation workspace
              rules/
                page.tsx            — Rules overview
                new/page.tsx        — New rule builder
                [rule_id]/edit/page.tsx — Edit rule
        layout.tsx
        page.tsx                    — Redirects to /login
      components/
        layouts/
          Topbar.tsx
          Sidebar.tsx
          Footer.tsx
        ui/
          Icon.tsx
          SignalLibraryModal.tsx
          ImageUploader.tsx
          AssetLibrary.tsx          — Asset library modal (R2 media browser)
          NewProjectModal.tsx
          LanguageSwitcher.tsx
          CitySearchInput.tsx       — Built, dormant — geo_city condition removed
      lib/
        api/
          client.ts                 — authApi, userApi, projectApi, workspaceApi,
                                      teamApi, clientsApi, rulesApi, analyticsApi
        context/
          WorkspaceContext.tsx      — Active workspace state + switcher
          WhiteLabelContext.tsx     — Agency white-label branding state
          AuthBrandingContext.tsx   — Branding on unauthenticated pages (accept, join)
        hooks/
          useAuth.ts
          useRole.ts                — Role/access level checks (owner, admin, member, client)
          useTranslation.ts
          useLanguage.ts
        data/
          world-cities.ts           — Dormant — geo_city condition removed
      locales/
        en/common.json              — English strings
        fr/common.json              — French strings
  docs/                             — All reference docs
  packages/                         — Chov Libraries (built AFTER first sales)
  DONE.md                           — Completed work log
  CLAUDE.md                         — Session reference
```
