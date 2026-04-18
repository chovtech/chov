# TO-BE-DONE — PagePersona Launch Plan
> What's left to build and do before we launch on JVZoo.
> Updated: 2026-04-18

---

## PHASE 1 — Finish the AI Features

1. **Analytics Insights**
   The AI tip card already exists on the project page (the blue card). Right now it shows a fixed message. We need to make it generate a real AI insight based on actual visitor data — telling the user what's working, what's not, and what to do next. There will also be a page where all past insights are saved, linked from the analytics tab.

2. **Send Report button**
   The backend for this is already built. We just need to turn the button on. Any user (not just agency users) can type an email address and send a summary of their project's analytics to anyone they want.

---

## PHASE 2 — Billing: Enforce Plan Limits

3. **Stop users when they hit their plan limit**
   Right now nothing stops a free user from creating unlimited projects or rules. We need to add those checks. When someone hits their limit, they get a clear message telling them which plan to upgrade to, with a link to buy it.

4. **Show real billing info in Settings**
   The billing tab in Settings currently shows placeholder content. We need to show the user's actual plan, how many AI coins they have left, when their plan expires, and how much of their limits they've used.

5. **Handle plan upgrades from JVZoo**
   When someone buys a higher plan on JVZoo, we need to automatically update their account — give them the new plan and add the extra coins that come with it. Currently this only works for brand new users, not existing ones.

6. **Let users buy more AI coins (via PayPal)**
   When a user runs out of AI coins, they should be able to buy more without changing their plan. Four pack sizes: $7, $27, $67, or $197. PayPal handles the payment and coins are added instantly.

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
