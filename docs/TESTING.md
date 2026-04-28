# TESTING.md — PagePersona Pre-Launch Manual Test Checklist
> Final QA pass before JVZoo launch. Test every module, every user type, every plan.
> Reset: 2026-04-20 · Last updated: 2026-04-27
>
> **Status key:** `[ ]` = not tested · `[x]` = passed · `[!]` = bug found · `[n/a]` = not applicable
>
> **Bug found:** Note it inline → fix it → mark `[x]`

---

## PROGRESS TRACKER

| Module | Status | Notes |
|--------|--------|-------|
| 1 — Authentication | 🔶 Partial | All done except 1.5 Magic Link |
| 2 — User Profile | ✅ Done | |
| 3 — Workspaces | ✅ Done | |
| 4 — Projects | 🔶 Partial | 4.1–4.5 done; 4.6 access-by-user-type table pending |
| 5 — Rules Engine | 🔶 Partial | 5.1–5.2 done; 5.3 actions, 5.4 AND/OR, 5.5 edit/delete, 5.6 AI, 5.7 access table pending (many overlap with M8/M13) |
| 6 — Popups | 🔶 Partial | 6.1 partially done (layout/blocks/position done; overlay/animation/country token pending); 6.2 done via M13; 6.3 access table pending |
| 7 — Countdown Timers | 🔶 Partial | All functional items done; access-by-user-type table pending |
| 8 — SDK End-to-End | ✅ Done | All signals, actions, cache/sync, white-label URL tested |
| 9 — Analytics | 🔶 Partial | All functional items done; access-by-user-type table pending |
| 10 — Agency / Client | 🔶 Partial | All invite/client flows done; 10.12 plan gates table partially done |
| 11 — Team Management | ✅ Done | |
| 12 — Media Library | ✅ Done | |
| 13 — AI Features | 🔶 Partial | 13.1–13.15 all done; 13.16 access-by-user-type table pending |
| 14 — Billing & Plan Limits | 🔶 Partial | 14.1–14.2 done; 14.3 nudge copy, 14.5 grace period, 14.6 PayPal top-up pending |
| 15 — Reports | 🔶 Partial | 15.1–15.3 done; 15.4 access-by-user-type table pending |
| 16 — JVZoo Webhook | ❌ Blocked | Needs real product IDs before testing |
| 17 — Settings Page | ✅ Done | |

---

## TEST ACCOUNTS TO SET UP BEFORE STARTING

| Account | Email | Role / Purpose |
|---------|-------|----------------|
| Owner (agency) | `chikeokoliofficial@gmail.com` | Main test account — set plan to **owner** in DB |
| Team Admin | `legendchyke@gmail.com` | Invited as **admin** on owner's workspace |
| Team Member | `noblechykeokoli@gmail.com` | Invited as **member** on owner's workspace |
| Client — Full | `edumesSoftware@gmail.com` | Client workspace under agency, access = **full** |
| Client — View Only | same as above | Switch access level to **view_only** during module 10 tests |
| Fresh email | `okolichikevitalis@gmail.com` | Used for JVZoo webhook + magic link tests |

**Browser setup:**
- Chrome: logged in as Owner
- Incognito / Firefox: used for client + team member tests

---

## MODULE 1 — AUTHENTICATION

### 1.1 Signup
- [x] New user can sign up with email + password
- [x] Verification email arrives in inbox
- [x] Duplicate email shows correct error message
- [x] Password shorter than 8 characters is rejected
- [x] After signup, user lands on dashboard (unverified banner visible)
- [x] Signup creates a trial entitlement row in DB
- [x] Signup creates ai_coins row with 20 coin balance

### 1.2 Email Verification
- [x] Clicking verification link in email verifies account
- [x] Verified state removes the unverified banner
- [x] Expired/invalid token shows correct error
- [x] Resend verification email works
- [x] Resend sends a fresh token (old link no longer works)

### 1.3 Login
- [x] Correct email + password logs in
- [x] Wrong password shows correct error
- [x] Unknown email shows correct error
- [x] User lands on dashboard after login
- [x] Access token set in localStorage and cookie

### 1.4 Forgot Password
- [x] Entering email sends reset link to inbox
- [x] Reset link opens reset password page
- [x] New password (≥ 8 chars) saves successfully
- [x] Old password no longer works after reset
- [x] Expired/invalid reset token shows correct error

### 1.5 Magic Link
- [ ] Requesting magic link for known email sends email
- [ ] Clicking magic link logs user in without password
- [ ] Magic link is single-use — second click fails gracefully
- [ ] Requesting magic link for unknown email still returns 200 (no enumeration)

### 1.6 Google OAuth
- [x] "Sign in with Google" redirects to Google
- [x] Completing Google auth creates account + logs in
- [x] Returning Google user logs in (no duplicate account created)

### 1.7 Logout & Session
- [x] Logout clears session and redirects to login
- [x] Accessing `/dashboard` after logout redirects to login
- [x] Closing and reopening browser keeps user logged in (persistent session)
- [x] Access token silently refreshes without kicking user out (wait 30 min or shorten TTL in .env)

---

## MODULE 2 — USER PROFILE

- [x] Update name saves correctly — reflects instantly in sidebar + topbar (no refresh)
- [x] Email field is read-only (cannot be changed)
- [x] Avatar upload works — reflects instantly in sidebar + topbar
- [x] Change password — correct current password required
- [x] Change password — wrong current password is rejected
- [x] Change password — new password shorter than 8 chars is rejected
- [x] Language switch EN ↔ FR applies across the whole app

