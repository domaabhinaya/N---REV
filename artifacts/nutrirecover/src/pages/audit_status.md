# Full Application Audit - Complete

## Files Audited
1. **Layout.tsx** - Layout component + nav
2. **Assessment.tsx** - Assessment wizard (5 steps)
3. **Tracking.tsx** - Daily food tracking
4. **Suggestions.tsx** - Smart suggestions
5. **RecoveryPlan.tsx** - Recovery plan with interactions
6. **Report.tsx** - PDF report
7. **AiAssistant.tsx** - AI chat assistant
8. **Dashboard.tsx** - Dashboard page
9. **AdminPanel.tsx** - Admin food management
10. **not-found.tsx** - 404 page
11. **FoodPlate.tsx** - Food plate component
12. **Home.tsx** - Home page
13. **Labs.tsx** - Lab results tracker

## Critical Issues Found

### Layout.tsx
- Duplicate `useState` import (line 1 and line 5)
- No `aria-label` on mobile hamburger menu
- No focus trap when mobile menu open
- No `role="navigation"` on nav element
- Menu state not reset on route change

### Assessment.tsx
- **Missing `useRef` import** - causes compile error
- `totalLabFields = 30` is hardcoded - doesn't match actual count
- No `type="button"` on step navigation buttons
- No focus management after step transitions
- Animation doesn't respect `prefers-reduced-motion`

### Tracking.tsx
- 3 unused variables: `summaryFetching`, `suggestionsFetching`, `hasPendingItems`
- `hasAnyItems` uses Object.values with downlevelIteration requirement
- No loading skeleton for suggestions section
- Buttons missing `type="button"` - default to `submit`
- No error boundary for individual meal sections

### Suggestions.tsx
- Uses `<div className="animate-pulse">` instead of `<Skeleton>` component
- Missing type="button" on input

### RecoveryPlan.tsx
- **Massive file (~3000 lines)** - massive constant arrays should be extracted
- Missing loading skeleton for personalized recommendations
- Accordion items need better keyboard navigation

### Report.tsx
- Hardcoded color `#5b8c5a` vs CSS variables inconsistent with other pages
- Missing type="button" on action buttons
- PDF page breaks may overflow

### AiAssistant.tsx
- `as any` type casts on query configs
- Fixed `max-h-[500px]` on chat may overflow on mobile
- setTimeout-based typing animation can cause issues

### AdminPanel.tsx
- Unused `useMemo` import
- No error boundaries per API call
- Delete dialog missing `aria-describedby`

### not-found.tsx
- Uses hardcoded colors (`bg-gray-50`, `text-gray-900`) instead of theme variables
- No semantic `<main>` tag

## Global Issues Across All Files
1. Missing `type="button"` on most non-submit buttons
2. No `prefers-reduced-motion` support for animations
3. Missing `aria-live` regions for dynamic updates
4. Inconsistent spacing (some pages `space-y-8`, others `space-y-6`)
5. Missing loading states for mutation operations
6. No error boundaries for API call failures
7. Missing `role="status"` on loading spinners
8. Inconsistent color usage (hardcoded vs CSS variables)
9. Missing focus outlines on interactive elements
