# TESTING.md — PagePersona Manual Test & Test Coverage Tracker
> Module-by-module. Test manually first, write automated test for each bug found.
> Last updated: 2026-04-13

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
- [x] Script verify detects installed script on page
- [x] Uninstalled script shows correct "not found" state

#### URL Guard (SDK)
- [x] pp.js only fires on the exact registered page URL
- [x] pp.js silently exits on any other page (blog, about, etc.) with same script installed
- [x] WordPress plugin downloads as ZIP with correct script ID pre-filled
- [x] WordPress plugin settings page shows page URL → Script ID mapping table


### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|

### Automated Tests — `tests/test_projects.py`
- [x] `test_create_project` — returns PP-XXXXXX script ID, draft status
- [x] `test_create_project_script_id_is_unique` — two projects never share a script ID
- [x] `test_list_projects` — all projects returned for workspace
- [x] `test_edit_project_name` — PUT updates name correctly
- [x] `test_edit_project_platform` — PUT updates platform correctly
- [x] `test_toggle_project_status` — draft ↔ active toggle works
- [x] `test_delete_project` — deleted project removed from list
- [x] `test_cannot_access_other_users_project` — returns 404 for wrong user

---

## MODULE 5 — RULES ENGINE

### Manual Checklist

#### Create Rule
- [x] Rule creation modal opens
- [x] Can add multiple conditions (AND / OR)
- [x] All 15 condition types work in the dropdown
- [x] All operators work per condition type
- [x] Can add an action to the rule
- [x] All 7 action types available

#### Signals Tested (each against all 7 actions)
- [x] `page_view` — fires on load
- [x] `visit_count` — fires on correct visit number
- [x] `time_on_page` — fires after correct number of seconds
- [x] `scroll_depth` — fires at correct scroll percentage
- [x] `exit_intent` — fires on cursor leaving viewport
- [x] `day_time` — fires based on visitor's local time (24h format)
- [x] `utm_source` — matches URL parameter
- [x] `utm_medium` — matches URL parameter
- [x] `utm_campaign` — matches URL parameter
- [x] `referrer_url` — matches referring page URL
- [x] `device_type` — desktop/mobile/tablet
- [x] `browser` — Chrome/Firefox/Safari etc.
- [x] `os` — Windows/Mac/iOS/Android etc.
- [x] `geo_country` — matches visitor country
- [x] `visitor_timezone` — matches timezone string

#### Actions
- [x] `swap_text` — element picker works, text swaps correctly on page
- [x] `swap_image` — image upload + picker works, image swaps on page
- [x] `swap_url` — URL input saves, link href updates on page
- [x] `hide_section` — picker works, element hidden correctly
- [x] `show_element` — picker works, element shown correctly
- [x] `show_popup` — popup selector works, popup renders on page
- [x] `insert_countdown` — countdown selector works, timer renders and counts down

#### Live Edit (no page reload required)
- [x] Edit a rule's trigger signal → fires with new trigger on next eval cycle
- [x] Edit a rule's action value → updated action fires without clearing cache
- [x] Edit then save → rule fires within ~30s via `pingHash` change detection
- [x] Popup config edited → new popup config shown without clearing sessionStorage

#### Manage Rules
- [x] Rule list shows sorted by priority
- [x] Edit rule saves changes correctly
- [x] Active/inactive toggle works
- [x] Delete rule works

### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|
| 1 | `time_on_page` rules never fired — one-shot evaluation at load when signal=0 | ✅ | — |
| 2 | `scroll_depth` always 0 at load — only updated on scroll events, not initialised | ✅ | — |
| 3 | `exit_intent` never triggered popup — no re-evaluation on mouseleave | ✅ | — |
| 4 | Edited rules not picked up by re-eval loop — loop captured stale `rules` variable | ✅ | — |
| 5 | pingHash re-fire used stale signals (scroll_depth=0) — called `detectSignals` fresh | ✅ | — |
| 6 | `day_time` `is between` broken — used `parseFloat` losing minutes component | ✅ | — |
| 7 | Popup config stale after edit — popup config saved as snapshot in rule, not resolved live | ✅ | — |
| 8 | Countdown config stale after edit — same snapshot issue as popup | ✅ | — |

