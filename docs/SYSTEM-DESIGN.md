# System Design — PagePersona

How the product works technically. Reference when touching rules, SDK, pp.js, or signals.

---

## pp.js SDK

### Environments
| Environment | Location | API_BASE |
|-------------|----------|----------|
| Local | `apps/pagepersona/backend/static/pp.js` | `http://localhost:8000` |
| Production CDN | `/var/www/cdn/pp.js` | `https://api.usepagepersona.com` |

### Data Flow
1. pp.js calls `/api/sdk/rules?script_id=X`
2. Backend extracts visitor IP, calls `ipwho.is/{ip}` (cached in `_geo_cache` dict — in-memory, cleared on restart)
3. Response: `{ rules_hash, rules, geo: { country, country_code, continent, isp, timezone_id } }`
4. pp.js stores full response in localStorage (5-min TTL)
5. `detectSignals(geo)` builds signals — `geo_country` from `geo.country`, `day_time` from `geo.timezone_id`
6. `evaluateRules` runs → `fireActions` fires

### Picker Mode
pp.js detects when loaded inside the PagePersona iframe and skips all rule execution — only the element picker overlay runs.

### Rules
- Never edit CDN pp.js directly — always go through `deploy.sh`
- `test.html` on VPS uses `git update-index --skip-worktree` — never overwritten by deploy

---

## Signal Library

| Group | Signal | Key | Value type |
|-------|--------|-----|------------|
| Visitor Behaviour | Visit count | `visit_count` | number |
| Visitor Behaviour | Time on page | `time_on_page` | number (seconds) |
| Visitor Behaviour | Scroll depth | `scroll_depth` | number (%) |
| Visitor Behaviour | Exit intent | `exit_intent` | none (detected) |
| Visitor Behaviour | Visitor type | `visitor_type` | select: new / returning |
| Traffic Source | UTM source | `utm_source` | text |
| Traffic Source | UTM medium | `utm_medium` | text |
| Traffic Source | UTM campaign | `utm_campaign` | text |
| Traffic Source | Referrer URL | `referrer_url` | text |
| Traffic Source | Query param | `query_param` | text |
| Context | Device type | `device_type` | select: mobile / tablet / desktop |
| Context | Operating system | `operating_system` | select |
| Context | Browser | `browser` | select |
| Context | Geo country | `geo_country` | select (all countries) |
| Context | Day / time | `day_time` | text (HH:MM) |

**Permanently removed:** `geo_city`, `company_name`, `industry`, `company_size`

---

## Actions

| Action | Status |
|--------|--------|
| swap_text | ✅ Working — supports `{country}` token with fallback |
| swap_image | ✅ Working |
| hide_section | ✅ Working |
| show_element | ✅ Working |
| swap_url | ✅ Working |
| show_popup | ✅ Working — full canvas builder + PopupPicker in rule engine + live picker |
| insert_countdown | ✅ Built — VPS DB table still needs creating |
| inject_token | ❌ Removed — replaced by `{country}` token in swap_text |
| send_webhook | ❌ Removed |

### Token Support
Only `{country}` is supported.

| Token | Resolves from | Fallback |
|-------|--------------|---------|
| `{country}` | `signals.geo_country` (ipwho.is) | "Your Country" |

**Serialization** — when `{country}` present in text:
```json
{"text": "Hello from {country}!", "fallbacks": {"country": "Your Country"}}
```
Plain strings stored as-is. pp.js handles both transparently.

---

## Popup Builder Config

```json
{
  "layout": "single | two-column",
  "col_split": "50-50 | 40-60 | 60-40",
  "position": "center | top_center | top_left | top_right | bottom_center | bottom_left | bottom_right | top_bar | bottom_bar | fullscreen",
  "bg_color": "#1A56DB",
  "bg_image": "",
  "bg_image_opacity": 40,
  "border_radius": 16,
  "overlay": true,
  "overlay_opacity": 50,
  "padding": 32,
  "width": 480,
  "height": "auto",
  "close_button": true,
  "close_on_overlay": true,
  "delay": 0,
  "frequency": "once | session | every",
  "animation": "fade | slide | zoom",
  "blocks": [...]
}
```

### Block Types
| Type | Key fields |
|------|-----------|
| text | text, text_fallbacks, font_size, font_weight, text_align, text_color, text_italic, text_underline |
| image | image_url, image_height, image_fit, image_link |
| button | btn_label, btn_url, btn_action (link/close), btn_color, btn_text_color, btn_radius, btn_bold, btn_italic |
| embed | embed_code |
| no_thanks | no_thanks_label, no_thanks_color, no_thanks_dont_show |
| columns | col_left: Block[], col_right: Block[] |

**Key rule:** Popup config is embedded in the rule at save — pp.js does NOT make a runtime API call to fetch popup data.
