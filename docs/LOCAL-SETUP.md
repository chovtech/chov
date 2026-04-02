# Local Setup — Machine, Terminals & Environment

## Terminal Layout (always assumed — never ask Chike to SSH)

| Terminal | Purpose | State |
|----------|---------|-------|
| 0 | Local commands | Where commands are run |
| 1 | Local backend | `uvicorn app.main:app --reload --port 8000` |
| 2 | Local frontend | `npm run dev` |
| 3 | Docker | Where commands are run |
| 4 | Live VPS | Always SSH'd in as `chike@mail` |

---

# Local Machine

## Machine
| Field | Value |
|-------|-------|
| OS | Windows 11 + WSL 2 Ubuntu 24.04 |
| Docker | v29.2 — must start Docker Desktop on Windows first |
| Node | v20.20.1 |
| Python | 3.12.3 |
| Monorepo | `~/chov` (inside WSL) |
| GitHub | `github.com/chovtech/chov` (private) |
| SSH key | `~/.ssh/chov_github` |
| VPS SSH | `ssh chov-vps` (key: `~/.ssh/chov_vps`) |

## Start Local Environment
```bash
# Terminal 3 — Database (run first)
docker start chov-db

# Terminal 1 — Backend
cd ~/chov/apps/pagepersona/backend && source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd ~/chov/apps/pagepersona/frontend && npm run dev
```

## Database (Local)
| Field | Value |
|-------|-------|
| Container | `chov-db` (Docker) |
| User / Password | `chov` / `chov_dev_password` |
| Database | `chov` |
| Port | 5432 |

## Environment Variables
See `apps/pagepersona/backend/.env` and `CLAUDE.local.md` for actual values.

### Backend `.env` keys
```
DATABASE_URL=postgresql://chov:chov_dev_password@localhost:5432/chov
SECRET_KEY=...
FRONTEND_URL=http://localhost:3000
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
SES_SENDER_EMAIL=noreply@usepagepersona.com
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=chov-media
R2_PUBLIC_URL=https://pub-f4f0504e96a04026adad9d727d7ad64e.r2.dev
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
```

### Production differences (VPS)
```
DATABASE_URL=postgresql://chov:chov_dev_password@localhost/chov
FRONTEND_URL=https://app.usepagepersona.com
GOOGLE_REDIRECT_URI=https://api.usepagepersona.com/api/auth/google/callback
```
