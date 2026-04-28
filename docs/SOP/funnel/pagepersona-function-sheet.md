# PagePersona — Complete Function Sheet
> Every capability the platform has. Use this as the source of truth when writing sales copy.
> Organised by what the user DOES, not by backend module.

---

## WHAT IS PAGEPERSONA?

PagePersona is a personalisation and conversion platform that makes any sales page, landing page, or website smart. It detects who is visiting — their behaviour, location, device, referral source, time of day — and automatically changes what they see in real time: swapping text, images, links, showing popups, hiding sections, and inserting countdown timers — all without touching code.

---

## 1. PROJECTS (Your Pages)

- Connect any web page to PagePersona by pasting its URL
- Platform auto-detects: HTML, WordPress, Shopify, Webflow, GoHighLevel, ClickFunnels, Systeme.io, Framer, and more
- One unique script tag per project — install once, works forever
- PagePersona scans the page and maps all headings, CTAs, images, and sections automatically
- Add custom elements (CSS selectors) the scanner missed
- Status toggle: set a project Active or Draft (Draft = rules paused, SDK fires nothing)
- Thumbnail upload for visual organisation
- Download a pre-configured WordPress plugin — script ID already embedded, zero setup
- "Send to developer" — one-click email with install instructions, branded per agency

---

## 2. RULES ENGINE — SIGNALS (Triggers)

Rules fire when a visitor matches a condition. 15 signal types available:

| Signal | What it detects |
|--------|----------------|
| `page_view` | Every page load — fires immediately |
| `visit_count` | How many times this visitor has been to the page (1st visit, 3rd visit, 10th visit…) |
| `time_on_page` | Seconds spent on page (e.g. fire after 30 seconds) |
| `scroll_depth` | How far down the page they scrolled (e.g. 50%, 75%, 100%) |
| `exit_intent` | Cursor moves toward browser close/back — last chance before they leave |
| `day_time` | Visitor's local time (e.g. show a "morning deal" before 12pm, evening urgency after 6pm) |
| `utm_source` | Traffic source in URL (e.g. `facebook`, `email`, `google`) |
| `utm_medium` | Traffic medium (e.g. `cpc`, `social`, `newsletter`) |
| `utm_campaign` | Specific campaign name in URL |
| `referrer_url` | The page they came from (e.g. specific blog post, competitor site) |
| `device_type` | Desktop, Mobile, or Tablet |
| `browser` | Chrome, Firefox, Safari, Edge, etc. |
| `os` | Windows, Mac, iOS, Android, Linux |
| `geo_country` | Visitor's country — resolved on the server, not guessable by visitors |
| `visitor_timezone` | Visitor's timezone string (e.g. `America/New_York`) |

**Condition logic:** AND (all must match) or OR (any one triggers the rule)

**Operators available:** `is`, `is not`, `contains`, `equals`, `is greater than`, `is less than`, `is between`, `is detected`

---

## 3. RULES ENGINE — ACTIONS (What Happens)

When a rule fires, it executes one of 7 actions — all without page reload:

| Action | What it does |
|--------|-------------|
| `swap_text` | Replaces any text on the page (headline, CTA, body copy, button label) with personalised copy |
| `swap_image` | Replaces any image on the page with a different one (product shot, hero image, testimonial photo) |
| `swap_url` | Changes any link's destination (send different traffic to different landing pages) |
| `hide_section` | Makes any element invisible (hide irrelevant offers, remove distracting sections) |
| `show_element` | Makes a hidden element visible (reveal a bonus for returning visitors, show a VIP section) |
| `show_popup` | Triggers a fully designed popup (opt-in, offer, warning, video embed) |
| `insert_countdown` | Injects a live countdown timer anywhere on the page |

---

## 4. POPUPS BUILDER

Full drag-and-drop popup builder — no extra tools needed:

**10 layout templates** to start from

**Block types:**
- Text block (with AI copywriter built in)
- Image block (with AI image generator built in)
- Button block
- Embed block (YouTube, Vimeo, any iframe)
- No Thanks link
- Two-column layout (columns block)

