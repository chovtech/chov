# BILLING PLAN — PagePersona

---

## 1. THE FUNNEL (What We Sell & In What Order)

```
FE checkout ($37 one-time)
    └── Bump: Bundle ($267/yr — $317/yr without coupon)
              Includes: Unlimited + Professional + Agency

IF Bundle YES  ──────────────────────────────────────────────────────────
    └── DFY ($147 one-time)
            └── White Label Self-Hosted ($497 one-time)

IF Bundle NO
    └── FastPass ($230/yr)  ← same bundle as above, lower price, second-chance offer
        IF FastPass YES  ─────────────────────────────────────────────────
            └── DFY ($147 one-time)
                    └── White Label Self-Hosted ($497 one-time)
        IF FastPass NO
            └── Individual OTOs:
                    OTO 1: Unlimited         ($67/yr)
                    OTO 2: Professional      ($47/yr)
                    OTO 3: Agency            ($197/yr)
                    OTO 4: DFY               ($147 one-time)
                    OTO 5: White Label Self-Hosted  ($497 one-time)
```

**Notes:**
- Bundle and FastPass are the same product (Unlimited + Professional + Agency bundled, yearly). Bundle is the bump offer at the higher price ($267/yr). FastPass is the second-chance offer shown immediately after someone declines the Bundle bump, at a lower price ($230/yr).
- Saying NO to any individual OTO does not exit the funnel — the buyer still sees every remaining OTO in sequence.
- DFY and White Label Self-Hosted are services, not software. They are always one-time and always come last.
- Professional includes all Unlimited features. A buyer who skips OTO 1 and buys OTO 2 still gets unlimited limits as part of Professional. Each higher plan includes everything below it.

---

## 2. WHAT EACH PLAN INCLUDES

### Trial (free, auto-assigned on signup — not shown on JVZoo launch, reserved for future use)
- 1 project
- 3 rules per project
- 1 popup
- 1 countdown timer
- 1 workspace
- 0 client accounts
- 20 AI coins (one-time allocation, never resets)
- "Powered by PagePersona" shown on all pages

### FE — Core ($37 one-time)
- 5 projects
- 10 rules per project
- 10 popups
- 5 countdown timers
- 1 workspace
- 0 client accounts
- 50 AI coins (one-time allocation, never resets)
- "Powered by PagePersona" shown on all pages

### Unlimited — OTO 1 ($67/yr)
Everything in FE, plus:
- Unlimited projects
- Unlimited rules per project
- Unlimited popups
- Unlimited countdown timers
- 200 AI coins (one-time; added on purchase, never resets monthly)
- Priority support

### Professional — OTO 2 ($47/yr)
Everything in Unlimited, plus:
- "Powered by PagePersona" branding removed everywhere
- Custom sender name on system emails
- Branded email templates (their logo + colour)
- Advanced analytics exports
- 200 AI coins (same pool, not separate)

### Agency — OTO 3 ($197/yr)
Everything in Professional, plus:
- 100 client sub-accounts
- Full white-label: custom domain, logo, brand colour
- Agency-branded login / signup / forgot-password pages
- Branded client invite and onboarding emails
- Client management dashboard
- DFY promotional website template (downloadable HTML)
- Reseller rights included (sell PagePersona as their own product)
- 500 AI coins (one-time; added on purchase)

### DFY — OTO 4 ($147 one-time) [SERVICE]
- No software entitlement change
- Chike personally sets up their first 3 projects
- Configures their first 5 personalisation rules
- Installs their white-label branding (if Agency)
- 1-hour live onboarding call
- Cap: 20 slots/month. Closes when full. Reopens next month.
- Fulfilled by email — buyer receives a calendar booking link after purchase

### White Label Self-Hosted — OTO 5 ($497 one-time) [SERVICE]
- No software entitlement change
- Chike deploys a full PagePersona instance on THEIR VPS
- Their domain, their brand, their pricing, their customers
- They sell it as their own SaaS — PagePersona is invisible
- Includes 3 months of free updates and redeployments
- After 3 months: optional $397/year support + update plan
- If they don't renew: their instance still works, no new features pushed

### Owner (internal — never public)
- `plan = 'owner'` in the entitlements table
- Bypasses every limit check and every feature gate
- Unlimited AI coins — deductions are skipped entirely
- Assigned manually by Chike via direct DB insert
- No badge, label, or UI indicator — invisible to the user

---

## 3. FEATURE LIMITS BY PLAN

| Feature | Trial | FE | Unlimited | Professional | Agency |
|---------|-------|----|-----------|--------------|--------|
| Projects | 1 | 5 | Unlimited | Unlimited | Unlimited |
| Rules per project | 3 | 10 | Unlimited | Unlimited | Unlimited |
| Popups | 1 | 10 | Unlimited | Unlimited | Unlimited |
| Countdown timers | 1 | 5 | Unlimited | Unlimited | Unlimited |
| Workspaces | 1 | 1 | Unlimited | Unlimited | Unlimited |
| Client accounts | 0 | 0 | 0 | 0 | 100 |
| Remove branding | ✗ | ✗ | ✗ | ✅ | ✅ |
| White-label (domain/logo) | ✗ | ✗ | ✗ | ✗ | ✅ |
| AI coins (one-time) | 20 | 50 | 200 | 200 | 500 |

