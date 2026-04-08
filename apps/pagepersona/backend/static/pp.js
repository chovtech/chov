(function () {
  'use strict';

  // ─── CONFIG ────────────────────────────────────────────────────────────────
  var API_BASE = 'https://api.usepagepersona.com';
  var CACHE_PREFIX = 'pp_rules_';
  var CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  // ─── BOOT ──────────────────────────────────────────────────────────────────
  function boot() {
    // Never fire actions in picker mode — iframe loaded by PagePersona dashboard
    try {
      var inIframe = window.self !== window.top;
      var referrer = document.referrer || '';
      var isPPDashboard = referrer.indexOf('localhost:3000') !== -1
        || referrer.indexOf('app.usepagepersona.com') !== -1;
      if (inIframe && isPPDashboard) {
        warn('Picker mode detected — skipping rule execution.');
        return;
      }
    } catch(e) {}

    var scriptId = getScriptId();
    if (!scriptId) {
      warn('No ?id= param found on pp.js script tag. Aborting.');
      return;
    }
    loadRules(scriptId, function (data) {
      var rules = data.rules;
      var geo = data.geo || {};
      if (!rules || rules.length === 0) return;
      var signals = detectSignals(geo, scriptId);
      window.__pp = window.__pp || {};
      window.__pp.signals = signals;
      window.__pp.rules = rules;
      // Visit beacon
      sendVisitBeacon(scriptId, signals, geo);
      var matched = evaluateRules(rules, signals);
      window.__pp.matched = matched;
      fireActions(matched, scriptId, signals);
    });
  }

  // ─── SCRIPT ID ─────────────────────────────────────────────────────────────
  function getScriptId() {
    var scripts = document.querySelectorAll('script[src*="pp.js"]');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || '';
      var match = src.match(/[?&]id=([^&]+)/);
      if (match) return match[1];
    }
    return null;
  }

  // ─── CACHE ─────────────────────────────────────────────────────────────────
  function getCached(scriptId) {
    try {
      var raw = localStorage.getItem(CACHE_PREFIX + scriptId);
      if (!raw) return null;
      var cached = JSON.parse(raw);
      if (Date.now() - cached.ts > CACHE_TTL_MS) return null;
      return cached;
    } catch (e) {
      return null;
    }
  }

  function setCache(scriptId, rulesHash, rules, geo, pageUrl) {
    try {
      localStorage.setItem(CACHE_PREFIX + scriptId, JSON.stringify({
        ts: Date.now(),
        rules_hash: rulesHash,
        rules: rules,
        geo: geo || null,
        page_url: pageUrl || null
      }));
    } catch (e) {}
  }

  // ─── LOAD RULES ────────────────────────────────────────────────────────────
  function urlMatches(projectUrl) {
    if (!projectUrl) return true; // no URL registered — allow
    try {
      var current = window.location.href.split('?')[0].replace(/\/$/, '');
      var registered = projectUrl.split('?')[0].replace(/\/$/, '');
      return current === registered;
    } catch (e) {
      return true;
    }
  }

  function loadRules(scriptId, callback) {
    var cached = getCached(scriptId);

    if (cached) {
      if (!urlMatches(cached.page_url)) {
        warn('URL mismatch — pp.js not active on this page.');
        return;
      }
      callback({ rules: cached.rules, geo: cached.geo || null });
      pingHash(scriptId, function (serverHash) {
        if (serverHash && serverHash !== cached.rules_hash) {
          fetchRules(scriptId, function (data) {
            if (data) setCache(scriptId, data.rules_hash, data.rules, data.geo, data.page_url);
          });
        }
      });
      return;
    }

    fetchRules(scriptId, function (data) {
      if (!data) return;
      if (!urlMatches(data.page_url)) {
        warn('URL mismatch — pp.js not active on this page.');
        setCache(scriptId, data.rules_hash, data.rules, data.geo, data.page_url);
        return;
      }
      setCache(scriptId, data.rules_hash, data.rules, data.geo, data.page_url);
      callback({ rules: data.rules, geo: data.geo || null });
    });
  }

  function pingHash(scriptId, callback) {
    get(API_BASE + '/api/sdk/ping?script_id=' + scriptId, function (data) {
      callback(data ? data.rules_hash : null);
    });
  }

  function fetchRules(scriptId, callback) {
    get(API_BASE + '/api/sdk/rules?script_id=' + scriptId, function (data) {
      callback(data);
    });
  }

  // ─── SIGNAL DETECTION ──────────────────────────────────────────────────────
  function detectSignals(geo, scriptId) {
    var signals = {};
    geo = geo || {};

    var params = parseQueryString(window.location.search);
    signals.utm_source   = params.utm_source   || '';
    signals.utm_medium   = params.utm_medium   || '';
    signals.utm_campaign = params.utm_campaign || '';
    signals.query_param  = window.location.search;
    signals.referrer_url = document.referrer || '';

    var ua = navigator.userAgent;
    if (/Mobi|Android/i.test(ua)) {
      signals.device_type = 'mobile';
    } else if (/Tablet|iPad/i.test(ua)) {
      signals.device_type = 'tablet';
    } else {
      signals.device_type = 'desktop';
    }

    if (/iPhone|iPad|Mac/i.test(ua)) {
      signals.operating_system = /iPhone|iPad/.test(ua) ? 'iOS' : 'macOS';
    } else if (/Android/i.test(ua)) {
      signals.operating_system = 'Android';
    } else if (/Windows/i.test(ua)) {
      signals.operating_system = 'Windows';
    } else if (/Linux/i.test(ua)) {
      signals.operating_system = 'Linux';
    } else {
      signals.operating_system = 'unknown';
    }

    if (/Edg\//i.test(ua)) {
      signals.browser = 'Edge';
    } else if (/Firefox/i.test(ua)) {
      signals.browser = 'Firefox';
    } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
      signals.browser = 'Safari';
    } else if (/Chrome/i.test(ua)) {
      signals.browser = 'Chrome';
    } else {
      signals.browser = 'unknown';
    }

    var visitKey = 'pp_visits_' + scriptId;
    var visits = parseInt(localStorage.getItem(visitKey) || '0', 10) + 1;
    localStorage.setItem(visitKey, String(visits));
    signals.visit_count = visits;
    signals.visitor_type = visits === 1 ? 'new' : 'returning';

    signals.scroll_depth = 0;
    window.addEventListener('scroll', function () {
      var scrolled = window.scrollY + window.innerHeight;
      var total = document.documentElement.scrollHeight;
      signals.scroll_depth = Math.round((scrolled / total) * 100);
    }, { passive: true });

    var loadTime = Date.now();
    signals.time_on_page = 0;
    setInterval(function () {
      signals.time_on_page = Math.round((Date.now() - loadTime) / 1000);
    }, 1000);

    signals.exit_intent = false;
    document.addEventListener('mouseleave', function (e) {
      if (e.clientY <= 0) signals.exit_intent = true;
    });

    var now = new Date();
    var tz = geo.timezone_id || '';
    if (tz) {
      try {
        var tzParts = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).formatToParts(now);
        var tzH = '', tzM = '';
        tzParts.forEach(function(p) { if (p.type === 'hour') tzH = p.value; if (p.type === 'minute') tzM = p.value; });
        signals.day_time = tzH + ':' + tzM;
      } catch(e) {
        signals.day_time = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
      }
    } else {
      signals.day_time = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
    }

    signals.geo_country = geo.country || '';
    signals.visitor_timezone = tz;

    return signals;
  }

  // ─── RULE EVALUATION ───────────────────────────────────────────────────────
  function evaluateRules(rules, signals) {
    var matched = [];
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (ruleMatches(rule, signals)) matched.push(rule);
    }
    return matched;
  }

  function ruleMatches(rule, signals) {
    var conditions = rule.conditions || [];
    var operator = (rule.condition_operator || 'AND').toUpperCase();
    if (conditions.length === 0) return false;

    var results = conditions.map(function (c) {
      return conditionMatches(c, signals);
    });

    if (operator === 'OR') return results.some(function (r) { return r; });
    return results.every(function (r) { return r; });
  }

  function conditionMatches(condition, signals) {
    var signal   = condition.signal;
    var operator = condition.operator;
    var expected = condition.value;
    var actual   = signals[signal];

    if (actual === undefined || actual === null) return false;

    switch (operator) {
      case 'is detected':    return actual === true;
      case 'is':             return String(actual).toLowerCase() === String(expected).toLowerCase();
      case 'is not':         return String(actual).toLowerCase() !== String(expected).toLowerCase();
      case 'contains':       return String(actual).toLowerCase().indexOf(String(expected).toLowerCase()) !== -1;
      case 'equals':         return String(actual) === String(expected);
      case 'is greater than':return parseFloat(actual) > parseFloat(expected);
      case 'is less than':   return parseFloat(actual) < parseFloat(expected);
      case 'is between': {
        var parts = String(expected).split(',');
        if (parts.length !== 2) return false;
        var val = parseFloat(actual);
        return val >= parseFloat(parts[0]) && val <= parseFloat(parts[1]);
      }
      default: return false;
    }
  }

  // ─── ACTION EXECUTION ──────────────────────────────────────────────────────
  function fireActions(rules, scriptId, signals) {
    // Collect all target selectors that need visual changes to hide before paint
    var selectorsToHide = [];
    for (var i = 0; i < rules.length; i++) {
      var actions = rules[i].actions || [];
      for (var j = 0; j < actions.length; j++) {
        var a = actions[j];
        if ((a.type === 'swap_text' || a.type === 'swap_image') && a.target_block) {
          selectorsToHide.push(a.target_block);
        }
      }
    }
    // Inject hide style before paint to prevent FOUC
    var hideStyle = null;
    if (selectorsToHide.length > 0) {
      hideStyle = document.createElement('style');
      hideStyle.id = 'pp-fouc-shield';
      hideStyle.textContent = selectorsToHide.join(',') + '{visibility:hidden !important;}';
      document.head.appendChild(hideStyle);
    }
    // Fire all actions + send event beacons
    for (var i = 0; i < rules.length; i++) {
      var actions = rules[i].actions || [];
      for (var j = 0; j < actions.length; j++) {
        fireAction(actions[j]);
      }
      if (scriptId && signals) sendEventBeacon(scriptId, rules[i], signals);
    }
    // Remove hide style — elements now have correct content
    if (hideStyle && hideStyle.parentNode) {
      hideStyle.parentNode.removeChild(hideStyle);
    }
    // Also remove early-injected FOUC shield from cache (separate instance)
    var earlyShield = document.getElementById('pp-fouc-shield');
    if (earlyShield && earlyShield.parentNode) {
      earlyShield.parentNode.removeChild(earlyShield);
    }
  }

  function fireAction(action) {
    switch (action.type) {
      case 'swap_text':        swapText(action.target_block, action.value);           break;
      case 'swap_image':       swapImage(action.target_block, action.value);          break;
      case 'hide_section':     hideSection(action.target_block);                      break;
      case 'show_element':     showElement(action.target_block);                      break;
      case 'swap_url':         swapUrl(action.target_block, action.value);            break;
      case 'show_popup':       showPopup(action.value);                               break;
      case 'insert_countdown': insertCountdown(action.target_block, action.value);    break;
      default: warn('Unknown action type: ' + action.type);
    }
  }

  function insertCountdown(blockId, value) {
    var el = findElement(blockId);
    if (!el) { warn('insert_countdown: element not found — ' + blockId); return; }

    var cfg;
    try { cfg = typeof value === 'string' ? JSON.parse(value) : value; } catch(e) { cfg = {}; }
    var style = cfg.config || {};
    var type   = style.countdown_type || 'fixed';
    var endsAt;

    if (type === 'duration') {
      var durSec = ((style.duration_value || 24) * ({ minutes: 60, hours: 3600, days: 86400 }[style.duration_unit || 'hours'] || 3600));
      var storKey = 'pp_cd_' + (cfg.countdown_id || 'x') + '_start';
      var stored  = localStorage.getItem(storKey);
      if (!stored) { stored = String(Date.now()); localStorage.setItem(storKey, stored); }
      endsAt = parseInt(stored) + durSec * 1000;
    } else {
      endsAt = cfg.ends_at ? new Date(cfg.ends_at).getTime() : null;
    }

    // Build container
    var digitBg    = style.digit_bg    || '#1A56DB';
    var digitColor = style.digit_color || '#ffffff';
    var labelColor = style.label_color || '#64748b';
    var bgColor    = style.bg_color    || 'transparent';
    var pad        = style.padding     != null ? style.padding : 0;
    var gap        = style.gap         || 10;
    var digitSize  = style.digit_size  || 32;
    var radius     = style.digit_radius != null ? style.digit_radius : 6;
    var showLabels = style.show_labels !== false;
    var units      = [
      { key: 'days',    label: 'DAYS', show: style.show_days    !== false },
      { key: 'hours',   label: 'HRS',  show: style.show_hours   !== false },
      { key: 'minutes', label: 'MIN',  show: style.show_minutes !== false },
      { key: 'seconds', label: 'SEC',  show: style.show_seconds !== false },
    ].filter(function(u) { return u.show; });

    // Inject wrapper
    el.innerHTML = '';
    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;align-items:flex-start;justify-content:center;gap:' + gap + 'px;background:' + bgColor + ';padding:' + pad + 'px;box-sizing:border-box;';
    el.appendChild(wrapper);

    // Digit elements
    var digitEls = {};
    units.forEach(function(u, i) {
      var group = document.createElement('div');
      group.style.cssText = 'display:flex;align-items:flex-start;gap:' + gap + 'px;';
      if (i > 0) {
        var colon = document.createElement('span');
        colon.style.cssText = 'font-size:' + digitSize + 'px;font-weight:800;color:' + digitBg + ';margin-top:' + Math.round(digitSize * 0.2) + 'px;line-height:1;';
        colon.textContent = ':';
        group.appendChild(colon);
      }
      var col = document.createElement('div');
      col.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;';
      var box = document.createElement('div');
      box.style.cssText = 'background:' + digitBg + ';color:' + digitColor + ';font-size:' + digitSize + 'px;font-weight:800;padding:' + Math.round(digitSize*0.25) + 'px ' + Math.round(digitSize*0.35) + 'px;border-radius:' + radius + 'px;min-width:' + Math.round(digitSize*1.5) + 'px;text-align:center;line-height:1;font-variant-numeric:tabular-nums;';
      box.textContent = '00';
      col.appendChild(box);
      if (showLabels) {
        var lbl = document.createElement('span');
        lbl.style.cssText = 'font-size:9px;font-weight:700;color:' + labelColor + ';letter-spacing:0.05em;';
        lbl.textContent = u.label;
        col.appendChild(lbl);
      }
      group.appendChild(col);
      wrapper.appendChild(group);
      digitEls[u.key] = box;
    });

    // Tick
    var expiredFired = false;
    function tick() {
      var now  = Date.now();
      var diff = endsAt ? endsAt - now : 0;
      if (diff <= 0) {
        Object.keys(digitEls).forEach(function(k) { digitEls[k].textContent = '00'; });
        if (!expiredFired) {
          expiredFired = true;
          var expAction = cfg.expiry_action || style.expiry_action || 'hide';
          var expValue  = cfg.expiry_value  || style.expiry_value  || '';
          if      (expAction === 'hide')     { el.style.display = 'none'; }
          else if (expAction === 'redirect') { window.location.href = expValue; }
          else if (expAction === 'message')  { el.innerHTML = '<span style="font-size:14px;color:' + labelColor + '">' + expValue + '</span>'; }
        }
        return;
      }
      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);
      var vals = { days: d, hours: h, minutes: m, seconds: s };
      Object.keys(digitEls).forEach(function(k) { digitEls[k].textContent = String(vals[k]).padStart(2,'0'); });
    }
    tick();
    if (endsAt) setInterval(tick, 1000);
  }

  function swapText(blockId, value) {
    var el = findElement(blockId);
    if (!el) return;
    var text, fallbacks;
    try {
      var parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && 'text' in parsed) {
        text = parsed.text || '';
        fallbacks = parsed.fallbacks || {};
      } else {
        text = value || '';
        fallbacks = {};
      }
    } catch(e) {
      text = value || '';
      fallbacks = {};
    }
    el.textContent = resolveTokensWithFallbacks(text, fallbacks);
  }

  function swapUrl(blockId, newUrl) {
    var el = findElement(blockId);
    if (!el) return;
    if (el.tagName === 'A') {
      el.href = newUrl;
    } else {
      var a = el.querySelector('a');
      if (a) a.href = newUrl;
    }
  }

  function showElement(blockId) {
    var el = findElement(blockId);
    if (!el) return;
    el.style.removeProperty('display');
  }

  function swapImage(blockId, newSrc) {
    var escapedSrc = newSrc.replace(/"/g, '\\"');
    var css = blockId + '{content:url("' + escapedSrc + '") !important}'
            + blockId + ' img{content:url("' + escapedSrc + '") !important}';
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  function hideSection(blockId) {
    var el = findElement(blockId);
    if (!el) return;
    el.style.display = 'none';
  }

  function showPopup(value) {
    var cfg;
    try { cfg = typeof value === 'string' ? JSON.parse(value) : value; } catch(e) { cfg = null; }
    // Legacy plain-text fallback
    if (!cfg || !cfg.config) {
      var existing = document.getElementById('pp-popup');
      if (existing) existing.remove();
      var popup = document.createElement('div');
      popup.id = 'pp-popup';
      popup.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999999;background:#1A56DB;color:#fff;padding:16px 20px;border-radius:12px;max-width:320px;font-family:sans-serif;font-size:14px;cursor:pointer';
      popup.textContent = resolveTokens(typeof value === 'string' ? value : '');
      popup.addEventListener('click', function () { popup.remove(); });
      document.body.appendChild(popup);
      return;
    }
    var c = cfg.config;
    var freq = c.frequency || 'once';
    var storageKey = 'pp_popup_' + (cfg.popup_id || 'x');
    if (freq === 'once') {
      if (localStorage.getItem(storageKey)) return;
      localStorage.setItem(storageKey, '1');
    } else if (freq === 'session') {
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, '1');
    }
    var delay = parseInt(c.delay) || 0;
    setTimeout(function() { _renderPopup(c, storageKey); }, delay * 1000);
  }

  function _renderPopup(c, storageKey) {
    var existing = document.getElementById('pp-popup-overlay');
    if (existing) existing.remove();

    var isBar = c.position === 'top_bar' || c.position === 'bottom_bar';
    var isFullscreen = c.position === 'fullscreen';
    var br = isBar || isFullscreen ? 0 : (c.border_radius || 12);
    var pad = isBar ? '10px 20px' : ((c.padding || 24) + 'px');

    // Container (overlay layer)
    var container = document.createElement('div');
    container.id = 'pp-popup-overlay';
    container.style.cssText = 'position:fixed;inset:0;z-index:999998;pointer-events:none';

    if (c.overlay && !isBar && !isFullscreen) {
      container.style.background = 'rgba(0,0,0,' + ((c.overlay_opacity || 50) / 100) + ')';
      container.style.pointerEvents = 'auto';
      if (c.close_on_overlay) {
        container.addEventListener('click', function(e) {
          if (e.target === container) container.remove();
        });
      }
    }

    // Position styles
    var posStyles = {
      center:        'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)',
      top_center:    'position:absolute;top:24px;left:50%;transform:translateX(-50%)',
      top_left:      'position:absolute;top:24px;left:24px',
      top_right:     'position:absolute;top:24px;right:24px',
      bottom_center: 'position:absolute;bottom:24px;left:50%;transform:translateX(-50%)',
      bottom_left:   'position:absolute;bottom:24px;left:24px',
      bottom_right:  'position:absolute;bottom:24px;right:24px',
      top_bar:       'position:absolute;top:0;left:0;right:0;width:100%',
      bottom_bar:    'position:absolute;bottom:0;left:0;right:0;width:100%',
      fullscreen:    'position:absolute;inset:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column',
    };

    // bg image
    if (c.bg_image) {
      container.style.backgroundImage = 'url(' + c.bg_image + ')';
      container.style.backgroundSize = 'cover';
      container.style.backgroundPosition = 'center';
    }

    var box = document.createElement('div');
    var widthStyle = isBar || isFullscreen ? '' : ';width:' + (c.width || 420) + 'px;max-width:95vw';
    box.style.cssText = (posStyles[c.position] || posStyles.center) + widthStyle +
      ';background:' + (c.bg_color || '#1A56DB') +
      ';border-radius:' + br + 'px' +
      ';padding:' + pad +
      ';font-family:sans-serif;box-shadow:0 8px 40px rgba(0,0,0,0.2);pointer-events:auto' +
      ';display:flex;flex-direction:' + (isBar ? 'row' : 'column') +
      ';gap:10px;align-items:' + (isBar ? 'center' : 'stretch') +
      ';flex-wrap:' + (isBar ? 'wrap' : 'nowrap') +
      ';overflow:hidden';

    // Close button
    if (c.close_button) {
      var closeBtn = document.createElement('button');
      closeBtn.textContent = '✕';
      closeBtn.style.cssText = 'position:absolute;top:8px;right:10px;background:none;border:none;color:#fff;opacity:0.7;font-size:15px;cursor:pointer;line-height:1;padding:0;z-index:1';
      closeBtn.addEventListener('click', function() { container.remove(); });
      box.appendChild(closeBtn);
    }

    // Render blocks (new format) or fall back to legacy headline/body/cta
    var blocks = c.blocks;
    if (blocks && blocks.length > 0) {
      blocks.forEach(function(block) {
        var el = _renderBlock(block, isBar, container);
        if (el) box.appendChild(el);
      });
    } else {
      // Legacy fallback — old headline/body/cta format
      if (c.headline) {
        var hl = document.createElement('p');
        hl.style.cssText = 'font-weight:800;font-size:16px;margin:0;color:' + (c.text_color || '#fff');
        hl.textContent = resolveTokens(c.headline);
        box.appendChild(hl);
      }
      if (c.body) {
        var bd = document.createElement('p');
        bd.style.cssText = 'font-size:13px;opacity:0.85;margin:0;color:' + (c.text_color || '#fff');
        bd.textContent = resolveTokens(c.body);
        box.appendChild(bd);
      }
      if (c.cta_label) {
        var cta = document.createElement('a');
        cta.href = c.cta_url || '#';
        if (c.cta_url) cta.target = '_blank';
        cta.style.cssText = 'display:block;text-align:center;background:' + (c.cta_color || '#fff') +
          ';color:' + (c.cta_text_color || '#1A56DB') +
          ';padding:10px 20px;border-radius:8px;font-weight:700;font-size:13px;text-decoration:none;cursor:pointer;margin-top:4px';
        cta.textContent = resolveTokens(c.cta_label);
        box.appendChild(cta);
      }
    }

    if (c.popup_url) {
      box.style.cursor = 'pointer';
      box.addEventListener('click', function(e) {
        if (e.target === box) window.open(c.popup_url, '_blank');
      });
    }

    container.appendChild(box);
    document.body.appendChild(container);
  }

  function _renderBlock(block, isBar, container) {
    switch (block.type) {
      case 'text': {
        var el = document.createElement('p');
        el.style.cssText = 'margin:0;font-size:' + (block.font_size || 14) + 'px' +
          ';font-weight:' + (block.font_weight || '400') +
          ';text-align:' + (block.text_align || 'left') +
          ';color:' + (block.text_color || '#ffffff') +
          ';line-height:1.5' +
          (block.text_italic ? ';font-style:italic' : '') +
          (block.text_underline ? ';text-decoration:underline' : '');
        el.textContent = resolveTokensWithFallbacks(block.text || '', block.text_fallbacks || {});
        return el;
      }
      case 'image': {
        if (!block.image_url) return null;
        var img = document.createElement('img');
        img.src = block.image_url;
        img.style.cssText = 'width:100%;height:' + (block.image_height || 160) + 'px' +
          ';object-fit:' + (block.image_fit || 'cover') +
          ';display:block';
        if (block.image_link) {
          var a = document.createElement('a');
          a.href = block.image_link;
          a.target = '_blank';
          a.appendChild(img);
          return a;
        }
        return img;
      }
      case 'button': {
        var el;
        if (block.btn_action === 'close') {
          el = document.createElement('button');
          el.addEventListener('click', function() { container.remove(); });
        } else {
          el = document.createElement('a');
          el.href = block.btn_url || '#';
          if (block.btn_url) el.target = '_blank';
        }
        el.textContent = resolveTokens(block.btn_label || 'Click Here');
        el.style.cssText = 'display:block;text-align:center;background:' + (block.btn_color || '#ffffff') +
          ';color:' + (block.btn_text_color || '#1A56DB') +
          ';padding:10px 20px;border-radius:' + (block.btn_radius || 10) + 'px' +
          ';font-weight:' + (block.btn_bold ? '700' : '400') +
          ';font-style:' + (block.btn_italic ? 'italic' : 'normal') +
          ';font-size:14px;text-decoration:none;cursor:pointer;border:none;width:' + (isBar ? 'auto' : '100%');
        return el;
      }
      case 'no_thanks': {
        var el = document.createElement('div');
        el.style.cssText = 'text-align:center;padding:4px 0';
        var span = document.createElement('span');
        span.textContent = block.no_thanks_label || 'No thanks';
        span.style.cssText = 'color:' + (block.no_thanks_color || '#94a3b8') +
          ';font-size:12px;cursor:pointer;text-decoration:underline';
        span.addEventListener('click', function() {
          if (block.no_thanks_dont_show) {
            localStorage.setItem('pp_popup_dismissed', '1');
          }
          container.remove();
        });
        el.appendChild(span);
        return el;
      }
      case 'embed': {
        if (!block.embed_code) return null;
        var el = document.createElement('div');
        el.innerHTML = block.embed_code;
        return el;
      }
      case 'columns': {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;width:100%;overflow:hidden';
        var split = (block.col_split) ? block.col_split : '50-50';
        var splitParts = split.split('-');
        var leftPct = parseInt(splitParts[0]) || 50;
        var rightPct = parseInt(splitParts[1]) || 50;
        var left = document.createElement('div');
        left.style.cssText = 'width:' + leftPct + '%;overflow:hidden;flex-shrink:0';
        (block.col_left || []).forEach(function(b) {
          var el = _renderBlock(b, false, container);
          if (el) left.appendChild(el);
        });
        var right = document.createElement('div');
        right.style.cssText = 'width:' + rightPct + '%;display:flex;flex-direction:column;justify-content:center;gap:10px;padding:24px;flex-shrink:0';
        (block.col_right || []).forEach(function(b) {
          var el = _renderBlock(b, false, container);
          if (el) right.appendChild(el);
        });
        row.appendChild(left);
        row.appendChild(right);
        return row;
      }
      default: return null;
    }
  }

  // ─── ANALYTICS BEACONS ─────────────────────────────────────────────────────
  var _visitId = null;

  function getSessionId() {
    var key = 'pp_session_id';
    var sid = sessionStorage.getItem(key);
    if (!sid) {
      sid = 'ps_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(key, sid);
    }
    return sid;
  }

  function sendVisitBeacon(scriptId, signals, geo) {
    var params = parseQueryString(window.location.search);
    var payload = JSON.stringify({
      project_id: scriptId,
      session_id: getSessionId(),
      country: (geo && geo.country) || null,
      country_code: (geo && geo.country_code) || null,
      continent: (geo && geo.continent) || null,
      device: signals.device_type || null,
      os: signals.operating_system || null,
      browser: signals.browser || null,
      referrer: document.referrer || null,
      utm_source: params.utm_source || null,
      utm_medium: params.utm_medium || null,
      utm_campaign: params.utm_campaign || null,
      utm_content: params.utm_content || null,
      utm_term: params.utm_term || null,
      is_new_visitor: signals.visitor_type === 'new',
    });
    post(API_BASE + '/api/sdk/visit', payload, function(data) {
      if (data && data.visit_id) {
        _visitId = data.visit_id;
        // Wire unload beacon now that we have a visit_id
        window.addEventListener('visibilitychange', function() {
          if (document.visibilityState === 'hidden' && _visitId) {
            var patchPayload = JSON.stringify({
              time_on_page: signals.time_on_page || 0,
              scroll_depth: signals.scroll_depth || 0,
            });
            var url = API_BASE + '/api/sdk/visit/' + _visitId;
            try {
              fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: patchPayload,
                keepalive: true,
              });
            } catch(e) {}
          }
        });
      }
    });
  }

  function sendEventBeacon(scriptId, rule, signals) {
    var payload = JSON.stringify({
      project_id: scriptId,
      rule_id: rule.id,
      session_id: getSessionId(),
      country: (window.__pp && window.__pp.signals && window.__pp.signals.geo_country) || null,
      device: signals.device_type || null,
      time_on_page: signals.time_on_page || 0,
      scroll_depth: signals.scroll_depth || 0,
    });
    post(API_BASE + '/api/sdk/event', payload, function() {});
  }

  // ─── TOKENS ────────────────────────────────────────────────────────────────
  function resolveTokensWithFallbacks(text, fallbacks) {
    if (!text) return text;
    var signals = (window.__pp && window.__pp.signals) || {};
    var countryVal = signals.geo_country || (fallbacks && fallbacks['country']) || '';
    return text.split('{country}').join(countryVal);
  }

  function resolveTokens(text) {
    if (!text) return text;
    return resolveTokensWithFallbacks(text, {});
  }

  function getAffiliateName() {
    var params = parseQueryString(window.location.search);
    return params.aff || params.affiliate || '';
  }

  function getCookieOrParam(key, params) {
    return params[key] || getCookie(key) || '';
  }

  // ─── DOM HELPERS ───────────────────────────────────────────────────────────
  function findElement(blockId) {
    if (!blockId) return null;
    var el = document.getElementById(blockId)
      || document.querySelector('[data-pp-block="' + blockId + '"]')
      || document.querySelector(blockId);
    if (!el) warn('Element not found: ' + blockId);
    return el;
  }

  // ─── UTILS ─────────────────────────────────────────────────────────────────
  function get(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try { callback(JSON.parse(xhr.responseText)); }
          catch (e) { callback(null); }
        } else {
          callback(null);
        }
      }
    };
    xhr.send();
  }

  function post(url, payload, callback) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          try { callback(JSON.parse(xhr.responseText)); }
          catch (e) { callback(null); }
        }
      };
      xhr.send(payload);
    } catch(e) {}
  }

  function parseQueryString(search) {
    var result = {};
    var str = (search || '').replace(/^\?/, '');
    var parts = str.split('&');
    for (var i = 0; i < parts.length; i++) {
      var pair = parts[i].split('=');
      if (pair[0]) result[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
    return result;
  }

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[2]) : '';
  }

  function warn(msg) {
    if (window.console && console.warn) console.warn('[PagePersona]', msg);
  }

  // ─── PICKER MODE ───────────────────────────────────────────────────────────
  // Activated only when the PagePersona dashboard loads this page in an iframe.
  // Normal visitors are never affected — this block is completely dormant otherwise.

  var pickerActive = false;
  var pickerHighlighted = null;
  var pickerTooltip = null;
  var pickerStyleTag = null;

  function initPicker() {
    if (pickerActive) return;
    pickerActive = true;

    // Fetch active rules and badge elements that already have rules
    var scriptId = getScriptId();
    if (scriptId) {
      get(API_BASE + '/api/sdk/rules?script_id=' + scriptId, function(data) {
        if (!data || !data.rules) return;
        var rules = data.rules;
        rules.forEach(function(rule) {
          (rule.actions || []).forEach(function(action) {
            if (!action.target_block) return;
            var el = findElement(action.target_block);
            if (!el) return;

            // For void elements (img, input etc), use parent or wrap
            var badgeTarget = el;
            if (el.tagName === 'IMG' || el.tagName === 'INPUT' || el.tagName === 'BR') {
              // Wrap in a span if parent doesn't already have position
              var parent = el.parentElement;
              if (parent && parent.querySelector('.pp-badge')) return;
              badgeTarget = parent;
            }

            if (!badgeTarget || badgeTarget.querySelector('.pp-badge')) return;
            badgeTarget.style.position = badgeTarget.style.position || 'relative';
            var badge = document.createElement('div');
            badge.className = 'pp-badge';
            badge.textContent = 'PP';
            badge.style.cssText = [
              'position:absolute', 'top:4px', 'left:4px', 'z-index:2147483646',
              'background:#1A56DB', 'color:#fff', 'font-family:\'Public Sans\',sans-serif',
              'font-size:9px', 'font-weight:700', 'padding:2px 6px',
              'border-radius:3px', 'letter-spacing:0.05em', 'pointer-events:none',
              'line-height:1.6', 'text-transform:uppercase'
            ].join(';');
            badgeTarget.appendChild(badge);
          });
        });
      });
    }

    // Inject hover styles
    pickerStyleTag = document.createElement('style');
    pickerStyleTag.id = 'pp-picker-styles';
    pickerStyleTag.textContent = [
      '.pp-picker-hover{outline:2px solid #14B8A6 !important;outline-offset:3px !important;cursor:crosshair !important;position:relative !important;}',
      '.pp-picker-hover .pp-brand-tag{display:block !important;}',
      '.pp-brand-tag{display:none;position:absolute;top:-22px;left:-2px;z-index:2147483646;',
      'background:#14B8A6;color:#fff;font-family:\'Public Sans\',\'DM Sans\',sans-serif;font-size:9px;font-weight:700;',
      'padding:2px 8px;border-radius:3px 3px 0 0;letter-spacing:0.08em;text-transform:uppercase;',
      'pointer-events:none;white-space:nowrap;line-height:1.8;}',
      '#pp-picker-tooltip{position:fixed;z-index:2147483647;background:#0F172A;color:#fff;',
      'font-family:sans-serif;font-size:12px;padding:5px 10px;border-radius:6px;',
      'pointer-events:none;white-space:nowrap;border:1px solid #14B8A6;}'
    ].join('');
    document.head.appendChild(pickerStyleTag);

    // Tooltip element
    pickerTooltip = document.createElement('div');
    pickerTooltip.id = 'pp-picker-tooltip';
    pickerTooltip.textContent = 'Click to personalise this element';
    pickerTooltip.style.display = 'none';
    document.body.appendChild(pickerTooltip);

    document.addEventListener('mouseover', onPickerHover, true);
    document.addEventListener('mouseout',  onPickerOut,   true);
    document.addEventListener('mousemove', onPickerMove,  true);
    document.addEventListener('click',     onPickerClick, true);

    // Tell dashboard we are ready
    window.parent.postMessage({ type: 'PP_READY' }, '*');
  }

  function destroyPicker() {
    if (!pickerActive) return;
    pickerActive = false;
    // Remove all PP badges and brand tags
    document.querySelectorAll('.pp-badge').forEach(function(b) { b.remove(); });
    document.querySelectorAll('.pp-brand-tag').forEach(function(t) { t.remove(); });

    document.removeEventListener('mouseover', onPickerHover, true);
    document.removeEventListener('mouseout',  onPickerOut,   true);
    document.removeEventListener('mousemove', onPickerMove,  true);
    document.removeEventListener('click',     onPickerClick, true);

    if (pickerHighlighted) {
      pickerHighlighted.classList.remove('pp-picker-hover');
      pickerHighlighted = null;
    }
    if (pickerTooltip)   { pickerTooltip.remove();   pickerTooltip = null; }
    if (pickerStyleTag)  { pickerStyleTag.remove();  pickerStyleTag = null; }
  }

  function onPickerHover(e) {
    if (!pickerActive) return;
    // Remove from previous
    if (pickerHighlighted) {
      pickerHighlighted.classList.remove('pp-picker-hover');
      var oldTag = pickerHighlighted.querySelector('.pp-brand-tag');
      if (oldTag) oldTag.remove();
    }
    pickerHighlighted = e.target;
    pickerHighlighted.classList.add('pp-picker-hover');
    // For void elements, inject brand tag into parent instead
    var tagTarget = pickerHighlighted;
    if (['IMG','INPUT','BR','HR'].indexOf(pickerHighlighted.tagName) !== -1) {
      tagTarget = pickerHighlighted.parentElement || pickerHighlighted;
    }
    if (tagTarget && !tagTarget.querySelector('.pp-brand-tag')) {
      var tag = document.createElement('span');
      tag.className = 'pp-brand-tag';
      tag.textContent = 'PagePersona';
      tagTarget.appendChild(tag);
    }
    if (pickerTooltip) pickerTooltip.style.display = 'block';
  }

  function onPickerOut(e) {
    if (!pickerActive) return;
    if (e.target && e.target.classList) {
      e.target.classList.remove('pp-picker-hover');
      var tag = e.target.querySelector('.pp-brand-tag');
      if (tag) tag.remove();
    }
    if (pickerTooltip) pickerTooltip.style.display = 'none';
  }

  function onPickerMove(e) {
    if (!pickerActive || !pickerTooltip) return;
    pickerTooltip.style.left = (e.clientX + 14) + 'px';
    pickerTooltip.style.top  = (e.clientY + 14) + 'px';
  }

  function onPickerClick(e) {
    if (!pickerActive) return;
    e.preventDefault();
    e.stopPropagation();

    var el = e.target;
    var selector = buildSelector(el);
    var payload = {
      type:        'PP_ELEMENT_SELECTED',
      selector:    selector,
      tagName:     el.tagName,
      textContent: (el.textContent || '').trim().slice(0, 120),
      id:          el.id || '',
      classes:     el.className || ''
    };
    window.parent.postMessage(payload, '*');
  }

  // Build a unique CSS selector for an element — verified to match exactly 1 node
  function buildSelector(el) {
    // 1. data-pp-block attribute — most stable
    if (el.getAttribute('data-pp-block')) {
      return '[data-pp-block="' + el.getAttribute('data-pp-block') + '"]';
    }
    // 2. Unique id on element itself
    if (el.id && document.querySelectorAll('#' + el.id).length === 1) {
      return '#' + el.id;
    }

    // Walk up DOM building a path from the nearest unique-ID ancestor down to el
    // This guarantees the selector is unique on this page
    function getPath(node) {
      var parts = [];
      var cur = node;
      while (cur && cur !== document.documentElement) {
        if (cur.id && document.querySelectorAll('#' + cur.id).length === 1) {
          parts.unshift('#' + cur.id);
          break;
        }
        var tag = cur.tagName.toLowerCase();
        var parent = cur.parentElement;
        if (parent) {
          var siblings = Array.prototype.slice.call(parent.children).filter(function(c) { return c.tagName === cur.tagName; });
          if (siblings.length > 1) {
            var idx = siblings.indexOf(cur) + 1;
            tag += ':nth-of-type(' + idx + ')';
          }
        }
        parts.unshift(tag);
        cur = cur.parentElement;
      }
      return parts.join(' > ');
    }

    var selector = getPath(el);
    // Verify uniqueness — if somehow still not unique, append nth-of-type to el
    try {
      if (document.querySelectorAll(selector).length !== 1) {
        var parent = el.parentElement;
        if (parent) {
          var siblings = Array.prototype.slice.call(parent.children);
          selector += ':nth-child(' + (siblings.indexOf(el) + 1) + ')';
        }
      }
    } catch(e) {}
    return selector;
  }

  // Listen for messages from the dashboard
  window.addEventListener('message', function (e) {
    if (!e.data || !e.data.type) return;
    if (e.data.type === 'PP_PICKER_INIT')    initPicker();
    if (e.data.type === 'PP_PICKER_DESTROY') destroyPicker();
  });

  // Auto-activate picker if loaded inside the PagePersona dashboard iframe
  // Works on both normal load AND hard reload (referrer may be empty on reload)
  (function autoInitPicker() {
    try {
      var inIframe = false;
      try { inIframe = window.self !== window.top; } catch(e) { inIframe = true; }
      if (!inIframe) return;

      // Check referrer OR parent origin
      var referrer = document.referrer || '';
      var isPPDashboard = referrer.indexOf('localhost:3000') !== -1
        || referrer.indexOf('app.usepagepersona.com') !== -1;

      // Also check if parent URL contains /picker — handles hard reload case
      var parentHref = '';
      try { parentHref = window.parent.location.href; } catch(e) {}
      var isPickerPage = parentHref.indexOf('/picker') !== -1;

      if (isPPDashboard || isPickerPage) {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function() {
            initPicker();
            window.parent.postMessage({ type: 'PP_READY' }, '*');
          });
        } else {
          initPicker();
          window.parent.postMessage({ type: 'PP_READY' }, '*');
        }
      }
    } catch(e) {}
  })();

  // ─── FOUC PREVENTION — runs immediately before DOM is ready ───────────────
  // If we have cached rules, inject visibility:hidden on swap targets right now
  // so the browser never paints the default content before the swap fires.
  (function injectFoucShield() {
    try {
      var scriptId = getScriptId();
      if (!scriptId) return;
      var cached = getCached(scriptId);
      if (!cached || !cached.rules || cached.rules.length === 0) return;
      var selectors = [];
      for (var i = 0; i < cached.rules.length; i++) {
        var actions = cached.rules[i].actions || [];
        for (var j = 0; j < actions.length; j++) {
          var a = actions[j];
          if ((a.type === 'swap_text' || a.type === 'swap_image') && a.target_block) {
            selectors.push(a.target_block);
          }
        }
      }
      if (selectors.length === 0) return;
      var style = document.createElement('style');
      style.id = 'pp-fouc-shield';
      style.textContent = selectors.join(',') + '{visibility:hidden !important;}';
      document.head.appendChild(style);
    } catch(e) {}
  })();
  // ─── INIT ──────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
