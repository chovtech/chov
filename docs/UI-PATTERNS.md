# Design System (Locked)

## Color Tokens
| Token | Value | Usage |
|-------|-------|-------|
| Primary blue | `#1A56DB` | Always `bg-[#1A56DB]`, never `bg-primary` |
| Teal accent | `#14B8A6` | Secondary accent |
| Dark | `#0F172A` | Dark backgrounds |
| Publish state | Rose/red | Warning colour — published rules |
| Draft state | Blue | Inviting colour — draft rules |

## Typography
| Role | Font |
|------|------|
| Dashboard body | Public Sans |
| Headings / display | Syne |

## Icons
- Material Symbols Outlined (Google)
- Always use `<Icon name="..." />` component

## Component Patterns
- Rounded cards: `rounded-2xl`
- Primary button: `bg-[#1A56DB] hover:bg-[#1547b3] text-white font-semibold rounded-xl`
- Input: `bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB]`
- Status badges: `px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider`
