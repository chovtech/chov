# CHOV INFRASTRUCTURE
## Library & Architecture Master Plan

> **The constitution of everything built under the Chov name.**
>
> This document defines the structure, vocabulary, and architecture of the Chov Infrastructure. Every product launched — individually on JVZoo or collectively as chov.ai — is built from the same building blocks, follows the same folder structure, and contributes back to the same shared library. Read this before writing a single line of code on any Chov product.

---

## Contents

| Section | Section |
|---|---|
| 01 Purpose & Vision | 08 Chov.ai Master Architecture |
| 02 The Complete Vocabulary | 09 Database Schema |
| 03 UI Components | 10 JVZoo → Chov Account Flow |
| 04 Packages | 11 Folder Structure |
| 05 Modules | 12 Naming Conventions |
| 06 Engines | 13 Build Order & Extraction Strategy |
| 07 How Engines Are Shared | 14 Launch First Rule |

---

## 01 · Purpose & Vision

### What This Infrastructure Is

The Chov Infrastructure is not a component library. It is not a design system. It is the complete shared foundation that every Chov product is built on — so that each new product launch takes less time than the last, until launching a product takes weeks instead of months.

Every product you build for the JVZoo marketing niche shares the same needs: authentication, billing, onboarding, dashboards, emails, analytics. Build each of these once — properly, with all edge cases handled — and every new product is mostly assembly, not construction.

> *The goal: Launch PagePersona as Product 1. Extract the library from it. Launch Product 2 in 60% of the time. Product 3 in 40%. By Product 5 you are assembling and configuring — not building from scratch.*

### The Long-Term Vision — Chov.ai Suite

Every product launched individually on JVZoo is simultaneously a brick in the chov.ai suite. PagePersona launches as a standalone product. So does Qualifr. So does the Video Generator. Each one is its own JVZoo listing, its own domain, its own product. But underneath, every one of them runs on the same infrastructure, the same database, the same authentication system, the same billing layer.

Products can also be grouped into Packs — two or more products bundled and sold together as one market offering. A Pack is still a sales-layer grouping; underneath, each product in a Pack is still its own independently-built Product running on the shared infrastructure.

When enough products exist — you flip one switch. chov.ai opens its front door. Every customer who ever bought a Chov product on JVZoo already has a Chov account. All their products are already inside it. You send one email. That email is the chov.ai launch.

> *How the biggest suites were built: Zoho started as one spreadsheet tool. HubSpot started as a CRM. GoHighLevel started as an agency tool. Every suite was built one product at a time. You are doing the same — but with the infrastructure planned from day one instead of retrofitted later.*

---

## 02 · The Complete Vocabulary

Everything built and sold under the Chov name belongs to one of seven categories. These are not suggestions. They are the architecture. Every developer, every document, every codebase uses these terms and only these terms.

### The Seven Levels

| Level | Term | Where It Lives | One-Line Definition | The Test |
|---|---|---|---|---|
| Smallest | **UI Component** | `/packages/ui/` | A single visual element. No logic, no API, no database. | Remove from PagePersona, drop in Qualifr — works with zero changes. |
| Utility | **Package** | `/packages/utils/` | A shared utility. Pure logic. No UI. | Does it render anything? No → Package. |
| Feature | **Module** | `/packages/modules/` | A complete feature: UI + logic + API + database. | Does it deliver a full working feature end to end? Yes → Module. |
| Capability | **Engine** | `/packages/engines/` | A major capability system. Products are built around it. | Would rebuilding it take months? Is it a moat? Yes → Engine. |
| Product | **Product** | `/apps/product-name/` | A standalone launchable SaaS. Its own domain, its own JVZoo listing, its own users. | Can it be sold independently on JVZoo as its own product? Yes → Product. |
| Grouping | **Pack** | Market layer — not a code folder | Two or more Products bundled and sold together as one market offering. | Are multiple complete Products being sold as a single offering? Yes → Pack. |
| Platform | **Suite** | chov.ai | All Products unified under one platform. One login. One dashboard. One billing record. | Is it the full chov.ai platform containing all Products? Yes → Suite. |

### Key Distinctions

**Product vs Pack vs Suite — the market layer**

- A **Product** stands alone. PagePersona is a Product. Qualifr is a Product. Each has its own domain, its own JVZoo listing, its own users, its own launch.
- A **Pack** is a sales grouping. "The Persona Pack" bundles PagePersona + VideoPersona + MagnetIQ into one offering. Underneath, each is still its own Product running on the same infrastructure.
- The **Suite** is chov.ai — the single platform all Products live inside when the switch is flipped. It is never built separately. It emerges from the Products.

**Engine vs Module — the most common confusion**

- A **Module** delivers a complete user-facing feature (Auth, Billing, Onboarding). It is self-contained and plugs into any Product.
- An **Engine** is a major capability system that Products are built *around*. Multiple Products can be architected on top of the same Engine. The Rules Engine and Adaptation Engine are Engines. The login system is a Module.

---

## 03 · The Four Building Blocks — Full Definitions

These definitions are precise and permanent. There is no overlap between them. Use the decision tree at the end of this section whenever you build something new.

### 01 · UI Component — `/packages/ui/`

**What it is:** A single visual element. No business logic. Does not talk to a database. Does not know which product it lives in. It renders something on screen and accepts props to configure its appearance and behaviour.

**The rule:** If you remove it from PagePersona and drop it into any other product, it works identically with zero changes.

