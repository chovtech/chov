(function () {
  'use strict';

  // ─── CONFIG ────────────────────────────────────────────────────────────────
  var API_BASE = 'http://localhost:8000'; // swap to https://api.usepagepersona.com in production
  var CACHE_PREFIX = 'pp_rules_';
  var CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  // ─── BOOT ──────────────────────────────────────────────────────────────────
  function boot() {
    var scriptId = getScriptId();
    if (!scriptId) {
      warn('No ?id= param found on pp.js script tag. Aborting.');
      return;
    }
    loadRules(scriptId, function (rules) {
      if (!rules || rules.length === 0) return;
      var signals = detectSignals();
      // Expose on window for debugging and external access
      window.__pp = window.__pp || {};
      window.__pp.signals = signals;
      window.__pp.rules = rules;
      var matched = evaluateRules(rules, signals);
      window.__pp.matched = matched;
      fireActions(matched);
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

  function setCache(scriptId, rulesHash, rules) {
    try {
      localStorage.setItem(CACHE_PREFIX + scriptId, JSON.stringify({
        ts: Date.now(),
        rules_hash: rulesHash,
        rules: rules
      }));
    } catch (e) {}
  }

  // ─── LOAD RULES ────────────────────────────────────────────────────────────
  // Strategy: stale-while-revalidate
  // 1. If cache exists and is fresh → use cache, revalidate in background
  // 2. If cache is stale or missing → fetch fresh, then apply
  function loadRules(scriptId, callback) {
    var cached = getCached(scriptId);

    if (cached) {
      // Serve from cache immediately
      callback(cached.rules);
      // Revalidate in background — check hash first
      pingHash(scriptId, function (serverHash) {
        if (serverHash && serverHash !== cached.rules_hash) {
          fetchRules(scriptId, function (data) {
            if (data) setCache(scriptId, data.rules_hash, data.rules);
            // Note: we do NOT re-apply rules mid-visit to avoid flicker
          });
        }
      });
      return;
    }

    // No cache — fetch fresh and apply
    fetchRules(scriptId, function (data) {
      if (!data) return;
      setCache(scriptId, data.rules_hash, data.rules);
      callback(data.rules);
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
  function detectSignals() {
    var signals = {};

    // UTM params
    var params = parseQueryString(window.location.search);
    signals.utm_source   = params.utm_source   || '';
    signals.utm_medium   = params.utm_medium   || '';
    signals.utm_campaign = params.utm_campaign || '';
    signals.query_param  = window.location.search;
    signals.referrer_url = document.referrer || '';

    // Device type
    var ua = navigator.userAgent;
    if (/Mobi|Android/i.test(ua)) {
      signals.device_type = 'mobile';
    } else if (/Tablet|iPad/i.test(ua)) {
      signals.device_type = 'tablet';
    } else {
      signals.device_type = 'desktop';
    }

    // Operating system
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

    // Browser
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

    // Visit count (per script_id stored in localStorage)
    var visitKey = 'pp_visits_' + (params.id || '');
    var visits = parseInt(localStorage.getItem(visitKey) || '0', 10) + 1;
    localStorage.setItem(visitKey, String(visits));
    signals.visit_count = visits;

    // Visitor type
    signals.visitor_type = visits === 1 ? 'new' : 'returning';

    // Scroll depth (updated as user scrolls — snapshot at rule eval time is 0)
    signals.scroll_depth = 0;
    window.addEventListener('scroll', function () {
      var scrolled = window.scrollY + window.innerHeight;
      var total = document.documentElement.scrollHeight;
      signals.scroll_depth = Math.round((scrolled / total) * 100);
    }, { passive: true });

    // Time on page (seconds since load)
    var loadTime = Date.now();
    signals.time_on_page = 0;
    setInterval(function () {
      signals.time_on_page = Math.round((Date.now() - loadTime) / 1000);
    }, 1000);

    // Exit intent
    signals.exit_intent = false;
    document.addEventListener('mouseleave', function (e) {
      if (e.clientY <= 0) signals.exit_intent = true;
    });

    // Day / time
    var now = new Date();
    signals.day_time = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');

    // Geo — not available client-side without an IP API
    // Will be populated server-side in a future version
    signals.geo_country = '';
    signals.geo_city = '';

    return signals;
  }

  // ─── RULE EVALUATION ───────────────────────────────────────────────────────
  function evaluateRules(rules, signals) {
    var matched = [];
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (ruleMatches(rule, signals)) {
        matched.push(rule);
      }
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

    if (operator === 'OR') {
      return results.some(function (r) { return r; });
    }
    return results.every(function (r) { return r; });
  }

  function conditionMatches(condition, signals) {
    var signal = condition.signal;
    var operator = condition.operator;
    var expected = condition.value;
    var actual = signals[signal];

    if (actual === undefined || actual === null) return false;

    switch (operator) {
      case 'is detected':
        return actual === true;
      case 'is':
        return String(actual).toLowerCase() === String(expected).toLowerCase();
      case 'is not':
        return String(actual).toLowerCase() !== String(expected).toLowerCase();
      case 'contains':
        return String(actual).toLowerCase().indexOf(String(expected).toLowerCase()) !== -1;
      case 'equals':
        return String(actual) === String(expected);
      case 'is greater than':
        return parseFloat(actual) > parseFloat(expected);
      case 'is less than':
        return parseFloat(actual) < parseFloat(expected);
      case 'is between': {
        var parts = String(expected).split(',');
        if (parts.length !== 2) return false;
        var val = parseFloat(actual);
        return val >= parseFloat(parts[0]) && val <= parseFloat(parts[1]);
      }
      default:
        return false;
    }
  }

  // ─── ACTION EXECUTION ──────────────────────────────────────────────────────
  function fireActions(rules) {
    for (var i = 0; i < rules.length; i++) {
      var actions = rules[i].actions || [];
      for (var j = 0; j < actions.length; j++) {
        fireAction(actions[j]);
      }
    }
  }

  function fireAction(action) {
    switch (action.type) {
      case 'swap_text':
        swapText(action.target_block, action.value);
        break;
      case 'swap_image':
        swapImage(action.target_block, action.value);
        break;
      case 'hide_section':
        hideSection(action.target_block);
        break;
      case 'inject_token':
        injectToken(action.target_block, action.value);
        break;
      case 'show_popup':
        showPopup(action.value);
        break;
      case 'send_webhook':
        sendWebhook(action.value);
        break;
      default:
        warn('Unknown action type: ' + action.type);
    }
  }

  function swapText(blockId, newText) {
    var el = findElement(blockId);
    if (!el) return;
    el.textContent = resolveTokens(newText);
  }

  function swapImage(blockId, newSrc) {
    var el = findElement(blockId);
    if (!el) return;
    if (el.tagName === 'IMG') {
      el.src = newSrc;
    } else {
      var img = el.querySelector('img');
      if (img) img.src = newSrc;
    }
  }

  function hideSection(blockId) {
    var el = findElement(blockId);
    if (!el) return;
    el.style.display = 'none';
  }

  function injectToken(blockId, template) {
    var el = findElement(blockId);
    if (!el) return;
    el.textContent = resolveTokens(template);
  }

  function showPopup(message) {
    var existing = document.getElementById('pp-popup');
    if (existing) existing.remove();
    var popup = document.createElement('div');
    popup.id = 'pp-popup';
    popup.style.cssText = [
      'position:fixed', 'bottom:24px', 'right:24px', 'z-index:999999',
      'background:#1A56DB', 'color:#fff', 'padding:16px 20px',
      'border-radius:12px', 'max-width:320px', 'font-family:sans-serif',
      'font-size:14px', 'line-height:1.5', 'box-shadow:0 8px 32px rgba(26,86,219,0.3)',
      'cursor:pointer'
    ].join(';');
    popup.textContent = resolveTokens(message);
    popup.addEventListener('click', function () { popup.remove(); });
    document.body.appendChild(popup);
    setTimeout(function () { if (popup.parentNode) popup.remove(); }, 8000);
  }

  function sendWebhook(url) {
    if (!url) return;
    var payload = {
      event: 'pp_rule_fired',
      timestamp: new Date().toISOString(),
      page: window.location.href,
    };
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(function () {});
  }

  // ─── TOKENS ────────────────────────────────────────────────────────────────
  function resolveTokens(text) {
    if (!text) return text;
    var params = parseQueryString(window.location.search);
    var tokens = {
      '{city}':           getCookieOrParam('pp_city', params),
      '{first_name}':     getCookieOrParam('pp_first_name', params),
      '{company}':        getCookieOrParam('pp_company', params),
      '{affiliate_name}': getCookieOrParam('pp_affiliate', params) || getAffiliateName(),
    };
    var result = text;
    for (var token in tokens) {
      result = result.split(token).join(tokens[token] || '');
    }
    return result;
  }

  function getAffiliateName() {
    // JVZoo passes affiliate as 'aff' query param
    var params = parseQueryString(window.location.search);
    return params.aff || params.affiliate || '';
  }

  function getCookieOrParam(key, params) {
    return params[key] || getCookie(key) || '';
  }

  // ─── DOM HELPERS ───────────────────────────────────────────────────────────
  function findElement(blockId) {
    if (!blockId) return null;
    // Try id first, then data-pp-block, then CSS selector
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
          try {
            callback(JSON.parse(xhr.responseText));
          } catch (e) {
            callback(null);
          }
        } else {
          callback(null);
        }
      }
    };
    xhr.send();
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

  // ─── INIT ──────────────────────────────────────────────────────────────────
  // Run after DOM is ready — but don't block page render
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();