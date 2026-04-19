# TO-BE-DONE — PagePersona Launch Plan
> What's left to build and do before we launch on JVZoo.
> Updated: 2026-04-18

---


---

## PHASE 2 — Billing: Enforce Plan Limits

4. **Show real billing info in Settings** ✅ DONE
   Live plan, coin balance, usage meters, upgrade CTAs per plan, client workspace breakdown.

5. **Handle plan upgrades from JVZoo**
   When someone buys a higher plan on JVZoo, automatically update their account — upgrade plan + top up coins. Currently only works for brand new users, not existing ones buying a higher OTO.

6. **Let users buy more AI coins**
   Coin top-up packs ($7 / $27 / $67 / $197) shown on billing page. Currently sends an email request — full PayPal/Stripe integration is a later phase.

---

## PHASE 2B — Plan Enforcement (detailed build + test plan)

### What each plan can do

| Resource | trial | Core (fe) | Unlimited | Professional | Agency | Owner |
|---|---|---|---|---|---|---|
| Projects | 1 | 5 | ∞ | ∞ | ∞ | ∞ |
| Rules per project | 3 | 10 | ∞ | ∞ | ∞ | ∞ |
| Popups | 1 | 10 | ∞ | ∞ | ∞ | ∞ |
| Countdowns | 1 | 5 | ∞ | ∞ | ∞ | ∞ |
| Client accounts | 0 | 0 | 0 | 0 | 100 | ∞ |
| Remove branding | ✗ | ✗ | ✗ | ✅ | ✅ | ✅ |
| White-label dashboard (brand/logo/color) | ✗ | ✗ | ✗ | ✗ | ✅ | ✅ |
| Custom domain | ✗ | ✗ | ✗ | ✗ | ✅ | ✅ |
| AI coins | 20 | 50 | 200 | 200 | 200 | ∞ |

---

### Backend — what to build

#### A. Fix plan lookup for client sub-workspaces ❌
`enforce_plan_limit()` looks up the plan by `workspace_id`. Client sub-workspaces have no entitlement row of their own — the entitlement is on the parent (agency) workspace. Right now any create inside a client workspace defaults to trial limits immediately.
- Fix: in `enforce_plan_limit()`, check if `workspace_id` has a `parent_workspace_id` — if so, use the parent's `workspace_id` for the plan lookup.
- Same fix needed in `billing.py` `_get_plan()` helper.

#### B. Backend 402 gates — status

| Endpoint | Resource gated | Status |
|---|---|---|
| `POST /api/projects` | projects | ✅ done |
| `POST /api/projects/{id}/rules` | rules_per_project | ✅ done |
| `POST /api/popups` | popups | ✅ done |
| `POST /api/countdowns` | countdowns | ✅ done |
| `POST /api/clients/invite` | client_accounts | ❌ missing |

#### C. White-label feature gating ❌
Currently any owner can save white-label settings regardless of plan. Backend needs to enforce:
- `hide_powered_by = true` → reject unless Professional, Agency, or Owner
- Brand name / logo / icon / primary color → reject unless Agency or Owner
- Custom domain save/verify → reject unless Agency or Owner
- Gate in: `PATCH /api/workspaces/{id}`

---

### Frontend — what to build

#### D. Create button gates ❌
Every "create" button needs to check usage vs limit before the user clicks. When at limit, the button is disabled and shows an inline upgrade nudge. No silent API failure.

| Button / action | Page | Gate needed |
|---|---|---|
| New Project | `/dashboard` project list | projects limit |
| Add Rule | `/dashboard/projects/[id]/rules` | rules_per_project limit |
| New Popup | `/dashboard/elements` popups tab | popups limit |
| New Countdown | `/dashboard/elements` countdowns tab | countdowns limit |
| Invite Client | `/dashboard/agency` | client_accounts limit |
| White-label settings form | Settings → White Label tab | agency plan check |
| Custom domain form | Settings → White Label tab | agency plan check |
| Remove branding toggle | Settings → White Label tab | professional plan check |