**The test:** Can it exist completely alone — no API call, no database, no business rule? Yes → UI Component.

**Examples:** Button · Card · Modal · InputField · DataTable · Badge · Toast · Tooltip · SidebarNav · Tabs · ProgressBar · Avatar · Skeleton · EmptyState · CodeBlock

### 02 · Package — `/packages/utils/`

**What it is:** A shared utility, helper, or configuration with no UI. Pure logic. Pure infrastructure. Things every product needs but that the user never sees. Imported and used silently in the background.

**The rule:** A Package never renders anything on screen by itself. Ever.

**The test:** Does it render UI? No → Package. Is it pure logic or infrastructure any product needs? Yes → Package.

**Examples:** db-client · jwt-validator · jvzoo-webhook-validator · stripe-client · email-sender · date-formatter · currency-formatter · slug-generator · error-logger · rate-limiter · env-config · file-uploader

### 03 · Module — `/packages/modules/`

**What it is:** A complete, self-contained feature area combining UI Components + Packages + API routes + database tables + business logic. A fully working feature you drop into any product and it works end to end.

**The rule:** A Module is the smallest thing that delivers a complete user-facing capability. Auth is a module — not just a login button, but the entire signup, login, reset, verify, session system working end to end.

**The test:** Does it combine UI + logic + API + database into one complete working feature? Yes → Module.

**Examples:** Auth · Billing · Onboarding · Dashboard Shell · Email · Analytics · Team Management

### 04 · Engine — `/packages/engines/`

**What it is:** A large, complex, standalone system that is itself a product capability. Something so significant that entire products are built around it. An engine has its own internal architecture. It is configured differently per product but its core logic never changes.

**The rule:** An Engine is your deepest competitive moat. If a competitor wanted to rebuild PagePersona, the Adaptation Engine and Rules Engine are what they would have to recreate.

**The test:** Is it a major capability multiple products are built around? Would recreating it take months? Yes → Engine.

**Examples:** Adaptation Engine · Rules Engine · Page Builder Engine · Form Builder Engine · AI Engine · Analytics Engine

### The Decision Tree

Run every new piece of code through this before you write it. Know exactly where it belongs before you start.

| Ask This | If Yes |
|---|---|
| Does it render UI and nothing else — no logic, no API, no database? | → UI Component → `/packages/ui/` |
| Does it contain pure logic only — no UI, no rendering? | → Package → `/packages/utils/` |
| Does it combine UI + logic + API + database into one complete feature? | → Module → `/packages/modules/` |
| Is it a major capability that products are built around, with its own architecture? | → Engine → `/packages/engines/` |
| Is it a complete, independently-launchable SaaS product? | → Product → `/apps/product-name/` |
| Are two or more Products being sold together as a single offering? | → Pack (market layer — no code folder) |
| Is it the full chov.ai platform unifying all Products? | → Suite (chov.ai platform layer) |

---

## 04 · UI Components — The Visual Layer

The atoms of the Chov design system. One library. Used by every frontend of every product. Change a button style once — it updates across PagePersona, Qualifr, the Video Generator, and every future product simultaneously.

> *Stored in `/packages/ui/`. Every product's frontend imports from this package. The design tokens — colours, typography, spacing — are defined here and used by every component.*

### Design Tokens — The Foundation

| Token Group | What It Contains | Used In |
|---|---|---|
| Colours | Brand palette: Navy `#0F172A`, Blue `#1A56DB`, Teal `#14B8A6`. Semantic names: primary, danger, success, warning. All opacity variants. | Every component |
| Typography | Font families: Syne 800 (headlines), DM Sans 400 (body), DM Mono 500 (labels/code). Full size and weight scales. | Every component |
| Spacing | 4px base unit. Scale: 4, 8, 12, 16, 24, 32, 48, 64px. Consistent margins and padding everywhere. | Every component |
| Border Radius | sm (4px) · md (8px) · lg (12px) · xl (16px) · full (999px). Consistent roundness system. | Buttons, cards, inputs |
| Shadows | none · sm · md · lg · xl. Elevation system for cards, modals, dropdowns. | Cards, modals, panels |
| Breakpoints | sm 640px · md 768px · lg 1024px · xl 1280px. Responsive grid system. | All layouts |

### Base UI Components

| Component | Variants & States | Build Phase |
|---|---|---|
| Button | Primary, Secondary, Ghost, Danger, Link. Sizes: sm/md/lg. States: default, hover, loading, disabled. | PagePersona |
| InputField | Text, email, password (show/hide), number, textarea. States: default, focus, error, success, disabled. | PagePersona |
| Dropdown/Select | Single, multi-select, searchable, with icons, with group labels. | PagePersona |
| Checkbox & Radio | Checkbox, radio, toggle switch. States: checked, unchecked, indeterminate, disabled. | PagePersona |
| Badge/Pill | Status (Active/Draft/Error), count, plan. Colour variants. | PagePersona |
| Card | Basic, stat (metric + delta), feature, project. Hover states. | PagePersona |
| Modal/Dialog | Confirmation, form, fullscreen. Header + body + footer zones. | PagePersona |
| Toast/Notification | Success, error, warning, info. Auto-dismiss. | PagePersona |
| Tooltip | Top/bottom/left/right. Delay config. | PagePersona |
| Skeleton Loader | Text line, card, avatar, table row. Pulse animation. | PagePersona |
| Empty State | Illustration + heading + CTA. Context-aware messaging. | PagePersona |
| Loading Spinner | sm/md/lg. Overlay variant. | PagePersona |
| Avatar | Image with fallback initials. Sizes. Online indicator. | PagePersona |
| Data Table | Sortable columns, pagination, row actions, bulk select. | PagePersona |
| Tabs | Horizontal · Underline · Pill. | PagePersona |
| Progress Bar | Linear · Step indicator. | PagePersona |
| Code Block | Syntax highlight, copy button. | PagePersona |

