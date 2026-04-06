# TESTING.md — PagePersona Manual Test & Test Coverage Tracker
> Module-by-module. Test manually first, write automated test for each bug found.
> Last updated: 2026-04-07

---

## HOW TO USE THIS FILE
- **Manual test:** Go through each checklist item on `app.usepagepersona.com`
- **Status:** `[ ]` = not tested, `[x]` = passed, `[!]` = bug found
- **Bug found:** Note it inline → fix it → write a test → mark `[x]`
- **Automated test:** Check the box in the "Test written" column once a pytest test covers it

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
### for magic link, we would test when we setup jvzoo as we did not implement magic link signp on the front end. we hope to use that when we finish billing and entitle ment and use it as sign up for jvzoo
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
- [x] Session expires correctly after inactivity (if applicable)

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
- [x] `test_email_verification_success`
- [x] `test_email_verification_invalid_token`
- [x] `test_forgot_password_sends_email`
- [x] `test_reset_password_success`
- [x] `test_magic_link_login`

-----------------------------

## MODULE 2 — USER PROFILE

### Manual Checklist
- [x] Update name saves correctly
- [x] Ensure email update is disabled (update email not allowed)
- [ ] Avatar upload works (image shows in sidebar/header)
- [ ] Change password — correct current password required
- [ ] Change password — wrong current password rejected
- [ ] Language switch (EN ↔ FR) applies across the app

### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|

### Automated Tests — `tests/test_users.py`
- [ ] `test_update_profile_name`
- [ ] `test_update_profile_email`
- [ ] `test_change_password_success`
- [ ] `test_change_password_wrong_current`

---

## MODULE 3 — WORKSPACES

### Manual Checklist
- [ ] Default workspace created on signup
- [ ] Create a second workspace
- [ ] Switch between workspaces in sidebar
- [ ] Rename workspace saves correctly
- [ ] Delete workspace (with confirmation)
- [ ] Workspace stats visible (project count, sessions, last activity)

### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|

### Automated Tests — `tests/test_workspaces.py`
- [ ] `test_create_workspace`
- [ ] `test_list_workspaces`
- [ ] `test_rename_workspace`
- [ ] `test_delete_workspace`

---

## MODULE 4 — PROJECTS

### Manual Checklist

#### Create
- [ ] 3-step wizard opens correctly (name+URL → platform → install)
- [ ] Project created with unique `PP-XXXXXX` script ID
- [ ] Script install instructions shown correctly
- [ ] "Send to developer" email sends with correct script tag

#### Manage
- [ ] Project list shows all projects for workspace
- [ ] Edit project name works
- [ ] Edit project URL works (only if script not yet verified)
- [ ] URL field locked after script verified
- [ ] Status toggle: Draft ↔ Active works
- [ ] Thumbnail upload works
- [ ] Delete project (with confirmation) works

#### Script Verification
- [ ] Script verify detects installed script on page
- [ ] Uninstalled script shows correct "not found" state

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
- [ ] Priority reorder works (if applicable)

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

## MODULE 8 — ANALYTICS

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
- [ ] Workspace analytics loads (aggregated)
- [ ] Overview stats on dashboard load

### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|

### Automated Tests — `tests/test_analytics.py`
- [ ] `test_project_analytics_returns_data`
- [ ] `test_workspace_analytics_returns_data`

---

## MODULE 9 — AGENCY / CLIENT

### Manual Checklist

#### Agency Side (White-label)
- [ ] White-label tab: set brand name, logo, primary colour
- [ ] Live preview updates correctly
- [ ] Custom domain field: enter domain, verify DNS, confirm verified
- [ ] CNAME record instructions show correct target (`cname.usepagepersona.com`)
- [ ] Root/ALIAS record instructions show correctly
- [ ] SSL auto-provisions after domain verify (site loads via HTTPS)
- [ ] Agency slug link works (`app.usepagepersona.com/join/[slug]`)

#### Agency — Invite Client
- [ ] Invite new client by email — invite email arrives
- [ ] Invite existing PagePersona user — correct email variant sent
- [ ] Client appears in client list after invite
- [ ] Revoke client access works
- [ ] Restore client access works
- [ ] Access level: `full` vs `view_only` applies correctly

#### Client Side (White-label experience)
- [ ] Self-signup via `/join/[slug]` shows agency branding
- [ ] Accept invite page shows agency branding
- [ ] Login page on custom domain shows agency branding (logo, colour, favicon, title)
- [ ] Login page branding persists after browser restart
- [ ] Client dashboard shows agency branding
- [ ] Client with `full` access sees all nav except Agency tab
- [ ] Client with `view_only` sees only dashboard + analytics
- [ ] SDK script tag uses agency custom domain URL (if domain verified)

### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|

### Automated Tests — `tests/test_agency.py`
- [ ] `test_invite_client`
- [ ] `test_client_self_signup`
- [ ] `test_revoke_client_access`
- [ ] `test_restore_client_access`
- [ ] `test_join_info_returns_branding`

---

## MODULE 10 — TEAM MANAGEMENT

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

## MODULE 11 — SDK (pp.js) END-TO-END

### Manual Checklist
- [ ] Script installed on test page — visits recorded in analytics
- [ ] Rule fires correctly based on condition (e.g. visit count)
- [ ] `swap_text` action executes on page
- [ ] `show_popup` action executes on page
- [ ] `insert_countdown` action executes on page
- [ ] Visit beacon records country, device, OS, browser, referrer, UTM
- [ ] Unload beacon updates time_on_page + scroll_depth
- [ ] Rule-fired event recorded in `rule_events`
- [ ] `pp.js` loads via agency custom domain (white-labeled URL)
- [ ] SDK ping/cache invalidation works (rule change reflects on page within 30s)

### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|

### Automated Tests — `tests/test_sdk.py`
- [ ] `test_sdk_ping`
- [ ] `test_sdk_rules_by_script_id`
- [ ] `test_sdk_visit_recorded`
- [ ] `test_sdk_event_recorded`

---

## PROGRESS SUMMARY

| Module | Manual done | Bugs found | Tests written |
|--------|-------------|------------|---------------|
| 1. Auth | 22 / 22 ✅ | 2 (fixed) | 5 / 10 |
| 2. User Profile | 0 / 6 | 0 | 0 / 4 |
| 3. Workspaces | 0 / 6 | 0 | 0 / 4 |
| 4. Projects | 0 / 11 | 0 | 0 / 5 |
| 5. Rules Engine | 0 / 14 | 0 | 0 / 5 |
| 6. Popups | 0 / 13 | 0 | 0 / 4 |
| 7. Countdowns | 0 / 7 | 0 | 0 / 3 |
| 8. Analytics | 0 / 11 | 0 | 0 / 2 |
| 9. Agency / Client | 0 / 18 | 0 | 0 / 5 |
| 10. Team | 0 / 5 | 0 | 0 / 3 |
| 11. SDK E2E | 0 / 10 | 0 | 0 / 4 |
