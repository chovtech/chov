# Translation Rules (MANDATORY — NO EXCEPTIONS)

> Skipping this caused 2–3 hours of cleanup in Chat 7. Every string must be translated as it is written.

## Pattern
1. Add English string to `locales/en/common.json`
2. Add French string to `locales/fr/common.json`
3. Use `t('namespace.key')` in the component

```tsx
// ❌ NEVER
<button>Save Rule</button>
placeholder="Enter value..."

// ✅ ALWAYS
<button>{t('rules.save')}</button>
placeholder={t('rules.value_placeholder')}
```

Applies to: button labels, headings, placeholders, toasts, modals, dropdowns, empty states, tooltips — every visible string.

---

## Subcomponent Crash Rule (MANDATORY)

> This crash happened 3 times across Chats 7, 8, and 9. Each took ~2 hours to fix.

**The problem:** Standalone functions outside the main exported component (e.g. `CanvasBlock`, `BlockPreview`, `BlockProperties`) have NO access to `useTranslation`. Calling `t()` inside them without receiving it as a prop causes a **runtime crash — build passes clean**.

**Before ANY translation pass on a file with subcomponents:**
1. List every standalone function in the file
2. Add `t: any` to each function's props signature
3. Add `t={t}` at every call site, including nested/recursive calls

```tsx
// ✅ CORRECT
function SubComponent({ data, t }: { data: any; t: any }) {
  return <p>{t('some.key')}</p>
}
<SubComponent data={x} t={t} />

// ❌ WRONG — crashes at runtime, NOT at build time
function SubComponent({ data }: { data: any }) {
  return <p>{t('some.key')}</p>
}
```

**Grep to run before deploying any translation pass:**
```bash
grep -n "t(el\.\|t(block\.\|t(action\.\|t(item\.\|t(a\.\|t(undefined" /path/to/file.tsx
```

**Files already fixed:** `PopupBuilder.tsx`, `projects/[id]/rules/[rule_id]/edit/page.tsx`