### Layout Components

| Component | Description | Build Phase |
|---|---|---|
| Page Shell | Full-page layout: sidebar + topbar + content area. | PagePersona |
| Card Grid | 2, 3, 4-col responsive grid for card displays. | PagePersona |
| Two-Column Split | 50/50 · 60/40 · 70/30 responsive grid for side-by-side panels. | PagePersona |
| Wizard / Stepper | Step indicator + back/next + content slot. Any number of steps. | PagePersona |
| Slide-in Drawer | Right-side panel sliding over content. ~380px wide. | PagePersona |
| Section Divider | Horizontal rule with optional label. Visual breathing room. | PagePersona |
| Split Pane | Resizable left + right panels with drag handle. | Product 3+ |

### Landing Page Components — `/packages/ui/landing/`

Every product needs a marketing page. Build these sections once and assemble any landing page in hours.

| Section | Variants | Build Phase |
|---|---|---|
| Hero | Centred · Left-aligned · With video · With product screenshot | PagePersona launch |
| Social Proof Bar | Static logos · Scrolling marquee | PagePersona launch |
| Features Grid | 3-col · 6-col · Alternating with screenshot | PagePersona launch |
| How It Works | Horizontal steps · Vertical · With arrows | PagePersona launch |
| Testimonials | Grid · Carousel · Single large quote | PagePersona launch |
| Pricing Section | 2-tier · 3-tier · With monthly/annual toggle | PagePersona launch |
| FAQ Accordion | Full width · With sidebar | PagePersona launch |
| CTA Banner | With gradient · Plain · Before footer | PagePersona launch |
| Countdown Timer | Inline · Sticky bar — critical for JVZoo launches | PagePersona launch |
| Footer | Simple · Multi-column with nav groups | PagePersona launch |
| Announcement Bar | Dismissable · Sticky — for launch offers | Product 2 |

---

## 05 · Packages — Pure Logic & Utilities

Packages are the invisible infrastructure. No UI. No rendering. Pure logic that every product imports and uses silently. A bug fixed in a Package is fixed across every product in one commit.

| Package | What It Does | Used By |
|---|---|---|
| `db-client` | Configured database connection, connection pooling, query helpers. | Every product, every module |
| `jwt-validator` | Verify and decode auth tokens. Powers protected routes. | Auth module, every API |
| `jvzoo-webhook-validator` | Receive JVZoo IPN, validate secret, extract buyer email + affiliate ID. | Billing module, every JVZoo launch |
| `warriorplus-webhook-validator` | Same as JVZoo but for WarriorPlus IPN format. | Billing module, every WP launch |
| `stripe-client` | Stripe SDK wrapper. Checkout sessions, subscriptions, webhook handler. | Billing module |
| `email-sender` | `send(template, to, data)`. One line to send any email from any product. | Email module, every product |
| `date-formatter` | Consistent date formatting across all products. Relative time, long form, short form. | Any product displaying dates |
| `currency-formatter` | $1,200 not 1200. Multi-currency support. | Billing, analytics displays |
| `api-request-wrapper` | HTTP client with auth headers, retry logic, error normalisation. | All frontends |
| `slug-generator` | 'Page Persona' → 'page-persona'. Workspace slugs, URL generation. | Auth, workspace creation |
| `error-logger` | Consistent error capture and logging across all products. | Every product |
| `rate-limiter` | Per-user API throttling. Prevents abuse on any endpoint. | Any public-facing API |
| `env-config` | Read environment variables safely. Fails loudly if required vars missing. | Every product |
| `file-uploader` | Upload to object storage. Returns CDN URL. Images, logos, exports. | Any product with uploads |

---

## 06 · Modules — Complete Feature Areas

A Module is the smallest thing that delivers a complete user-facing capability. Build it once for PagePersona, extract it, and every future product gets it for free. Each module has a `/frontend/` folder, a `/backend/` folder, and a `/shared/` folder containing the API contract that connects them — regardless of what language the backend is written in.

> *The `/shared/` folder in each module is critical. It contains the API contract — the documented agreement of what endpoints exist, what they accept, what they return. The frontend calls the contract. The backend implements the contract. The backend language is irrelevant to the frontend.*

### Module 01 — Authentication

| Feature | Description | Phase |
|---|---|---|
| Sign up — email + password | Registration, validation, email confirmation flow. | PagePersona |
| Sign up — Google OAuth | One-click sign up. Highest-conversion signup method. | PagePersona |
| Sign up — magic link | Passwordless — enter email, receive link, click to log in. | PagePersona |
| Login | Email + password. Remember me. Forgot password link. | PagePersona |
| Forgot password flow | Email entry → reset link → new password form → success. | PagePersona |
| Email verification | Confirm on signup. Resend option. Verified state tracking. | PagePersona |
| Session management | Tokens, auto-refresh, logout, logout all devices. | PagePersona |
| Protected route middleware | Redirects unauthenticated users to login on every protected page. | PagePersona |
| User profile | Name, avatar upload, email change, password change. | Product 2 |
| Two-factor authentication | Authenticator app or SMS. Agency and enterprise tier. | Product 3+ |

