# Tech Stack (Locked)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React + Next.js 15 + Tailwind CSS | Port 3000 local, 3001 VPS |
| Backend | Python + FastAPI | Port 8000 |
| Database | PostgreSQL 16 | Docker locally, native on VPS |
| Icons | Material Symbols Outlined (Google) | |
| Fonts | Public Sans (dashboard), Syne (headings) | |
| Images | Cloudflare R2 | `chov-media` bucket |
| Email | Amazon SES via boto3 | |
| CRM | Mautic (self-hosted) | Via bridge API |
| Payments | Stripe + JVZoo webhooks | |
| Translation | Custom `useTranslation` hook | `/locales/{lang}/common.json` |
| Geo lookup | ipwho.is | Free, no key — server-side in sdk.py |

**Polyglot rule:** Node.js/TypeScript for pure SaaS. Python/FastAPI for AI-heavy. Intentional architecture, not inconsistency.
