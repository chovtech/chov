# Deploy Workflow

## Standard Deploy Command (from terminal 0)
```bash
cd ~/chov && git add -A && git commit -m "message" && git push && deploy-pp
```

Then in terminal 4 (already SSH'd to VPS): `~/deploy.sh`

## What deploy.sh does
1. `git pull` — pulls latest code
2. Copies `pp.js` to CDN (`/var/www/cdn/pp.js`) with prod `API_BASE` swapped in via `sed`
3. Restarts backend: `sudo systemctl restart pagepersona-api`
4. `rm -rf .next` → `npm run build` → `pm2 restart pagepersona-app`

## Rules
- **Never edit the CDN pp.js directly** — always go through deploy.sh
- `ssh chov-vps ~/deploy.sh` fails from Claude's terminal (no SSH key) — Chike always runs it manually in terminal 4

## VPS Process Management
| Process | Manager | Name | Restart command |
|---------|---------|------|-----------------|
| Backend (FastAPI) | systemd | `pagepersona-api` | `sudo systemctl restart pagepersona-api` |
| Frontend (Next.js) | PM2 | `pagepersona-app` | `pm2 restart pagepersona-app` |

## Installing New Python Packages on VPS
No venv on VPS — backend runs on system Python via `~/.local`. Whenever `requirements.txt` gains a new package:
```bash
pip install <package> && sudo systemctl restart pagepersona-api
```
Or to install everything from requirements at once:
```bash
pip install -r requirements.txt && sudo systemctl restart pagepersona-api
```

## Useful VPS Commands
```bash
# Backend logs
sudo journalctl -u pagepersona-api -n 100 --no-pager

# Connect to DB on VPS
psql "postgresql://chov:chov_dev_password@localhost/chov"
```