*Database tables: `users` · `sessions` · `verification_tokens` · `password_reset_tokens`*

### Module 02 — Billing & Subscriptions

Critical for every JVZoo launch. Covers one-time purchases, subscriptions, JVZoo, WarriorPlus, Stripe, and the entitlement system that powers chov.ai.

| Feature | Description | Phase |
|---|---|---|
| Pricing page | 3-tier table (Solo/Agency/Enterprise). Feature comparison. Monthly/annual toggle. | PagePersona |
| JVZoo integration | Purchase IPN listener. Auto-creates Chov account. Stores affiliate ID. Grants entitlement. | PagePersona |
| WarriorPlus integration | Same as JVZoo but for WarriorPlus IPN format. | PagePersona |
| Stripe checkout | Direct subscription and one-time payment checkout. | PagePersona |
| Entitlement system | `workspace_id` + `product_id` + `plan` + `source` + `status`. Powers the chov.ai suite. | PagePersona |
| Plan badge + usage meter | Current plan in sidebar. Progress bars for usage vs plan limits. | PagePersona |
| Upgrade flow | Upgrade CTA → plan comparison → confirm → checkout → success. | PagePersona |
| OTO / Upsell page | One-time offer page shown after JVZoo purchase. Major revenue driver. | PagePersona |
| Affiliate token injection | Reads affiliate ID from purchase, stores on account, injects into experience. | PagePersona |
| Billing history | Invoice list with download links. | PagePersona |
| Free trial | X-day trial, expiry banner, trial-to-paid conversion gate. | Product 2 |
| Cancel flow | Exit survey, grace period, data export. | Product 2 |

*Database tables: `subscriptions` · `entitlements` · `invoices` · `products`*

### Module 03 — Onboarding

| Feature | Description | Phase |
|---|---|---|
| Welcome screen | Post-signup screen with name, product pitch, Get Started CTA. | PagePersona |
| Multi-step wizard shell | Step indicator + back/next + content slot. Configurable step count. | PagePersona |
| Goal picker | Card grid of preset goals. User picks one, product pre-configures itself. | PagePersona |
| Setup checklist | Post-onboarding checklist with completion tracking. Drives activation. | PagePersona |
| Empty state prompts | Context-aware first-time prompts on every empty dashboard section. | PagePersona |
| Product tour tooltips | Walkthrough tooltips on first login highlighting key UI elements. | Product 2 |

*Database tables: `onboarding_progress`*

### Module 04 — Dashboard Shell

| Feature | Description | Phase |
|---|---|---|
| Sidebar navigation | Logo, nav items with icons, active states, plan badge, user menu at bottom. | PagePersona |
| Topbar | Page title, action buttons, user avatar dropdown. | PagePersona |
| User menu dropdown | Avatar + name + email + Profile, Settings, Billing, Logout. | PagePersona |
| Settings shell | Left sub-nav (General/Team/Billing/Integrations/Developer) + content area. | PagePersona |
| Suite app switcher | Shows all Chov products the workspace owns. Enables chov.ai switching. | Product 2 |
| Mobile navigation | Hamburger + slide-out drawer nav. | Product 2 |
| Notification bell | Bell icon + unread badge + dropdown list. | Product 3 |

*Database tables: `workspaces` · `workspace_members`*

### Module 05 — Email System

| Template | Trigger | Phase |
|---|---|---|
| Welcome email | On signup confirmed. | PagePersona |
| Email confirmation | On sign up — verify address. | PagePersona |
| Password reset | On forgot password request. | PagePersona |
| Team invite | When user invites a team member. | Product 2 |
| Trial expiry warning | 3 days before trial ends. | Product 2 |
| Trial expired | Day trial ends — conversion gate. | Product 2 |
| Upgrade confirmation | On successful plan upgrade. | Product 2 |
| Weekly digest | Automated weekly performance summary. | Product 2 |
| Re-engagement | After 14 days inactivity. | Product 3 |
| Cancellation confirmation | On cancel with re-activation CTA. | Product 3 |

*All templates live in `/packages/modules/email/templates/`. Shared regardless of backend language.*

### Module 06 — Analytics & Tracking

| Feature | Description | Phase |
|---|---|---|
| Event tracking | Captures named events with properties: `rule_fired`, `variant_shown`, `conversion`, `page_view`. | PagePersona |
| Dashboard overview | Total visitors, rules fired, conversion rate, top-performing rule. | PagePersona |
| Rule performance table | Per-rule: impressions, conversions, rate, top variant. | PagePersona |
| Date range filter | Last 7 / 30 / 90 days. Custom range. | PagePersona |
| A/B test results | Side-by-side variant comparison with confidence %. | Product 2 |
| Revenue attribution | Link conversions to rules and variants. | Product 2 |
| Export | CSV download of raw events. | Product 2 |

*Database tables: `events` · `sessions` · `analytics_aggregates`*

### Module 07 — Team Management

| Feature | Description | Phase |
|---|---|---|
| Invite by email | Send invite → accept link → join workspace. | Product 2 |
| Role assignment | Admin · Editor · Viewer. Different permissions per role. | Product 2 |
| Member list | Active members, pending invites, last active. | Product 2 |
| Remove member | Revoke access immediately. | Product 2 |
| Audit log | Who did what and when across the workspace. | Product 3 |

