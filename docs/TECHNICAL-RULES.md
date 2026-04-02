# Technical Rules & File Writing Patterns

## File Writing Patterns

```bash
# .py / .md / .sh files:
cat > /path/to/file.py << 'PYEOF'
content here
PYEOF

# .tsx / .ts files — ALWAYS python3, NEVER heredoc:
python3 << 'PYEOF'
content = '''file content here'''
with open('/path/to/file.tsx', 'w') as f:
    f.write(content)
print("Done")
PYEOF

# Surgical edits:
python3 << 'PYEOF'
path = '/path/to/file.tsx'
with open(path, 'r') as f:
    content = f.read()
content = content.replace('old string', 'new string')
with open(path, 'w') as f:
    f.write(content)
print("Done")
PYEOF
```

---

## Locked Technical Rules

| Rule | Detail |
|------|--------|
| No heredoc for TSX/TS | Always use `python3 << 'PYEOF'` pattern |
| `bg-primary` doesn't work | Always use `bg-[#1A56DB]` directly |
| `'use client'` needs blank line | Next.js 15 requires blank line after directive before imports |
| JSONB fields need parsing | `conditions` and `actions` are strings — use `json.loads()` |
| Windows CRLF | Open files with `.replace('\r\n', '\n')` before processing |
| `useSearchParams` needs Suspense | Use `SearchParamReader` pattern |
| R2 credentials | Via `config.py` settings object — NOT `os.getenv()` |
| `app.` runs on port 3001 on VPS | Port 3000 is taken by another Docker container |
| Docker Desktop must be running | Before `docker start chov-db` works in WSL |
| `pp.js` local vs production | Local: `localhost:8000` — deploy.sh swaps to prod URL via `sed` |
| `test.html` on VPS | Uses `git update-index --skip-worktree` — never overwritten by deploy |
| `user.name.split()` guard | Always `(user.name || '').split()` — Topbar, Sidebar, Settings |
| `t(undefined)` crashes | Never pass dynamic object properties into `t()` without a guard |
| PopupPicker must be stateless | hooks in parent only — no useState/useEffect inside PopupPicker |
| `axios` 401 interceptor | Excludes `/api/auth/login` and `/api/auth/signup` |
| `ImageUploader` content type | Needs `{ headers: { 'Content-Type': 'multipart/form-data' } }` |
| Nginx body size | `client_max_body_size 10m` on `api.usepagepersona.com` |
| `_geo_cache` in sdk.py | Module-level dict — in-memory, cleared on backend restart. No eviction. |
| swap_text JSON format | When `{country}` token present, value is `{"text":"...","fallbacks":{"country":"..."}}`. pp.js tries JSON.parse first — plain strings still work (backward compat). |
| `users.password_hash` | Column is `password_hash` NOT `hashed_password`. Added via ALTER TABLE — not in core.sql CREATE TABLE definition. |
| VPS backend process | systemd: `sudo systemctl restart pagepersona-api` (NOT pm2). Frontend only is PM2: `pm2 restart pagepersona-app` |
| CORS on VPS | `allow_origins` must list explicit origins + `allow_origin_regex`. Cannot use `"*"` with `allow_credentials=True` — browser rejects it. |
| Client workspace type | `type='client'`, `parent_workspace_id=agency_ws_id`, `owner_id=agency_owner_id`. Client users access via `workspace_members` row with `role='client'`. |
