# TESTING.md — PagePersona Manual Test & Test Coverage Tracker
> Module-by-module. Test manually first, write automated test for each bug found.
> Last updated: 2026-04-07

---

## HOW TO USE THIS FILE
- **Manual test:** Go through each checklist item on `app.usepagepersona.com`
- **Status:** `[ ]` = not tested, `[x]` = passed, `[!]` = bug found, `[n/a]` = not applicable
- **Bug found:** Note it inline → fix it → write a test → mark `[x]`
- **Automated test:** Check the box once a pytest test covers it

---

## MODULE 1 — AUTHENTICATION

### Manual Checklist

#### Signup
- [x] New user can sign up with email + password
- [x] Verification email arrives in inbox
- [x] Duplicate email shows correct error message
- [x] Short password (< 8 chars) is rejected
- [x] After signup, user lands on dashboard (unverified state)
- [x] Unverified banner/prompt is visible

#### Email Verification
- [x] Clicking verification link in email verifies account
- [x] Verified state removes the unverified banner
- [x] Expired/invalid token shows correct error
- [x] Resend verification email works

#### Login
- [x] Correct email + password logs in
- [x] Wrong password shows correct error
- [x] Unknown email shows correct error
- [x] User lands on dashboard after login
- [x] JWT token is set (check localStorage or cookie)

#### Forgot Password
- [x] Entering email sends reset link to inbox
- [x] Reset link opens reset password page
- [x] New password (≥ 8 chars) saves successfully
- [x] Old password no longer works after reset
- [x] Expired/invalid reset token shows correct error

#### Magic Link
> Magic link UI not built yet — test when JVZoo billing is wired up
- [ ] Requesting magic link sends email
- [ ] Clicking magic link logs user in
- [ ] Magic link is single-use (second click fails gracefully)

#### Google OAuth
- [x] "Sign in with Google" redirects to Google
- [x] Completing Google auth creates account + logs in
- [x] Returning Google user logs in (no duplicate account)

#### Logout
- [x] Logout clears session and redirects to login
- [x] Accessing `/dashboard` after logout redirects to login

#### Session / Token
- [x] Closing and reopening browser keeps user logged in
- [x] Silent refresh — access token renews without kicking user out

### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|
| 1 | Duplicate JWT token on rapid signup+login (jti fix) | ✅ | ✅ |
| 2 | Session expiring every 30 min — no refresh token flow implemented | ✅ | — |

### Automated Tests — `tests/test_auth.py`
- [x] `test_signup_returns_tokens`
- [x] `test_signup_duplicate_email_fails`
- [x] `test_login_with_correct_credentials`
- [x] `test_login_wrong_password_fails`
- [x] `test_login_unknown_email_fails`

---

## MODULE 2 — USER PROFILE

### Manual Checklist
- [x] Update name saves correctly and reflects instantly in sidebar + topbar
- [x] Email update is disabled (email field is read-only)
- [x] Avatar upload works — reflects instantly in sidebar + topbar
- [x] Change password — correct current password required
- [x] Change password — wrong current password rejected
- [x] Language switch (EN ↔ FR) applies across the app

### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|
| 1 | Name/avatar change not reflected in sidebar + topbar until refresh | ✅ | — |
| 2 | Password fields had no show/hide toggle | ✅ | — |

### Automated Tests — `tests/test_users.py`
- [x] `test_update_profile_name`
- [x] `test_update_profile_email_duplicate_rejected`
- [x] `test_change_password_success`
- [x] `test_change_password_wrong_current`

---

## MODULE 3 — WORKSPACES

### Manual Checklist
- [x] Default workspace created on signup
- [n/a] Create a second workspace — Add Workspace removed intentionally
- [x] Switch between workspaces in sidebar
- [x] Rename workspace saves correctly
- [n/a] Delete workspace — intentionally omitted (primary workspace is permanent)
- [ ] Workspace stats visible (project count, sessions, last activity) — revisit after Module 4