### Automated Tests — `tests/test_rules.py`
- [x] `test_create_rule`
- [x] `test_list_rules`
- [x] `test_edit_rule`
- [x] `test_delete_rule`
- [x] `test_toggle_rule_active`
- [x] `test_cannot_access_other_users_rules`
- [x] `test_rule_with_multiple_conditions`
- [x] `test_rule_with_show_popup_action`

---

## MODULE 6 — POPUPS

### Manual Checklist
- [x] Create popup — all layout templates selectable
- [x] All block types work: text, image, button, embed, no_thanks, columns
- [x] All position options work (center, top/bottom bars, corners, fullscreen)
- [x] Background colour picker works
- [x] Background image upload works
- [x] Border radius, padding, width inputs save
- [x] Overlay toggle works
- [x] Close button toggle works
- [x] Display delay + frequency inputs save
- [x] Animation selector works (fade, slide, zoom)
- [x] `{country}` token renders correctly in preview
- [x] Countdown block inside popup renders and counts down on live page
- [x] Edit popup saves changes — reflects on page without cache clear
- [x] Delete popup works
- [x] All popup templates tested on live page

### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|
| 1 | Countdown block inside popup not rendering — `_renderBlock` had no countdown case | ✅ | — |
| 2 | Countdown inside popup used stale config — backend not resolving countdown blocks live | ✅ | — |
| 3 | Announcement bar text misaligned left — fixed with `justify-content:center` | ✅ | — |
| 4 | Popup shown-history not reset after editing — storage key versioned by config hash | ✅ | — |

### Automated Tests — `tests/test_popups.py`
- [x] `test_create_popup`
- [x] `test_list_popups`
- [x] `test_get_popup_by_id`
- [x] `test_edit_popup_name`
- [x] `test_edit_popup_config`
- [x] `test_delete_popup`
- [x] `test_cannot_access_other_users_popup`
- [x] `test_popup_with_countdown_block`

---

## MODULE 7 — COUNTDOWN TIMERS

### Manual Checklist
- [x] Create fixed-date countdown (with `ends_at` timestamp)
- [x] Create duration countdown (per-session)
- [x] Expiry action: `hide` saves correctly
- [x] Expiry action: `redirect` saves correctly
- [x] Expiry action: `message` saves correctly
- [x] Edit countdown saves changes — reflects on page without cache clear
- [x] Delete countdown works
- [x] Countdown renders correctly as standalone `insert_countdown` action
- [x] Countdown renders correctly when inserted as a block inside a popup
- [x] "Demo preview" badge removed from all countdown templates

### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|
| 1 | "Demo preview" text showing on all countdown templates | ✅ | — |

### Automated Tests — `tests/test_countdowns.py`
- [x] `test_create_countdown_fixed`
- [x] `test_create_countdown_duration`
- [x] `test_create_countdown_expiry_redirect`
- [x] `test_create_countdown_expiry_message`
- [x] `test_list_countdowns`
- [x] `test_edit_countdown`
- [x] `test_delete_countdown`
- [x] `test_cannot_access_other_users_countdown`

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
- [x] Rule with `page_view` fires on load
- [x] Rule with `visit_count` condition fires on correct visit number
- [x] Rule with `time_on_page` condition fires after correct delay (seconds)
- [x] Rule with `scroll_depth` condition fires at correct scroll %
- [x] Rule with `exit_intent` condition fires on cursor leave
- [x] Rule with `day_time` condition fires based on visitor's local time
- [x] Rule with `utm_source` / `utm_medium` / `utm_campaign` fires from URL params
- [x] Rule with `referrer_url` fires based on referring page
- [x] Rule with `device_type` / `browser` / `os` / `geo_country` fires correctly
- [x] AND condition — all conditions must be true for rule to fire
- [x] OR condition — any one condition triggers rule

#### Actions on Page
- [x] `swap_text` — text swaps correctly on page
- [x] `swap_image` — image swaps correctly on page
- [x] `swap_url` — link href updated correctly
- [x] `hide_section` — element hidden correctly
- [x] `show_element` — element shown correctly
- [x] `show_popup` — popup renders correctly on page
- [x] `insert_countdown` — countdown timer renders and counts down

