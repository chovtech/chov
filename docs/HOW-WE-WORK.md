# How We Work & Locked Decisions

## HOW WE WORK (NON-NEGOTIABLE)

- Give **ONE command** → Chike runs it → pastes output → continue
- **Never** give multiple options and ask Chike to choose
- **Always read a file before editing it** — never write blind
- Chike **never manually edits files** — always provide the exact command
- **Live (`app.usepagepersona.com`) is the default testing environment**
- Work autonomously — do not ask for approval before editing files
- Do not ask clarifying questions mid-task — make a decision and proceed
- Only stop and ask if something is genuinely ambiguous or destructive

---

## LOCKED DECISIONS (never revisit)

- No onboarding flow — JVZoo buyers are self-selected marketers
- No 'Projects' in sidebar — Home shows all projects
- 'Project' not 'Campaign'
- Manual rules first, AI later (coins model — see FUNNEL-ANALYSIS.md)
- Publish = rose/red, Draft = blue
- `pp.js` not `sdk.js`
- Polyglot backend — Node for SaaS, Python for AI-heavy
- Ship first, extract Chov Libraries after first sales
- `app.` runs on port 3001 on VPS
- ImageUploader everywhere — no bare URL fields
- Translation-first — never after
- Popup config embedded in rule at save — no runtime API call
- PopupPicker must be stateless — hooks in parent only
- Only `{country}` token — no other tokens
- Geo resolved server-side — pp.js never calls geo API directly
- `inject_token` and `send_webhook` permanently removed
- Firmographics + `geo_city` signals permanently removed
