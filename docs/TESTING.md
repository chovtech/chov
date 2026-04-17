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
- [x] `test_get_me_returns_user`
- [x] `test_get_me_without_token_returns_403`
- [x] `test_logout_invalidates_session`
- [x] `test_refresh_token_returns_new_access_token`
- [x] `test_refresh_token_invalid_returns_401`
- [x] `test_verify_email_success`
- [x] `test_verify_email_invalid_token_returns_400`
- [x] `test_verify_email_missing_token_returns_400`
- [x] `test_forgot_password_returns_success`
- [x] `test_forgot_password_unknown_email_still_returns_200`
- [x] `test_reset_password_success`
- [x] `test_reset_password_invalid_token_returns_400`
- [x] `test_magic_link_request_always_returns_200`
- [x] `test_magic_link_verify_success`
- [x] `test_magic_link_verify_invalid_returns_400`
- [x] `test_signup_creates_trial_entitlement`
- [x] `test_signup_creates_ai_coins_with_trial_balance`
- [x] `test_signup_rejects_short_password`

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
- [x] `test_update_language`
- [x] `test_change_password_short_new_password_rejected`

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
- [x] `test_default_workspace_created_on_signup`
- [x] `test_list_workspaces`
- [x] `test_rename_workspace`
- [x] `test_list_workspaces_includes_stats_fields`
- [x] `test_onboarding_completed_false_on_signup`
- [x] `test_complete_onboarding`
- [x] `test_patch_white_label_settings`

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
- [x] `test_create_project_with_description`
- [x] `test_edit_project_description`
- [x] `test_trigger_scan_returns_scan_started`
- [x] `test_add_custom_block`
- [x] `test_add_custom_block_no_duplicate`
- [x] `test_bulk_add_blocks`
- [x] `test_update_block`
- [x] `test_delete_block`
- [x] `test_import_blocks_from_rules`

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
- [x] `test_sdk_rules_includes_page_url`
- [x] `test_sdk_rules_includes_geo_object`
- [x] `test_sdk_rules_insert_countdown_config_resolved`

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

> **Agency account:** `chikeokoliofficial@gmail.com`
> **New client (no PP account yet):** `edumesSoftware@gmail.com`
> **Existing client (already has PP account):** `chovtechllc@gmail.com` ← sign up first if not already on PP
> **Deployed app:** `app.usepagepersona.com`
>
> **Pre-test setup:**
> 1. Sign up `chovtechllc@gmail.com` on PagePersona if not already registered
> 2. Log in as `chikeokoliofficial@gmail.com` — go to Agency tab
> 3. Use Chrome as agency browser, incognito window as client browser

---

### PART A — Agency White-Label Setup

- [x] Agency tab → White-label sub-tab loads correctly
- [x] Set brand name — saves and reflects in preview
- [x] Upload logo — appears in preview
- [x] Change primary colour — preview updates live
- [x] Agency slug link works — visit `app.usepagepersona.com/join/[slug]` in incognito — branded page loads
- [ ] White-labeled WordPress plugin uses agency brand name when brand is set

> **Custom domain (skip if no domain ready):**
> - [x] Enter domain → CNAME instructions show correct target
> - [x] After DNS propagates — domain verifies, shows verified state
> - [x] Agency SDK script tag updates to use custom domain URL

---

### PART B — Agency Invites a New Client (no existing PP account)

> Client email: `edumesSoftware@gmail.com`

- [x] Agency tab → Clients → click Invite Client
- [x] Enter `edumesSoftware@gmail.com`, set access **Full**, click Send
- [x] Client row appears in list with status **Pending**
- [x] Invite email arrives at `edumesSoftware@gmail.com` — accept link visible
- [x] Agency brand name visible in the invite email
- [x] Resend invite from row dropdown → new email arrives, old link now returns error
- [x] Cancel invite from row dropdown → row removed from client list
- [x] Re-invite `edumesSoftware@gmail.com` with **Full** access (for accept test below)

---