#### Cache & Sync
- [x] SDK ping detects rule change within ~30s — updated rule fires without page reload
- [x] Editing a rule's trigger or action reflects on next eval cycle — no cache clear needed
- [x] Editing popup config reflects immediately — popup storage key versioned by config hash
- [ ] `pp.js` loads via agency custom domain (white-labeled URL)
- [ ] Rule-fired event recorded in `rule_events` table

### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|
| 1 | API_BASE was localhost after revert — pp.js not hitting production API | ✅ | — |
| 2 | Cloudflare caching `/api/sdk/ping` and `/api/sdk/rules` for 30s | ✅ | — |
| 3 | `window.__pp.rules` not updated after pingHash change — loop used stale closure | ✅ | — |

### Automated Tests — `tests/test_sdk.py`
- [x] `test_sdk_ping_returns_hash`
- [x] `test_sdk_ping_unknown_script_id`
- [x] `test_sdk_rules_returns_rules`
- [x] `test_sdk_rules_draft_project_returns_empty`
- [x] `test_sdk_ping_hash_changes_after_rule_edit`
- [x] `test_sdk_rules_no_cache_header`
- [x] `test_sdk_ping_no_cache_header`
- [x] `test_sdk_rules_only_active_rules_returned`
- [x] `test_sdk_rules_popup_config_resolved_live`
- [ ] `test_sdk_visit_recorded` — requires beacon endpoint
- [ ] `test_sdk_event_recorded` — requires beacon endpoint

---

## MODULE 9 — ANALYTICS
> Requires SDK data flowing (complete Module 8 first).

### Manual Checklist
- [x] Project analytics loads (visits, unique visitors, rules fired)
- [x] Period selector (7/14/30/90/180/365 days) works
- [x] Daily chart renders correctly
- [x] Top countries table shows data
- [x] Traffic sources shows data
- [x] Device split shows data
- [x] Visitor split (new vs returning) shows data
- [x] Rules performance table shows data
- [x] Recent visits list shows data
- [x] Workspace analytics loads (aggregated across all projects)
- [x] Overview stats on dashboard load

### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|

### Automated Tests — `tests/test_analytics.py`
- [x] `test_project_analytics_empty`
- [x] `test_project_analytics_counts_visits`
- [x] `test_project_analytics_counts_rules_fired`
- [x] `test_project_analytics_period_filter`
- [x] `test_project_analytics_response_shape`
- [x] `test_project_analytics_traffic_sources`
- [x] `test_project_analytics_device_split`
- [x] `test_project_analytics_cannot_access_other_users`
- [x] `test_workspace_analytics_empty`
- [x] `test_workspace_analytics_aggregates_across_projects`
- [x] `test_overview_analytics`
- [x] `test_sdk_visit_beacon`
- [x] `test_sdk_event_beacon`
- [x] `test_sdk_visit_unknown_script_id`

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
- [ ] White-labeled plugin uses agency brand name when workspace has brand set

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

> **Owner account:** `chikeokoliofficial@gmail.com`
> **Deployed app:** `app.usepagepersona.com`
>
> **Pre-test setup (do this before anything else):**
> 1. Sign up `okolichikevitalis@gmail.com` on PagePersona (existing user test)
> 2. Sign up `theinfluenccr@gmail.com` on PagePersona (existing user test)
> 3. Log out — then log back in as `chikeokoliofficial@gmail.com` to run the tests

---

### PART A — Invite New Users (no existing account)

#### Invite `noblechykeokoli@gmail.com` as Member
- [x] Go to Settings → Team tab as `chikeokoliofficial@gmail.com`
- [x] Enter `noblechykeokoli@gmail.com`, select role **Member**, click Invite
- [x] Row appears in team list with status **Pending**
- [x] Email arrives at `noblechykeokoli@gmail.com` — invite link visible

#### Accept as new user — `noblechykeokoli@gmail.com`
- [x] Click invite link — lands on `/team-accept?token=...`
- [x] Page shows workspace name and role **Member**
- [x] Shows "Create your account" form (name + password + confirm)
- [x] Fill in name and password, submit
- [x] Redirected to `/dashboard`
- [x] Workspace switcher shows **two workspaces**: their own + `chikeokoliofficial`'s workspace
- [x] Back in owner account — `noblechykeokoli@gmail.com` row shows status **Active**