### Design Decision
- One workspace per account. Agencies get client sub-workspaces via the Agency page.
- "Add Workspace" button removed from sidebar switcher.
- Workspace deletion not built — primary workspace is permanent.

### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|

### Automated Tests — `tests/test_workspaces.py`
- [X] `test_default_workspace_created_on_signup`
- [X] `test_list_workspaces`
- [X] `test_rename_workspace`

---

## MODULE 4 — PROJECTS

### Manual Checklist

#### Create
- [x] 3-step wizard opens correctly (name+URL → platform → install)
- [x] Project created with unique `PP-XXXXXX` script ID
- [x] Script install instructions shown correctly
- [x] "Send to developer" email sends with correct script tag

#### Manage
- [x] Project list shows all projects for workspace
- [x] Edit project name works
- [x] Edit project URL works (only if script not yet verified)
- [x] URL field locked after script verified
- [x] Status toggle: Draft ↔ Active works
- [x] Thumbnail upload works
- [x] Delete project (with confirmation) works

#### Script Verification
- [ ] Script verify detects installed script on page
- [ ] Uninstalled script shows correct "not found" state

#### URL Guard (SDK)
- [ ] pp.js only fires on the exact registered page URL
- [ ] pp.js silently exits on any other page (blog, about, etc.) with same script installed
- [ ] WordPress plugin downloads as ZIP with correct script ID pre-filled
- [ ] WordPress plugin settings page shows page URL → Script ID mapping table
- [ ] White-labeled plugin uses agency brand name when workspace has brand set

### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|

### Automated Tests — `tests/test_projects.py`
- [ ] `test_create_project`
- [ ] `test_list_projects`
- [ ] `test_edit_project`
- [ ] `test_delete_project`
- [ ] `test_toggle_project_status`

---

## MODULE 5 — RULES ENGINE

### Manual Checklist

#### Create Rule
- [ ] Rule creation modal opens
- [ ] Can add multiple conditions (AND / OR)
- [ ] All 15 condition types work in the dropdown
- [ ] All operators work per condition type
- [ ] Can add an action to the rule
- [ ] All 7 action types available

#### Actions
- [ ] `swap_text` — element picker works, text saves
- [ ] `swap_image` — image upload + picker works
- [ ] `swap_url` — URL input saves
- [ ] `hide_section` — picker works
- [ ] `show_element` — picker works
- [ ] `show_popup` — popup selector shows saved popups
- [ ] `insert_countdown` — countdown selector shows saved countdowns

#### Manage Rules
- [ ] Rule list shows sorted by priority
- [ ] Edit rule saves changes correctly
- [ ] Active/inactive toggle works
- [ ] Delete rule works

### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|

### Automated Tests — `tests/test_rules.py`
- [ ] `test_create_rule`
- [ ] `test_list_rules`
- [ ] `test_edit_rule`
- [ ] `test_delete_rule`
- [ ] `test_toggle_rule_active`

---

## MODULE 6 — POPUPS

### Manual Checklist
- [ ] Create popup — all 10 layout templates selectable
- [ ] All block types work: text, image, button, embed, no_thanks, columns
- [ ] All 12 position options work
- [ ] Background colour picker works
- [ ] Background image upload works
- [ ] Border radius, padding, width inputs save
- [ ] Overlay toggle works
- [ ] Close button toggle works
- [ ] Display delay + frequency inputs save
- [ ] Animation selector works (fade, slide, zoom)
- [ ] `{country}` token renders correctly in preview
- [ ] Edit popup saves changes
- [ ] Delete popup works

### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|

### Automated Tests — `tests/test_popups.py`
- [ ] `test_create_popup`
- [ ] `test_list_popups`
- [ ] `test_edit_popup`
- [ ] `test_delete_popup`

---

## MODULE 7 — COUNTDOWN TIMERS