### PART C — New Client Accepts (as `edumesSoftware@gmail.com`)

> Open in incognito browser.

- [x] Click accept link — lands on `/client-accept?token=...`
- [x] Page shows agency brand name, logo, primary colour
- [x] Shows account creation form (name + password + confirm)
- [x] Fill in name and password, submit
- [x] Redirected to `/dashboard`
- [x] Dashboard shows agency branding (logo, colour, brand name in nav)
- [x] **No workspace switcher** — workspace badge shown instead
- [x] Nav shows all items **except** Agency tab
- [x] Back in agency browser — `edumesSoftware@gmail.com` row status is **Active**

---

### PART D — Agency Invites Existing PagePersona User as Client

> Client email: `chovtechllc@gmail.com`

- [x] Agency tab → Clients → Invite Client
- [x] Enter `chovtechllc@gmail.com`, set access **Full**, click Send
- [x] Client row appears with status **Pending**
- [x] Email arrives — shows **"Accept Invitation"** button only (no signup form)
- [x] Open in incognito as `chovtechllc@gmail.com` — click Accept → redirected to `/dashboard`
- [x] Client sees their **own workspace** + the client workspace in the switcher (both visible)
- [x] Back in agency browser — row status is **Active**

---

### PART E — Client Experience: Full Access (as `edumesSoftware@gmail.com`)

> In incognito, log in as `edumesSoftware@gmail.com`.

- [x] Agency branding applied throughout — logo, colour, brand name in nav
- [x] No workspace switcher — badge shown instead
- [x] Nav: Dashboard, Projects, Rules, Popups, Countdowns, Analytics all visible
- [x] Agency tab **not visible**
- [x] Can create a project in their workspace
- [x] Can create rules, popups, countdowns
- [x] Can view analytics
- [x] Agency's projects are not visible anywhere
- [x] Settings visible — can view but cannot change billing

---

### PART F — Switch Client to View Only

> As agency: Agency tab → `edumesSoftware@gmail.com` row → change access to **View Only**

- [x] Access level updates to `view_only` in client list
- [x] In client browser (refresh) — nav shows only **Dashboard** and **Analytics**
- [x] Projects, Rules, Popups, Countdowns nav items are gone
- [x] Navigating directly to `/dashboard/projects` is blocked or redirects
- [x] Analytics still loads correctly
- [x] Cannot create or edit anything

---

### PART G — Revoke & Restore Access

> As agency: Agency tab → `edumesSoftware@gmail.com` → Revoke Access

- [X] Row status changes to **Revoked** in client list
- [x] Client browser (refresh) → **Access Revoked** page shown, not dashboard
- [x] As agency: click Restore Access
- [x] Client browser (refresh) → back to dashboard normally

---

### PART H — Client Self-Signup via Slug

> Use a fresh email not already on PagePersona.

- [x] Visit `app.usepagepersona.com/join/[agency-slug]` in incognito
- [x] Agency branding shows on the signup page (logo, colour, brand name)
- [x] Fill in name, email, password — submit
- [x] Redirected to dashboard with agency branding
- [x] New client row appears in agency's client list

---

### PART I — Branding on Auth Pages

- [x] Visit `app.usepagepersona.com/login?slug=[agency-slug]` — agency branding appears
- [x] Page `<title>` reflects agency brand name
- [x] Favicon reflects agency icon
- [x] Refresh — branding persists (not lost on reload)
- [x] Log out as client — login page retains agency branding

---

### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|

