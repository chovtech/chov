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
  function loadRules(scriptId, callback) {
    var cached = getCached(scriptId);

    if (cached) {
      callback(cached.rules);
      pingHash(scriptId, function (serverHash) {
        if (serverHash && serverHash !== cached.rules_hash) {
          fetchRules(scriptId, function (data) {
            if (data) setCache(scriptId, data.rules_hash, data.rules);
          });
        }
      });
      return;
    }

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

    var visitKey = 'pp_visits_' + (params.id || '');
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
    signals.day_time = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');

    signals.geo_country = '';
    signals.geo_city = '';

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
      case 'swap_text':    swapText(action.target_block, action.value);    break;
      case 'swap_image':   swapImage(action.target_block, action.value);   break;
      case 'hide_section': hideSection(action.target_block);               break;
      case 'inject_token': injectToken(action.target_block, action.value); break;
      case 'show_popup':   showPopup(action.value);                        break;
      case 'send_webhook': sendWebhook(action.value);                      break;
      default: warn('Unknown action type: ' + action.type);
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
            // Don't badge twice
            if (el.querySelector('.pp-badge')) return;
            el.style.position = el.style.position || 'relative';
            var badge = document.createElement('div');
            badge.className = 'pp-badge';
            badge.textContent = 'PP';
            badge.style.cssText = [
              'position:absolute', 'top:4px', 'left:4px', 'z-index:2147483646',
              'background:#1A56DB', 'color:#fff', 'font-family:sans-serif',
              'font-size:9px', 'font-weight:700', 'padding:2px 6px',
              'border-radius:3px', 'letter-spacing:0.05em', 'pointer-events:none',
              'line-height:1.6', 'text-transform:uppercase'
            ].join(';');
            el.appendChild(badge);
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
    // Inject brand tag if not already there
    if (!pickerHighlighted.querySelector('.pp-brand-tag')) {
      var tag = document.createElement('span');
      tag.className = 'pp-brand-tag';
      tag.textContent = 'PagePersona';
      pickerHighlighted.appendChild(tag);
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

  // Build the most specific stable CSS selector for a given element
  function buildSelector(el) {
    // 1. data-pp-block attribute — most stable
    if (el.getAttribute('data-pp-block')) {
      return '[data-pp-block="' + el.getAttribute('data-pp-block') + '"]';
    }
    // 2. id attribute — very stable
    if (el.id) {
      return '#' + el.id;
    }
    // 3. tag + meaningful classes (skip utility/layout classes)
    if (el.className && typeof el.className === 'string') {
      var classes = el.className.trim().split(/\s+/).slice(0, 2).join('.');
      if (classes) return el.tagName.toLowerCase() + '.' + classes;
    }
    // 4. tag + nth-child fallback
    var parent = el.parentElement;
    if (parent) {
      var siblings = Array.prototype.slice.call(parent.children);
      var index = siblings.indexOf(el) + 1;
      var parentSelector = parent.id ? '#' + parent.id : parent.tagName.toLowerCase();
      return parentSelector + ' > ' + el.tagName.toLowerCase() + ':nth-child(' + index + ')';
    }
    // 5. bare tag as last resort
    return el.tagName.toLowerCase();
  }

  // Listen for messages from the dashboard
  window.addEventListener('message', function (e) {
    if (!e.data || !e.data.type) return;
    if (e.data.type === 'PP_PICKER_INIT')    initPicker();
    if (e.data.type === 'PP_PICKER_DESTROY') destroyPicker();
  });

  // Auto-activate picker if loaded inside the PagePersona dashboard iframe
  // This fires when postMessage is blocked by cross-origin port differences
  (function autoInitPicker() {
    try {
      var inIframe = window.self !== window.top;
      var referrer = document.referrer || '';
      var isPPDashboard = referrer.indexOf('localhost:3000') !== -1
        || referrer.indexOf('app.usepagepersona.com') !== -1;
      if (inIframe && isPPDashboard) {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initPicker);
        } else {
          initPicker();
        }
      }
    } catch(e) {}
  })();

  // ─── INIT ──────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