### Manual Checklist
- [ ] Create fixed-date countdown (with `ends_at` timestamp)
- [ ] Create duration countdown (per-session)
- [ ] Expiry action: `hide` saves correctly
- [ ] Expiry action: `redirect` saves correctly
- [ ] Expiry action: `message` saves correctly
- [ ] Edit countdown saves changes
- [ ] Delete countdown works

### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|

### Automated Tests — `tests/test_countdowns.py`
- [ ] `test_create_countdown_fixed`
- [ ] `test_create_countdown_duration`
- [ ] `test_edit_countdown`
- [ ] `test_delete_countdown`

---

## MODULE 8 — SDK END-TO-END (pp.js on a real page)
> This is where modules 4–7 come together. Test after projects, rules, popups and countdowns are set up.
> Install the script on a real test page and verify everything fires correctly.

### Manual Checklist

#### Script & Visits
- [ ] Script installed on test page — page loads without errors
- [ ] Visit beacon fires — visit recorded in DB (country, device, OS, browser, referrer, UTM)
- [ ] Returning visitor correctly identified on second visit
- [ ] Unload beacon updates `time_on_page` + `scroll_depth`

#### Rules Firing
- [ ] Rule with `visit_count` condition fires on correct visit number
- [ ] Rule with `time_on_page` condition fires after correct delay
- [ ] Rule with `scroll_depth` condition fires at correct scroll %
- [ ] Rule with `exit_intent` condition fires on cursor leave
- [ ] AND condition — all conditions must be true for rule to fire
- [ ] OR condition — any one condition triggers rule

#### Actions on Page
- [ ] `swap_text` — text swaps correctly on page
- [ ] `swap_image` — image swaps correctly on page
- [ ] `swap_url` — link href updated correctly
- [ ] `hide_section` — element hidden correctly
- [ ] `show_element` — element shown correctly
- [ ] `show_popup` — popup renders correctly on page
- [ ] `insert_countdown` — countdown timer renders and counts down

#### Cache & Sync
- [ ] SDK ping detects rule change within 30s — updated rule fires without page reload
- [ ] `pp.js` loads via agency custom domain (white-labeled URL)
- [ ] Rule-fired event recorded in `rule_events` table

### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|

### Automated Tests — `tests/test_sdk.py`
- [ ] `test_sdk_ping`
- [ ] `test_sdk_rules_by_script_id`
- [ ] `test_sdk_visit_recorded`
- [ ] `test_sdk_event_recorded`

---

## MODULE 9 — ANALYTICS
> Requires SDK data flowing (complete Module 8 first).

### Manual Checklist
- [ ] Project analytics loads (visits, unique visitors, rules fired)
- [ ] Period selector (7/14/30/90/180/365 days) works
- [ ] Daily chart renders correctly
- [ ] Top countries table shows data
- [ ] Traffic sources shows data
- [ ] Device split shows data
- [ ] Visitor split (new vs returning) shows data
- [ ] Rules performance table shows data
- [ ] Recent visits list shows data
- [ ] Workspace analytics loads (aggregated across all projects)
- [ ] Overview stats on dashboard load

### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|

### Automated Tests — `tests/test_analytics.py`
- [ ] `test_project_analytics_returns_data`
- [ ] `test_workspace_analytics_returns_data`

---

## MODULE 10 — AGENCY / CLIENT
> Test both sides thoroughly. Do not assume that because something works as an agency it works as a client.
> Use two separate browsers (or one incognito) — one logged in as agency, one as client.

### PART A — Agency Setup (White-label)
- [ ] White-label tab: set brand name, logo, primary colour
- [ ] Live preview updates correctly
- [ ] Custom domain: enter domain, verify DNS, shows verified state
- [ ] CNAME instructions show correct target (`cname.usepagepersona.com`)
- [ ] Root/ALIAS record instructions show correctly
- [ ] SSL auto-provisions after domain verify (custom domain loads via HTTPS)
- [ ] Agency slug link works (`app.usepagepersona.com/join/[slug]`)
- [ ] SDK script tag uses agency custom domain URL (if domain verified)

