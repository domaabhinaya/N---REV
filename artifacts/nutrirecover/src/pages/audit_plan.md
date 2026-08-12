# Full Application Audit - Issues Found

## Layout.tsx
- [ ] Duplicate `import { useState } from "react"` on line 5 (already imported on line 1 via ReactNode)
- [ ] Missing `aria-label` on mobile menu toggle button
- [ ] No `role="navigation"` on nav element
- [ ] No focus trap when mobile menu is open
- [ ] `isMobileMenuOpen` state not reset on route change

## Dashboard.tsx
- [ ] Unused variable: `location` in `const [location, setLocation] = useLocation()` - should be `const [, setLocation]`
- [ ] Missing `aria-label` on chart RechartsTooltip
- [ ] Quick Actions buttons need `type="button"` to prevent form submission
- [ ] Color inconsistency: uses `bg-[#5b8c5a]` hardcoded instead of `bg-primary`

## Assessment.tsx
- [ ] **Missing `useRef` import** - `import { useEffect, useState } from "react"` needs `useRef`
- [ ] `totalLabFields = 30` is hardcoded and doesn't match actual fields
- [ ] Missing `aria-label` on step buttons
- [ ] Missing focus management after step transitions
- [ ] Animation (framer-motion) may cause issues on mobile with reduced motion preference
- [ ] Add `prefers-reduced-motion` media query support

## Tracking.tsx
- [ ] Unused variables: `summaryFetching`, `suggestionsFetching`, `hasPendingItems`
- [ ] `hasAnyItems` uses `Object.values(...)` which requires `downlevelIteration` or ES2015
- [ ] Missing loading skeleton for suggestions section
- [ ] Empty state needs better messaging when no foods logged
- [ ] Error boundary for individual meal section failures
- [ ] `type="button"` missing on Add and Save buttons - default to submit in forms

## Suggestions.tsx
- [ ] Uses `<div className="h-32 bg-muted animate-pulse rounded-lg" />` instead of proper `<Skeleton>` component
- [ ] Missing `type="button"` on Date input

## RecoveryPlan.tsx
- [ ] MASSIVE file (~3000 lines) - should extract ANTAGONISTIC, SYNERGIES, TIMING arrays into separate constants file
- [ ] Missing loading skeleton for personalized recommendations
- [ ] Accordion items need better keyboard navigation support

## Report.tsx
- [ ] Uses hardcoded color `#5b8c5a` instead of CSS variables
- [ ] Missing `type="button"` on buttons
- [ ] PDF generation may overflow page breaks

## AiAssistant.tsx
- [ ] Uses generic `as any` type casts on query configs
- [ ] Chat area has fixed max-height (`max-h-[500px]`) which may overflow on small screens
- [ ] Missing keyboard focus management for new messages
- [ ] Typing animation relies on `setTimeout` which may cause issues

## AdminPanel.tsx
- [ ] Unused import: `useMemo`
- [ ] Missing error boundaries for each API call
- [ ] Delete confirmation should use `aria-describedby`

## not-found.tsx
- [ ] Uses hardcoded `bg-gray-50`, `text-gray-900`, `text-gray-600` instead of theme CSS variables
- [ ] Missing semantic `<main>` tag

## Global Issues
- [ ] No consistent `type="button"` on all buttons that aren't in forms
- [ ] Missing `prefers-reduced-motion` support for animations
- [ ] Missing `aria-live` regions for dynamic content updates
- [ ] Missing focus outlines on interactive elements
- [ ] Inconsistent spacing between pages (some use `space-y-8`, some `space-y-6`)
- [ ] No loading states for mutation operations (add/delete food, save labs)
- [ ] Missing error recovery for failed API calls
- [ ] No `role="status"` on loading spinners