*Database tables: `workspace_members` · `workspace_invites` · `roles` · `permissions`*

---

## 07 · Engines — Major Capability Systems

Engines are the most valuable things in the Chov Infrastructure. Entire products are built around them. Each engine has a `/core/` folder containing the spec — the logic defined language-agnostically. Implementations in any language follow the same spec. The core is the source of truth.

> **If a competitor wanted to rebuild PagePersona, the Adaptation Engine and Rules Engine are what they would have to recreate from scratch. You build each engine once. It powers every relevant product forever.**

### Engine 01 — Adaptation Engine

*Lives in: `/packages/engines/adaptation/` — Vanilla JS only. Runs on visitor pages in the browser.*

| Capability | Description |
|---|---|
| Signal detection | Reads UTM params, visit count (cookie), scroll depth, time on page, geo, device, referrer, exit intent. |
| Rule evaluation | Passes signals to the Rules Engine. Receives which rule fires and what action to take. |
| Content swapping | Replaces text, images, shows/hides sections, triggers popups in real time without page reload. |
| Token injection | Injects dynamic values — `{city}`, `{affiliate_name}`, `{first_name}`, `{company}` — into any element. |
| Script delivery | Delivered as a single `<script>` tag. Loads async, non-blocking, under 10kb gzipped. |
| Conflict resolution | Priority-ordered rule stack. Higher rules fire first. Multiple matching rules handled gracefully. |

*Note: This engine is Vanilla JavaScript permanently. It runs in the browser. No backend language can change this.*

### Engine 02 — Rules Engine

*Lives in: `/packages/engines/rules-engine/core/` (spec) + `/frontend/` (UI) + `/backend/` (logic implementation)*

| Capability | Description |
|---|---|
| Condition evaluation | Evaluates conditions: `visit_count >= 3`, `utm_source contains 'email'`, `geo.country == 'NG'`. |
| AND/OR logic | Combines multiple conditions with AND or OR operators. |
| Priority ordering | Rules have a priority order. First matching rule wins. Configurable per product. |
| Conflict resolution | When multiple rules match, priority determines which fires. |
| Action dispatch | Returns the winning rule's action to the calling engine. |
| Rule validation | Validates rule structure at save time. Prevents invalid rules from being deployed. |

### Engine 03 — Page Builder Engine

*Lives in: `/packages/engines/page-builder/core/` (spec) + `/frontend/` (React canvas) + `/backend/` (save/render)*

| Capability | Description |
|---|---|
| Drag-and-drop canvas | Users drag blocks onto a canvas, reorder, resize, nest within each other. |
| Block library | Hero, headline, body text, image, CTA, form, testimonial, divider, spacer, video, countdown. |
| Block configuration | Each block has its own settings panel for content, colours, fonts, padding. |
| Responsive preview | Toggle between desktop and mobile views inside the canvas. |
| Clean HTML output | Renders to clean, deployable HTML. No proprietary format lock-in. |
| Product configuration | `allowedBlocks` controls which blocks are available. `outputTarget` controls render format. |

### Engine 04 — Form Builder Engine

*Lives in: `/packages/engines/form-builder/core/` (spec) + `/frontend/` (React canvas) + `/backend/` (submissions)*

| Capability | Description |
|---|---|
| Field types | Text, email, phone, number, dropdown, checkbox, radio, file upload, date, hidden field. |
| Validation rules | Required, min/max length, email format, regex, conditional required. |
| Conditional logic | Show/hide fields based on other field values. Dynamic form paths. |
| Multi-step forms | Split forms into steps with progress indicator. |
| Submission handling | Store, send notification, trigger webhook, redirect on complete. |
| Spam protection | Honeypot fields, rate limiting, optional captcha. |

### Engine 05 — AI Engine

*Lives in: `/packages/engines/ai-engine/core/` (spec + prompt templates) + `/backend/` (LLM calls)*

| Capability | Description |
|---|---|
| LLM integration | Calls to Anthropic, OpenAI, or other providers. Abstracted so provider can be swapped. |
| Prompt templates | Reusable prompt structures stored in `/core/`. Products configure with their context. |
| Response parsing | Structured output parsing. Returns clean data, not raw LLM strings. |
| Cost tracking | Logs token usage and cost per call per product. |
| Retry logic | Handles rate limits and failures with exponential backoff. |
| Streaming support | Supports streaming responses for real-time UI generation effects. |

*Products that use this engine: any product with AI-generated content, AI copy, AI analysis, or AI automation.*

### Engine 06 — Analytics Engine

*Lives in: `/packages/engines/analytics-engine/core/` + `/frontend/` (charts/dashboards) + `/backend/` (capture/aggregate)*

| Capability | Description |
|---|---|
| Event capture | Captures named events with properties. `rule_fired`, `variant_shown`, `conversion`, `page_view`. |
| Session tracking | Groups events into sessions. Unique visitors, return visits, session duration. |
| Conversion attribution | Links conversions back to the rules or variants that influenced them. |
| Segment comparison | Compare metrics: cold vs warm, personalised vs default, mobile vs desktop. |
| Statistical confidence | Confidence % for A/B test results. Flags winners at 95% threshold. |
| Aggregation | Pre-aggregates common queries so dashboards load fast at scale. |