### PART B — Agency Creates Projects & Rules (as Agency)
- [ ] Create a project inside agency workspace
- [ ] Install script on a test page
- [ ] Create rules with conditions and actions
- [ ] Create a popup and attach to a rule
- [ ] Create a countdown and attach to a rule
- [ ] Rules fire correctly on the test page
- [ ] Analytics records visits and rule events for agency project

### PART C — Agency Invites Client
- [ ] Invite new client by email — invite email arrives
- [ ] Invite existing PagePersona user — correct email variant sent
- [ ] Client appears in client list after invite
- [ ] Set client access to `full` — verify correct permissions
- [ ] Set client access to `view_only` — verify correct permissions
- [ ] Revoke client access — client can no longer log in to agency workspace
- [ ] Restore client access — client regains access

### PART D — Client Self-Signup
- [ ] Client visits `/join/[slug]` — agency branding shows (logo, colour, favicon, title)
- [ ] Client signs up via self-signup form
- [ ] Client lands in their own workspace with agency branding applied
- [ ] Client login page shows agency branding on custom domain

### PART E — Client Experience (Full Access)
> Log in as invited client with `full` access
- [ ] Client sees agency branding in dashboard (logo, colour, brand name)
- [ ] Client sees all nav items except the Agency tab
- [ ] Client can create a project in their workspace
- [ ] Client can install script on their page
- [ ] Client can create rules
- [ ] Client can create popups
- [ ] Client can create countdowns
- [ ] Client rules fire correctly on their test page
- [ ] Client analytics shows their own data
- [ ] Client cannot access agency's projects or data

### PART F — Client Experience (View Only Access)
> Log in as invited client with `view_only` access
- [ ] Client sees only dashboard + analytics in nav
- [ ] Projects, Rules, Popups, Countdown pages are inaccessible
- [ ] Client cannot create or edit anything
- [ ] Analytics is visible and shows their data

### PART G — Branding Persistence
- [ ] Agency branding persists on auth pages after browser restart
- [ ] Page title is dynamic from agency brand name
- [ ] Favicon reflects agency icon on all auth pages

### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|

### Automated Tests — `tests/test_agency.py`
- [ ] `test_invite_client`
- [ ] `test_client_self_signup`
- [ ] `test_revoke_client_access`
- [ ] `test_restore_client_access`
- [ ] `test_join_info_returns_branding`
- [ ] `test_client_cannot_access_agency_data`

---

## MODULE 11 — TEAM MANAGEMENT

### Manual Checklist
- [ ] Invite team member by email + role
- [ ] Team member receives invite email
- [ ] Team member appears in team list
- [ ] Change team member role works
- [ ] Remove team member works

### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|

### Automated Tests — `tests/test_team.py`
- [ ] `test_invite_team_member`
- [ ] `test_update_member_role`
- [ ] `test_remove_team_member`

---

## PROGRESS SUMMARY

| Module | Manual done | Bugs found | Tests written |
|--------|-------------|------------|---------------|
| 1. Auth | 19 / 22 (magic link pending JVZoo) | 2 (fixed) | 5 / 5 ✅ |
| 2. User Profile | 6 / 6 ✅ | 2 (fixed) | 4 / 4 ✅ |
| 3. Workspaces | 4 / 4 ✅ | 0 | 0 / 3 |
| 4. Projects | 0 / 11 | 0 | 0 / 5 |
| 5. Rules Engine | 0 / 14 | 0 | 0 / 5 |
| 6. Popups | 0 / 13 | 0 | 0 / 4 |
| 7. Countdowns | 0 / 7 | 0 | 0 / 4 |
| 8. SDK E2E | 0 / 20 | 0 | 0 / 4 |
| 9. Analytics | 0 / 11 | 0 | 0 / 2 |
| 10. Agency / Client | 0 / 37 | 0 | 0 / 6 |
| 11. Team | 0 / 5 | 0 | 0 / 3 |