### Automated Tests — `tests/test_agency.py`
- [x] `test_invite_info_returns_branding`
- [x] `test_invite_info_user_exists_true_for_known_email`
- [x] `test_invite_info_invalid_token_returns_404`
- [x] `test_invite_creates_pending_client_workspace`
- [x] `test_invite_client_appears_in_clients_list`
- [x] `test_invite_duplicate_active_returns_400`
- [x] `test_accept_new_user_creates_account`
- [x] `test_accept_new_user_activates_invite`
- [x] `test_accept_existing_user_no_password_needed`
- [x] `test_accept_invalid_token_returns_404`
- [x] `test_list_clients_only_for_owner`
- [x] `test_revoke_client_access`
- [x] `test_restore_client_access`
- [x] `test_join_info_returns_branding`
- [x] `test_join_info_invalid_slug_returns_404`
- [x] `test_self_signup_creates_account_and_client_workspace`
- [x] `test_self_signup_invalid_slug_returns_404`
- [x] `test_full_access_client_can_create_project`
- [x] `test_view_only_client_cannot_create_project`
- [x] `test_client_cannot_see_agency_projects`

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
- [x] Can see all projects in the workspace
- [x] Can create a new project
- [x] Can edit an existing project
- [x] Can delete a project
- [x] Full CRUD on rules, popups, countdowns
- [x] Can view analytics
- [x] Settings → Team — **invite form IS visible**
- [x] Can invite another member
- [x] Can remove a member (not the owner)

#### Cannot do
- [x] Cannot change roles (role controls hidden/disabled)
- [x] Cannot change workspace settings or billing

---

### PART E — Role Changes (logged in as Owner `chikeokoliofficial@gmail.com`)

- [x] Change `noblechykeokoli@gmail.com` from **Member → Admin** — they can now invite others
- [x] Change back **Admin → Member** — invite button disappears again
- [x] Change `legendchyke@gmail.com` from **Admin → Member** — invite button disappears
- [x] Change back **Member → Admin** — invite button reappears

---

### PART F — Edge Cases