---

## 08 · How Engines Are Shared Across Products

The same engine runs inside multiple different products simultaneously. The products look and feel completely different to their users. Underneath, the engine is identical — only the configuration changes. This is the infrastructure advantage competitors cannot replicate.

### Rules Engine — Same Engine, Different Products

| Product | Signals Configured | Actions Configured | What User Thinks It Is |
|---|---|---|---|
| PagePersona | `visit_count` · `utm_source` · `geo` · `device` · `exit_intent` · `firmographics` | `swap_text` · `swap_image` · `show_popup` · `hide_section` · `change_cta` | PagePersona's personalisation rule builder |
| Qualifr | `utm_source` · `company_size` · `industry` · `visit_count` | `show_form_variant` · `change_qualification_path` · `trigger_webhook` | Qualifr's lead routing logic |
| Future Automation Tool | `user_action` · `tag` · `segment` · `time_of_day` · `custom_event` | `send_email` · `add_tag` · `update_crm` · `trigger_webhook` | A visual workflow builder |

> *Same engine. Different configuration. Qualifr users have no idea they are using the same rule builder as PagePersona users. That invisibility is your competitive advantage.*

### Page Builder Engine — Four Products, One Engine

| Product | `allowedBlocks` | `outputTarget` | What User Thinks It Is |
|---|---|---|---|
| PagePersona | headline · body · cta · image · section | page-overlay | PagePersona's content editor |
| Qualifr | hero · form · testimonial · cta · countdown | landing-page | Qualifr's landing page designer |
| Email Designer | text · image · button · divider · spacer | email-html | Email Designer's drag-and-drop editor |
| Page Builder Product | all blocks unlocked | full-page | A standalone page building tool |

When you fix a bug in the Page Builder Engine, all four products get the fix in one deployment. When you add a new block type, all four products can access it immediately.

---

## 09 · Chov.ai Master Architecture

Every JVZoo product launch is simultaneously a brick in the chov.ai suite. The four pillars below are built once — starting with PagePersona — and they power the entire suite forever.

### The Four Suite Pillars

| Central Identity | Workspace Layer | Entitlement Engine | Unified Billing |
|---|---|---|---|
| One login. One Chov account. Forever. A JVZoo buyer gets a Chov account — not a PagePersona account. When they buy a second product, both are already there. | The business using your tools. A workspace owns products, contains team members, and has isolated data. Every product is workspace-aware from day one. | Controls which products a workspace has access to and at what plan. JVZoo purchase → entitlement granted. The suite reads entitlements and shows what they own. | One billing record per workspace. JVZoo or Stripe — every purchase updates the same record. One place to manage everything across all products. |

### The Flip the Switch Moment

> You do not announce chov.ai when you have 12 products. You build the infrastructure correctly from product one so that chov.ai already exists when you are ready — it just needs a front door. All products are inside it. All users already have Chov accounts. All billing is already unified. You turn on the suite dashboard and send one email: everything you bought is now in one place. That is the chov.ai launch. It costs nothing because the infrastructure was always there.

### The Polyglot Principle — Right Backend for Each Product

The Chov Infrastructure is language-agnostic at the backend layer. Each product uses the backend language best suited to its job. The shared infrastructure — the database, the entitlement system, the API contracts, the UI components — connects everything regardless of backend language.

| Product Type | Recommended Backend | Reason |
|---|---|---|
| Standard SaaS — dashboards, rules, editors, workflows | Choose what you are most productive in | No AI-heavy lifting. Speed of development is the priority. |
| AI-heavy products — video generation, content creation, LLM tools | Choose the language with the best AI libraries for the job | AI libraries vary by language maturity. Pick the best tool for the capability. |
| Data processing — scraping, bulk analytics, report generation | Choose the language with the strongest data libraries | Data processing performance and library availability matters most here. |
| Real-time features — live collaboration, sockets, streaming | Choose based on the concurrency model needed | Different languages handle concurrency differently. Choose accordingly. |

> *The language serves the product. Not the other way around. The frontend is always React. The database is always PostgreSQL. The structure is always `/packages/`. The backend language is decided per product based on what that product needs.*

---

## 10 · Database Schema — Designed for the Suite

One database. One schema. Every product reads from the same core tables. The tables are named generically — never product-specifically. This is what makes the chov.ai suite structurally possible.

> *Golden naming rule: `users` not `pagepersona_users`. `workspaces` not `pp_workspaces`. If a table name contains a product name, it is wrong. The table belongs to the infrastructure, not to any single product.*

### Core Tables

| Table | Purpose | Written By | Read By |
|---|---|---|---|
| `users` | Central identity. One record per person. Forever. | Auth Module | Every product |
| `workspaces` | The business/account. Owns products and members. | Auth Module on signup | Every product |
| `workspace_members` | Who belongs to which workspace and with what role. | Team Module | Products with team features |
| `products` | Registry of all Chov products. `pagepersona` · `qualifr` · `pagebuilder` etc. | Seeded at deploy | Entitlement Engine |
| `entitlements` | `workspace_id` + `product_id` + `plan` + `source` + `status`. The suite engine. | Billing Module | Suite dashboard, every product access check |
| `subscriptions` | Stripe ID, JVZoo purchase ref, plan, status, renewal date. | Billing Module | Billing, account page |
| `invoices` | Payment history. Amount, date, product, source. | Billing Module | Billing history page |
| `sessions` | Auth session tokens. Expiry. Device info. | Auth Module | Protected routes |
| `verification_tokens` | Email verification and password reset tokens. | Auth Module | Auth flows |
| `workspace_invites` | Pending team invites. Token + expiry. | Team Module | Invite acceptance flow |
| `onboarding_progress` | Step completion per workspace per product. | Onboarding Module | Onboarding wizard |
| `events` | Raw event stream. `workspace_id` + `product_id` + `event_name` + `properties` + `timestamp`. | Analytics Engine | Analytics dashboards |
| `analytics_aggregates` | Pre-computed daily/weekly rollups. Fast dashboard queries. | Analytics Engine (background job) | Analytics dashboards |
| `audit_logs` | Who did what, when, from what IP. | Every module | Admin, security |

