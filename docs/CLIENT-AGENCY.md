# Client / Agency Feature

## Data Model

### Workspaces
- **Agency workspace:** `type='personal'` or `type='agency'`, `parent_workspace_id=NULL`
- **Client workspace:** `type='client'`, `parent_workspace_id=<agency_ws_id>`, `owner_id=<agency_owner_id>`
- Client's email stored in `workspaces.client_email`
- Client access level stored in `workspaces.client_access_level` (`full` or `view_only`, default `full`)

### workspace_members
- Every client user gets a row with `role='client'`, `status='active'`
- This row links the user to their client workspace
- `role='revoked'` when access is revoked

### client_invites
- One row per invite: `workspace_id` (agency), `email` (NOT NULL — invited email), `client_workspace_id`, `token`, `status`
- `status`: `pending` → `active` on accept
- `client_email` column exists but is legacy/unused — always read/write `email`

---

## Flows

### Invite Flow (agency sends invite)
1. Agency owner calls `POST /api/clients/invite` with `client_email` + `workspace_id`
2. Backend creates client workspace (`type='client'`, `parent_workspace_id=agency_ws_id`) if not existing
3. Inserts `client_invites` row (`status='pending'`)
4. Sends SES email — two variants:
   - New user (no account): `send_client_invite_email` — includes setup form
   - Existing user: `send_client_invite_existing_user_email` — one-click accept
5. Email `From` name and all branding use the agency's white-label settings
6. Accept URL uses agency custom domain if set and verified, else `app.usepagepersona.com`

### Accept Flow (client accepts invite)
1. Client lands on `/accept?token=...`
2. Frontend calls `GET /api/clients/invite-info?token=...` — returns branding + `user_exists` flag
3. If new user: shows name + password form. If existing user: shows one-click accept button
4. Client submits → `POST /api/clients/accept` → creates user account if new → inserts `workspace_members` row → returns JWT
5. Client is redirected to dashboard with agency branding applied

### Self-Signup Flow (client signs up via agency link)
1. Agency shares their slug link: `/join/[slug]`
2. Frontend calls `GET /api/clients/join-info?slug=...` — returns agency branding
3. Client fills in name, email, password → `POST /api/clients/self-signup`
4. Backend creates user + client workspace + `workspace_members` row → returns JWT
5. Client goes straight to dashboard (no invite email needed)

### Revoke / Restore Flow
- Agency revokes: `DELETE /api/clients/{workspace_id}/revoke` → sets `workspace_members.role='revoked'` + sends access-revoked email
- Client sees `/access-revoked` page on next login
- Agency restores: `POST /api/clients/{workspace_id}/restore` → sets role back to `'client'` + sends access-restored email

### Access Level Update
- Agency changes level: `PATCH /api/workspaces/{workspace_id}` with `{ "client_access_level": "view_only" | "full" }`

---

## Access Levels
| Level | What client can do |
|-------|-------------------|
| `full` | View + create/edit projects, rules, popups, countdowns, analytics, settings |
| `view_only` | View dashboard and analytics only — cannot create or modify anything |

---

## API Endpoints

### `/api/clients` router
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/clients/invite-info?token=` | None | Returns branding + user_exists for invite token |
| GET | `/api/clients/resolve-domain?domain=` | None | Returns branding for custom domain |
| GET | `/api/clients/join-info?slug=` | None | Returns branding for self-signup page |
| POST | `/api/clients/self-signup` | None | Create account + client workspace via agency slug |
| POST | `/api/clients/invite` | Agency owner | Send invite, create client workspace |
| POST | `/api/clients/accept` | None | Accept invite, create account if needed |
| DELETE | `/api/clients/{workspace_id}/revoke` | Agency owner | Revoke client access |
| POST | `/api/clients/{workspace_id}/restore` | Agency owner | Restore revoked client access |
| GET | `/api/clients/access-status` | Client user | Check if own access is still active |
| POST | `/api/clients/report` | Agency owner | Send report email to client |

### `/api/workspaces` router (client-related)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/workspaces/{workspace_id}/clients` | Agency owner | List all client workspaces + invite status |
| PATCH | `/api/workspaces/{workspace_id}` | Agency owner | Update `client_access_level` (and other workspace fields) |

---

## Sidebar Behaviour by User Type
| User | Workspace switcher | Nav | Plan card |
|------|--------------------|-----|-----------|
| Agency owner (own workspace) | ✅ shown | Full nav | ✅ shown |
| Agency owner (viewing client workspace) | ✅ shown | Full nav minus Agency tab | ✅ shown |
| Client user | ❌ hidden — workspace badge shown instead | Full or view-only nav | ❌ hidden |

---

## Key Frontend Identifiers
```tsx
isClientUser        = activeWorkspace?.member_role === 'client'
isViewOnly          = isClientUser && activeWorkspace?.client_access_level === 'view_only'
isInClientWorkspace = !isClientUser && activeWorkspace?.parent_workspace_id !== null
```

---

## White-Label
Agency workspace columns (all nullable):
- `white_label_brand_name` — shown as app name on client-facing pages
- `white_label_logo` — R2 URL, shown in nav and emails
- `white_label_icon` — R2 URL, used as favicon on client-facing pages
- `white_label_primary_color` — hex colour, default `#1A56DB`
- `hide_powered_by` — boolean, hides "Powered by PagePersona" in emails
- `custom_domain` + `custom_domain_verified` — used in accept URLs and SDK script tag

> ⚠️ Legacy columns `brand_name`, `logo_url`, `brand_color` exist on the workspaces table but are always NULL for new workspaces. Always use the `white_label_*` columns.

Client workspaces **inherit** brand settings from their parent agency workspace (via JOIN in `list_workspaces` and all plugin/email endpoints).

White-label applies on:
- `/accept?token=...` — invite accept page
- `/join/[slug]` — self-signup page
- All client invite emails (From name, brand colour, logo)
- Access revoked / restored emails
- WordPress plugin download (brand name, CDN domain)
- Send-install-email to developer
- Team invite emails

---

## Status
- ✅ Invite flow (invite → email → accept → dashboard)
- ✅ Self-signup flow (join link → account → dashboard)
- ✅ Existing user invite (user_exists detection, one-click accept)
- ✅ Client access levels (full vs view_only)
- ✅ Sidebar behaviour (badge, correct nav, no plan card)
- ✅ Revoke and restore access
- ✅ White-label branding on all client-facing pages and emails
- ✅ Agency brand name/colour/logo in all outgoing emails (From name included)
- ✅ Custom domain used in accept URL and SDK script tag
- ✅ Client workspace inherits custom_domain from parent for SDK URL
- ✅ Full-access clients can create and manage projects in their workspace
- ✅ View-only clients blocked from create/edit (403)
- ✅ Clients cannot see agency workspace projects
- ✅ Script verification works for client users
- ✅ WordPress plugin uses agency brand name and domain
- ❌ Send Report feature (endpoint exists, UI commented out — build later)