---

## MODULE 3 — WORKSPACES

- [x] Default workspace created on signup
- [x] Rename workspace saves and reflects in sidebar
- [x] Workspace stats visible in dashboard overview (project count, sessions, last activity)
- [x] `onboarding_completed` = false on signup; `/complete-onboarding` sets it to true
- [x] White-label PATCH works (brand name, logo, primary colour) — tested fully in Module 10

---

## MODULE 4 — PROJECTS

### 4.1 Create Project
- [x] 3-step wizard opens correctly (name + URL → platform → script install)
- [x] Description field is required (cannot proceed with < 10 chars)
- [x] "Extract from URL" fills description via AI (costs 3 coins)
- [x] Project created with unique `PP-XXXXXX` script ID
- [x] Two projects never share the same script ID
- [x] Script install instructions shown correctly on step 3
- [x] "Send to developer" email sends with correct branded script tag

### 4.2 Manage Projects
- [x] Project list shows all projects for the workspace
- [x] Edit project name saves correctly
- [x] Edit project URL works only when script is **not yet verified**
- [x] URL field is locked (read-only) after script verified
- [x] Status toggle: Draft ↔ Active saves correctly
- [x] Thumbnail upload works and displays in project card

### 4.3 Script Verification
- [x] Script verify detects installed script on a real page
- [x] Uninstalled script shows "not found" state
- [x] Verified project: SDK fires rules on the registered page
- [x] Verified project: pp.js silently exits on any other URL

### 4.4 Soft Delete & Plan Quota
- [x] Delete project (with confirmation modal) works
- [x] Deleted project disappears from list immediately
- [x] **Unverified deleted project**: frees up its quota slot (can create a replacement)
- [x] **Verified deleted project**: still counts against project quota (cannot recycle)
- [x] Deleted project's rules/analytics are not accessible via the UI

### 4.5 WordPress Plugin
- [x] Download plugin ZIP — file downloads with correct filename
- [x] Plugin ZIP contains script ID pre-filled for the correct project
- [x] If agency has brand name set: plugin uses agency brand name and domain

### 4.6 Access by User Type

| Action | Owner | Team Admin | Team Member | Client Full | Client View |
|--------|-------|-----------|-------------|-------------|-------------|
| See project list | [ ] | [ ] | [ ] | [ ] | [ ] |
| Create project | [ ] | [ ] | [ ] | [ ] | blocked |
| Edit project | [ ] | [ ] | blocked | [ ] | blocked |
| Delete project | [ ] | [ ] | blocked | [ ] | blocked |
| Download WP plugin | [ ] | [ ] | [ ] | [ ] | [ ] |

---

## MODULE 5 — RULES ENGINE
> ▶ **CURRENTLY TESTING** — Test all three creation paths (Manual, Template/AI Suggest, AI) for each user type.

### 5.1 Create Rule (Manual Path)
- [x] New rule modal / page opens correctly
- [x] Can add multiple conditions (AND / OR selector works)
- [] All 15 condition types appear in the dropdown
- [x] All operators work correctly per condition type
- [x] Can add an action to the rule
- [x] All 7 action types available in the dropdown
- [x] Rule saves and appears in the rules list sorted by priority

### 5.2 Signals — fire each on a live page
- [x] `page_view` — fires immediately on load
- [x] `visit_count` — fires on correct visit number
- [x] `time_on_page` — fires after correct number of seconds
- [x] `scroll_depth` — fires at correct scroll percentage
- [x] `exit_intent` — fires when cursor leaves viewport
- [x] `day_time` — fires based on visitor's local time (24h format, `is between` works)
- [x] `utm_source` — matches URL parameter
- [x] `utm_medium` — matches URL parameter
- [x] `utm_campaign` — matches URL parameter
- [x] `referrer_url` — matches referring page URL
- [x] `device_type` — desktop / mobile / tablet
- [x] `browser` — Chrome / Firefox / Safari etc.
- [x] `os` — Windows / Mac / iOS / Android etc.
- [x] `geo_country` — matches visitor country (server-resolved)
- [x] `visitor_timezone` — matches timezone string

### 5.3 Actions — verify each fires correctly on live page
- [ ] `swap_text` — element picker selects element; text swaps on page
- [ ] `swap_image` — image picker + upload works; image swaps on page
- [ ] `swap_url` — URL input saves; link href updates on page
- [ ] `hide_section` — picker selects element; element is hidden
- [ ] `show_element` — picker selects element; element becomes visible
- [ ] `show_popup` — popup selector shows list; popup renders on page
- [ ] `insert_countdown` — countdown selector shows list; timer renders and counts down

### 5.4 AND / OR Logic
- [ ] AND: all conditions must be true — rule fires only when all match
- [ ] OR: any condition triggers rule — fires when at least one matches
- [ ] Mixed rules fire independently on same page

### 5.5 Edit / Delete
- [ ] Edit rule's trigger signal → updated rule fires with new trigger within ~30s (pingHash)
- [ ] Edit rule's action value → updated action fires without cache clear
- [ ] Active/Inactive toggle stops and resumes rule firing
- [ ] Delete rule removes it from list and stops it from firing