---

## 11 · JVZoo → Chov Account Flow

This flow runs on every JVZoo product launch. It is the bridge between a JVZoo buyer and a chov.ai account.

```
JVZoo purchase confirmed
        ↓
IPN webhook fires → jvzoo-webhook-validator Package
        ↓
Extract: buyer_email · product_id · affiliate_id · plan
        ↓
Does user exist in users table?
    YES → look up workspace_id
    NO  → create user + workspace (slug from company/name)
        ↓
Write to entitlements:
  workspace_id + product_id + plan + source='jvzoo' + status='active'
        ↓
Write to subscriptions:
  jvzoo_purchase_ref + plan + product_id
        ↓
Send welcome email via email-sender Package
        ↓
Redirect buyer to product login page
  (auto-login if new account, standard login if existing)
```

This flow is identical for every JVZoo launch. Only `product_id` and `plan` change.

---

## 12 · Folder Structure

```
/chov-infrastructure/
│
├── /apps/                          ← One folder per Product
│   /pagepersona/                   ← Product 1
│   │   /frontend/                  ← React app
│   │   /backend/                   ← Node or Python API
│   │   /shared/                    ← API contracts, types
│   │
│   /qualifr/                       ← Product 2
│   /video-generator/               ← Product 3
│   /scraper-tool/                  ← Product 4
│
├── /packages/                      ← Shared infrastructure
│   │
│   /ui/                            ← UI Components
│   │   /components/                ← Button, Card, Modal etc.
│   │   /landing/                   ← Hero, Pricing, FAQ etc.
│   │   /tokens/                    ← Colours, typography, spacing
│   │
│   /utils/                         ← Packages (pure logic)
│   │   /db-client/
│   │   /jwt-validator/
│   │   /jvzoo-webhook-validator/
│   │   /stripe-client/
│   │   /email-sender/
│   │
│   /modules/                       ← Modules (complete features)
│   │   /auth/
│   │   │   /frontend/              ← Login, signup, reset UI
│   │   │   /backend/               ← Session logic, OAuth
│   │   │   /shared/                ← API contract
│   │   │
│   │   /billing/
│   │   │   /frontend/              ← Pricing, upgrade, billing history
│   │   │   /backend/               ← Stripe, JVZoo, entitlements
│   │   │   /shared/                ← API contract. Webhook specs.
│   │   │
│   │   /onboarding/
│   │   /dashboard/
│   │   /email/
│   │   /analytics/
│   │   /team/
│   │
│   /engines/                       ← Engines (major capability systems)
│       /adaptation/                ← Vanilla JS. Visitor pages only.
│       /rules-engine/
│       │   /core/                  ← Logic spec. Language-agnostic.
│       │   /frontend/              ← Rules builder UI. React.
│       │   /backend/               ← Rule evaluation. Any language.
│       │
│       /page-builder/
│       │   /core/                  ← Block definitions. Shared spec.
│       │   /frontend/              ← Canvas, drag-drop, panels.
│       │   /backend/               ← Save, load, render to HTML.
│       │
│       /form-builder/
│       /ai-engine/
│       /analytics-engine/
│
├── /database/                      ← Shared database layer
│   /schema/                        ← All table definitions
│   /migrations/                    ← All migrations in order
│   /seeds/                         ← Dev and test seed data
│
├── /infrastructure/                ← Server and deployment
│   /docker/                        ← Dockerfile per product
│   /nginx/                         ← Reverse proxy per domain
│   /scripts/                       ← Deploy, backup, maintenance
│
└── /docs/                          ← The constitution
    ARCHITECTURE.md                 ← This structure explained
    BUILDING-BLOCKS.md              ← The seven levels defined
    API-CONTRACTS.md                ← All module contracts
    DATABASE-SCHEMA.md              ← All tables documented
    DECISION-LOG.md                 ← Why decisions were made
```

---

## 13 · Naming Conventions

Consistent naming means you always know where to look and what something does before you open it. These conventions apply across every product, every package, every module, every engine.