#### E. Upgrade nudge copy — by stakeholder
- **Owner** → "You've reached your [plan] limit. Upgrade to [next plan] to get more."
- **Team member (admin/member)** → "This workspace has reached its limit. Ask the workspace owner to upgrade."
- **Client (full access)** → No upgrade path — they can't buy. Show: "Your agency account has reached its limit. Contact your agency."
- **Client (view-only)** → Can't create anything — no gates needed.
- **Owner plan** → Never shown any limit or upgrade message.

---

### Test plan — verify plan by plan, stakeholder by stakeholder

When building is done, manually test each row:

#### Plan tests (logged in as workspace owner)
- [ ] **trial** — can create 1 project, 1 popup, 1 countdown, 3 rules. 2nd of each is blocked with upgrade message.
- [ ] **Core (fe)** — can create 5 projects, 10 popups, 5 countdowns, 10 rules. 6th project blocked. White-label tab visible but saving branding/domain blocked.
- [ ] **Unlimited** — projects/rules/popups/countdowns all unrestricted. Client invite button hidden (0 slots). White-label blocked.
- [ ] **Professional** — same as Unlimited. Remove branding toggle works and saves. White-label brand/logo still blocked. Custom domain blocked.
- [ ] **Agency** — everything unrestricted. Client invite works up to 100. White-label brand/logo/domain all work.
- [ ] **Owner** — zero limits shown anywhere. All features open.

#### Stakeholder tests (with Core plan workspace as the base)
- [ ] **Team admin** — hits project limit → sees "ask owner to upgrade" message (not upgrade link).
- [ ] **Team member** — same as admin for limits. Cannot see billing tab (only owner can).
- [ ] **Agency → client workspace (full access)** — agency plan applies, not trial. Client can create projects up to agency limit.
- [ ] **Agency → client workspace (view-only)** — no create buttons shown at all.
- [ ] **Client (full access)** — hitting limit shows "contact your agency" not upgrade link.
- [ ] **Owner plan user** — no limits, no upgrade nudges anywhere.

---

## PHASE 3 — Plan Expiry

7. **Expire plans that are not renewed**
   Yearly plans need to lock when they expire. We give a 7-day grace period with three reminder emails (day 1, day 4, day 7). On day 8, the account is locked to the free limits. Nothing is ever deleted — they just lose access to the extras until they renew.

---

## PHASE 4 — Launch Pages & JVZoo Setup

8. **Main sales page** (`usepagepersona.com`)
   The marketing page people land on before buying. Shows what PagePersona does, who it's for, what they get, and the price.

9. **FastPass page**
   Shown to buyers who skip the Bundle offer at checkout. A shorter offer at a lower price — last chance to get everything bundled before going through the full step-by-step pages.

10. **OTO pages (5 pages)**
    One page per upgrade offer shown after the main purchase:
    - Unlimited — remove all limits
    - Professional — remove PagePersona branding
    - Agency — manage clients under your own brand
    - DFY — Chike sets everything up for them (20 slots/month)
    - White Label Self-Hosted — full deployment on their own server

11. **Thank-you pages**
    Shown after each purchase. Tells the buyer what they just got and how to log in.

12. **Set everything up on JVZoo**
    Create the product listings, connect the payment links, set up the affiliate programme, configure the Bundle coupon code for the webinar, and schedule the webinar during the 5-day launch window.

---

## PHASE 5 — Pre-Launch Checks (Before Going Live)

- All plan limits work correctly and show the right upgrade message
- Buying on JVZoo creates the account and gives the right plan
- Buying a second product upgrades an existing account correctly
- Buying AI coins via PayPal adds them instantly
- Expiry emails send correctly
- All sales pages and thank-you pages are live and working
- Server uptime monitoring is set up (UptimeRobot — free, takes 10 minutes)
- DFY slot tracker is ready (a simple spreadsheet tracking the 20 slots per month)
- All tests pass and the app is running clean on the server

---

## AFTER LAUNCH

- Keep the webinar replay page live so late buyers can still find and watch it
- Check monthly that AI coin revenue is covering the AI usage costs
- Extract the shared code into reusable building blocks so Product 2 (AvatarFlow) launches faster