### 5.6 AI Path — Rule Suggestions
- [ ] AI path option visible on New Rule page
- [ ] User can type a natural-language goal
- [ ] Generate returns 3–5 rules with conditions + actions (costs 15 coins)
- [ ] Returned rules show valid signal names and action types (no gibberish)
- [ ] User can accept an AI rule → it saves to the rules list
- [ ] Coin balance decrements by 15 after generation

### 5.7 Access by User Type

| Action | Owner | Team Admin | Team Member | Client Full | Client View |
|--------|-------|-----------|-------------|-------------|-------------|
| View rules list | [ ] | [ ] | [ ] | [ ] | [ ] |
| Create rule | [ ] | [ ] | [ ] | [ ] | blocked |
| Edit rule | [ ] | [ ] | [ ] | [ ] | blocked |
| Delete rule | [ ] | [ ] | [ ] | [ ] | blocked |
| Use AI rule suggest | [ ] | [ ] | [ ] | [ ] | blocked |

---

## MODULE 6 — POPUPS

### 6.1 Builder
- [x] Create popup — all layout templates selectable
- [x] All block types work: text, image, button, embed, no_thanks, columns
- [x] All 12 position options work (center, top/bottom bars, corners, fullscreen)
- [x] Background colour picker saves
- [x] Background image upload via media library works
- [ ] Border radius, padding, width inputs save
- [ ] Overlay toggle saves
- [ ] Close button toggle saves
- [ ] Display delay + frequency inputs save
- [ ] Animation selector (fade, slide, zoom) saves
- [ ] `{country}` token renders visitor's country in preview + on live page
- [ ] Countdown block inside popup: select a countdown → renders and counts down on live site
- [ ] Edit popup → changes reflect on live page without clearing session storage
- [ ] Delete popup works

### 6.2 AI Popup Generator
- [ ] "Generate with AI · 5 coins" button visible in template picker
- [ ] Panel opens with project selector + goal textarea
- [ ] Generate produces a complete popup (layout, bg_color, blocks + copy)
- [ ] Popup loads into the editor — all blocks present
- [ ] Image blocks have empty image_url slot (user fills)
- [ ] Countdown blocks present as empty slots (user wires)
- [ ] Two-column layout generated when appropriate (columns block)
- [ ] Coin balance decrements by 5

### 6.3 Access by User Type

| Action | Owner | Team Admin | Team Member | Client Full | Client View |
|--------|-------|-----------|-------------|-------------|-------------|
| View popup list | [ ] | [ ] | [ ] | [ ] | [ ] |
| Create popup | [ ] | [ ] | [ ] | [ ] | blocked |
| Edit popup | [ ] | [ ] | [ ] | [ ] | blocked |
| Delete popup | [ ] | [ ] | [ ] | [ ] | blocked |

---

## MODULE 7 — COUNTDOWN TIMERS

- [x] Create fixed-date countdown (with `ends_at` timestamp) — ticks toward end date
- [x] Create duration countdown (per-session, localStorage-based) — persists across page reloads
- [x] Expiry action `hide` — element disappears at zero
- [x] Expiry action `redirect` — user redirected at zero
- [x] Expiry action `message` — message shown at zero
- [x] Edit countdown saves changes — reflects on live page without cache clear
- [x] Delete countdown works
- [x] Countdown as standalone `insert_countdown` action renders correctly
- [x] Countdown inside a popup block renders and counts down correctly

### Access by User Type

| Action | Owner | Team Admin | Team Member | Client Full | Client View |
|--------|-------|-----------|-------------|-------------|-------------|
| View countdown list | [ ] | [ ] | [ ] | [ ] | [ ] |
| Create countdown | [ ] | [ ] | [ ] | [ ] | blocked |
| Edit countdown | [ ] | [ ] | [ ] | [ ] | blocked |
| Delete countdown | [ ] | [ ] | [ ] | [ ] | blocked |

---

## MODULE 8 — SDK END-TO-END (pp.js on a real page)
> Install script on a real test page. Run after Modules 4–7 are confirmed working.

### 8.1 Script & Visits
- [x] Script installed on test page — page loads without JS errors in console
- [x] Visit beacon fires — visit recorded (check DB: country, device, OS, browser, referrer, UTM)
- [x] Returning visitor correctly identified on second visit
- [x] Unload beacon fires on page leave — `time_on_page` + `scroll_depth` updated in DB

### 8.2 Rules Firing on Live Page
- [x] All 15 signals fire correctly (cross-reference Module 5.2 results)
- [x] AND condition — rule only fires when all conditions match
- [x] OR condition — rule fires when any one condition matches
- [x] Rule with `geo_country` fires correctly (server-resolved, not client)

### 8.3 All 7 Actions on Live Page
- [x] `swap_text` — text swaps on page
- [x] `swap_image` — image swaps on page
- [x] `swap_url` — link href updated
- [x] `hide_section` — element hidden
- [x] `show_element` — element shown
- [x] `show_popup` — popup renders
- [x] `insert_countdown` — countdown renders and ticks

### 8.4 Cache & Sync
- [x] Editing a rule triggers pingHash change — updated rule fires within ~30s (no page reload)
- [x] Editing popup config reflects immediately on next popup trigger — storage key versioned by hash
- [x] Editing countdown config reflects without cache clear
- [x] Draft project: SDK returns empty rules list — no rules fire
- [x] Rule-fired event recorded in `rule_events` table in DB