**12 position options:** Centre modal, fullscreen overlay, top bar, bottom bar, all 4 corners, slide-in variations

**Styling controls:**
- Background colour picker
- Background image (from media library)
- Border radius
- Padding
- Width
- Overlay (dark background behind popup)
- Close button (show/hide)

**Display controls:**
- Display delay (show after X seconds)
- Frequency (show once per session, once per day, always)
- Animation: Fade, Slide, Zoom

**Dynamic tokens:** `{country}` — renders visitor's country in any text block automatically

**Countdown inside popup:** embed a live countdown timer directly inside any popup block

---

## 5. COUNTDOWN TIMERS

- **Fixed-date countdown:** counts down to a specific date and time (evergreen launches, limited offers)
- **Duration countdown:** per-session timer stored in browser — persists across page reloads, resets for each new session

**Expiry actions when timer hits zero:**
- `hide` — element disappears
- `redirect` — visitor sent to another URL
- `message` — custom message displayed

---

## 6. REAL-TIME SYNC (Cache & Hash System)

- Rules update on live pages within ~30 seconds — no page reload needed
- Popup and countdown configs versioned by hash — visitors always get the latest version
- Draft projects fire nothing — safe to edit without affecting live traffic

---

## 7. ANALYTICS

**Project-level analytics:**
- Total visits
- Unique visitors
- New vs returning visitor split
- Rules fired count
- Personalisation rate (% of visits where at least one rule fired)
- Average time on page
- Average scroll depth
- Daily visit chart (selectable period: 7 / 14 / 30 / 90 / 180 / 365 days)
- Top countries table
- Traffic sources (referrer breakdown)
- Device split (Desktop / Mobile / Tablet)
- Rules performance table (which rules fired most, unique sessions affected)
- Recent visits list (live feed of individual visits)

**Workspace-level analytics:** aggregated view across all projects

**Dashboard overview:** top-level stats card on the main dashboard

---

## 8. AI — COPYWRITER (5 coins per use)

Generates 3 personalised copy variants in seconds:

- Works on: rule swap_text field, popup text blocks, popup button labels, popup no-thanks labels, brand knowledge about-brand field, live element picker
- Context stack: pulls in brand knowledge + project description + current text on page + visitor conditions set on the rule + user's goal
- Each variant comes with a rationale explaining why it works
- Apply a variant with one click — fills the field; can swap to a different variant instantly

---

## 9. AI — IMAGE GENERATOR (10 coins per use)

Generates images using fal.ai Flux Dev model:

- 4 style presets: Photorealistic, Illustration, Anime, Abstract
- Auto-detects dimensions from existing image in the slot
- User-editable width and height
- Generated image saved to R2 (cloud storage) + added to asset library automatically
- Works on: popup image blocks, rule swap_image action, live picker swap_image

---

## 10. AI — POPUP CONTENT GENERATOR (5 coins per use)

Generates a complete popup from a goal description:

- Picks layout, background colour, and all blocks
- Writes all copy (headline, body, button, no-thanks)
- Includes image block slots (user fills with their images or generates with AI)
- Includes countdown block slots (user wires to an existing countdown)
- Two-column layouts generated when appropriate
- Loads directly into the popup editor — ready to customise and save

---

## 11. AI — RULE SUGGESTIONS (15 coins per use)

AI reads your page's scanned elements + brand knowledge → suggests 3–5 complete rules:

- Each rule has conditions (real signals from your 15 signal types) and actions (targeting real selectors from your page scan)
- User types a natural-language goal ("increase conversions for Facebook traffic")
- Returns ready-to-save rules — one click to accept and add to your rules list

---

## 12. AI — ANALYTICS INSIGHTS (8 coins per use)

- Reads your project's visit data, rule fire counts, and visitor breakdown
- Generates a plain-English insight summary (3–4 sentences)
- Explains what's working, what's underperforming, and what to test
- Insight history stored — see all past insights, newest first
- Button disabled when project has no data yet

---

## 13. AI — PROJECT DESCRIPTION EXTRACT (3 coins per use)