- [x] Try inviting `chikeokoliofficial@gmail.com` (owner's own email) — error shown
- [x] Try inviting `noblechykeokoli@gmail.com` again (already active) — error shown
- [x] Invite a new pending email, then re-invite same email — new link works, old link returns error
- [x] Paste a tampered/fake token URL — shows "Invalid invitation" error page
- [x] Click an already-accepted link — shows "Already accepted" screen with sign-in link

---

### PART G — Remove Member

- [x] Owner removes `noblechykeokoli@gmail.com` from the team list
- [x] Row disappears from team list
- [x] Log in as `noblechykeokoli@gmail.com` — `chikeokoliofficial`'s workspace is gone from switcher
- [x] Their own workspace still works normally

---

### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|
| 1 | Team list showed members from wrong workspace — endpoints not respecting active `workspace_id` | ✅ | — |
| 2 | Members could create new projects — `canManageProject` guard missing on create button | ✅ | — |
| 3 | Members could delete projects — delete button not gated on role | ✅ | — |
| 4 | Members could edit project settings (name, status, platform) — edit actions not blocked for member role | ✅ | — |
| 5 | Backend didn't enforce member role on project mutations — API accepted member PUT/DELETE on projects | ✅ | — |
| 6 | Members couldn't access Rules, Popups, Countdowns pages — nav guard was too broad, blocked members entirely | ✅ | — |
| 7 | Role-change selector missing — owner had no UI to promote/demote members | ✅ | — |
| 8 | Duplicate pending invites allowed — re-inviting same pending email created a second row instead of erroring | ✅ | ✅ |
| 9 | No resend button for pending invites — UI had no way to resend without cancelling and re-inviting | ✅ | ✅ |
| 10 | Old invite link still valid after resend — token not rotated, both old and new links worked | ✅ | ✅ |
| 11 | No feedback after clicking Resend — button gave no visual confirmation the resend succeeded | ✅ | — |

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

## MODULE 12 — MEDIA LIBRARY

### Manual Checklist
- [x] Click any image zone in popup builder → library tray opens (not OS picker)
- [x] Click any image zone in rules swap_image → library tray opens
- [x] Click project thumbnail → library tray opens
- [x] Settings → workspace logo / icon → library tray opens
- [x] Library empty state shows upload button
- [x] Upload new image from library tray → appears in grid, auto-selected
- [x] Click image in grid → highlighted with blue border + checkmark
- [x] Insert button disabled until image selected
- [x] Click Insert → image applied, tray closes
- [x] Image persists in library across page reloads
- [x] Delete image from library → removed from grid
- [x] Profile avatar — direct OS picker (no library)
- [x] Paste URL section still works in all ImageUploader instances
- [x] Non-workspace (personal) uploads rejected by assets endpoint
- [x] Files > 10MB rejected
- [x] Non-image file types rejected

### Bugs Found
| # | Description | Fixed | Test written |
|---|-------------|-------|-------------|
| 1 | activeWorkspace used directly inside GlobalProperties (outside PopupBuilder scope) — ReferenceError during build prerender | ✅ | ✅ |

### Automated Tests — `tests/test_assets.py`
- [x] `test_upload_asset_returns_record`
- [x] `test_upload_asset_without_workspace_id`
- [x] `test_upload_asset_wrong_workspace_returns_403`
- [x] `test_upload_asset_unauthenticated`
- [x] `test_upload_rejects_non_image`
- [x] `test_list_assets_returns_workspace_assets`
- [x] `test_list_assets_wrong_workspace_returns_403`
- [x] `test_list_assets_empty_for_new_workspace`
- [x] `test_delete_own_asset`
- [x] `test_delete_asset_removed_from_list`
- [x] `test_delete_nonexistent_asset_returns_404`
- [x] `test_delete_other_users_asset_returns_403`

## PROGRESS SUMMARY

| Module | Manual done | Bugs found | Tests written |
|--------|-------------|------------|---------------|
| 1. Auth | 19 / 22 (magic link pending JVZoo) | 2 (fixed) | 5 / 5 ✅ |
| 2. User Profile | 6 / 6 ✅ | 2 (fixed) | 4 / 4 ✅ |
| 3. Workspaces | 4 / 4 ✅ | 0 | 3 / 3 ✅ |
| 4. Projects | 0 / 11 | 0 | 8 / 8 ✅ |
| 5. Rules Engine | ✅ All signals × all actions | 8 (all fixed) | 8 / 8 ✅ |
| 6. Popups | ✅ All templates + all block types | 4 (all fixed) | 8 / 8 ✅ |
| 7. Countdowns | ✅ All expiry types + in-popup | 1 (fixed) | 8 / 8 ✅ |
| 8. SDK E2E | ✅ All signals + actions on live page | 3 (all fixed) | 9 / 11 (beacon pending) |
| 9. Analytics | ✅ All endpoints | 0 | 14 / 14 ✅ |
| 10. Agency / Client | 48 / 49 (WP plugin branding pending) | 0 | 20 / 20 ✅ |
| 11. Team | ✅ All 52 items | 11 bugs (all fixed) | 15 / 15 ✅ |
| 12. Media Library | ✅ All 16 items | 1 (fixed) | 12 / 12 ✅ |
| 13. AI Module | Partial (see 13.1–13.15) | 1 (fixed) | 30 / 30 ✅ |

**Total automated tests: 145 / 145 passing**



## MODULE 13 — AI FEATURES

> Test on `app.usepagepersona.com` with a real workspace.
> Each AI feature costs coins — use owner plan workspace to avoid running out during testing.
> Coin balance in topbar should update after each generation.

---

### 13.1 — AI Coin Balance (Topbar)

- [ ] Coin balance shows correct number from DB on page load
- [ ] Balance updates immediately after an AI action (no refresh needed)
- [ ] Owner plan workspace shows ∞ (not a number)
- [x] While fetching, shows `—` (not 0 or blank)
- [x] Clicking the coin badge opens the dropdown
- [x] Dropdown shows correct balance + progress bar
- [ ] Progress bar is hidden for owner/unlimited plan
- [ ] Progress bar fills proportionally to plan allocation (e.g. 40/50 = 80%)
- [x] "Top Up" link navigates to billing tab
- [x] View-only client sees no coin badge at all

---

### 13.2 — Copy Writer: Rule Builder (Standalone — New Rule)

> Path: Dashboard → Project → Rules → New Rule → Add swap_text action

- [x] "Write with AI" link appears below the swap_text textarea
- [x] Shows "5 coins" indicator next to the link
- [x] Clicking opens the AI panel inline (does not navigate away)
- [x] Goal textarea accepts input
- [x] Cmd+Enter / Ctrl+Enter triggers generation
- [x] "Generate 3 variants" button is disabled when goal is empty
- [x] Spinner shows during generation
- [x] 3 variant cards appear with text + rationale
- [x] "Use this" button fills the swap_text textarea with the variant text
- [x] Applied variant shows "Applied" state (green tick)
- [x] Can apply a different variant after applying one (overwrites)
- [x] Closing the panel (✕) resets goal, variants, and error
- [x] Coin balance in topbar decrements by 5 after generation
- [x] Conditions set on the rule are sent as context to AI (verify via variant relevance)
- [x] Target element selector is sent as context (verify via variant relevance)
- [x] Page URL is sent as context

---

### 13.3 — Copy Writer: Rule Builder (Standalone — Edit Rule)

> Path: Dashboard → Project → Rules → Edit existing rule with swap_text action

- [x] "Write with AI" link appears below the swap_text textarea
- [x] All generation behaviour identical to 13.2
- [x] Applying a variant overwrites the existing saved text in the textarea
- [x] Existing conditions are sent as context

---

### 13.4 — Copy Writer: Live Picker (New Rule via Picker)

> Path: Dashboard → Project → Open Picker → Click element → "Add Personalisation" → swap_text action

- [x] "Write with AI" link appears in the sidebar swap_text section
- [x] Panel fits within the narrow sidebar without overflow
- [x] `selectedEl.textContent` (current live page text) is sent as context — variants reference what they're replacing
- [x] `pageUrl` (the live page URL) is sent as context
- [x] Conditions added in picker sidebar are included as context
- [x] Applying a variant fills the sidebar textarea
- [x] Coin balance in topbar decrements by 5

---

### 13.5 — Copy Writer: Live Picker (Edit Existing Rule)

> Path: Picker → Click element with existing rule → Edit rule → swap_text action

- [x] "Write with AI" link appears
- [x] All behaviour identical to 13.4
- [x] Existing conditions correctly sent as context

---

### 13.6 — Copy Writer: Popup Builder — Text Block

> Path: Elements → Popups → New or Edit → Add/select Text block → click block to open properties

- [x] "Write with AI" link appears below the text content textarea
- [x] Panel opens inline in the properties sidebar
- [x] Applying a variant fills the text block content
- [x] Coin balance decrements by 5
- [x] No page URL / element context (user describes goal freely)

---

### 13.7 — Copy Writer: Popup Builder — Button Label

> Path: Elements → Popups → Button block → properties

- [x] "Write with AI" link appears below the Label input
- [x] Variants are short (≤ 5 words enforced via prompt)
- [x] Applying a variant fills the btn_label field
- [x] Coin balance decrements by 5

---

### 13.8 — Copy Writer: Popup Builder — No Thanks Label

> Path: Elements → Popups → No Thanks block → properties

- [x] "Write with AI" link appears below the Label input
- [x] Variants are short dismissal phrases (≤ 5 words)
- [x] Applying a variant fills the no_thanks_label field
- [x] Coin balance decrements by 5

---

### 13.9 — Coin Error Handling

- [ ] With 0 coins (non-owner), clicking "Generate" shows insufficient coins error
- [ ] Error message shows current balance and required amount
- [ ] No coins are deducted when generation fails (API error / network)
- [ ] Error clears when panel is closed and reopened

---

### 13.10 — User Type Access

| User type | Sees "Write with AI"? | Can generate? |
|-----------|----------------------|---------------|
| Owner | ✅ | ✅ unlimited |
| Team admin | ✅ | ✅ (workspace coins) |
| Team member | ✅ | ✅ (workspace coins) |
| Client (full) | ✅ | ✅ (workspace coins) |
| Client (view_only) | ❌ (can't reach builders) | ❌ |

- [ ] Owner plan: ∞ coins, no deduction visible
- [ ] Team member: generates fine, coins deduct from shared workspace pool
- [ ] Client (full): generates fine in their own workspace
- [ ] Client (view_only): cannot reach rule/popup builder — confirmed by 403 on write attempts

---

### AI Module Progress

| Sub-module | Manual tested | Bugs found | Notes |
|------------|--------------|------------|-------|
| 13.1 Coin balance topbar | [x] | — | Wired to live API |
| 13.2 Copy Writer — new rule | [x] | — | |
| 13.3 Copy Writer — edit rule | [x] | — | |
| 13.4 Copy Writer — picker (new) | [x] | — | Has live element context |
| 13.5 Copy Writer — picker (edit) | [x] | — | |
| 13.6 Copy Writer — popup text | [x] | — | |
| 13.7 Copy Writer — button label | [x] | — | maxWords=5 |
| 13.8 Copy Writer — no thanks | [x] | — | maxWords=5 |
| 13.9 Error handling | [ ] | — | Not yet tested |
| 13.10 User type access | [ ] | — | Not yet tested |
| 13.11 Brand Knowledge CopyWriter | [x] | — | workspaceOnly — no project selector |
| 13.12 Project Description Extract | [x] | — | 3 coins, Sonnet |
| 13.13 Popup Content Generator | [x] | — | Generated, customised, saved |
| 13.14 Image Generator | [x] | — | Tested on Popup Builder + Live Picker |
| 13.15 Countdown in Popup | [x] | fixed | countdown_config double-encoded bug fixed |

---

### 13.11 — Brand Knowledge CopyWriter (Settings → Brand Knowledge)

> Path: Settings → Brand Knowledge → About Brand → "Write with AI"

- [ ] "Write with AI · 5 coins" trigger appears below About Brand textarea
- [ ] Panel opens — NO project selector (workspaceOnly mode)
- [ ] Variants are brand-level, 150 words max
- [ ] Applying a variant fills the About Brand field
- [ ] Clicking Save Brand Knowledge persists the value
- [ ] Coin balance decrements by 5

---

### 13.12 — Project Description Extract

> Path: New Project or Edit Project → Description field → "Extract from URL"

- [ ] Description textarea visible and required at creation (cannot proceed if < 10 chars)
- [ ] "Extract from URL" button enabled when page_url has content
- [ ] Clicking extracts a 4–6 sentence description via AI (3 coins)
- [ ] Coin balance decrements by 3
- [ ] User can edit the extracted description before saving
- [ ] Description saves correctly on both Create and Edit

---

### 13.13 — Popup Content Generator

> Path: Elements → Popups → New Popup → "Generate with AI"

- [ ] "Generate with AI · 5 coins" button visible in template picker header
- [ ] Panel opens with project selector + goal textarea
- [ ] Close (×) button dismisses the panel
- [ ] Generate produces a fully-built popup (layout, bg_color, blocks + copy)
- [ ] Popup loads directly into the editor — no manual block-adding needed
- [ ] Image blocks generated with empty image_url (user fills with image generator)
- [ ] Countdown blocks generated as empty slots (user wires countdown in properties)
- [ ] Coin balance decrements by 5
- [ ] Two-column layout generated when appropriate (columns block with col_left/col_right)

---

### 13.14 — Image Generator

> Path: Any surface with ImageUploader + workspaceId (Popup Builder image block, Rules swap_image, Live Picker swap_image)

- [ ] "Generate with AI · 10 coins" trigger visible below upload zone
- [ ] Panel opens with: project selector (popup context) / no selector (rules/picker), prompt textarea, style dropdown, W × H fields
- [ ] W/H auto-populated from existing image dimensions if image already in slot
- [ ] Style options: Photorealistic (default), Illustration, Anime, Abstract
- [ ] Generate calls fal.ai Flux Dev — takes 10–20s
- [ ] Generated image saved to R2 + appears in asset library
- [ ] Preview shown — "Insert Image" applies URL to slot
- [ ] Coin balance decrements by 10
- [ ] Popup Builder: project selector shown (no projectId prop)
- [ ] Rules/Picker: no project selector (projectId passed through ImageUploader)

---

### 13.15 — Countdown in Popup (Integration)

> Path: Popup Builder → countdown block → select countdown → save → view on live site

- [ ] Countdown block renders on live site after selecting a countdown in properties
- [ ] Duration-type countdown ticks correctly (localStorage-based, persists across page loads)
- [ ] Fixed-date countdown ticks toward end date
- [ ] Expiry action works: hide / redirect / message
- [ ] Countdown config not double-encoded (countdown_config stored as object not string)

---

### 13.16 — Analytics Insights *(not yet built)*
### 13.17 — Rule Creation Hub — AI Path *(not yet built)*
### 13.18 — AI Rule Suggestions *(not yet built)*

---

### Automated Tests — `tests/test_ai.py`
- [x] `test_coins_balance_returns_shape` — GET /api/ai/coins returns expected keys
- [x] `test_coins_balance_initial_trial` — new workspace has 20 coins, plan=trial, not unlimited
- [x] `test_coins_history_initially_empty` — fresh workspace has no transaction history
- [x] `test_coins_unauthenticated_returns_401` — coin endpoints require auth
- [x] `test_get_brand_empty_for_new_workspace` — brand GET returns {} before first save
- [x] `test_save_and_retrieve_brand` — PUT saves all brand fields; GET retrieves them
- [x] `test_save_brand_overwrites_on_second_put` — second PUT replaces first (no duplicate rows)
- [x] `test_brand_extract_returns_fields` — POST /api/ai/brand/extract returns brand knowledge shape (mocked AI + HTTP)
- [x] `test_brand_extract_invalid_url_returns_422` — unreachable URL returns 422
- [x] `test_project_describe_returns_description` — POST /api/ai/project/extract-description returns text (mocked)
- [x] `test_project_describe_deducts_3_coins` — project describe costs 3 coins
- [x] `test_write_copy_returns_3_variants` — POST /api/ai/copy/write returns 3 variants with text + rationale (mocked)
- [x] `test_write_copy_deducts_5_coins` — balance decrements by 5 after generation
- [x] `test_write_copy_logs_transaction` — write_copy transaction appears in coin history
- [x] `test_write_copy_insufficient_coins_returns_402` — 402 with insufficient_coins detail when balance < 5
- [x] `test_write_copy_bad_ai_response_returns_502` — non-JSON AI response → 502
- [x] `test_write_copy_with_project_context` — project_id passed → project description loaded as context
- [x] `test_popup_generate_returns_blocks` — POST /api/ai/popup/generate returns layout + bg_color + blocks (mocked)
- [x] `test_popup_generate_deducts_5_coins` — balance decrements by 5
- [x] `test_popup_generate_applies_style_defaults` — headline blocks have font_size 24, font_weight 800
- [x] `test_popup_generate_bad_ai_response_returns_502` — malformed AI JSON → 502
- [x] `test_rule_suggest_returns_rules` — POST /api/ai/rules/suggest returns rules list with valid shape (mocked)
- [x] `test_rule_suggest_deducts_15_coins` — balance decrements by 15
- [x] `test_rule_suggest_unknown_project_returns_404` — project not in workspace → 404
- [x] `test_rule_suggest_validates_signals_and_actions` — invalid signals stripped; only valid rules survive
- [x] `test_image_generate_returns_url_and_balance` — POST /api/ai/image/generate returns URL + dimensions + balance (mocked fal + R2)
- [x] `test_image_generate_deducts_10_coins` — balance decrements by 10
- [x] `test_image_generate_saved_to_asset_library` — generated URL appears in /api/assets
- [x] `test_image_generate_fal_failure_returns_502` — fal.ai exception → 502
- [x] `test_image_generate_clamps_dimensions` — dimensions clamped to 256–2048, multiples of 8