### 8.5 White-Label SDK URL
- [x] Agency with verified custom domain: SDK script tag shown to clients uses custom domain URL
- [x] `pp.js` loads correctly from custom domain URL

---

## MODULE 9 — ANALYTICS

- [x] Project analytics loads — visits, unique visitors, rules fired, personalisation rate
- [x] Period selector (7 / 14 / 30 / 90 / 180 / 365 days) filters data correctly
- [x] Daily chart renders correctly with real data
- [x] Top countries table populated
- [x] Traffic sources shows referrer data
- [x] Device split (desktop / mobile / tablet) shows data
- [x] Visitor split (new vs returning) shows data
- [x] Rules performance table — correct fire counts per rule
- [x] Recent visits list shows visit rows
- [x] Workspace analytics loads and aggregates across all projects
- [x] Overview stats on main dashboard load

### Access by User Type

| Action | Owner | Team Admin | Team Member | Client Full | Client View |
|--------|-------|-----------|-------------|-------------|-------------|
| View project analytics | [ ] | [ ] | [ ] | [ ] | [ ] |
| View workspace analytics | [ ] | [ ] | [ ] | [ ] | [ ] |
| View overview stats | [ ] | [ ] | [ ] | [ ] | [ ] |

---

## MODULE 10 — AGENCY / CLIENT

> **Pre-test setup:**
> 1. Set `chikeokoliofficial@gmail.com` plan to `agency` in DB (or `owner`)
> 2. Have a fresh email ready for new-client tests
> 3. Chrome = agency account · Incognito = client account

### 10.1 White-Label Setup (Agency account)
- [x] Settings → White-label tab loads
- [x] Brand name saves and reflects in the sidebar
- [x] Logo upload works — logo appears in sidebar and nav
- [x] Primary colour picker saves — colour applied across UI
- [x] Page title (`<title>`) reflects agency brand name on every page (not just after refresh)
- [x] Favicon reflects agency icon on every page (not just after refresh)
- [x] Hard refresh (Ctrl+R) — brand name/icon loads without flash of default PagePersona branding
- [x] Navigating between pages — brand stays applied (no reset on route change)
- [x] Slug link works: `app.usepagepersona.com/join/[slug]` loads with agency branding

### 10.2 Custom Domain (skip if domain not ready)
- [x] Enter domain → CNAME instructions show correct target
- [x] After DNS propagates — verify domain button works, shows verified state
- [x] Verified domain: SDK script tag updates to use custom domain URL
- [x] `app.usepagepersona.com/login?slug=[slug]` shows agency branding

### 10.3 Invite New Client (no PagePersona account)
- [x] Agency → Clients → Invite Client
- [x] Enter email (fresh), set access **Full**, click Send
- [x] Client row appears with status **Pending**
- [x] Invite email arrives — agency brand name visible in email
- [x] Resend invite → new email arrives; old invite link now returns error
- [x] Cancel invite → row removed from client list
- [x] Re-invite same email (fresh invite for accept test)

### 10.4 New Client Accepts Invite
> Open in incognito

- [x] Click accept link → lands on `/client-accept?token=...`
- [x] Page shows agency brand name, logo, primary colour
- [x] Shows account creation form (name + password)
- [x] Fill in details, submit → redirected to dashboard
- [x] Dashboard shows agency branding throughout
- [x] No workspace switcher — workspace badge shown instead
- [x] Agency tab not visible in nav
- [x] Back in agency browser: client row status = **Active**

### 10.5 Invite Existing PagePersona User as Client
- [x] Invite `chovtechllc@gmail.com` (must already have PP account)
- [x] Email arrives — shows "Accept Invitation" button only (no signup form)
- [x] Accept → redirected to dashboard with both workspaces in switcher
- [x] Agency browser: row status = **Active**

### 10.6 Client Experience — Full Access
> Logged in as client, switched to agency workspace

- [x] Agency branding applied throughout
- [x] Nav shows: Dashboard, Projects, Rules, Popups, Countdowns, Analytics
- [x] Agency tab NOT visible
- [x] Can create a project
- [x] Can create rules, popups, countdowns
- [x] Can view analytics
- [x] Cannot see agency's own projects
- [x] Settings visible but billing tab hidden / read-only

### 10.7 Client Experience — View Only
> Agency → change client access to **View Only**

- [x] Nav shows only Dashboard and Analytics
- [x] Projects, Rules, Popups, Countdowns pages blocked (redirected or 403)
- [x] Analytics still loads
- [x] Cannot create anything

### 10.8 Revoke & Restore
- [x] Agency revokes client access → row = **Revoked**
- [x] Client browser (refresh) → **Access Revoked** page shown
- [x] Agency restores → client browser back to dashboard normally

### 10.9 Client Self-Signup via Slug (PagePersona domain)
- [x] Visit `app.usepagepersona.com/join/[slug]` in incognito (fresh email)
- [x] Agency branding shown on signup page
- [x] Fill in details, submit → redirected to dashboard with agency branding
- [x] New client row appears in agency's client list

### 10.10 Client Signs Up via Agency Custom Domain
> Requires Module 10.2 (custom domain verified). Skip this section if custom domain is not set up.
> This simulates a real agency customer who never sees PagePersona at all — they only see the agency's brand.

