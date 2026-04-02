# Client / Agency Feature

## Data Model
- **Agency workspace:** `type='agency'` (or 'personal'), `parent_workspace_id=NULL`
- **Client workspace:** `type='client'`, `parent_workspace_id=<agency_ws_id>`, `owner_id=<agency_owner_id>`
- Client access tracked via `workspace_members` row with `role='client'`

## Invite Flow
1. Agency owner invites via `POST /api/clients/invite` → creates client workspace + `client_invites` row → sends SES email
2. Client accepts via `POST /api/clients/accept` (unauthenticated) → creates user account → inserts `workspace_members` row
3. Client logs in and sees workspace badge in sidebar (non-interactive), `clientFullNavigation` or `clientViewNavigation`

## Access Levels
| Level | What client can do |
|-------|-------------------|
| `full` | View dashboard, elements, analytics, settings |
| `view_only` | View dashboard and analytics only |

## Sidebar Behaviour by User Type
| User | Workspace switcher | Nav | Plan card |
|------|--------------------|-----|-----------|
| Agency owner (own ws) | ✅ shown | Full nav | ✅ shown |
| Agency owner (in client ws) | ✅ shown | Full nav minus Clients | ✅ shown |
| Client user | ❌ hidden — badge shown instead | clientFull or clientView nav | ❌ hidden |

## Key Identifiers
```tsx
isClientUser = activeWorkspace?.member_role === 'client'
isViewOnly = isClientUser && activeWorkspace?.client_access_level === 'view_only'
isInClientWorkspace = !isClientUser && activeWorkspace?.parent_workspace_id !== null
```

## White-Label
Each agency workspace can have `brand_name`, `logo_url`, `brand_color`, `custom_domain`. Used on:
- Invite accept page
- Login / forgot-password pages (via slug param)
- Report emails

## Status
- ✅ Invite flow (invite → email → accept → dashboard)
- ✅ Client access levels
- ✅ Sidebar behaviour
- ✅ White-label branding on auth pages
- ⚠️ Verify client can view projects + analytics correctly (not fully confirmed)
- ❌ Send Report feature (commented out — build later)