---

## 4. AI COINS

### How it works
- Every workspace gets a one-time coin allocation when they sign up or upgrade
- Coins never reset monthly — what you get is what you have until you buy more
- When balance hits 0, AI features are locked until recharged
- Owner plan: coins are never deducted

### Coin Allocation
| Plan | Coins | When |
|------|-------|------|
| Trial | 20 | On signup |
| FE | 50 | On purchase (replaces trial 20) |
| Unlimited | +150 | Added on upgrade (total becomes 200) |
| Professional | No additional coins | Same pool as Unlimited |
| Agency | +300 | Added on upgrade (total becomes 500) |
| Owner | Unlimited | Deductions skipped |

### Coin Costs Per Action
| Action | Cost |
|--------|------|
| Write copy (CopyWriter) | 5 coins |
| Generate image | 10 coins |
| Popup content generation | 5 coins |
| Project description (AI) | 3 coins |
| Analytics insights | 8 coins |
| Rule creation via AI | 15 coins |
| Rule suggestion | 3 coins |

### Coin Recharge Packs (via PayPal)
Buyers can top up coins at any time without a plan change:

| Pack | Coins | Price |
|------|-------|-------|
| Starter | 100 | $7 |
| Growth | 500 | $27 |
| Pro | 2,000 | $67 |
| Agency | 10,000 | $197 |

---

## 5. PLAN UPGRADES & ENTITLEMENTS

### How plans are stored
- One row per workspace in the `entitlements` table
- `plan` column holds the highest plan the workspace holds: `trial`, `fe`, `unlimited`, `professional`, `agency`, `owner`
- Plans are additive — buying Professional assumes Unlimited features are included

### JVZoo purchase flow
1. Buyer completes JVZoo checkout
2. JVZoo sends IPN (Instant Payment Notification) to our webhook
3. Webhook verifies the IPN, identifies the workspace by email
4. Updates `entitlements.plan` to the new plan
5. Seeds additional coins if applicable
6. Sends confirmation email

### Plan hierarchy (each includes everything below it)
```
owner > agency > professional > unlimited > fe > trial
```

---

## 6. PLAN EXPIRY (Recurring Plans)

Applies to: Unlimited ($67/yr), Professional ($47/yr), Agency ($197/yr), Bundle/FastPass ($230–267/yr)

### What happens when a plan expires
1. Day 0: Plan expires — `entitlements.expires_at` is now in the past
2. Grace period: 7 days — plan stays active, renewal email sent (day 1, day 4, day 7)
3. Day 8: Plan locked — downgraded to FE entitlements
4. Existing rules, popups, and projects are NEVER deleted — only locked if over FE limits
5. Buyer can renew at any time to restore full access

### What "locked" means
- Rules over the FE limit (10 per project): still stored, not evaluated by SDK until renewed
- Projects over the FE limit (5): existing ones visible, new ones blocked
- Client accounts: access suspended, not deleted

---

## 7. WHAT IS ALREADY BUILT

| Feature | Status |
|---------|--------|
| Trial entitlement created on signup | ✅ Built |
| `ai_coins` row seeded on signup (balance=20) | ✅ Built |
| `PLAN_LIMITS` constant in backend | ✅ Built |
| `PLAN_COIN_ALLOCATIONS` constant | ✅ Built |
| Coin deduction middleware | ✅ Built |
| AI coin transaction logging | ✅ Built |
| JVZoo IPN webhook (new user path) | ✅ Built |
| Feature gate enforcement on create endpoints | ❌ Not yet |
| Frontend 402 handler (upgrade prompt) | ❌ Not yet |
| JVZoo IPN: existing user upgrade path | ❌ Not yet |
| Plan expiry + grace period emails | ❌ Not yet |
| Coin recharge via PayPal | ❌ Not yet |
| Settings billing tab (show plan + coins) | ❌ Not yet |

---

## 8. IMPLEMENTATION ORDER

1. **Feature gates** — add limit checks on all create endpoints; return HTTP 402 `plan_limit_reached` when over limit
2. **Frontend 402 handler** — intercept 402 responses, show upgrade modal pointing to JVZoo OTO link
3. **JVZoo IPN: existing user upgrade** — when a known email buys a higher OTO, update their entitlement
4. **Settings billing tab** — show current plan, coin balance, expiry date, recharge link
5. **Plan expiry + grace emails** — cron job checks `expires_at`, sends 3 emails, locks on day 8
6. **Coin recharge packs via PayPal** — post-launch; PayPal IPN adds coins to workspace balance