- [x] Visit `clients.[agencydomain.com]/join` in incognito (fresh email)
- [x] Page loads with agency branding only — no PagePersona name, logo, or colour visible anywhere
- [x] Browser tab title shows agency brand name (not "PagePersona")
- [x] Signup form works: fill name + email + password, submit
- [x] After submit → redirected to dashboard at custom domain, agency branding throughout
- [x] New client row appears in agency's client list with correct email
- [x] Client account is correctly linked to the agency's workspace (not a standalone PagePersona account)
- [X] Agency invite email arrives using agency brand name and custom domain link (not usepagepersona.com link)
- [X] Invite accept link goes to `clients.[agencydomain.com]/client-accept?token=...` not PagePersona URL

### 10.11 White-Label on WordPress Plugin
- [x] Agency has brand name set
- [x] Download WP plugin from any project → plugin filename uses agency brand name

### 10.12 Plan Gates on White-Label (Settings tab)
> Test with plans below Professional and Agency

| Plan | Brand name / logo / colour editable? | `hide_powered_by` toggle works? | Custom domain editable? |
|------|-------------------------------------|--------------------------------|------------------------|
| trial / fe / unlimited | locked (upgrade overlay shown) | locked | locked |
| professional | locked (upgrade overlay shown) | [ ] works | locked |
| agency | [ ] works | [ ] works | [ ] works |
| owner | [ ] works | [ ] works | [ ] works |

---

## MODULE 11 — TEAM MANAGEMENT