#### Invite `legendchyke@gmail.com` as Admin
- [x] Enter `legendchyke@gmail.com`, select role **Admin**, click Invite
- [x] Row appears in team list with status **Pending**
- [x] Email arrives at `legendchyke@gmail.com` — invite link visible

#### Accept as new user — `legendchyke@gmail.com`
- [x] Click invite link — lands on `/team-accept?token=...`
- [x] Page shows workspace name and role **Admin**
- [x] Fill in name and password, submit
- [x] Redirected to `/dashboard`
- [x] Workspace switcher shows **two workspaces**: their own + `chikeokoliofficial`'s workspace
- [x] Back in owner account — `legendchyke@gmail.com` row shows status **Active**

---

### PART B — Invite Existing Users (already have an account)

#### Invite `okolichikevitalis@gmail.com` as Member
- [x] Enter `okolichikevitalis@gmail.com`, select role **Member**, click Invite
- [x] Row appears in team list with status **Pending**
- [x] Email arrives at `okolichikevitalis@gmail.com`

#### Accept as existing user — `okolichikevitalis@gmail.com`
- [x] Click invite link — lands on `/team-accept?token=...`
- [x] Page shows workspace name and role **Member**
- [x] Shows **"Accept Invitation" button only** — no name/password form
- [x] Click Accept — redirected to `/dashboard`
- [x] Workspace switcher shows their existing workspace + `chikeokoliofficial`'s workspace
- [x] Back in owner account — `okolichikevitalis@gmail.com` row shows status **Active**

#### Invite `theinfluenccr@gmail.com` as Admin
- [x] Enter `theinfluenccr@gmail.com`, select role **Admin**, click Invite
- [x] Row appears in team list with status **Pending**
- [x] Email arrives at `theinfluenccr@gmail.com`

#### Accept as existing user — `theinfluenccr@gmail.com`
- [x] Click invite link — shows "Accept Invitation" button only (no signup form)
- [x] Click Accept — redirected to `/dashboard`
- [x] Workspace switcher shows their existing workspace + `chikeokoliofficial`'s workspace
- [x] Back in owner account — `theinfluenccr@gmail.com` row shows status **Active**

---

### PART C — Member Access (logged in as `noblechykeokoli@gmail.com`)

> Switch to `chikeokoliofficial`'s workspace in the switcher first.

#### Can do
- [x] Can see all projects in the workspace
- [x] Can create a rule on a project
- [x] Can edit and delete a rule
- [x] Can create, edit, delete a popup
- [x] Can create, edit, delete a countdown
- [x] Can view project analytics and workspace analytics

#### Cannot do (blocked)
- [x] Cannot create a new project — button hidden or returns error
- [x] Cannot edit an existing project (name, status, platform)
- [x] Cannot delete a project — button hidden or returns error
- [x] Settings — cannot change workspace name or billing
- [x] Settings → Team — invite form is **not visible** (member role)
- [x] Agency / Client pages are inaccessible

---

### PART D — Admin Access (logged in as `legendchyke@gmail.com`)

> Switch to `chikeokoliofficial`'s workspace in the switcher first.

#### Can do
- [ ] Can see all projects in the workspace
- [ ] Can create a new project
- [ ] Can edit an existing project
- [ ] Can delete a project
- [ ] Full CRUD on rules, popups, countdowns
- [ ] Can view analytics
- [ ] Settings → Team — **invite form IS visible**
- [ ] Can invite another member
- [ ] Can remove a member (not the owner)

#### Cannot do
- [ ] Cannot change roles (role controls hidden/disabled)
- [ ] Cannot change workspace settings or billing

---

### PART E — Role Changes (logged in as Owner `chikeokoliofficial@gmail.com`)

- [ ] Change `noblechykeokoli@gmail.com` from **Member → Admin** — they can now invite others
- [ ] Change back **Admin → Member** — invite button disappears again
- [ ] Change `legendchyke@gmail.com` from **Admin → Member** — invite button disappears
- [ ] Change back **Member → Admin** — invite button reappears