- Paste your page URL at project creation
- AI scrapes the page and writes a 4–6 sentence description of what the page sells
- Description used as context for all AI features (copywriter, rule suggestions, image generator)
- Editable before saving

---

## 14. AI — BRAND KNOWLEDGE EXTRACT (free)

- Enter your website URL in Settings → Brand Knowledge
- AI scrapes your site and fills in: brand name, industry, tone of voice, target audience, key benefits, about brand
- Used as context for all AI copywriting across every project

---

## 15. AI COINS SYSTEM

- Every workspace has a coin balance
- Coins are spent per AI action (see costs above)
- Coin balance visible in topbar at all times — updates live after every action
- Coin history: full transaction log in Settings → Billing
- Top-up packs available: Starter, Growth, Pro, Agency (via PayPal, card entry by default)
- Owner plan: unlimited coins, no deductions

---

## 16. MEDIA LIBRARY

- Centralised image storage for the workspace
- Used by: popup image blocks, rule swap_image, project thumbnail, workspace logo
- Upload once, reuse across all projects
- Max 10MB per image — JPEG, PNG, GIF, WebP, SVG
- Delete images from library
- Also supports paste-URL for external images

---

## 17. LIVE ELEMENT PICKER

- Opens a live version of your page inside PagePersona
- Hover over any element to highlight it
- Click to select — CSS selector captured automatically
- Write copy with AI directly in the picker sidebar
- Swap image with AI-generated image directly in the picker sidebar

---

## 18. TEAM MANAGEMENT

- Invite unlimited team members by email
- Two roles: Admin (full project CRUD + can invite others) and Member (rules/popups/countdowns only — cannot create/edit/delete projects)
- Pending invite row shown until accepted
- Resend invite (rotates token — old link invalidated)
- Remove member at any time
- Team member gets their own workspace + access to the shared workspace

---

## 19. AGENCY / WHITE-LABEL

**For agencies reselling PagePersona under their own brand:**

- Set custom brand name, logo, icon, primary colour — applied across the entire platform
- `hide_powered_by` toggle — removes PagePersona branding from all client-facing surfaces
- Custom domain (e.g. `clients.youragency.com`) — clients never see PagePersona URLs
- Agency signup link (`/join/[slug]`) — clients sign up directly under your brand
- Client workspaces: isolated, clients only see their own projects — never the agency's
- Client access levels: Full (can create projects, rules, popups) or View Only (dashboard + analytics only)
- Revoke and restore client access instantly
- All emails (invite, welcome, install instructions, reports) sent under your brand name
- WordPress plugin download uses your brand name and domain
- SDK script tag shown to clients uses your custom domain URL

**Client plan inheritance:** clients use the parent agency's plan limits — no separate subscription needed

---

## 20. REPORTS

- Send analytics reports to any email address (clients, stakeholders)
- Customise: recipient name, personal message, period (7 / 14 / 30 days)
- Report email branded with agency name, logo, and colour
- Public report link (`/r/[token]`) — no login required to view
- Report URL uses agency's custom domain if verified
- Resend report at any time

---

## 21. PLATFORM COMPATIBILITY

Works on any platform that allows a script tag in the `<head>`:

- HTML / Static pages
- WordPress (plugin available — zero-config install)
- Shopify
- Webflow
- GoHighLevel
- ClickFunnels
- Systeme.io
- Framer
- Any other platform (Other)

---

## 22. PLAN TIERS

| Plan | Projects | Rules | Popups | Countdowns | Clients | Coins |
|------|---------|-------|--------|------------|---------|-------|
| Trial | 1 | 3 | 1 | 1 | 0 | 20 |
| Core (FE) | 5 | 10 | 10 | 5 | 0 | 50 |
| Unlimited | ∞ | ∞ | ∞ | ∞ | 0 | 200 |
| Professional | ∞ | ∞ | ∞ | ∞ | 0 | 200 |
| Agency | ∞ | ∞ | ∞ | ∞ | 100 | 200 |
| Owner | ∞ | ∞ | ∞ | ∞ | ∞ | ∞ |

Professional adds: `hide_powered_by` toggle
Agency adds: white-label brand/logo/colour + custom domain + client workspaces
