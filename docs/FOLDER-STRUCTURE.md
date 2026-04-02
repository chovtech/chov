# Folder & File Structure

```
~/chov/
  apps/pagepersona/
    backend/
      app/
        core/           — config.py, security.py
        routers/        — auth.py, users.py, projects.py, rules.py, sdk.py,
                          upload.py, webhooks.py, google_auth.py, popups.py, countdowns.py,
                          analytics.py, sdk_analytics.py, workspaces.py, team.py, clients.py
        schemas/        — projects.py, users.py, rules.py
        services/       — auth_service.py, project_service.py,
                          popup_service.py, countdown_service.py, email_service.py,
                          mautic_service.py, rules_service.py
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
        accept/page.tsx                       — client invite accept page (unauthenticated, white-label)
        join/[slug]/page.tsx                  — client self-signup page
        dashboard/
          page.tsx                          — home dashboard (project cards + thumbnails)
          settings/page.tsx                 — profile, password, avatar, workspace, white-label tabs
          agency/
            page.tsx                        — Clients page (list, invite, manage)
            ManageAccessModal.tsx           — manage client access level, resend/revoke invite
          analytics/page.tsx               — Analytics dashboard
          billing/page.tsx                 — Billing page
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
        layouts/        — Topbar.tsx, Sidebar.tsx, Footer.tsx
        ui/             — Icon.tsx, SignalLibraryModal.tsx, ImageUploader.tsx,
                          NewProjectModal.tsx, LanguageSwitcher.tsx,
                          CitySearchInput.tsx (built, dormant — geo_city removed)
      lib/
        api/client.ts   — authApi, authApiExtended, userApi, projectApi, workspaceApi,
                          teamApi, clientsApi, rulesApi
        context/        — WorkspaceContext.tsx
        hooks/          — useTranslation.ts, useLanguage.ts
        data/           — world-cities.ts (dormant — geo_city removed)
      locales/
        en/common.json  — English strings
        fr/common.json  — French strings
  docs/                 — All reference docs (this file, FUNNEL-ANALYSIS, etc.)
  packages/             — Chov Libraries (built AFTER first sales)
  DONE.md               — Completed work log
  CLAUDE.md             — Session reference (this file's parent)
```