---

### PART F — Edge Cases

- [ ] Try inviting `chikeokoliofficial@gmail.com` (owner's own email) — error shown
- [ ] Try inviting `noblechykeokoli@gmail.com` again (already active) — error shown
- [ ] Invite a new pending email, then re-invite same email — new link works, old link returns error
- [ ] Paste a tampered/fake token URL — shows "Invalid invitation" error page
- [ ] Click an already-accepted link — shows "Already accepted" screen with sign-in link

---

### PART G — Remove Member

- [ ] Owner removes `noblechykeokoli@gmail.com` from the team list
- [ ] Row disappears from team list
- [ ] Log in as `noblechykeokoli@gmail.com` — `chikeokoliofficial`'s workspace is gone from switcher
- [ ] Their own workspace still works normally

---

### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|

### Automated Tests — `tests/test_team.py`
- [x] `test_invite_new_member`
- [x] `test_invite_admin_role`
- [x] `test_invite_invalid_role`
- [x] `test_invite_info_returns_workspace_name`
- [x] `test_accept_invite_new_user`
- [x] `test_accept_invite_existing_user`
- [x] `test_accept_invite_activates_member`
- [x] `test_list_members`
- [x] `test_update_member_role`
- [x] `test_update_role_invalid`
- [x] `test_remove_member`
- [x] `test_member_can_access_workspace_projects`
- [x] `test_resend_invite_refreshes_token`
- [x] `test_cannot_invite_self`
- [x] `test_accept_invalid_token`

---

## Upcoming Feature — Media Library

**What:** A workspace-scoped image store. Every image uploaded anywhere in the app
(popup builder, profile, project thumbnail, etc.) is saved to the library. Users can
browse and re-select existing images instead of re-uploading the same file.

**Why:** Currently re-using an image requires re-uploading it, generating duplicate R2
objects and bloating the database. The library fixes this.

**Scope decision:** `workspace_id` scoped — consistent with all other entities.
For regular users (one workspace) this is effectively account-level. For agencies,
each workspace (agency + each client) keeps its own isolated image library, which is
the correct behaviour for data isolation.

**Data model:**
```
assets (id, workspace_id, url, filename, size, mime_type, created_at)
```
`mime_type` is stored now even though the UI only surfaces images (`image/*`) today.
Video/audio support later is just a UI filter change — no schema migration needed.

**Build order (after all manual testing is done):**
1. `assets` DB table + migration
2. `POST /api/assets/upload` — upload to R2, insert row
3. `GET /api/assets` — list workspace assets (filterable by mime_type)
4. `DELETE /api/assets/{id}` — delete from R2 + DB
5. `AssetLibrary` modal component (thumbnail grid, select / upload new tab)
6. Wire into `ImageUploader` everywhere it appears

## PROGRESS SUMMARY

| Module | Manual done | Bugs found | Tests written |
|--------|-------------|------------|---------------|
| 1. Auth | 19 / 22 (magic link pending JVZoo) | 2 (fixed) | 5 / 5 ✅ |
| 2. User Profile | 6 / 6 ✅ | 2 (fixed) | 4 / 4 ✅ |
| 3. Workspaces | 4 / 4 ✅ | 0 | 0 / 3 |
| 4. Projects | 0 / 11 | 0 | 0 / 5 |
| 5. Rules Engine | ✅ All signals × all actions | 8 (all fixed) | 8 / 8 ✅ |
| 6. Popups | ✅ All templates + all block types | 4 (all fixed) | 8 / 8 ✅ |
| 7. Countdowns | ✅ All expiry types + in-popup | 1 (fixed) | 8 / 8 ✅ |
| 8. SDK E2E | ✅ All signals + actions on live page | 3 (all fixed) | 9 / 11 (beacon pending) |
| 9. Analytics | ✅ All endpoints | 0 | 14 / 14 ✅ |
| 10. Agency / Client | 0 / 37 | 0 | 0 / 6 |
| 11. Team | 0 / 44 | 0 | 15 / 15 ✅ |

### Next up
- Module 11 — Team Management
- Build Media Library
- Module 10 — Agency / Client
- Write automated tests for Modules 9–11