### 11.1 Invite New Team Members
- [x] Invite `legendchyke@gmail.com` as **Admin** → pending row + email arrives
- [x] Invite `noblechykeokoli@gmail.com` as **Member** → pending row + email arrives
- [x] Accept as new user — shows name + password form; redirect to dashboard
- [x] After accept: both workspaces visible in switcher (own + owner's)
- [x] Owner sees rows as **Active**

### 11.2 Invite Existing PagePersona Users
- [x] Invite existing user as Member → email shows "Accept Invitation" button only
- [x] Accept → their existing workspace + owner's workspace both in switcher

### 11.3 Team Member Access (logged in as Member, on owner's workspace)

**Can do:**
- [x] View all projects
- [x] Create/edit/delete rules
- [x] Create/edit/delete popups and countdowns
- [x] View analytics

**Cannot do:**
- [x] Create a new project — button hidden or 403 from backend
- [x] Edit existing project (name, URL, status)
- [x] Delete a project
- [x] See billing tab in Settings
- [x] See Team invite form in Settings
- [x] See Agency tab

### 11.4 Team Admin Access (logged in as Admin, on owner's workspace)

**Can do:**
- [x] Full CRUD on projects
- [x] Full CRUD on rules, popups, countdowns
- [x] View analytics
- [x] Invite team members (invite form visible in Settings → Team)
- [x] Remove team members (not the owner)

**Cannot do:**
- [x] Change workspace billing
- [x] Change member roles (role dropdown hidden or disabled)
- [x] See Agency tab (unless owner has agency plan)

### 11.5 Role Changes (as Owner)
- [x] Promote Member → Admin: invite form appears for them
- [x] Demote Admin → Member: invite form disappears

### 11.6 Edge Cases
- [x] Inviting owner's own email shows error
- [x] Inviting already-active member shows error
- [x] Resending invite rotates token — old link fails; new link works
- [x] Pasting a tampered token URL shows "Invalid invitation" error
- [x] Clicking an already-accepted link shows "Already accepted" screen

### 11.7 Remove Member
- [x] Owner removes a member → row disappears from list
- [x] Removed member's switcher no longer shows owner's workspace
- [x] Removed member's own workspace still works

---

## MODULE 12 — MEDIA LIBRARY

- [x] Click image zone in Popup Builder → library tray opens (not OS picker)
- [x] Click image zone in Rules swap_image → library tray opens
- [x] Click project thumbnail → library tray opens
- [x] Settings → workspace logo / icon → library tray opens
- [x] Library empty state shows upload button
- [x] Upload new image → appears in grid; auto-selected
- [x] Click existing image → highlighted with blue border + checkmark
- [x] Insert button disabled until image selected
- [x] Click Insert → image applied, tray closes
- [x] Images persist in library across page reloads
- [x] Delete image from library → removed from grid
- [x] Profile avatar uses direct OS file picker (no library)
- [x] Paste URL field still works in all ImageUploader instances
- [x] Files > 10 MB rejected
- [x] Non-image file types rejected

---

## MODULE 13 — AI FEATURES

> Use owner plan workspace so coins don't run out.
> Coin balance in topbar must update after every generation — verify each time.

### 13.1 Coin Balance (Topbar)
- [x] Balance shows correct number from DB on page load
- [x] Balance updates immediately after any AI action (no refresh needed)
- [x] Owner plan workspace shows ∞ (not a number)
- [x] While fetching, shows `—` (not 0 or blank)
- [x] Clicking coin badge opens dropdown
- [x] Dropdown shows balance + progress bar
- [x] Progress bar hidden for owner plan
- [x] Progress bar fills proportionally to plan allocation (e.g. 40/50 = 80% full)
- [x] "Top Up" link navigates to Settings → Billing tab
- [x] Client view-only user sees no coin badge

### 13.2 CopyWriter — New Rule (swap_text action)
- [x] "Write with AI · 5 coins" link appears below swap_text textarea
- [x] Panel opens inline
- [x] Goal textarea accepts input
- [x] Cmd/Ctrl + Enter triggers generation
- [x] Generate button disabled when goal is empty
- [x] Spinner shows during generation
- [x] 3 variants appear with text + rationale
- [x] "Use this" fills the textarea
- [x] Can apply a different variant (overwrites previous)
- [x] Closing panel resets state
- [x] Coin balance decrements by 5
- [x] Conditions set on the rule sent as context (variants reflect them)

### 13.3 CopyWriter — Edit Rule
- [x] Same as 13.2 — works on existing rule with swap_text action
- [x] Existing saved text is replaced when variant applied

### 13.4 CopyWriter — Live Picker (swap_text)
- [x] "Write with AI" appears in picker sidebar
- [x] Panel fits in narrow sidebar without overflow
- [x] Live element text sent as context (`current_text`)
- [x] Page URL sent as context
- [x] Applying variant fills sidebar textarea

### 13.5 CopyWriter — Popup Builder (Text block)
- [x] "Write with AI" appears below text content textarea
- [x] Panel opens inline in properties sidebar
- [x] No project selector needed (no projectId in popup context)
- [x] Applying variant fills the text block

### 13.6 CopyWriter — Popup Builder (Button label)
- [x] "Write with AI" appears below label input
- [x] Variants are short (≤ 5 words)
- [x] Applying variant fills btn_label field

### 13.7 CopyWriter — Popup Builder (No Thanks label)
- [x] "Write with AI" appears below no-thanks label input
- [x] Variants are short dismissal phrases (≤ 5 words)

### 13.8 CopyWriter — Brand Knowledge (About Brand)
- [x] "Write with AI · 5 coins" trigger appears below About Brand textarea
- [x] Panel opens with NO project selector (workspaceOnly mode)
- [x] Variants are brand-level copy, ~150 words
- [x] Applying variant fills the About Brand field
- [x] Saving Brand Knowledge persists the value

### 13.9 CopyWriter — Insufficient Coins
- [x] With 0 coins (non-owner plan), clicking Generate shows insufficient coins error
- [x] Error message shows current balance + required amount
- [x] No coins deducted when generation fails (backend error)
- [x] Error clears when panel is closed and reopened

### 13.10 Brand Knowledge Extract
- [x] Settings → Brand Knowledge → "Extract from URL" button
- [x] Enter a URL → all brand fields populated via AI (no coin cost)
- [x] Fields are editable after extraction
- [x] Save persists all fields

### 13.11 Project Description Extract
- [x] Description field required at project creation (< 10 chars blocked)
- [x] "Extract from URL" fills description via Sonnet (costs 3 coins)
- [x] Coin balance decrements by 3
- [x] User can edit extracted description before saving
- [x] Description persists on Edit project

### 13.12 Popup Content Generator
- [x] "Generate with AI · 5 coins" button in template picker header
- [x] Panel opens with project selector + goal textarea
- [x] Generate produces popup (layout, bg_color, blocks + copy)
- [x] Popup loads directly into editor
- [x] Image blocks have empty slots (user fills)
- [x] Countdown blocks present as empty slots (user wires)
- [x] Two-column layout generated when appropriate
- [x] Coin balance decrements by 5

### 13.13 Image Generator
- [x] "Generate with AI · 10 coins" trigger visible below upload zone
- [x] Popup Builder: project selector shown
- [x] Rules / Picker: no project selector (projectId auto-passed)
- [x] Prompt textarea accepts input
- [x] Style picker works: Photorealistic, Illustration, Anime, Abstract
- [x] W × H auto-populated from existing image if slot has image
- [x] Generation takes 10–20s — spinner shown
- [x] Generated image saved to R2 + appears in asset library
- [x] "Insert Image" applies URL to slot
- [x] Coin balance decrements by 10

### 13.14 AI Rule Suggestions
- [x] AI path option on New Rule page
- [x] User types a natural-language goal
- [x] Optional user prompt textarea is visible
- [x] Generate returns 3–5 ready rules with valid signals + actions (costs 15 coins)
- [x] Rules show recognisable selectors from the project's page scan
- [x] Accept an AI rule → saves to rules list
- [x] Coin balance decrements by 15

### 13.15 Analytics Insights
- [x] "Generate Insight · 8 coins" button on project insights page
- [x] Button disabled when no analytics data exists for the project
- [x] Generate returns a 3–4 sentence plain-English insight (costs 8 coins)
- [x] Insight references real numbers from the project's analytics
- [x] Insight history section shows past insights (newest first)
- [x] Coin balance decrements by 8

### 13.16 AI User Type Access

| Feature | Owner | Team Admin | Team Member | Client Full | Client View |
|---------|-------|-----------|-------------|-------------|-------------|
| CopyWriter | [ ] | [ ] | [ ] | [ ] | blocked |
| Image Generator | [ ] | [ ] | [ ] | [ ] | blocked |
| Rule Suggestions | [ ] | [ ] | [ ] | [ ] | blocked |
| Analytics Insights | [ ] | [ ] | [ ] | [ ] | blocked |
| Coins deducted from shared workspace pool | [ ] | [ ] | [ ] | [ ] | n/a |
| Owner: ∞ coins, no deduction shown | [ ] | n/a | n/a | n/a | n/a |

---

## MODULE 14 — BILLING & PLAN LIMITS

> Test every plan for every create action. Use direct DB updates to switch plans.
> `UPDATE entitlements SET plan = 'X' WHERE workspace_id = '...'`

### 14.1 Plan Limit Gates (Backend + Frontend)

For each plan below, verify the limits table is enforced both in the UI (button disabled / upgrade nudge) AND in the API (returns 402 on limit hit):

#### trial plan (1 project, 3 rules, 1 popup, 1 countdown, 0 clients, 20 coins)
- [x] Can create 1 project — 2nd project is blocked (upgrade message shown)
- [x] Can create 3 rules on a project — 4th rule is blocked
- [x] Can create 1 popup — 2nd popup is blocked
- [x] Can create 1 countdown — 2nd countdown is blocked
- [x] Invite Client button absent / blocked (0 client slots)
- [x] White-label tab shows upgrade overlay
- [x] Custom domain shows upgrade overlay

#### fe / Core plan (5 projects, 10 rules, 10 popups, 5 countdowns, 0 clients, 50 coins)
- [x] Can create 5 projects — 6th is blocked
- [x] Can create 10 rules — 11th is blocked
- [x] Can create 10 popups — 11th is blocked
- [x] Can create 5 countdowns — 6th is blocked
- [x] Invite Client blocked (0 slots)
- [x] White-label brand/logo/colour: upgrade overlay shown (agency required)
- [x] `hide_powered_by` toggle: upgrade overlay shown (professional required)
- [x] Custom domain: upgrade overlay shown (agency required)

#### unlimited plan (∞ projects/rules/popups/countdowns, 0 clients, 200 coins)
- [x] No limits on projects, rules, popups, countdowns — can create freely
- [x] Invite Client still blocked (0 slots)
- [x] White-label brand/logo/colour still blocked (not agency)
- [x] `hide_powered_by` still blocked (not professional)

#### professional plan (∞ resources, 0 clients, 200 coins)
- [x] No resource limits
- [x] `hide_powered_by` toggle saves correctly (branding removed)
- [x] White-label brand/logo/colour still blocked (not agency)
- [x] Custom domain still blocked (not agency)
- [x] Invite Client still blocked (0 slots)

#### agency plan (∞ resources, 100 clients, 200 coins — but use owner for ∞)
- [x] No resource limits
- [x] `hide_powered_by` toggle works
- [x] White-label brand name, logo, icon, primary colour all save
- [x] Custom domain field enabled and saves
- [x] Can invite clients up to 100 — 101st is blocked

#### owner plan (∞ everything)
- [x] Zero limits shown anywhere
- [x] No upgrade nudges visible
- [x] All features accessible
- [x] Coin balance shows ∞ — no deductions recorded

### 14.2 Plan Limits for Client Sub-Workspaces
- [x] Client sub-workspace uses the parent (agency) workspace's plan, not trial
- [x] Client on agency plan can create projects up to agency's project limit
- [x] Client hitting a limit sees "contact your agency" message — not an upgrade link

### 14.3 Upgrade Nudge Copy by User Type

| Plan / User | Hits limit | Expected message |
|-------------|-----------|-----------------|
| Owner workspace, limit hit | [ ] | "Upgrade to [next plan]..." with upgrade link |
| Team Admin / Member, limit hit | [ ] | "Ask the workspace owner to upgrade" (no upgrade link) |
| Client (full), limit hit | [ ] | "Contact your agency" (no upgrade link) |
| Owner plan user | [ ] | No limit message ever shown |

### 14.4 Soft Delete Quota Behaviour
- [ ] Delete an **unverified** project → project limit decrements (slot freed)
- [ ] Delete a **verified** project → slot NOT freed (still counts in quota)
- [ ] After deleting verified project: creating a new project still counts against total
- [ ] Deleted projects not visible in project list

### 14.5 Plan Expiry & Grace Period
- [ ] Set a yearly plan `expires_at` to yesterday in DB → plan still accessible (grace period active)
- [ ] Grace period banner visible in dashboard layout with days remaining
- [ ] Banner shows "Renew now" link
- [ ] Set `expires_at` to 8 days ago → plan locked to `fe` limits
- [ ] Locked plan: all limits drop to fe-plan values
- [ ] Restoring `expires_at` to future date → full plan access restored immediately

### 14.6 PayPal Coin Top-Up
- [ ] Settings → Billing → coin pack cards visible (Starter $7, Growth $27, Pro $67, Agency $197)
- [ ] Clicking "Buy" opens PayPal popup
- [ ] Popup defaults to card entry form (not PayPal login) — `landing_page: "BILLING"`
- [ ] Complete a test purchase (use PayPal sandbox or real card with small pack)
- [ ] After payment: popup closes; success toast shown
- [ ] Coin balance in topbar updates to reflect new balance
- [ ] `ai_coin_transactions` record created with `action_type = 'purchase'`
- [ ] Coin history in billing tab shows the purchase

### 14.7 Coin History
- [ ] Settings → Billing → coin history shows last 20 transactions
- [ ] Each row shows: action type, coins, date
- [ ] History ordered newest first

---

## MODULE 15 — REPORTS

> Path: Project page → Reports (icon in header) OR → Reports list page

### 15.1 Create & Send Report
- [x] Reports list page loads for a project
- [x] "Create Report" / "Send Report" button opens the send modal
- [x] Recipient email field required
- [x] Optional recipient name and message fields save
- [x] Optional period selector (7 / 14 / 30 days) saves
- [x] Send → report created; row appears in reports list with status **Sent**
- [x] Report email arrives at recipient email
- [x] Email contains project name, analytics summary, and message (if provided)

### 15.2 Public Report Page
- [x] Click "View Report" link in email → opens `/r/[token]`
- [x] Report page loads without requiring login
- [x] Shows project name, period, analytics data
- [x] Invalid / expired token shows appropriate error page

### 15.3 Resend Report
- [x] Resend button on report row → report email resent to original recipient
- [x] Can resend to a different email if field is editable

### 15.4 Access by User Type

| Action | Owner | Team Admin | Team Member | Client Full | Client View |
|--------|-------|-----------|-------------|-------------|-------------|
| View reports list | [ ] | [ ] | [ ] | [ ] | [ ] |
| Create/send report | [ ] | [ ] | [ ] | [ ] | blocked |
| Resend report | [ ] | [ ] | [ ] | [ ] | blocked |

---

## MODULE 16 — JVZOO WEBHOOK

> Use JVZoo IPN simulator or a real test purchase. Check DB after each action.

### 16.1 New Purchase (SALE transaction)
- [ ] POST to `/api/webhooks/jvzoo` with SALE + FE product ID
- [ ] New user created if email not in DB
- [ ] Entitlement row created with plan = `fe`
- [ ] Welcome email with magic link sent to buyer
- [ ] POST with SALE + Unlimited product ID → plan = `unlimited`
- [ ] POST with SALE + Professional product ID → plan = `professional`
- [ ] POST with SALE + Agency product ID → plan = `agency`
- [ ] POST with SALE + FastPass product ID → plan = `agency`
- [ ] POST with SALE + Bundle product ID → plan = `agency`
- [ ] POST with SALE + DFY product ID → no plan change (service only)
- [ ] POST with SALE + Self-Hosted product ID → no plan change (service only)

### 16.2 Plan Upgrade (existing user buys higher OTO)
- [ ] Existing `fe` user buys Unlimited → plan upgrades to `unlimited`
- [ ] Existing `unlimited` user buys Agency → plan upgrades to `agency`
- [ ] Existing `agency` user buys FE (re-purchase) → plan stays `agency` (no downgrade)
- [ ] Welcome email NOT sent to existing users on upgrade

### 16.3 Renewal (BILL transaction)
- [ ] BILL transaction for yearly plan → `expires_at` reset to NOW() + 365 days
- [ ] Plan itself does not change

### 16.4 Refund (RFND / CGBK transaction)
- [ ] RFND transaction → entitlement `status` set to `refunded`
- [ ] Refunded user loses plan access (drops to trial limits)

### 16.5 Signature Validation
- [ ] Request with invalid `cverify` signature → rejected (400 or 403)
- [ ] Request with valid signature → processed correctly

---

## MODULE 17 — SETTINGS PAGE (overall)

> Verify each tab loads and all actions work end-to-end.

### General Tab
- [x] Avatar upload, name update, email (read-only), change password all work
- [x] Workspace rename saves

### Team Tab
- [x] Team list loads with correct members and roles
- [x] Invite, resend, remove all work (cross-ref Module 11)
- [x] Team tab visible to owner and admin; form hidden for member role

### Billing Tab
- [x] Current plan name displayed correctly
- [x] Plan features list shown
- [x] Coin balance, allocation, and progress bar shown correctly
- [x] Coin history (last 20 transactions) loaded
- [x] Coin pack purchase buttons present and functional (cross-ref Module 14.6)
- [x] In-grace-period banner shown when applicable (cross-ref Module 14.5)
- [x] Billing tab visible to **owner only** — hidden for team members and clients

### Brand Knowledge Tab
- [x] All fields present: website_url, brand_name, industry, tone_of_voice, target_audience, key_benefits, about_brand
- [x] Save and retrieve works
- [x] "Extract from URL" populates all fields
- [x] CopyWriter on about_brand works (cross-ref 13.8)

### White-Label Tab
- [x] Tab visible to all users but content locked below required plan
- [x] Agency plan: brand name, logo, icon, primary colour editable
- [x] Professional plan: `hide_powered_by` toggle editable; brand/logo locked
- [x] Below professional: entire tab shows upgrade overlay
- [x] Custom domain field shown for agency plan only
- [x] DNS instructions appear when domain is entered
- [x] Agency slug link shown and works

---

## FINAL LAUNCH READINESS CHECKLIST

- [ ] All modules above fully tested with no open bugs
- [ ] All plan limits correct for every plan × resource combination
- [ ] JVZoo webhook tested for all product IDs (replace placeholders with real IDs)
- [ ] PayPal coin top-up completes end-to-end
- [ ] Magic link login works (JVZoo buyer flow)
- [ ] White-label branding has no flash on hard refresh or navigation
- [ ] Expiry grace period works — banner shown, locks after day 7
- [ ] Reports email lands in inbox (not spam)
- [ ] All AI features work with correct coin deductions
- [ ] App loads correctly on mobile (responsive check — no broken layouts)
- [ ] No JS errors in browser console on any main page
- [ ] Deploy clean: `~/deploy.sh` runs without errors; backend + frontend both healthy after deploy

---

## BUGS LOG

| # | Module | Description | Fixed | Date |
|---|--------|-------------|-------|------|
| | | | | |