| Type | Pattern | Examples |
|---|---|---|
| UI Component | PascalCase | `Button` · `InputField` · `DataTable` · `SidebarNav` · `WizardShell` |
| Package function | camelCase | `validateJvzooWebhook()` · `formatCurrency()` · `generateSlug()` |
| Module hook | `use` + Module + Action | `useAuthLogin()` · `useBillingUpgrade()` · `useOnboardingStep()` |
| API route | `/api/module/action` | `/api/auth/login` · `/api/billing/checkout` · `/api/webhooks/jvzoo` |
| Database table | `snake_case` plural | `users` · `workspaces` · `entitlements` · `audit_logs` · `workspace_members` |
| Engine import | `@chov/engines/name` | `@chov/engines/rules-engine` · `@chov/engines/page-builder` |
| Module import | `@chov/modules/name` | `@chov/modules/auth` · `@chov/modules/billing` · `@chov/modules/email` |
| UI import | `@chov/ui` | `import { Button, Card, Modal } from '@chov/ui'` |
| Product app folder | kebab-case | `/apps/pagepersona` · `/apps/video-generator` · `/apps/scraper-tool` |
| Environment variable | `SCREAMING_SNAKE_CASE` | `DATABASE_URL` · `JVZOO_SECRET` · `STRIPE_SECRET_KEY` |
| Pack (naming convention) | Descriptive + "Pack" | "The Persona Pack" · "The Video Pack" · "The Agency Pack" |

---

## 14 · Build Order & Extraction Strategy

You do not build the library first and then build products. You build PagePersona — and extract the library from it as you go. Every feature built for PagePersona that another product will ever need is a future package. Note it. Name it correctly. Extract it after launch.

> *The extraction strategy: Build PagePersona at full speed. Name things correctly. Keep the Library Later list. After first sales, extract what you built into `/packages/`. Product 2 imports from `/packages/` instead of rebuilding.*

| Step | Build for PagePersona | Extracts Into | When |
|---|---|---|---|
| 1 | Auth — signup, login, Google OAuth, magic link, reset, sessions | Module: `/packages/modules/auth/` | While building PP |
| 2 | JVZoo + Stripe + pricing + OTO + entitlement system | Module: `/packages/modules/billing/` | While building PP |
| 3 | Dashboard shell — sidebar, topbar, nav, settings | Module: `/packages/modules/dashboard/` | While building PP |
| 4 | Onboarding — wizard, goal picker, checklist | Module: `/packages/modules/onboarding/` | While building PP |
| 5 | All UI pieces — buttons, cards, inputs, modals, tables | UI: `/packages/ui/` | While building PP |
| 6 | All backend utilities — db client, JWT, JVZoo validator | Packages: `/packages/utils/` | While building PP |
| 7 | Transactional emails — welcome, reset, digest | Module: `/packages/modules/email/` | While building PP |
| 8 | Adaptation Engine — signal detection, content swapping | Engine: `/packages/engines/adaptation/` | While building PP |
| 9 | Rules Engine — IF/THEN, priority, AND/OR logic | Engine: `/packages/engines/rules-engine/` | While building PP |
| 10 | Landing page sections — hero, features, pricing, FAQ | UI: `/packages/ui/landing/` | Before PP launch |
| 11 | Combine all above into one clean starter template | Starter: clone for every new product | After PP launch |
| 12 | Error logging, event tracking, feature flags | Module: `/packages/modules/analytics/` | After PP launch |

---

## 15 · The Launch First Rule

> **This section exists to prevent the most common mistake in product development: building infrastructure instead of shipping. The library is worthless if no product ships. Read this whenever you feel the urge to perfect the structure before launching.**

### The Priority Order — Non-Negotiable

| Priority | Focus | Why |
|---|---|---|
| 1 — RIGHT NOW | Ship PagePersona on JVZoo. Get paying customers. | Zero revenue = zero validation. The entire infrastructure is worthless without a shipped product. |
| 2 — AFTER FIRST SALES | Extract the library. Build the modules properly. | Now you have revenue, real code to extract from, and proof people want what you build. |
| 3 — WITH EACH PRODUCT | Grow the library. Every product adds to the infrastructure. | Every launch makes the next one faster. The advantage compounds with every product. |
| 4 — WHEN READY | Flip the switch. Launch chov.ai. | The suite emerges from the products. It is never built separately. It was always there. |

### The Two Habits — Zero Extra Time

**Habit 1 — Name Things Properly**

Use the vocabulary. Name tables generically. Follow the folder structure. This takes zero extra time and makes extraction later straightforward instead of painful.

- `users` not `pagepersona_users`
- `workspaces` not `pp_workspaces`
- `/modules/auth` not `/login-stuff`

**Habit 2 — The Library Later List**

Every time you build something and think "I will need this again" — write it down. One line. Do not extract it now. Just note it. After launch this list tells you exactly what to extract first.

- "Login with Google OAuth — every product needs this"
- "JVZoo webhook — every launch needs this"
- "IF/THEN builder — Qualifr will need this"

### Time Savings — What the Library Delivers

| Product | What You Skip | Estimated Time Saved |
|---|---|---|
| Product 1 — PagePersona | Nothing. You are building the library now. | Baseline |
| Product 2 | Auth, billing, onboarding, dashboard shell, email, UI components. | 50–60% |
| Product 3 | Everything from Product 2 plus new modules added in Product 2. | 65–70% |
| Product 5+ | Mostly assembling and configuring. Unique logic only. | 75–80% |
| Year 2 — 12 products/year | Clone starter → configure → build unique features → launch. | 80–85% |

### The One Rule

> **Ship PagePersona first. Name things correctly as you build. Keep the Library Later list. After first sales — extract, document, and grow the infrastructure. Every product you launch makes the next one faster. That is how PagePersona becomes Qualifr becomes the Page Builder becomes chov.ai.**

---

*CHOV_LibraryMasterPlan_v4.md — Updated to include Product, Pack, and Suite in the complete vocabulary. Version locked after agreement on 2026-03-26.*
